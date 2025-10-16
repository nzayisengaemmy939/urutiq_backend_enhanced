import { prisma } from './prisma';
import { validateBody, schemas } from './validate';
import { ApiError } from './errors';
import { createMulter } from './storage';
import mongoService from './config/mongodb.js';
import * as fs from 'node:fs';
// Helper function to safely get user ID
function getUserId(req) {
    return req.user?.id || req.user?.sub || null;
}
export function mountDocumentRoutes(router) {
    // Document CRUD Operations
    // List documents with filtering, search, and pagination
    router.get('/documents', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            const search = String(req.query.search || '');
            const category = String(req.query.category || '');
            const status = String(req.query.status || 'active');
            const page = parseInt(String(req.query.page || '1'));
            const limit = parseInt(String(req.query.limit || '20'));
            const offset = (page - 1) * limit;
            const where = {
                tenantId: req.tenantId,
                status: status || 'active'
            };
            if (companyId)
                where.companyId = companyId;
            if (search) {
                where.OR = [
                    { name: { contains: search } },
                    { displayName: { contains: search } },
                    { description: { contains: search } }
                ];
            }
            if (category)
                where.categoryId = category;
            const [documents, total] = await Promise.all([
                prisma.fileAsset.findMany({
                    where,
                    include: {
                        uploader: {
                            select: { id: true, name: true, email: true }
                        },
                        company: {
                            select: { id: true, name: true }
                        },
                        category: {
                            select: { id: true, name: true, color: true }
                        }
                    },
                    orderBy: { uploadedAt: 'desc' },
                    skip: offset,
                    take: limit
                }),
                prisma.fileAsset.count({ where })
            ]);
            res.json({
                documents,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        }
        catch (error) {
            console.error('=== DOCUMENTS LIST ERROR ===');
            console.error('Error in documents list route:', error);
            console.error('Error stack:', error?.stack);
            console.error('Request tenantId:', req.tenantId);
            console.error('=== END DOCUMENTS LIST ERROR ===');
            res.status(500).json({
                error: 'internal_server_error',
                message: 'Failed to fetch documents',
                details: process.env.NODE_ENV === 'development' ? error?.message : undefined
            });
        }
    });
    // Document Statistics & Analytics
    // Get document statistics
    router.get('/documents/stats', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const where = { tenantId: req.tenantId };
        if (companyId)
            where.companyId = companyId;
        const userId = getUserId(req);
        const [totalDocuments, storageUsed, pendingApprovals, sharedDocuments] = await Promise.all([
            prisma.fileAsset.count({ where: { ...where, status: 'active' } }),
            prisma.fileAsset.aggregate({
                where: { ...where, status: 'active' },
                _sum: { sizeBytes: true }
            }),
            userId ? prisma.documentWorkflow.count({
                where: {
                    ...where,
                    status: 'pending',
                    assignedTo: userId
                }
            }) : Promise.resolve(0),
            prisma.documentShare.count({
                where: {
                    ...where,
                    status: 'active'
                }
            })
        ]);
        const totalBytes = storageUsed._sum?.sizeBytes ?? 0;
        // Format storage in appropriate unit
        let storageFormatted;
        if (totalBytes >= 1024 * 1024 * 1024) {
            // GB
            storageFormatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        }
        else if (totalBytes >= 1024 * 1024) {
            // MB
            storageFormatted = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
        }
        else if (totalBytes >= 1024) {
            // KB
            storageFormatted = `${(totalBytes / 1024).toFixed(2)} KB`;
        }
        else {
            // Bytes
            storageFormatted = `${totalBytes} Bytes`;
        }
        res.json({
            totalDocuments,
            storageUsed: storageFormatted,
            pendingApprovals,
            sharedDocuments
        });
    });
    // Get document by ID
    router.get('/documents/:id', async (req, res) => {
        try {
            const { id } = req.params;
            console.log('🚨 DOCUMENTS/:ID ROUTE HIT - ID:', id);
            const document = await prisma.fileAsset.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    uploader: {
                        select: { id: true, name: true, email: true }
                    },
                    company: {
                        select: { id: true, name: true }
                    },
                    category: {
                        select: { id: true, name: true, color: true }
                    },
                    workspace: {
                        select: { id: true, name: true }
                    }
                }
            });
            if (!document) {
                return res.status(404).json({ error: 'Document not found' });
            }
            res.json(document);
        }
        catch (error) {
            console.error('Error fetching document:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Upload new document
    router.post('/documents/upload', async (req, res) => {
        const companyId = String(req.body.companyId || '');
        const workspaceId = String(req.body.workspaceId || '');
        const categoryId = String(req.body.categoryId || '');
        const displayName = String(req.body.displayName || '');
        const description = String(req.body.description || '');
        // Validate company exists and belongs to tenant
        if (companyId) {
            const company = await prisma.company.findFirst({
                where: { id: companyId, tenantId: req.tenantId }
            });
            if (!company) {
                throw new ApiError(400, 'invalid_company', 'Company not found');
            }
        }
        // Validate workspace if provided
        if (workspaceId) {
            const workspace = await prisma.workspace.findFirst({
                where: { id: workspaceId, tenantId: req.tenantId }
            });
            if (!workspace) {
                throw new ApiError(400, 'invalid_workspace', 'Workspace not found');
            }
        }
        // Use multer for file upload
        const multer = createMulter(req.tenantId, companyId || 'default');
        multer.single('file')(req, res, async (err) => {
            try {
                if (err) {
                    console.error('Multer error:', err.message);
                    return res.status(400).json({
                        error: 'upload_error',
                        message: 'File upload failed: ' + err.message
                    });
                }
                const file = req.file;
                if (!file) {
                    return res.status(400).json({
                        error: 'no_file',
                        message: 'No file provided'
                    });
                }
                // Check if MongoDB is connected
                if (!mongoService.isConnected()) {
                    return res.status(500).json({
                        error: 'mongo_unavailable',
                        message: 'MongoDB not connected. Document storage requires MongoDB.'
                    });
                }
                // Get user ID from request
                const userId = getUserId(req);
                // User information for upload
                // Get or create a system user for uploads if no user ID is available
                let uploaderId = userId;
                if (!uploaderId) {
                    try {
                        // Try to find any existing user in the tenant
                        const existingUser = await prisma.appUser.findFirst({
                            where: { tenantId: req.tenantId },
                            select: { id: true }
                        });
                        if (existingUser) {
                            uploaderId = existingUser.id;
                            // Using existing user for upload
                        }
                        else {
                            // Create a system user if no users exist
                            const systemUser = await prisma.appUser.create({
                                data: {
                                    id: 'system',
                                    tenantId: req.tenantId,
                                    name: 'System',
                                    email: 'system@urutiq.com',
                                    role: 'admin'
                                }
                            });
                            uploaderId = systemUser.id;
                            // Created system user for upload
                        }
                    }
                    catch (error) {
                        console.error('Error finding/creating user:', error);
                        throw new ApiError(500, 'user_error', 'Unable to determine uploader');
                    }
                }
                const gridFS = mongoService.getGridFS();
                // Read file buffer
                const fileBuffer = fs.readFileSync(file.path);
                // Upload to MongoDB GridFS
                const filename = `${Date.now()}-${file.originalname}`;
                const uploadStream = gridFS.openUploadStream(filename, {
                    metadata: {
                        tenantId: req.tenantId,
                        companyId: companyId || null,
                        workspaceId: workspaceId || null,
                        categoryId: categoryId || null,
                        uploaderId: uploaderId,
                        originalName: file.originalname,
                        displayName: displayName || file.originalname,
                        description: description || null,
                        mimeType: file.mimetype,
                        sizeBytes: file.size
                    }
                });
                const document = await new Promise((resolve, reject) => {
                    uploadStream.on('error', (error) => {
                        reject(error);
                    });
                    uploadStream.on('finish', async () => {
                        try {
                            // Create document record in SQLite with MongoDB file reference
                            const document = await prisma.fileAsset.create({
                                data: {
                                    tenantId: req.tenantId,
                                    companyId: companyId || null,
                                    workspaceId: workspaceId || null,
                                    categoryId: categoryId || null,
                                    uploaderId: uploaderId,
                                    name: file.originalname,
                                    displayName: displayName || file.originalname,
                                    description: description || null,
                                    mimeType: file.mimetype,
                                    sizeBytes: file.size,
                                    storageKey: filename, // Store MongoDB filename instead of local path
                                    status: 'active'
                                },
                                include: {
                                    uploader: {
                                        select: { id: true, name: true, email: true }
                                    },
                                    company: {
                                        select: { id: true, name: true }
                                    },
                                    category: {
                                        select: { id: true, name: true, color: true }
                                    }
                                }
                            });
                            // Clean up local file
                            fs.unlinkSync(file.path);
                            resolve(document);
                        }
                        catch (dbError) {
                            // If SQLite save fails, clean up MongoDB file
                            try {
                                await gridFS.delete(uploadStream.id);
                            }
                            catch (cleanupError) {
                                console.error('Failed to clean up MongoDB file:', cleanupError);
                            }
                            reject(dbError);
                        }
                    });
                    uploadStream.end(fileBuffer);
                });
                res.status(201).json(document);
            }
            catch (error) {
                console.error('Upload error:', error);
                // Clean up local file on error
                const file = req.file;
                if (file && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                return res.status(500).json({
                    error: 'upload_failed',
                    message: 'Failed to upload document: ' + error.message
                });
            }
        });
    });
    // Download document
    router.get('/documents/:id/download', async (req, res) => {
        const { id } = req.params;
        const document = await prisma.fileAsset.findFirst({
            where: {
                id,
                tenantId: req.tenantId
            }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        try {
            // Check if MongoDB is connected
            if (!mongoService.isConnected()) {
                throw new ApiError(500, 'mongo_unavailable', 'MongoDB not connected. Document retrieval requires MongoDB.');
            }
            const gridFS = mongoService.getGridFS();
            // Try to find file by filename first (newer uploads)
            let downloadStream;
            try {
                downloadStream = gridFS.openDownloadStreamByName(document.storageKey);
            }
            catch (error) {
                // If not found by filename, try by ObjectId (older uploads)
                try {
                    const { ObjectId } = await import('mongodb');
                    if (ObjectId.isValid(document.storageKey)) {
                        downloadStream = gridFS.openDownloadStream(ObjectId.createFromHexString(document.storageKey));
                    }
                    else {
                        throw new Error('Invalid storage key format');
                    }
                }
                catch (idError) {
                    // Try to find by searching for files with similar names
                    try {
                        const files = await gridFS.find({ filename: { $regex: document.storageKey, $options: 'i' } }).toArray();
                        if (files.length > 0) {
                            downloadStream = gridFS.openDownloadStream(files[0]._id);
                        }
                        else {
                            throw new ApiError(404, 'file_not_found', 'File not found in MongoDB');
                        }
                    }
                    catch (searchError) {
                        throw new ApiError(404, 'file_not_found', 'File not found in MongoDB');
                    }
                }
            }
            // Set headers for download
            res.setHeader('Content-Type', document.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${document.name}"`);
            res.setHeader('Content-Length', document.sizeBytes.toString());
            // Stream the file from MongoDB
            downloadStream.pipe(res);
            downloadStream.on('error', (error) => {
                if (!res.headersSent) {
                    res.status(500).json({ error: 'stream_error', message: 'Failed to stream document' });
                }
            });
        }
        catch (error) {
            console.error('Error downloading document:', error);
            throw error;
        }
    });
    // Document preview/thumbnail
    router.get('/documents/:id/preview', async (req, res) => {
        const { id } = req.params;
        const { size = 'medium' } = req.query; // small, medium, large
        const document = await prisma.fileAsset.findFirst({
            where: {
                id,
                tenantId: req.tenantId
            }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // For now, return basic preview info
        // In production, you'd generate actual thumbnails/previews
        const previewInfo = {
            id: document.id,
            name: document.displayName || document.name,
            mimeType: document.mimeType,
            size: document.sizeBytes,
            hasPreview: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].includes(document.mimeType),
            previewUrl: `/api/documents/stream/${id}?size=${size}`,
            downloadUrl: `/api/documents/${id}/download`
        };
        res.json(previewInfo);
    });
    // Document streaming from MongoDB (for previews and direct access)
    router.get('/stream/:id', async (req, res) => {
        console.log('🔥 STREAMING ROUTE HIT! 🔥');
        console.log('🔥 STREAMING ROUTE HIT! 🔥');
        console.log('🔥 STREAMING ROUTE HIT! 🔥');
        const { id } = req.params;
        const { size = 'medium', token, tenantId, companyId } = req.query;
        console.log('=== STREAMING REQUEST DEBUG ===');
        console.log('Document ID:', id);
        console.log('Token:', token);
        console.log('Token type:', typeof token);
        console.log('Token length:', token ? token.length : 0);
        console.log('Tenant ID:', tenantId);
        console.log('Company ID:', companyId);
        console.log('Full URL:', req.url);
        console.log('Query params:', req.query);
        console.log('Headers:', req.headers);
        console.log('=== END STREAMING DEBUG ===');
        // Basic authentication check via query parameters
        if (!token || !tenantId) {
            console.log('Authentication failed - missing token or tenantId');
            return res.status(401).json({ error: 'missing_token', message: 'Authentication required' });
        }
        const document = await prisma.fileAsset.findFirst({
            where: {
                id,
                tenantId: tenantId
            }
        });
        if (!document) {
            return res.status(404).json({ error: 'document_not_found', message: 'Document not found' });
        }
        try {
            // Check if MongoDB is connected
            if (!mongoService.isConnected()) {
                return res.status(500).json({ error: 'mongo_unavailable', message: 'MongoDB not connected. Document streaming requires MongoDB.' });
            }
            const gridFS = mongoService.getGridFS();
            // Try to find file by filename first (newer uploads)
            let downloadStream;
            try {
                downloadStream = gridFS.openDownloadStreamByName(document.storageKey);
            }
            catch (error) {
                // If not found by filename, try by ObjectId (older uploads)
                try {
                    const { ObjectId } = await import('mongodb');
                    downloadStream = gridFS.openDownloadStream(ObjectId.createFromHexString(document.storageKey));
                }
                catch (idError) {
                    throw new ApiError(404, 'file_not_found', 'File not found in MongoDB');
                }
            }
            // Set appropriate headers
            res.setHeader('Content-Type', document.mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${document.name}"`);
            res.setHeader('Content-Length', document.sizeBytes.toString());
            // Add CORS headers for cross-origin requests
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Content-Type');
            // Allow iframe embedding
            res.setHeader('X-Frame-Options', 'ALLOWALL');
            res.setHeader('Content-Security-Policy', "frame-ancestors *");
            // Stream the file from MongoDB
            downloadStream.pipe(res);
            downloadStream.on('error', (error) => {
                if (!res.headersSent) {
                    res.status(500).json({ error: 'stream_error', message: 'Failed to stream document' });
                }
            });
        }
        catch (error) {
            console.error('Error streaming document:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'stream_error', message: 'Failed to stream document' });
            }
        }
    });
    // Document preview image (placeholder for now)
    router.get('/documents/:id/preview-image', async (req, res) => {
        const { id } = req.params;
        const { size = 'medium' } = req.query;
        const document = await prisma.fileAsset.findFirst({
            where: {
                id,
                tenantId: req.tenantId
            }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // For now, return a placeholder response
        // In production, you'd generate actual thumbnails
        if (document.mimeType.startsWith('image/')) {
            // For images, redirect to the streaming endpoint
            res.redirect(`/api/documents/stream/${id}?size=${size}`);
        }
        else {
            // For other files, return a placeholder or error
            res.status(501).json({
                error: 'preview_not_supported',
                message: 'Preview not supported for this file type',
                mimeType: document.mimeType
            });
        }
    });
    // Update document metadata
    router.put('/documents/:id', validateBody(schemas.documentUpdate), async (req, res) => {
        const { id } = req.params;
        const { displayName, description, categoryId, workspaceId } = req.body;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Validate category if provided
        if (categoryId) {
            const category = await prisma.documentCategory.findFirst({
                where: { id: categoryId, tenantId: req.tenantId }
            });
            if (!category) {
                throw new ApiError(400, 'invalid_category', 'Category not found');
            }
        }
        // Validate workspace if provided
        if (workspaceId) {
            const workspace = await prisma.workspace.findFirst({
                where: { id: workspaceId, tenantId: req.tenantId }
            });
            if (!workspace) {
                throw new ApiError(400, 'invalid_workspace', 'Workspace not found');
            }
        }
        const updated = await prisma.fileAsset.update({
            where: { id },
            data: {
                displayName: displayName || undefined,
                description: description || undefined,
                categoryId: categoryId || undefined,
                workspaceId: workspaceId || undefined
            },
            include: {
                uploader: {
                    select: { id: true, name: true, email: true }
                },
                company: {
                    select: { id: true, name: true }
                },
                category: {
                    select: { id: true, name: true, color: true }
                }
            }
        });
        res.json(updated);
    });
    // Soft delete document
    router.delete('/documents/:id', async (req, res) => {
        const { id } = req.params;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        try {
            // Delete file from MongoDB GridFS
            if (mongoService.isConnected()) {
                const gridFS = mongoService.getGridFS();
                try {
                    // Try to delete by filename first (newer uploads)
                    const { ObjectId } = await import('mongodb');
                    // Check if storageKey is a valid ObjectId, otherwise treat as filename
                    if (ObjectId.isValid(document.storageKey)) {
                        await gridFS.delete(ObjectId.createFromHexString(document.storageKey));
                    }
                    else {
                        // Try to delete by filename - GridFS delete requires ObjectId, so we need to find the file first
                        try {
                            const files = await gridFS.find({ filename: document.storageKey }).toArray();
                            if (files.length > 0) {
                                await gridFS.delete(files[0]._id);
                            }
                            else {
                                console.warn('Document file not found by filename:', document.storageKey);
                            }
                        }
                        catch (filenameError) {
                            console.warn('Document file not found by filename:', document.storageKey);
                        }
                    }
                }
                catch (error) {
                    // If not found by filename, try by ObjectId (older uploads)
                    try {
                        const { ObjectId } = await import('mongodb');
                        if (ObjectId.isValid(document.storageKey)) {
                            await gridFS.delete(ObjectId.createFromHexString(document.storageKey));
                        }
                    }
                    catch (idError) {
                        console.warn('Document file not found in MongoDB:', document.storageKey);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error deleting document from MongoDB:', error);
            // Continue with soft delete even if MongoDB deletion fails
        }
        // Soft delete by updating status
        await prisma.fileAsset.update({
            where: { id },
            data: { status: 'deleted' }
        });
        res.status(204).end();
    });
    // Restore deleted document
    router.post('/documents/:id/restore', async (req, res) => {
        const { id } = req.params;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        if (document.status !== 'deleted') {
            throw new ApiError(400, 'not_deleted', 'Document is not deleted');
        }
        const restored = await prisma.fileAsset.update({
            where: { id },
            data: { status: 'active' },
            include: {
                uploader: {
                    select: { id: true, name: true, email: true }
                },
                company: {
                    select: { id: true, name: true }
                },
                category: {
                    select: { id: true, name: true, color: true }
                }
            }
        });
        res.json(restored);
    });
    // Document Categories
    // List categories
    router.get('/documents/categories', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const where = { tenantId: req.tenantId };
        if (companyId)
            where.companyId = companyId;
        const categories = await prisma.documentCategory.findMany({
            where,
            include: {
                _count: {
                    select: { documents: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    });
    // Create category
    router.post('/documents/categories', validateBody(schemas.documentCategoryCreate), async (req, res) => {
        const { name, description, color, companyId } = req.body;
        // Check if category already exists
        const existing = await prisma.documentCategory.findFirst({
            where: {
                tenantId: req.tenantId,
                name,
                companyId: companyId || null
            }
        });
        if (existing) {
            throw new ApiError(400, 'category_exists', 'Category with this name already exists');
        }
        const category = await prisma.documentCategory.create({
            data: {
                tenantId: req.tenantId,
                name,
                description,
                color,
                companyId: companyId || null
            }
        });
        res.status(201).json(category);
    });
    // Update category
    router.put('/documents/categories/:id', validateBody(schemas.documentCategoryUpdate), async (req, res) => {
        const { id } = req.params;
        const { name, description, color } = req.body;
        const category = await prisma.documentCategory.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!category) {
            throw new ApiError(404, 'category_not_found', 'Category not found');
        }
        const updated = await prisma.documentCategory.update({
            where: { id },
            data: { name, description, color }
        });
        res.json(updated);
    });
    // Delete category
    router.delete('/documents/categories/:id', async (req, res) => {
        const { id } = req.params;
        // Check if category has documents
        const hasDocuments = await prisma.fileAsset.findFirst({
            where: { categoryId: id, tenantId: req.tenantId }
        });
        if (hasDocuments) {
            throw new ApiError(400, 'category_in_use', 'Cannot delete category that has documents');
        }
        await prisma.documentCategory.delete({
            where: { id, tenantId: req.tenantId }
        });
        res.status(204).end();
    });
    // Document Statistics & Analytics
    // Get detailed analytics
    router.get('/documents/analytics', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const period = String(req.query.period || '30d'); // 7d, 30d, 90d, 1y
        const where = { tenantId: req.tenantId };
        if (companyId)
            where.companyId = companyId;
        // Calculate date range
        const now = new Date();
        let startDate = new Date();
        switch (period) {
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }
        where.uploadedAt = { gte: startDate };
        // Get upload trends
        const uploadTrends = await prisma.fileAsset.groupBy({
            by: ['uploadedAt'],
            where: { ...where, status: 'active' },
            _count: { id: true },
            _sum: { sizeBytes: true },
            orderBy: { uploadedAt: 'asc' }
        });
        // Get category distribution
        const categoryDistribution = await prisma.fileAsset.groupBy({
            by: ['categoryId'],
            where: { ...where, status: 'active' },
            _count: { id: true },
            _sum: { sizeBytes: true }
        });
        // Get file type distribution
        const fileTypeDistribution = await prisma.fileAsset.groupBy({
            by: ['mimeType'],
            where: { ...where, status: 'active' },
            _count: { id: true },
            _sum: { sizeBytes: true }
        });
        // Get user activity
        const userActivity = await prisma.fileAsset.groupBy({
            by: ['uploaderId'],
            where: { ...where, status: 'active' },
            _count: { id: true },
            _sum: { sizeBytes: true }
        });
        // Get workflow statistics
        const workflowStats = await prisma.documentWorkflow.groupBy({
            by: ['status'],
            where: {
                ...where,
                status: { in: ['pending', 'in_progress', 'approved', 'rejected', 'completed'] }
            },
            _count: { id: true }
        });
        res.json({
            period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            uploadTrends: uploadTrends.map(trend => ({
                date: trend.uploadedAt?.toISOString?.().split('T')[0] ?? null,
                count: trend._count?.id ?? 0,
                size: trend._sum?.sizeBytes ?? 0
            })),
            categoryDistribution: categoryDistribution.map(cat => ({
                categoryId: cat.categoryId,
                count: cat._count?.id ?? 0,
                size: cat._sum?.sizeBytes ?? 0
            })),
            fileTypeDistribution: fileTypeDistribution.map(type => ({
                mimeType: type.mimeType,
                count: type._count?.id ?? 0,
                size: type._sum?.sizeBytes ?? 0
            })),
            userActivity: userActivity.map(user => ({
                userId: user.uploaderId,
                count: user._count?.id ?? 0,
                size: user._sum?.sizeBytes ?? 0
            })),
            workflowStats: workflowStats.map(workflow => ({
                status: workflow.status,
                count: workflow._count?.id ?? 0
            }))
        });
    });
    // Get storage usage report
    router.get('/documents/storage-report', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const where = { tenantId: req.tenantId };
        if (companyId)
            where.companyId = companyId;
        // Get storage by category
        const storageByCategory = await prisma.fileAsset.groupBy({
            by: ['categoryId'],
            where: { ...where, status: 'active' },
            _count: { id: true },
            _sum: { sizeBytes: true }
        });
        // Get storage by workspace
        const storageByWorkspace = await prisma.fileAsset.groupBy({
            by: ['workspaceId'],
            where: { ...where, status: 'active' },
            _count: { id: true },
            _sum: { sizeBytes: true }
        });
        // Get storage by file type
        const storageByFileType = await prisma.fileAsset.groupBy({
            by: ['mimeType'],
            where: { ...where, status: 'active' },
            _count: { id: true },
            _sum: { sizeBytes: true }
        });
        // Get largest files
        const largestFiles = await prisma.fileAsset.findMany({
            where: { ...where, status: 'active' },
            select: {
                id: true,
                name: true,
                displayName: true,
                sizeBytes: true,
                mimeType: true,
                categoryId: true,
                uploadedAt: true
            },
            orderBy: { sizeBytes: 'desc' },
            take: 20
        });
        // Calculate totals (guard optional aggregate fields)
        const totalStorage = storageByCategory.reduce((sum, cat) => sum + (cat._sum?.sizeBytes ?? 0), 0);
        const totalFiles = storageByCategory.reduce((sum, cat) => sum + (cat._count?.id ?? 0), 0);
        res.json({
            totalStorage,
            totalFiles,
            storageByCategory: storageByCategory.map(cat => ({
                categoryId: cat.categoryId,
                count: cat._count?.id ?? 0,
                size: cat._sum?.sizeBytes ?? 0,
                percentage: totalStorage > 0 ? ((cat._sum?.sizeBytes ?? 0) / totalStorage * 100).toFixed(2) : '0'
            })),
            storageByWorkspace: storageByWorkspace.map(ws => ({
                workspaceId: ws.workspaceId,
                count: ws._count?.id ?? 0,
                size: ws._sum?.sizeBytes ?? 0,
                percentage: totalStorage > 0 ? ((ws._sum?.sizeBytes ?? 0) / totalStorage * 100).toFixed(2) : '0'
            })),
            storageByFileType: storageByFileType.map(type => ({
                mimeType: type.mimeType,
                count: type._count?.id ?? 0,
                size: type._sum?.sizeBytes ?? 0,
                percentage: totalStorage > 0 ? ((type._sum?.sizeBytes ?? 0) / totalStorage * 100).toFixed(2) : '0'
            })),
            largestFiles: largestFiles.map(file => ({
                ...file,
                sizeMB: (file.sizeBytes / (1024 * 1024)).toFixed(2)
            }))
        });
    });
    // Recent activity
    router.get('/documents/activity', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const limit = parseInt(String(req.query.limit || '10'));
        const where = { tenantId: req.tenantId };
        if (companyId)
            where.companyId = companyId;
        const activities = await prisma.documentActivity.findMany({
            where,
            include: {
                document: {
                    select: { id: true, name: true, displayName: true }
                },
                user: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
        res.json(activities);
    });
    // Document Sharing & Collaboration
    // Share document with user
    router.post('/documents/:id/share', async (req, res) => {
        const { id } = req.params;
        const { userId, permissions, expiresAt } = req.body;
        // Validate document exists
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Validate user exists
        const user = await prisma.appUser.findFirst({
            where: { id: userId, tenantId: req.tenantId }
        });
        if (!user) {
            throw new ApiError(400, 'invalid_user', 'User not found');
        }
        // Check if already shared
        const existingShare = await prisma.documentShare.findFirst({
            where: {
                documentId: id,
                sharedWith: userId,
                status: 'active'
            }
        });
        if (existingShare) {
            throw new ApiError(400, 'already_shared', 'Document already shared with this user');
        }
        // Create share
        const share = await prisma.documentShare.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                sharedWith: userId,
                permissions: permissions || 'read',
                expiresAt: expiresAt ? new Date(expiresAt) : null
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                document: {
                    select: { id: true, name: true, displayName: true }
                }
            }
        });
        // Log activity
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                userId: req.user.id,
                action: 'shared',
                details: `Shared with ${user.name} (${permissions || 'read'} permissions)`
            }
        });
        res.status(201).json(share);
    });
    // List document shares
    router.get('/documents/:id/shares', async (req, res) => {
        const { id } = req.params;
        const shares = await prisma.documentShare.findMany({
            where: {
                documentId: id,
                tenantId: req.tenantId,
                status: 'active'
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { sharedAt: 'desc' }
        });
        res.json(shares);
    });
    // Update share permissions
    router.put('/documents/shares/:shareId', async (req, res) => {
        const { shareId } = req.params;
        const { permissions, expiresAt } = req.body;
        const share = await prisma.documentShare.findFirst({
            where: { id: shareId, tenantId: req.tenantId }
        });
        if (!share) {
            throw new ApiError(404, 'share_not_found', 'Share not found');
        }
        const updated = await prisma.documentShare.update({
            where: { id: shareId },
            data: {
                permissions: permissions || share.permissions,
                expiresAt: expiresAt ? new Date(expiresAt) : share.expiresAt
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
        res.json(updated);
    });
    // Revoke document share
    router.delete('/documents/shares/:shareId', async (req, res) => {
        const { shareId } = req.params;
        const share = await prisma.documentShare.findFirst({
            where: { id: shareId, tenantId: req.tenantId }
        });
        if (!share) {
            throw new ApiError(404, 'share_not_found', 'Share not found');
        }
        await prisma.documentShare.update({
            where: { id: shareId },
            data: { status: 'revoked' }
        });
        // Log activity
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: share.companyId,
                documentId: share.documentId,
                userId: req.user.id,
                action: 'share_revoked',
                details: 'Share access revoked'
            }
        });
        res.status(204).end();
    });
    // Document Workflows & Approval
    // Create approval workflow
    router.post('/documents/:id/workflows', async (req, res) => {
        const { id } = req.params;
        const { workflowType, assignedTo, comments } = req.body;
        // Validate document exists
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Validate assigned user exists
        const user = await prisma.appUser.findFirst({
            where: { id: assignedTo, tenantId: req.tenantId }
        });
        if (!user) {
            throw new ApiError(400, 'invalid_user', 'Assigned user not found');
        }
        // Check for existing active workflow
        const existingWorkflow = await prisma.documentWorkflow.findFirst({
            where: {
                documentId: id,
                status: 'pending',
                tenantId: req.tenantId
            }
        });
        if (existingWorkflow) {
            throw new ApiError(400, 'workflow_exists', 'Document already has an active workflow');
        }
        // Create workflow
        const workflow = await prisma.documentWorkflow.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                workflowType: workflowType || 'approval',
                assignedTo,
                comments: comments || null
            },
            include: {
                assignedUser: {
                    select: { id: true, name: true, email: true }
                },
                document: {
                    select: { id: true, name: true, displayName: true }
                }
            }
        });
        // Log activity
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                userId: req.user.id,
                action: 'workflow_created',
                details: `${workflowType || 'approval'} workflow assigned to ${user.name}`
            }
        });
        res.status(201).json(workflow);
    });
    // Update workflow status
    router.put('/documents/workflows/:workflowId', async (req, res) => {
        const { workflowId } = req.params;
        const { status, comments } = req.body;
        const workflow = await prisma.documentWorkflow.findFirst({
            where: { id: workflowId, tenantId: req.tenantId }
        });
        if (!workflow) {
            throw new ApiError(404, 'workflow_not_found', 'Workflow not found');
        }
        // Only assigned user or admin can update workflow
        if (workflow.assignedTo !== req.user.id &&
            !req.user.roles?.includes('admin')) {
            throw new ApiError(403, 'unauthorized', 'Only assigned user or admin can update workflow');
        }
        const updated = await prisma.documentWorkflow.update({
            where: { id: workflowId },
            data: {
                status: status || workflow.status,
                comments: comments || workflow.comments,
                completedAt: status === 'completed' || status === 'approved' || status === 'rejected'
                    ? new Date()
                    : workflow.completedAt
            },
            include: {
                assignedUser: {
                    select: { id: true, name: true, email: true }
                },
                document: {
                    select: { id: true, name: true, displayName: true }
                }
            }
        });
        // Log activity
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: workflow.companyId,
                documentId: workflow.documentId,
                userId: req.user.id,
                action: 'workflow_updated',
                details: `Workflow status changed to ${status}`
            }
        });
        res.json(updated);
    });
    // Document Version Control
    // Create new version
    router.post('/documents/:id/versions', async (req, res) => {
        const { id } = req.params;
        const { versionNotes } = req.body;
        // Get current document
        const currentDoc = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!currentDoc) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Use multer for new file upload
        const multer = createMulter(req.tenantId, currentDoc.companyId || '');
        multer.single('file')(req, res, async (err) => {
            if (err) {
                throw new ApiError(400, 'upload_error', 'File upload failed');
            }
            const file = req.file;
            if (!file) {
                throw new ApiError(400, 'no_file', 'No file provided');
            }
            // Create new version
            const newVersion = await prisma.fileAsset.create({
                data: {
                    tenantId: req.tenantId,
                    companyId: currentDoc.companyId,
                    workspaceId: currentDoc.workspaceId,
                    categoryId: currentDoc.categoryId,
                    uploaderId: req.user.id,
                    name: file.originalname,
                    displayName: currentDoc.displayName,
                    description: currentDoc.description,
                    mimeType: file.mimetype,
                    sizeBytes: file.size,
                    storageKey: file.filename,
                    status: 'active',
                    version: (currentDoc.version || 1) + 1
                },
                include: {
                    uploader: {
                        select: { id: true, name: true, email: true }
                    },
                    company: {
                        select: { id: true, name: true }
                    },
                    category: {
                        select: { id: true, name: true, color: true }
                    }
                }
            });
            // Archive old version
            await prisma.fileAsset.update({
                where: { id },
                data: { status: 'archived' }
            });
            // Log activity
            await prisma.documentActivity.create({
                data: {
                    tenantId: req.tenantId,
                    companyId: currentDoc.companyId,
                    documentId: newVersion.id,
                    userId: req.user.id,
                    action: 'version_created',
                    details: `New version ${newVersion.version} created${versionNotes ? `: ${versionNotes}` : ''}`
                }
            });
            res.status(201).json(newVersion);
        });
    });
    // Get document versions
    router.get('/documents/:id/versions', async (req, res) => {
        const { id } = req.params;
        // Get current document to find related versions
        const currentDoc = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!currentDoc) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Find all versions of this document (by name and category)
        const versions = await prisma.fileAsset.findMany({
            where: {
                tenantId: req.tenantId,
                name: currentDoc.name,
                categoryId: currentDoc.categoryId,
                status: { in: ['active', 'archived'] }
            },
            include: {
                uploader: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { version: 'desc' }
        });
        res.json(versions);
    });
    // Advanced Search & Filtering
    // Full-text search with filters
    router.get('/documents/search', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const query = String(req.query.q || '');
        const categoryId = String(req.query.categoryId || '');
        const workspaceId = String(req.query.workspaceId || '');
        const uploaderId = String(req.query.uploaderId || '');
        const dateFrom = String(req.query.dateFrom || '');
        const dateTo = String(req.query.dateTo || '');
        const mimeType = String(req.query.mimeType || '');
        const sizeMin = parseInt(String(req.query.sizeMin || '0'));
        const sizeMax = parseInt(String(req.query.sizeMax || '999999999'));
        const page = parseInt(String(req.query.page || '1'));
        const limit = parseInt(String(req.query.limit || '20'));
        const offset = (page - 1) * limit;
        const where = {
            tenantId: req.tenantId,
            status: 'active'
        };
        if (companyId)
            where.companyId = companyId;
        if (categoryId)
            where.categoryId = categoryId;
        if (workspaceId)
            where.workspaceId = workspaceId;
        if (uploaderId)
            where.uploaderId = uploaderId;
        if (mimeType)
            where.mimeType = { contains: mimeType };
        if (sizeMin > 0 || sizeMax < 999999999) {
            where.sizeBytes = {};
            if (sizeMin > 0)
                where.sizeBytes.gte = sizeMin;
            if (sizeMax < 999999999)
                where.sizeBytes.lte = sizeMax;
        }
        // Date range filter
        if (dateFrom || dateTo) {
            where.uploadedAt = {};
            if (dateFrom)
                where.uploadedAt.gte = new Date(dateFrom);
            if (dateTo)
                where.uploadedAt.lte = new Date(dateTo);
        }
        // Full-text search
        if (query) {
            where.OR = [
                { name: { contains: query } },
                { displayName: { contains: query } },
                { description: { contains: query } }
            ];
        }
        const [documents, total] = await Promise.all([
            prisma.fileAsset.findMany({
                where,
                include: {
                    uploader: {
                        select: { id: true, name: true, email: true }
                    },
                    company: {
                        select: { id: true, name: true }
                    },
                    category: {
                        select: { id: true, name: true, color: true }
                    },
                    workspace: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { uploadedAt: 'desc' },
                skip: offset,
                take: limit
            }),
            prisma.fileAsset.count({ where })
        ]);
        res.json({
            documents,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            filters: {
                query,
                categoryId,
                workspaceId,
                uploaderId,
                dateFrom,
                dateTo,
                mimeType,
                sizeMin,
                sizeMax
            }
        });
    });
    // Bulk Operations
    // Bulk update documents
    router.put('/documents/bulk', async (req, res) => {
        const { documentIds, updates } = req.body;
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            throw new ApiError(400, 'invalid_ids', 'Document IDs array is required');
        }
        if (!updates || typeof updates !== 'object') {
            throw new ApiError(400, 'invalid_updates', 'Updates object is required');
        }
        // Validate all documents exist and belong to tenant
        const documents = await prisma.fileAsset.findMany({
            where: {
                id: { in: documentIds },
                tenantId: req.tenantId
            }
        });
        if (documents.length !== documentIds.length) {
            throw new ApiError(400, 'invalid_documents', 'Some documents not found or access denied');
        }
        // Bulk update
        const updated = await prisma.fileAsset.updateMany({
            where: {
                id: { in: documentIds },
                tenantId: req.tenantId
            },
            data: updates
        });
        // Log bulk activity
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: documents[0]?.companyId,
                documentId: documents[0]?.id,
                userId: req.user.id,
                action: 'bulk_update',
                details: `Bulk updated ${documents.length} documents`
            }
        });
        res.json({
            message: `Successfully updated ${updated.count} documents`,
            updatedCount: updated.count
        });
    });
    // Bulk delete documents
    router.delete('/documents/bulk', async (req, res) => {
        const { documentIds } = req.body;
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            throw new ApiError(400, 'invalid_ids', 'Document IDs array is required');
        }
        // Validate all documents exist and belong to tenant
        const documents = await prisma.fileAsset.findMany({
            where: {
                id: { in: documentIds },
                tenantId: req.tenantId
            }
        });
        if (documents.length !== documentIds.length) {
            throw new ApiError(400, 'invalid_documents', 'Some documents not found or access denied');
        }
        // Bulk soft delete
        const deleted = await prisma.fileAsset.updateMany({
            where: {
                id: { in: documentIds },
                tenantId: req.tenantId
            },
            data: { status: 'deleted' }
        });
        // Log bulk activity
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: documents[0]?.companyId,
                documentId: documents[0]?.id,
                userId: req.user.id,
                action: 'bulk_delete',
                details: `Bulk deleted ${documents.length} documents`
            }
        });
        res.json({
            message: `Successfully deleted ${deleted.count} documents`,
            deletedCount: deleted.count
        });
    });
    // Phase 3: AI-Powered Features & Advanced Intelligence
    // AI Document Analysis
    router.post('/documents/:id/analyze', async (req, res) => {
        const { id } = req.params;
        const { analysisType = 'full' } = req.body; // full, ocr, classification, sentiment
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Check if document is already being analyzed
        const existingAnalysis = await prisma.documentActivity.findFirst({
            where: {
                documentId: id,
                action: 'ai_analysis_started',
                createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
            }
        });
        if (existingAnalysis) {
            throw new ApiError(400, 'analysis_in_progress', 'Document analysis already in progress');
        }
        // Log analysis start
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                userId: req.user.id,
                action: 'ai_analysis_started',
                details: `AI analysis started: ${analysisType}`
            }
        });
        // Queue AI analysis job
        try {
            const { enqueueAiJob } = await import('./queue');
            await enqueueAiJob('document-analysis', {
                documentId: id,
                tenantId: req.tenantId,
                companyId: document.companyId,
                analysisType,
                userId: req.user.id
            }, {
                delay: 1000, // 1 second delay
                attempts: 3,
                backoff: 'exponential'
            });
        }
        catch (error) {
            console.error('Failed to queue AI analysis job:', error);
        }
        res.json({
            message: 'AI analysis started',
            analysisId: `analysis_${Date.now()}`,
            status: 'queued',
            estimatedTime: '2-5 minutes'
        });
    });
    // Get AI Analysis Results
    router.get('/documents/:id/analysis', async (req, res) => {
        const { id } = req.params;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Get analysis activities
        const analysisActivities = await prisma.documentActivity.findMany({
            where: {
                documentId: id,
                action: { in: ['ai_analysis_started', 'ai_analysis_completed', 'ai_analysis_failed'] },
                tenantId: req.tenantId
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        // Get latest analysis result
        const latestAnalysis = analysisActivities.find(a => a.action === 'ai_analysis_completed');
        if (!latestAnalysis) {
            // Check if analysis is in progress
            const inProgress = analysisActivities.find(a => a.action === 'ai_analysis_started' &&
                a.createdAt > new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
            );
            if (inProgress) {
                return res.json({
                    status: 'in_progress',
                    message: 'AI analysis is currently running',
                    startedAt: inProgress.createdAt,
                    estimatedCompletion: new Date(inProgress.createdAt.getTime() + 5 * 60 * 1000)
                });
            }
            return res.json({
                status: 'not_started',
                message: 'No AI analysis has been performed on this document'
            });
        }
        // Parse analysis details from the latest completed analysis
        let analysisData;
        try {
            analysisData = JSON.parse(latestAnalysis.details || '{}');
        }
        catch {
            analysisData = { rawDetails: latestAnalysis.details };
        }
        res.json({
            status: 'completed',
            completedAt: latestAnalysis.createdAt,
            analysisData,
            history: analysisActivities.map(activity => ({
                action: activity.action,
                timestamp: activity.createdAt,
                details: activity.details
            }))
        });
    });
    // AI Document Classification
    router.post('/documents/:id/classify', async (req, res) => {
        const { id } = req.params;
        const { suggestedCategory, suggestedWorkspace, confidence, tags } = req.body;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Validate suggested category if provided
        if (suggestedCategory) {
            const category = await prisma.documentCategory.findFirst({
                where: { id: suggestedCategory, tenantId: req.tenantId }
            });
            if (!category) {
                throw new ApiError(400, 'invalid_category', 'Suggested category not found');
            }
        }
        // Validate suggested workspace if provided
        if (suggestedWorkspace) {
            const workspace = await prisma.workspace.findFirst({
                where: { id: suggestedWorkspace, tenantId: req.tenantId }
            });
            if (!workspace) {
                throw new ApiError(400, 'invalid_workspace', 'Suggested workspace not found');
            }
        }
        // Update document with AI suggestions
        const updated = await prisma.fileAsset.update({
            where: { id },
            data: {
                categoryId: suggestedCategory || document.categoryId,
                workspaceId: suggestedWorkspace || document.workspaceId,
                // Store AI metadata as JSON in description or create a separate field
                description: document.description ?
                    `${document.description}\n\nAI Suggestions:\n- Category: ${suggestedCategory || 'None'}\n- Workspace: ${suggestedWorkspace || 'None'}\n- Confidence: ${confidence || 'Unknown'}\n- Tags: ${tags?.join(', ') || 'None'}` :
                    `AI Suggestions:\n- Category: ${suggestedCategory || 'None'}\n- Workspace: ${suggestedWorkspace || 'None'}\n- Confidence: ${confidence || 'Unknown'}\n- Tags: ${tags?.join(', ') || 'None'}`
            },
            include: {
                uploader: {
                    select: { id: true, name: true, email: true }
                },
                company: {
                    select: { id: true, name: true }
                },
                category: {
                    select: { id: true, name: true, color: true }
                }
            }
        });
        // Log AI classification
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                userId: req.user.id,
                action: 'ai_classification_applied',
                details: `AI classification applied: Category=${suggestedCategory || 'None'}, Workspace=${suggestedWorkspace || 'None'}, Confidence=${confidence || 'Unknown'}`
            }
        });
        res.json(updated);
    });
    // AI Document Templates
    router.post('/documents/templates', async (req, res) => {
        const { name, description, categoryId, workspaceId, templateType, metadata } = req.body;
        // Validate category if provided
        if (categoryId) {
            const category = await prisma.documentCategory.findFirst({
                where: { id: categoryId, tenantId: req.tenantId }
            });
            if (!category) {
                throw new ApiError(400, 'invalid_category', 'Category not found');
            }
        }
        // Validate workspace if provided
        if (workspaceId) {
            const workspace = await prisma.workspace.findFirst({
                where: { id: workspaceId, tenantId: req.tenantId }
            });
            if (!workspace) {
                throw new ApiError(400, 'invalid_workspace', 'Workspace not found');
            }
        }
        // Create template document
        const template = await prisma.fileAsset.create({
            data: {
                tenantId: req.tenantId,
                companyId: null, // Templates are tenant-wide
                workspaceId: workspaceId || null,
                categoryId: categoryId || null,
                uploaderId: req.user.id,
                name: `Template: ${name}`,
                displayName: name,
                description: description || null,
                mimeType: 'application/template',
                sizeBytes: 0,
                storageKey: `template_${Date.now()}`,
                status: 'template',
                isPublic: true // Templates are public within tenant
            },
            include: {
                uploader: {
                    select: { id: true, name: true, email: true }
                },
                category: {
                    select: { id: true, name: true, color: true }
                }
            }
        });
        // Log template creation
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: null,
                documentId: template.id,
                userId: req.user.id,
                action: 'template_created',
                details: `Template created: ${name} (${templateType})`
            }
        });
        res.status(201).json(template);
    });
    // List Document Templates
    router.get('/documents/templates', async (req, res) => {
        const categoryId = String(req.query.categoryId || '');
        const templateType = String(req.query.templateType || '');
        const where = {
            tenantId: req.tenantId,
            status: 'template'
        };
        if (categoryId)
            where.categoryId = categoryId;
        if (templateType)
            where.templateType = templateType;
        const templates = await prisma.fileAsset.findMany({
            where,
            include: {
                uploader: {
                    select: { id: true, name: true, email: true }
                },
                category: {
                    select: { id: true, name: true, color: true }
                }
            },
            orderBy: { uploadedAt: 'desc' }
        });
        res.json(templates);
    });
    // AI Document Search & Discovery
    router.get('/documents/ai-search', async (req, res) => {
        const { query, semanticSearch = 'true', filters, page = '1', limit = '20' } = req.query;
        if (!query || typeof query !== 'string') {
            throw new ApiError(400, 'missing_query', 'Search query is required');
        }
        const pageNum = parseInt(String(page));
        const limitNum = parseInt(String(limit));
        const offset = (pageNum - 1) * limitNum;
        // Basic search (existing functionality)
        const basicWhere = {
            tenantId: req.tenantId,
            status: 'active'
        };
        if (filters) {
            try {
                const filterObj = JSON.parse(String(filters));
                Object.assign(basicWhere, filterObj);
            }
            catch (e) {
                // Ignore invalid filters
            }
        }
        // Semantic search placeholder (in production, integrate with vector DB)
        if (semanticSearch === 'true') {
            // For now, enhance basic search with AI-powered ranking
            // In production, this would use embeddings and vector similarity
            basicWhere.OR = [
                { name: { contains: query } },
                { displayName: { contains: query } },
                { description: { contains: query } }
            ];
        }
        const [documents, total] = await Promise.all([
            prisma.fileAsset.findMany({
                where: basicWhere,
                include: {
                    uploader: {
                        select: { id: true, name: true, email: true }
                    },
                    company: {
                        select: { id: true, name: true }
                    },
                    category: {
                        select: { id: true, name: true, color: true }
                    }
                },
                orderBy: { uploadedAt: 'desc' },
                skip: offset,
                take: limitNum
            }),
            prisma.fileAsset.count({ where: basicWhere })
        ]);
        // AI-powered relevance scoring (placeholder)
        const scoredDocuments = documents.map((doc, index) => ({
            ...doc,
            relevanceScore: Math.max(0.1, 1 - (index * 0.1)), // Simple scoring for demo
            aiInsights: {
                suggestedTags: [query.toLowerCase(), doc.mimeType?.split('/')[1] || 'file'],
                confidence: Math.random() * 0.5 + 0.5
            }
        }));
        res.json({
            documents: scoredDocuments,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            searchMetadata: {
                query,
                semanticSearch: semanticSearch === 'true',
                aiEnhanced: true,
                suggestedQueries: [
                    `${query} documents`,
                    `${query} files`,
                    `recent ${query}`,
                    `${query} templates`
                ]
            }
        });
    });
    // AI Document Insights & Recommendations
    router.get('/documents/:id/insights', async (req, res) => {
        const { id } = req.params;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Get document activity for insights
        const activities = await prisma.documentActivity.findMany({
            where: {
                documentId: id,
                tenantId: req.tenantId,
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            },
            orderBy: { createdAt: 'desc' }
        });
        // Get similar documents
        const similarDocuments = await prisma.fileAsset.findMany({
            where: {
                tenantId: req.tenantId,
                status: 'active',
                categoryId: document.categoryId,
                mimeType: document.mimeType,
                id: { not: id }
            },
            take: 5,
            orderBy: { uploadedAt: 'desc' }
        });
        // Generate AI insights
        const insights = {
            documentId: id,
            analysis: {
                fileType: document.mimeType,
                size: document.sizeBytes,
                age: Math.floor((Date.now() - document.uploadedAt.getTime()) / (1000 * 60 * 60 * 24)),
                activityLevel: activities.length
            },
            recommendations: {
                suggestedTags: [
                    document.mimeType?.split('/')[1] || 'file',
                    document.categoryId ? 'categorized' : 'uncategorized',
                    document.workspaceId ? 'workspace' : 'no-workspace'
                ],
                suggestedActions: [
                    activities.length === 0 ? 'Share with team members' : null,
                    !document.categoryId ? 'Assign to category' : null,
                    !document.workspaceId ? 'Move to workspace' : null
                ].filter(Boolean),
                optimization: {
                    storage: document.sizeBytes > 10 * 1024 * 1024 ? 'Consider compression' : 'Size is optimal',
                    organization: !document.categoryId || !document.workspaceId ? 'Improve organization' : 'Well organized'
                }
            },
            similarDocuments: similarDocuments.map(doc => ({
                id: doc.id,
                name: doc.displayName || doc.name,
                similarity: 'category_and_type',
                relevance: Math.random() * 0.5 + 0.5
            })),
            trends: {
                uploadFrequency: activities.filter(a => a.action === 'uploaded').length,
                accessPattern: activities.map(a => a.action).slice(0, 10),
                collaboration: activities.filter(a => a.action.includes('share')).length
            }
        };
        res.json(insights);
    });
    // AI Document Automation
    router.post('/documents/automate', async (req, res) => {
        const { automationType, rules, documents, schedule } = req.body;
        if (!automationType || !rules || !Array.isArray(documents) || documents.length === 0) {
            throw new ApiError(400, 'invalid_automation', 'Automation type, rules, and documents are required');
        }
        // Validate all documents exist and belong to tenant
        const documentList = await prisma.fileAsset.findMany({
            where: {
                id: { in: documents },
                tenantId: req.tenantId
            }
        });
        if (documentList.length !== documents.length) {
            throw new ApiError(400, 'invalid_documents', 'Some documents not found or access denied');
        }
        // Create automation job
        try {
            const { enqueueAiJob } = await import('./queue');
            const jobId = await enqueueAiJob('document-automation', {
                automationType,
                rules,
                documents: documentList.map(d => ({ id: d.id, name: d.name, categoryId: d.categoryId })),
                tenantId: req.tenantId,
                userId: req.user.id,
                schedule: schedule || 'immediate'
            }, {
                delay: schedule === 'immediate' ? 1000 : 0,
                attempts: 3,
                backoff: 'exponential'
            });
            // Log automation creation
            await prisma.documentActivity.create({
                data: {
                    tenantId: req.tenantId,
                    companyId: documentList[0]?.companyId,
                    documentId: documentList[0]?.id,
                    userId: req.user.id,
                    action: 'automation_created',
                    details: `Automation created: ${automationType} for ${documents.length} documents`
                }
            });
            res.json({
                message: 'Automation job created successfully',
                jobId,
                automationType,
                documentCount: documents.length,
                status: 'queued'
            });
        }
        catch (error) {
            console.error('Failed to create automation job:', error);
            throw new ApiError(500, 'automation_failed', 'Failed to create automation job');
        }
    });
    // Get Automation Status
    router.get('/documents/automations', async (req, res) => {
        const { status, automationType, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(String(page));
        const limitNum = parseInt(String(limit));
        const offset = (pageNum - 1) * limitNum;
        const where = {
            tenantId: req.tenantId,
            action: { in: ['automation_created', 'automation_completed', 'automation_failed'] }
        };
        if (status)
            where.action = status;
        if (automationType)
            where.details = { contains: automationType };
        const [automations, total] = await Promise.all([
            prisma.documentActivity.findMany({
                where,
                include: {
                    document: {
                        select: { id: true, name: true, displayName: true }
                    },
                    user: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limitNum
            }),
            prisma.documentActivity.count({ where })
        ]);
        res.json({
            automations,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    });
    // Phase 4: Enterprise Integration & Advanced Workflows
    // Enterprise Security - Advanced Access Controls
    router.post('/documents/:id/access-controls', validateBody(schemas.accessControlCreate), async (req, res) => {
        const { id } = req.params;
        const { accessLevel, userGroups, timeRestrictions, ipRestrictions, mfaRequired } = req.body;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Create access control record
        const accessControl = await prisma.documentAccessControl.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                accessLevel,
                userGroups,
                timeRestrictions,
                ipRestrictions,
                mfaRequired,
                createdBy: req.user.id
            }
        });
        // Log access control creation
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                userId: req.user.id,
                action: 'access_control_created',
                details: `Access control created: ${accessLevel}`
            }
        });
        res.status(201).json(accessControl);
    });
    // Audit Logging & Compliance Monitoring
    router.get('/documents/:id/audit-log', async (req, res) => {
        const { id } = req.params;
        const { startDate, endDate, actions, users } = req.query;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Build audit log query
        const where = {
            documentId: id,
            tenantId: req.tenantId
        };
        if (startDate) {
            where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
        }
        if (endDate) {
            where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
        }
        if (actions) {
            where.action = { in: actions.split(',') };
        }
        if (users) {
            where.userId = { in: users.split(',') };
        }
        const auditLog = await prisma.documentActivity.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            documentId: id,
            totalEntries: auditLog.length,
            auditLog
        });
    });
    // System Integrations - Webhooks
    router.post('/documents/:id/webhooks', validateBody(schemas.webhookCreate), async (req, res) => {
        const { id } = req.params;
        const { url, events, headers, retryPolicy, isActive } = req.body;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Create webhook configuration
        const webhook = await prisma.documentWebhook.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                url,
                events,
                headers,
                retryPolicy,
                isActive: isActive ?? true,
                createdBy: req.user.id
            }
        });
        // Log webhook creation
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                userId: req.user.id,
                action: 'webhook_created',
                details: `Webhook created for ${events.join(', ')} events`
            }
        });
        res.status(201).json(webhook);
    });
    // Webhook delivery status
    router.get('/documents/:id/webhooks/:webhookId/deliveries', async (req, res) => {
        const { id, webhookId } = req.params;
        const deliveries = await prisma.webhookDelivery.findMany({
            where: {
                webhookId,
                documentId: id,
                tenantId: req.tenantId
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({
            webhookId,
            documentId: id,
            totalDeliveries: deliveries.length,
            deliveries
        });
    });
    // Advanced Analytics - Business Intelligence
    router.get('/documents/analytics/business-intelligence', async (req, res) => {
        const { startDate, endDate, groupBy } = req.query;
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const end = endDate ? new Date(endDate) : new Date();
        // Document volume trends
        const volumeTrends = await prisma.$queryRaw `
      SELECT 
        DATE(uploaded_at) as date,
        COUNT(*) as document_count,
        SUM(size_bytes) as total_size
      FROM FileAsset 
      WHERE tenant_id = ${req.tenantId} 
        AND uploaded_at BETWEEN ${start} AND ${end}
      GROUP BY DATE(uploaded_at)
      ORDER BY date
    `;
        // User activity patterns
        const userActivity = await prisma.documentActivity.groupBy({
            by: ['userId', 'action'],
            where: {
                tenantId: req.tenantId,
                createdAt: { gte: start, lte: end }
            },
            _count: { action: true }
        });
        // Category distribution
        const categoryDistribution = await prisma.fileAsset.groupBy({
            by: ['categoryId'],
            where: {
                tenantId: req.tenantId,
                uploadedAt: { gte: start, lte: end }
            },
            _count: { id: true }
        });
        // Storage utilization
        const storageMetrics = await prisma.fileAsset.aggregate({
            where: {
                tenantId: req.tenantId,
                uploadedAt: { gte: start, lte: end }
            },
            _sum: { sizeBytes: true },
            _avg: { sizeBytes: true },
            _count: { id: true }
        });
        res.json({
            period: { start, end },
            volumeTrends,
            userActivity,
            categoryDistribution,
            storageMetrics: {
                totalSize: storageMetrics._sum?.sizeBytes ?? 0,
                averageSize: storageMetrics._avg?.sizeBytes ?? 0,
                totalDocuments: storageMetrics._count?.id ?? 0
            }
        });
    });
    // Performance Metrics & Predictive Insights
    router.get('/documents/analytics/performance', async (req, res) => {
        const { timeframe = '7d' } = req.query;
        let days = 7;
        if (timeframe === '30d')
            days = 30;
        else if (timeframe === '90d')
            days = 90;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        // Response time metrics
        const responseTimeMetrics = await prisma.documentActivity.groupBy({
            by: ['action'],
            where: {
                tenantId: req.tenantId,
                createdAt: { gte: startDate }
            },
            _count: { id: true }
        });
        // Workflow completion rates
        const workflowMetrics = await prisma.documentWorkflow.groupBy({
            by: ['status'],
            where: {
                tenantId: req.tenantId,
                assignedAt: { gte: startDate }
            },
            _count: { id: true }
        });
        // Storage growth prediction (simple linear regression)
        const storageGrowth = await prisma.$queryRaw `
      SELECT 
        AVG(daily_growth) as avg_daily_growth,
        STDDEV(daily_growth) as growth_volatility
      FROM (
        SELECT 
          date,
          total_size - LAG(total_size) OVER (ORDER BY date) as daily_growth
        FROM (
          SELECT 
            DATE(uploaded_at) as date,
            SUM(size_bytes) as total_size
          FROM FileAsset 
          WHERE tenant_id = ${req.tenantId} 
            AND uploaded_at >= ${startDate}
          GROUP BY DATE(uploaded_at)
        ) daily_totals
      ) growth_calc
    `;
        res.json({
            timeframe,
            responseTimeMetrics,
            workflowMetrics,
            storageGrowth,
            recommendations: [
                'Consider implementing document lifecycle policies for older files',
                'Monitor workflow bottlenecks for process optimization',
                'Review storage growth trends for capacity planning'
            ]
        });
    });
    // Advanced Document Workflows - Multi-step approval chains
    router.post('/documents/:id/workflows/advanced', validateBody(schemas.advancedWorkflowCreate), async (req, res) => {
        const { id } = req.params;
        const { steps, conditions, autoApproval, escalationRules } = req.body;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Create advanced workflow with multiple steps
        const workflow = await prisma.documentWorkflow.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                workflowType: 'advanced_approval',
                status: 'pending',
                assignedTo: steps[0]?.assignedTo || req.user.id,
                metadata: JSON.stringify({
                    steps,
                    conditions,
                    autoApproval,
                    escalationRules,
                    currentStep: 0,
                    stepHistory: []
                })
            }
        });
        // Log workflow creation
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                userId: req.user.id,
                action: 'advanced_workflow_created',
                details: `Advanced workflow created with ${steps.length} steps`
            }
        });
        res.status(201).json(workflow);
    });
    // Workflow step progression
    router.post('/documents/workflows/:workflowId/progress', validateBody(schemas.workflowStepProgress), async (req, res) => {
        const { workflowId } = req.params;
        const { action, comments, metadata } = req.body;
        const workflow = await prisma.documentWorkflow.findFirst({
            where: { id: workflowId, tenantId: req.tenantId }
        });
        if (!workflow) {
            throw new ApiError(404, 'workflow_not_found', 'Workflow not found');
        }
        const currentMetadata = workflow.metadata;
        const currentStep = currentMetadata.currentStep || 0;
        const steps = currentMetadata.steps || [];
        if (currentStep >= steps.length) {
            throw new ApiError(400, 'workflow_completed', 'Workflow is already completed');
        }
        // Process step action
        let newStatus = workflow.status;
        let nextStep = currentStep;
        if (action === 'approve') {
            if (currentStep === steps.length - 1) {
                newStatus = 'completed';
            }
            else {
                nextStep = currentStep + 1;
                const nextStepData = steps[nextStep];
                if (nextStepData) {
                    // Auto-assign to next approver
                    await prisma.documentWorkflow.update({
                        where: { id: workflowId },
                        data: {
                            assignedTo: nextStepData.assignedTo,
                            metadata: JSON.stringify({
                                ...currentMetadata,
                                currentStep: nextStep,
                                stepHistory: [
                                    ...(currentMetadata.stepHistory || []),
                                    {
                                        step: currentStep,
                                        action: 'approved',
                                        userId: req.user.id,
                                        timestamp: new Date().toISOString(),
                                        comments
                                    }
                                ]
                            })
                        }
                    });
                }
            }
        }
        else if (action === 'reject') {
            newStatus = 'rejected';
        }
        else if (action === 'request_changes') {
            newStatus = 'changes_requested';
        }
        // Update workflow
        const updatedWorkflow = await prisma.documentWorkflow.update({
            where: { id: workflowId },
            data: {
                status: newStatus,
                completedAt: newStatus === 'completed' ? new Date() : null,
                comments: comments || workflow.comments,
                metadata: JSON.stringify({
                    ...currentMetadata,
                    currentStep: nextStep,
                    stepHistory: [
                        ...(currentMetadata.stepHistory || []),
                        {
                            step: currentStep,
                            action,
                            userId: req.user.id,
                            timestamp: new Date().toISOString(),
                            comments,
                            metadata
                        }
                    ]
                })
            }
        });
        // Log workflow activity
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: workflow.companyId,
                documentId: workflow.documentId,
                userId: req.user.id,
                action: `workflow_${action}`,
                details: `Workflow step ${currentStep + 1} ${action}`
            }
        });
        res.json(updatedWorkflow);
    });
    // Enterprise Security - Advanced Access Controls
    router.post('/documents/:id/access-controls', validateBody(schemas.accessControlCreate), async (req, res) => {
        const { id } = req.params;
        const { accessLevel, userGroups, timeRestrictions, ipRestrictions, mfaRequired } = req.body;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Create access control record
        const accessControl = await prisma.documentAccessControl.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                accessLevel,
                userGroups,
                timeRestrictions,
                ipRestrictions,
                mfaRequired,
                createdBy: req.user.id
            }
        });
        // Log access control creation
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                userId: req.user.id,
                action: 'access_control_created',
                details: `Access control created: ${accessLevel}`
            }
        });
        res.status(201).json(accessControl);
    });
    // Audit Logging & Compliance Monitoring
    router.get('/documents/:id/audit-log', async (req, res) => {
        const { id } = req.params;
        const { startDate, endDate, actions, users } = req.query;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Build audit log query
        const where = {
            documentId: id,
            tenantId: req.tenantId
        };
        if (startDate) {
            where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
        }
        if (endDate) {
            where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
        }
        if (actions) {
            where.action = { in: actions.split(',') };
        }
        if (users) {
            where.userId = { in: users.split(',') };
        }
        const auditLog = await prisma.documentActivity.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            documentId: id,
            totalEntries: auditLog.length,
            auditLog
        });
    });
    // System Integrations - Webhooks
    router.post('/documents/:id/webhooks', validateBody(schemas.webhookCreate), async (req, res) => {
        const { id } = req.params;
        const { url, events, headers, retryPolicy, isActive } = req.body;
        const document = await prisma.fileAsset.findFirst({
            where: { id, tenantId: req.tenantId }
        });
        if (!document) {
            throw new ApiError(404, 'document_not_found', 'Document not found');
        }
        // Create webhook configuration
        const webhook = await prisma.documentWebhook.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                url,
                events,
                headers,
                retryPolicy,
                isActive: isActive ?? true,
                createdBy: req.user.id
            }
        });
        // Log webhook creation
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: document.companyId,
                documentId: id,
                userId: req.user.id,
                action: 'webhook_created',
                details: `Webhook created for ${events.join(', ')} events`
            }
        });
        res.status(201).json(webhook);
    });
    // Webhook delivery status
    router.get('/documents/:id/webhooks/:webhookId/deliveries', async (req, res) => {
        const { id, webhookId } = req.params;
        const deliveries = await prisma.webhookDelivery.findMany({
            where: {
                webhookId,
                documentId: id,
                tenantId: req.tenantId
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({
            webhookId,
            documentId: id,
            totalDeliveries: deliveries.length,
            deliveries
        });
    });
    // Advanced Analytics - Business Intelligence
    router.get('/documents/analytics/business-intelligence', async (req, res) => {
        const { startDate, endDate, groupBy } = req.query;
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const end = endDate ? new Date(endDate) : new Date();
        // Document volume trends
        const volumeTrends = await prisma.$queryRaw `
      SELECT 
        DATE(uploaded_at) as date,
        COUNT(*) as document_count,
        SUM(size_bytes) as total_size
      FROM FileAsset 
      WHERE tenant_id = ${req.tenantId} 
        AND uploaded_at BETWEEN ${start} AND ${end}
      GROUP BY DATE(uploaded_at)
      ORDER BY date
    `;
        // User activity patterns
        const userActivity = await prisma.documentActivity.groupBy({
            by: ['userId', 'action'],
            where: {
                tenantId: req.tenantId,
                createdAt: { gte: start, lte: end }
            },
            _count: { action: true }
        });
        // Category distribution (use uploadedAt on FileAsset)
        const categoryDistribution = await prisma.fileAsset.groupBy({
            by: ['categoryId'],
            where: {
                tenantId: req.tenantId,
                uploadedAt: { gte: start, lte: end }
            },
            _count: { id: true }
        });
        // Storage utilization
        const storageMetrics = await prisma.fileAsset.aggregate({
            where: {
                tenantId: req.tenantId,
                uploadedAt: { gte: start, lte: end }
            },
            _sum: { sizeBytes: true },
            _avg: { sizeBytes: true },
            _count: { id: true }
        });
        res.json({
            period: { start, end },
            volumeTrends,
            userActivity,
            categoryDistribution,
            storageMetrics: {
                totalSize: storageMetrics._sum?.sizeBytes ?? 0,
                averageSize: storageMetrics._avg?.sizeBytes ?? 0,
                totalDocuments: storageMetrics._count?.id ?? 0
            }
        });
    });
    // Performance Metrics & Predictive Insights
    router.get('/documents/analytics/performance', async (req, res) => {
        const { timeframe = '7d' } = req.query;
        let days = 7;
        if (timeframe === '30d')
            days = 30;
        else if (timeframe === '90d')
            days = 90;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        // Response time metrics
        const responseTimeMetrics = await prisma.documentActivity.groupBy({
            by: ['action'],
            where: {
                tenantId: req.tenantId,
                createdAt: { gte: startDate }
            },
            _count: { id: true }
        });
        // Workflow completion rates
        const workflowMetrics = await prisma.documentWorkflow.groupBy({
            by: ['status'],
            where: {
                tenantId: req.tenantId,
                assignedAt: { gte: startDate }
            },
            _count: { id: true }
        });
        // Storage growth prediction (simple linear regression)
        const storageGrowth = await prisma.$queryRaw `
      SELECT 
        AVG(daily_growth) as avg_daily_growth,
        STDDEV(daily_growth) as growth_volatility
      FROM (
        SELECT 
          date,
          total_size - LAG(total_size) OVER (ORDER BY date) as daily_growth
        FROM (
          SELECT 
            DATE(created_at) as date,
            SUM(size_bytes) as total_size
          FROM FileAsset 
          WHERE tenant_id = ${req.tenantId} 
            AND created_at >= ${startDate}
          GROUP BY DATE(created_at)
        ) daily_totals
      ) growth_calc
    `;
        res.json({
            timeframe,
            responseTimeMetrics,
            workflowMetrics,
            storageGrowth,
            recommendations: [
                'Consider implementing document lifecycle policies for older files',
                'Monitor workflow bottlenecks for process optimization',
                'Review storage growth trends for capacity planning'
            ]
        });
    });
    // Workflow step progression
    router.post('/documents/workflows/:workflowId/progress', validateBody(schemas.workflowStepProgress), async (req, res) => {
        const { workflowId } = req.params;
        const { action, comments, metadata } = req.body;
        const workflow = await prisma.documentWorkflow.findFirst({
            where: { id: workflowId, tenantId: req.tenantId }
        });
        if (!workflow) {
            throw new ApiError(404, 'workflow_not_found', 'Workflow not found');
        }
        const currentMetadata = workflow.metadata;
        const currentStep = currentMetadata.currentStep || 0;
        const steps = currentMetadata.steps || [];
        if (currentStep >= steps.length) {
            throw new ApiError(400, 'workflow_completed', 'Workflow is already completed');
        }
        // Process step action
        let newStatus = workflow.status;
        let nextStep = currentStep;
        if (action === 'approve') {
            if (currentStep === steps.length - 1) {
                newStatus = 'completed';
            }
            else {
                nextStep = currentStep + 1;
                const nextStepData = steps[nextStep];
                if (nextStepData) {
                    // Auto-assign to next approver
                    await prisma.documentWorkflow.update({
                        where: { id: workflowId },
                        data: {
                            assignedTo: nextStepData.assignedTo,
                            metadata: {
                                ...currentMetadata,
                                currentStep: nextStep,
                                stepHistory: [
                                    ...(currentMetadata.stepHistory || []),
                                    {
                                        step: currentStep,
                                        action: 'approved',
                                        userId: req.user.id,
                                        timestamp: new Date().toISOString(),
                                        comments
                                    }
                                ]
                            }
                        }
                    });
                }
            }
        }
        else if (action === 'reject') {
            newStatus = 'rejected';
        }
        else if (action === 'request_changes') {
            newStatus = 'changes_requested';
        }
        // Update workflow
        const updatedWorkflow = await prisma.documentWorkflow.update({
            where: { id: workflowId },
            data: {
                status: newStatus,
                completedAt: newStatus === 'completed' ? new Date() : null,
                comments: comments || workflow.comments,
                metadata: {
                    ...currentMetadata,
                    currentStep: nextStep,
                    stepHistory: [
                        ...(currentMetadata.stepHistory || []),
                        {
                            step: currentStep,
                            action,
                            userId: req.user.id,
                            timestamp: new Date().toISOString(),
                            comments,
                            metadata
                        }
                    ]
                }
            }
        });
        // Log workflow activity
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: workflow.companyId,
                documentId: workflow.documentId,
                userId: req.user.id,
                action: `workflow_${action}`,
                details: `Workflow step ${currentStep + 1} ${action}`
            }
        });
        res.json(updatedWorkflow);
    });
    // Compliance Automation - Regulatory Compliance
    router.post('/documents/compliance/automated-checks', validateBody(schemas.complianceCheckCreate), async (req, res) => {
        const { documentIds, complianceRules, schedule, notifications } = req.body;
        // Create compliance check job
        const complianceJob = await prisma.complianceCheck.create({
            data: {
                tenantId: req.tenantId,
                companyId: req.companyId,
                documentIds,
                complianceRules,
                schedule,
                notifications,
                status: 'pending',
                createdBy: req.user.id
            }
        });
        // Queue compliance check processing
        try {
            const { enqueueAiJob } = await import('./queue');
            await enqueueAiJob('compliance-check', {
                jobId: complianceJob.id,
                tenantId: req.tenantId,
                companyId: req.companyId,
                documentIds,
                complianceRules,
                userId: req.user.id
            }, {
                delay: 1000,
                attempts: 3,
                backoff: 'exponential'
            });
        }
        catch (error) {
            console.error('Failed to queue compliance check job:', error);
        }
        res.status(201).json({
            message: 'Compliance check job created',
            jobId: complianceJob.id,
            status: 'queued',
            estimatedTime: '5-15 minutes'
        });
    });
    // Compliance check results
    router.get('/documents/compliance/checks/:checkId', async (req, res) => {
        const { checkId } = req.params;
        const complianceCheck = await prisma.complianceCheck.findFirst({
            where: {
                id: checkId,
                tenantId: req.tenantId
            },
            include: {
                results: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!complianceCheck) {
            throw new ApiError(404, 'compliance_check_not_found', 'Compliance check not found');
        }
        res.json(complianceCheck);
    });
    // Automated Reporting
    router.post('/documents/reports/automated', validateBody(schemas.automatedReportCreate), async (req, res) => {
        const { reportType, schedule, recipients, format, filters } = req.body;
        // Create automated report configuration
        const automatedReport = await prisma.automatedReport.create({
            data: {
                tenantId: req.tenantId,
                companyId: req.companyId,
                reportType,
                schedule,
                recipients,
                format,
                filters,
                isActive: true,
                createdBy: req.user.id
            }
        });
        // Log automated report creation
        await prisma.documentActivity.create({
            data: {
                tenantId: req.tenantId,
                companyId: req.companyId,
                documentId: '', // System-level activity (use empty string when no specific document)
                userId: req.user.id,
                action: 'automated_report_created',
                details: `Automated ${reportType} report created`
            }
        });
        res.status(201).json({
            message: 'Automated report configuration created',
            reportId: automatedReport.id,
            nextRun: 'Scheduled according to configuration'
        });
    });
    // Report generation history
    router.get('/documents/reports/automated/:reportId/history', async (req, res) => {
        const { reportId } = req.params;
        const reportHistory = await prisma.reportGeneration.findMany({
            where: {
                automatedReportId: reportId,
                tenantId: req.tenantId
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json({
            reportId,
            totalGenerations: reportHistory.length,
            history: reportHistory
        });
    });
}
