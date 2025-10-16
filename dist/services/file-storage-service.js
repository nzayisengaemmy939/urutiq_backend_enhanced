import { ObjectId } from 'mongodb';
import { PrismaClient } from '@prisma/client';
import mongoService from '../config/mongodb';
import crypto from 'crypto';
const prisma = new PrismaClient();
class FileStorageService {
    generateDownloadUrl(fileId, tenantId) {
        // Generate a secure download URL with expiration
        const timestamp = Date.now();
        const hash = crypto.createHash('sha256')
            .update(`${fileId}-${tenantId}-${timestamp}`)
            .digest('hex');
        return `/api/files/download/${fileId}?token=${hash}&t=${timestamp}`;
    }
    getFileTypeFromMimeType(mimeType) {
        if (mimeType.startsWith('video/'))
            return 'video';
        if (mimeType.startsWith('image/'))
            return 'image';
        if (mimeType.startsWith('audio/'))
            return 'audio';
        if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text'))
            return 'document';
        return 'other';
    }
    async uploadFile(buffer, uploadData) {
        try {
            if (!mongoService.isConnected()) {
                throw new Error('MongoDB not connected');
            }
            const gridFS = mongoService.getGridFS();
            // Upload file to MongoDB GridFS
            const uploadStream = gridFS.openUploadStream(uploadData.fileName, {
                metadata: {
                    tenantId: uploadData.tenantId,
                    originalName: uploadData.originalName,
                    uploadedBy: uploadData.uploadedBy,
                    uploadedByName: uploadData.uploadedByName,
                    category: uploadData.category,
                    description: uploadData.description,
                    tags: uploadData.tags || [],
                    isPublic: uploadData.isPublic || false
                }
            });
            return new Promise((resolve, reject) => {
                uploadStream.end(buffer, async (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    const mongoFileId = uploadStream.id.toString();
                    const downloadUrl = this.generateDownloadUrl(mongoFileId, uploadData.tenantId);
                    try {
                        // Save metadata to SQLite
                        const fileRecord = await prisma.fileStorage.create({
                            data: {
                                tenantId: uploadData.tenantId,
                                fileName: uploadData.fileName,
                                originalName: uploadData.originalName,
                                mimeType: uploadData.mimeType,
                                fileSize: uploadData.fileSize,
                                fileType: uploadData.fileType,
                                category: uploadData.category,
                                description: uploadData.description,
                                tags: uploadData.tags ? JSON.stringify(uploadData.tags) : null,
                                mongoFileId,
                                downloadUrl,
                                isPublic: uploadData.isPublic || false,
                                uploadedBy: uploadData.uploadedBy,
                                uploadedByName: uploadData.uploadedByName
                            }
                        });
                        resolve({
                            id: fileRecord.id,
                            fileName: fileRecord.fileName,
                            originalName: fileRecord.originalName,
                            mimeType: fileRecord.mimeType,
                            fileSize: fileRecord.fileSize,
                            fileType: fileRecord.fileType,
                            category: fileRecord.category || undefined,
                            description: fileRecord.description || undefined,
                            tags: fileRecord.tags ? JSON.parse(fileRecord.tags) : undefined,
                            downloadUrl: fileRecord.downloadUrl,
                            isPublic: fileRecord.isPublic,
                            uploadedBy: fileRecord.uploadedBy,
                            uploadedByName: fileRecord.uploadedByName,
                            createdAt: fileRecord.createdAt,
                            updatedAt: fileRecord.updatedAt
                        });
                    }
                    catch (dbError) {
                        // If SQLite save fails, clean up MongoDB file
                        await this.deleteFileFromMongoDB(mongoFileId);
                        reject(dbError);
                    }
                });
            });
        }
        catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }
    async downloadFile(fileId, tenantId) {
        try {
            if (!mongoService.isConnected()) {
                throw new Error('MongoDB not connected');
            }
            // Get file metadata from SQLite
            const fileRecord = await prisma.fileStorage.findFirst({
                where: {
                    id: fileId,
                    tenantId
                }
            });
            if (!fileRecord) {
                throw new Error('File not found');
            }
            // Download file from MongoDB GridFS
            const gridFS = mongoService.getGridFS();
            const downloadStream = gridFS.openDownloadStream(new ObjectId(fileRecord.mongoFileId));
            return new Promise((resolve, reject) => {
                const chunks = [];
                downloadStream.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                downloadStream.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const metadata = {
                        id: fileRecord.id,
                        fileName: fileRecord.fileName,
                        originalName: fileRecord.originalName,
                        mimeType: fileRecord.mimeType,
                        fileSize: fileRecord.fileSize,
                        fileType: fileRecord.fileType,
                        category: fileRecord.category || undefined,
                        description: fileRecord.description || undefined,
                        tags: fileRecord.tags ? JSON.parse(fileRecord.tags) : undefined,
                        downloadUrl: fileRecord.downloadUrl,
                        isPublic: fileRecord.isPublic,
                        uploadedBy: fileRecord.uploadedBy,
                        uploadedByName: fileRecord.uploadedByName,
                        createdAt: fileRecord.createdAt,
                        updatedAt: fileRecord.updatedAt
                    };
                    resolve({ buffer, metadata });
                });
                downloadStream.on('error', (error) => {
                    reject(error);
                });
            });
        }
        catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }
    async getFileMetadata(fileId, tenantId) {
        try {
            const fileRecord = await prisma.fileStorage.findFirst({
                where: {
                    id: fileId,
                    tenantId
                }
            });
            if (!fileRecord) {
                return null;
            }
            return {
                id: fileRecord.id,
                fileName: fileRecord.fileName,
                originalName: fileRecord.originalName,
                mimeType: fileRecord.mimeType,
                fileSize: fileRecord.fileSize,
                fileType: fileRecord.fileType,
                category: fileRecord.category || undefined,
                description: fileRecord.description || undefined,
                tags: fileRecord.tags ? JSON.parse(fileRecord.tags) : undefined,
                downloadUrl: fileRecord.downloadUrl,
                isPublic: fileRecord.isPublic,
                uploadedBy: fileRecord.uploadedBy,
                uploadedByName: fileRecord.uploadedByName,
                createdAt: fileRecord.createdAt,
                updatedAt: fileRecord.updatedAt
            };
        }
        catch (error) {
            console.error('Error getting file metadata:', error);
            throw error;
        }
    }
    async listFiles(tenantId, filters) {
        try {
            const whereClause = { tenantId };
            if (filters?.fileType) {
                whereClause.fileType = filters.fileType;
            }
            if (filters?.category) {
                whereClause.category = filters.category;
            }
            if (filters?.uploadedBy) {
                whereClause.uploadedBy = filters.uploadedBy;
            }
            if (filters?.isPublic !== undefined) {
                whereClause.isPublic = filters.isPublic;
            }
            const fileRecords = await prisma.fileStorage.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' }
            });
            return fileRecords.map(record => ({
                id: record.id,
                fileName: record.fileName,
                originalName: record.originalName,
                mimeType: record.mimeType,
                fileSize: record.fileSize,
                fileType: record.fileType,
                category: record.category || undefined,
                description: record.description || undefined,
                tags: record.tags ? JSON.parse(record.tags) : undefined,
                downloadUrl: record.downloadUrl,
                isPublic: record.isPublic,
                uploadedBy: record.uploadedBy,
                uploadedByName: record.uploadedByName,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt
            }));
        }
        catch (error) {
            console.error('Error listing files:', error);
            throw error;
        }
    }
    async deleteFile(fileId, tenantId) {
        try {
            // Get file metadata
            const fileRecord = await prisma.fileStorage.findFirst({
                where: {
                    id: fileId,
                    tenantId
                }
            });
            if (!fileRecord) {
                return false;
            }
            // Delete from MongoDB GridFS
            await this.deleteFileFromMongoDB(fileRecord.mongoFileId);
            // Delete metadata from SQLite
            await prisma.fileStorage.delete({
                where: { id: fileId }
            });
            return true;
        }
        catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }
    async deleteFileFromMongoDB(mongoFileId) {
        try {
            if (!mongoService.isConnected()) {
                return;
            }
            const gridFS = mongoService.getGridFS();
            await gridFS.delete(new ObjectId(mongoFileId));
        }
        catch (error) {
            console.error('Error deleting file from MongoDB:', error);
            // Don't throw error here as it's cleanup
        }
    }
    async updateFileMetadata(fileId, tenantId, updates) {
        try {
            const updateData = {};
            if (updates.category !== undefined)
                updateData.category = updates.category;
            if (updates.description !== undefined)
                updateData.description = updates.description;
            if (updates.tags !== undefined)
                updateData.tags = JSON.stringify(updates.tags);
            if (updates.isPublic !== undefined)
                updateData.isPublic = updates.isPublic;
            const updatedRecord = await prisma.fileStorage.update({
                where: { id: fileId },
                data: updateData
            });
            return {
                id: updatedRecord.id,
                fileName: updatedRecord.fileName,
                originalName: updatedRecord.originalName,
                mimeType: updatedRecord.mimeType,
                fileSize: updatedRecord.fileSize,
                fileType: updatedRecord.fileType,
                category: updatedRecord.category || undefined,
                description: updatedRecord.description || undefined,
                tags: updatedRecord.tags ? JSON.parse(updatedRecord.tags) : undefined,
                downloadUrl: updatedRecord.downloadUrl,
                isPublic: updatedRecord.isPublic,
                uploadedBy: updatedRecord.uploadedBy,
                uploadedByName: updatedRecord.uploadedByName,
                createdAt: updatedRecord.createdAt,
                updatedAt: updatedRecord.updatedAt
            };
        }
        catch (error) {
            console.error('Error updating file metadata:', error);
            throw error;
        }
    }
}
export const fileStorageService = new FileStorageService();
export default fileStorageService;
