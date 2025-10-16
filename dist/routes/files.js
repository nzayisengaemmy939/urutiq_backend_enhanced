import express from 'express';
import multer from 'multer';
import { requireRoles } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { asyncHandler, ApiError } from '../errors.js';
import fileStorageService from '../services/file-storage-service.js';
const router = express.Router();
// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types for now, can be restricted later
        cb(null, true);
    }
});
/**
 * Upload File
 * POST /api/files/upload
 */
router.post('/upload', requireRoles(['admin', 'accountant', 'auditor', 'employee']), upload.single('file'), asyncHandler(async (req, res, next) => {
    const tenantId = req.tenantId;
    const userId = req.user?.sub;
    if (!req.file) {
        throw new ApiError(400, 'NO_FILE', 'No file provided');
    }
    try {
        // Get user info
        const user = await prisma.appUser.findUnique({
            where: { id: userId },
            select: { name: true, email: true }
        });
        const userName = user ? user.name || 'Unknown User' : 'Unknown User';
        // Prepare upload data
        const uploadData = {
            fileName: `${Date.now()}-${req.file.originalname}`,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            fileType: fileStorageService.getFileTypeFromMimeType(req.file.mimetype),
            category: req.body.category || 'general',
            description: req.body.description || '',
            tags: req.body.tags ? JSON.parse(req.body.tags) : [],
            isPublic: req.body.isPublic === 'true',
            tenantId,
            uploadedBy: userId || 'unknown',
            uploadedByName: userName
        };
        // Upload file
        const fileMetadata = await fileStorageService.uploadFile(req.file.buffer, uploadData);
        // Log the file upload
        await prisma.auditLog.create({
            data: {
                tenantId,
                userId: userId || 'unknown',
                action: 'FILE_UPLOADED',
                entityType: 'FileStorage',
                entityId: fileMetadata.id,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent') || 'Unknown'
            }
        });
        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: fileMetadata
        });
    }
    catch (error) {
        console.error('Error uploading file:', error instanceof Error ? error.message : 'Unknown error');
        throw new ApiError(500, 'UPLOAD_ERROR', 'Failed to upload file');
    }
}));
/**
 * Download File
 * GET /api/files/download/:fileId
 */
router.get('/download/:fileId', requireRoles(['admin', 'accountant', 'auditor', 'employee']), asyncHandler(async (req, res, next) => {
    const tenantId = req.tenantId;
    const fileId = req.params.fileId;
    try {
        const { buffer, metadata } = await fileStorageService.downloadFile(fileId, tenantId);
        // Set appropriate headers
        res.setHeader('Content-Type', metadata.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
        res.setHeader('Content-Length', metadata.fileSize);
        // Log the file download
        await prisma.auditLog.create({
            data: {
                tenantId,
                userId: req.user?.sub || 'unknown',
                action: 'FILE_DOWNLOADED',
                entityType: 'FileStorage',
                entityId: fileId,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent') || 'Unknown'
            }
        });
        res.send(buffer);
    }
    catch (error) {
        console.error('Error downloading file:', error instanceof Error ? error.message : 'Unknown error');
        if (error.message === 'File not found') {
            throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found');
        }
        throw new ApiError(500, 'DOWNLOAD_ERROR', 'Failed to download file');
    }
}));
/**
 * Get File Metadata
 * GET /api/files/:fileId
 */
router.get('/:fileId', requireRoles(['admin', 'accountant', 'auditor', 'employee']), asyncHandler(async (req, res, next) => {
    const tenantId = req.tenantId;
    const fileId = req.params.fileId;
    try {
        const metadata = await fileStorageService.getFileMetadata(fileId, tenantId);
        if (!metadata) {
            throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found');
        }
        res.json({
            success: true,
            data: metadata
        });
    }
    catch (error) {
        console.error('Error getting file metadata:', error);
        if (error instanceof ApiError)
            throw error;
        throw new ApiError(500, 'FETCH_ERROR', 'Failed to fetch file metadata');
    }
}));
/**
 * List Files
 * GET /api/files
 */
router.get('/', requireRoles(['admin', 'accountant', 'auditor', 'employee']), asyncHandler(async (req, res, next) => {
    const tenantId = req.tenantId;
    const { fileType, category, uploadedBy, isPublic } = req.query;
    try {
        const filters = {};
        if (fileType)
            filters.fileType = fileType;
        if (category)
            filters.category = category;
        if (uploadedBy)
            filters.uploadedBy = uploadedBy;
        if (isPublic !== undefined)
            filters.isPublic = isPublic === 'true';
        const files = await fileStorageService.listFiles(tenantId, filters);
        res.json({
            success: true,
            data: {
                files,
                totalCount: files.length
            }
        });
    }
    catch (error) {
        console.error('Error listing files:', error);
        throw new ApiError(500, 'LIST_ERROR', 'Failed to list files');
    }
}));
/**
 * Update File Metadata
 * PUT /api/files/:fileId
 */
router.put('/:fileId', requireRoles(['admin', 'accountant', 'auditor', 'employee']), asyncHandler(async (req, res, next) => {
    const tenantId = req.tenantId;
    const fileId = req.params.fileId;
    const { category, description, tags, isPublic } = req.body;
    try {
        const updates = {};
        if (category !== undefined)
            updates.category = category;
        if (description !== undefined)
            updates.description = description;
        if (tags !== undefined)
            updates.tags = tags;
        if (isPublic !== undefined)
            updates.isPublic = isPublic;
        const updatedMetadata = await fileStorageService.updateFileMetadata(fileId, tenantId, updates);
        if (!updatedMetadata) {
            throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found');
        }
        // Log the file update
        await prisma.auditLog.create({
            data: {
                tenantId,
                userId: req.user?.sub || 'unknown',
                action: 'FILE_UPDATED',
                entityType: 'FileStorage',
                entityId: fileId,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent') || 'Unknown'
            }
        });
        res.json({
            success: true,
            message: 'File metadata updated successfully',
            data: updatedMetadata
        });
    }
    catch (error) {
        console.error('Error updating file metadata:', error);
        if (error instanceof ApiError)
            throw error;
        throw new ApiError(500, 'UPDATE_ERROR', 'Failed to update file metadata');
    }
}));
/**
 * Delete File
 * DELETE /api/files/:fileId
 */
router.delete('/:fileId', requireRoles(['admin', 'accountant', 'auditor', 'employee']), asyncHandler(async (req, res, next) => {
    const tenantId = req.tenantId;
    const fileId = req.params.fileId;
    try {
        const deleted = await fileStorageService.deleteFile(fileId, tenantId);
        if (!deleted) {
            throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found');
        }
        // Log the file deletion
        await prisma.auditLog.create({
            data: {
                tenantId,
                userId: req.user?.sub || 'unknown',
                action: 'FILE_DELETED',
                entityType: 'FileStorage',
                entityId: fileId,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent') || 'Unknown'
            }
        });
        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting file:', error);
        if (error instanceof ApiError)
            throw error;
        throw new ApiError(500, 'DELETE_ERROR', 'Failed to delete file');
    }
}));
export default router;
