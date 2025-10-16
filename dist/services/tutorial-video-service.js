import { ObjectId } from 'mongodb';
import { PrismaClient } from '@prisma/client';
import mongoService from '../config/mongodb.js';
import crypto from 'crypto';
const prisma = new PrismaClient();
class TutorialVideoService {
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
    generateDownloadUrl(videoId, tenantId) {
        const timestamp = Date.now();
        const hash = crypto.createHash('sha256')
            .update(`${videoId}-${tenantId}-${timestamp}`)
            .digest('hex');
        return `/api/tutorial-videos/stream/${videoId}?token=${hash}&t=${timestamp}`;
    }
    async uploadTutorialVideo(videoBuffer, videoData) {
        try {
            if (!mongoService.isConnected()) {
                throw new Error('MongoDB not connected');
            }
            const gridFS = mongoService.getGridFS();
            // Upload video to MongoDB GridFS
            const filename = `${Date.now()}-${videoData.title}.mp4`;
            const uploadStream = gridFS.openUploadStream(filename, {
                metadata: {
                    tenantId: videoData.tenantId,
                    title: videoData.title,
                    category: videoData.category,
                    difficulty: videoData.difficulty,
                    duration: videoData.duration,
                    createdBy: videoData.createdBy,
                    createdByName: videoData.createdByName,
                    tags: videoData.tags || [],
                    isPublished: videoData.isPublished || false
                }
            });
            return new Promise((resolve, reject) => {
                uploadStream.end(videoBuffer, () => {
                    // Handle upload completion
                    const videoFileId = filename; // Use filename as the videoFileId
                    const downloadUrl = this.generateDownloadUrl(videoFileId, videoData.tenantId);
                    // Save metadata to SQLite
                    prisma.tutorialVideo.create({
                        data: {
                            tenantId: videoData.tenantId,
                            title: videoData.title,
                            description: videoData.description,
                            category: videoData.category,
                            difficulty: videoData.difficulty,
                            duration: videoData.duration,
                            thumbnailUrl: videoData.thumbnailUrl,
                            videoFileId,
                            downloadUrl,
                            isPublished: videoData.isPublished || false,
                            tags: videoData.tags ? JSON.stringify(videoData.tags) : null,
                            createdBy: videoData.createdBy,
                            createdByName: videoData.createdByName
                        }
                    }).then(async (videoRecord) => {
                        resolve({
                            id: videoRecord.id,
                            title: videoRecord.title,
                            description: videoRecord.description || undefined,
                            category: videoRecord.category,
                            difficulty: videoRecord.difficulty,
                            duration: videoRecord.duration,
                            thumbnailUrl: videoRecord.thumbnailUrl || undefined,
                            downloadUrl: videoRecord.downloadUrl,
                            isPublished: videoRecord.isPublished,
                            viewCount: videoRecord.viewCount,
                            rating: videoRecord.rating || undefined,
                            ratingCount: videoRecord.ratingCount,
                            tags: videoRecord.tags ? JSON.parse(videoRecord.tags) : undefined,
                            createdBy: videoRecord.createdBy,
                            createdByName: videoRecord.createdByName,
                            createdAt: videoRecord.createdAt,
                            updatedAt: videoRecord.updatedAt
                        });
                    }).catch(async (dbError) => {
                        // If SQLite save fails, clean up MongoDB file
                        await this.deleteVideoFromMongoDB(videoFileId);
                        reject(dbError);
                    });
                });
            });
        }
        catch (error) {
            console.error('Error uploading tutorial video:', error);
            throw error;
        }
    }
    async streamTutorialVideo(videoId, tenantId) {
        try {
            if (!mongoService.isConnected()) {
                throw new Error('MongoDB not connected');
            }
            // Get video metadata from SQLite
            const videoRecord = await prisma.tutorialVideo.findFirst({
                where: {
                    id: videoId,
                    tenantId
                }
            });
            if (!videoRecord) {
                throw new Error('Video not found');
            }
            // Get video stream from MongoDB GridFS
            const gridFS = mongoService.getGridFS();
            const downloadStream = gridFS.openDownloadStream(new ObjectId(videoRecord.videoFileId));
            const metadata = {
                id: videoRecord.id,
                title: videoRecord.title,
                description: videoRecord.description || undefined,
                category: videoRecord.category,
                difficulty: videoRecord.difficulty,
                duration: videoRecord.duration,
                thumbnailUrl: videoRecord.thumbnailUrl || undefined,
                downloadUrl: videoRecord.downloadUrl,
                isPublished: videoRecord.isPublished,
                viewCount: videoRecord.viewCount,
                rating: videoRecord.rating || undefined,
                ratingCount: videoRecord.ratingCount,
                tags: videoRecord.tags ? JSON.parse(videoRecord.tags) : undefined,
                createdBy: videoRecord.createdBy,
                createdByName: videoRecord.createdByName,
                createdAt: videoRecord.createdAt,
                updatedAt: videoRecord.updatedAt
            };
            return { stream: downloadStream, metadata };
        }
        catch (error) {
            console.error('Error streaming tutorial video:', error);
            throw error;
        }
    }
    async getTutorialVideoMetadata(videoId, tenantId) {
        try {
            const videoRecord = await prisma.tutorialVideo.findFirst({
                where: {
                    id: videoId,
                    tenantId
                }
            });
            if (!videoRecord) {
                return null;
            }
            return {
                id: videoRecord.id,
                title: videoRecord.title,
                description: videoRecord.description || undefined,
                category: videoRecord.category,
                difficulty: videoRecord.difficulty,
                duration: videoRecord.duration,
                thumbnailUrl: videoRecord.thumbnailUrl || undefined,
                downloadUrl: videoRecord.downloadUrl,
                isPublished: videoRecord.isPublished,
                viewCount: videoRecord.viewCount,
                rating: videoRecord.rating || undefined,
                ratingCount: videoRecord.ratingCount,
                tags: videoRecord.tags ? JSON.parse(videoRecord.tags) : undefined,
                createdBy: videoRecord.createdBy,
                createdByName: videoRecord.createdByName,
                createdAt: videoRecord.createdAt,
                updatedAt: videoRecord.updatedAt
            };
        }
        catch (error) {
            console.error('Error getting tutorial video metadata:', error);
            throw error;
        }
    }
    async listTutorialVideos(tenantId, filters) {
        try {
            const whereClause = { tenantId };
            if (filters?.category) {
                whereClause.category = filters.category;
            }
            if (filters?.difficulty) {
                whereClause.difficulty = filters.difficulty;
            }
            if (filters?.isPublished !== undefined) {
                whereClause.isPublished = filters.isPublished;
            }
            if (filters?.createdBy) {
                whereClause.createdBy = filters.createdBy;
            }
            const videoRecords = await prisma.tutorialVideo.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' }
            });
            return videoRecords.map(record => ({
                id: record.id,
                title: record.title,
                description: record.description || undefined,
                category: record.category,
                difficulty: record.difficulty,
                duration: record.duration,
                thumbnailUrl: record.thumbnailUrl || undefined,
                downloadUrl: record.downloadUrl,
                isPublished: record.isPublished,
                viewCount: record.viewCount,
                rating: record.rating || undefined,
                ratingCount: record.ratingCount,
                tags: record.tags ? JSON.parse(record.tags) : undefined,
                createdBy: record.createdBy,
                createdByName: record.createdByName,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt
            }));
        }
        catch (error) {
            console.error('Error listing tutorial videos:', error);
            throw error;
        }
    }
    async recordVideoView(videoId, tenantId, userId, userName, duration) {
        try {
            // Record the view
            await prisma.tutorialVideoView.create({
                data: {
                    tenantId,
                    videoId,
                    userId,
                    userName,
                    duration
                }
            });
            // Update view count
            await prisma.tutorialVideo.update({
                where: { id: videoId },
                data: {
                    viewCount: {
                        increment: 1
                    }
                }
            });
        }
        catch (error) {
            console.error('Error recording video view:', error);
            throw error;
        }
    }
    async rateVideo(videoId, tenantId, userId, userName, rating, comment) {
        try {
            // Check if user already rated this video
            const existingRating = await prisma.tutorialVideoRating.findFirst({
                where: {
                    videoId,
                    userId,
                    tenantId
                }
            });
            if (existingRating) {
                // Update existing rating
                await prisma.tutorialVideoRating.update({
                    where: { id: existingRating.id },
                    data: { rating, comment }
                });
            }
            else {
                // Create new rating
                await prisma.tutorialVideoRating.create({
                    data: {
                        tenantId,
                        videoId,
                        userId,
                        userName,
                        rating,
                        comment
                    }
                });
            }
            // Update video rating statistics
            const ratings = await prisma.tutorialVideoRating.findMany({
                where: { videoId, tenantId }
            });
            const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
            await prisma.tutorialVideo.update({
                where: { id: videoId },
                data: {
                    rating: averageRating,
                    ratingCount: ratings.length
                }
            });
        }
        catch (error) {
            console.error('Error rating video:', error);
            throw error;
        }
    }
    async deleteTutorialVideo(videoId, tenantId) {
        try {
            // Get video metadata
            const videoRecord = await prisma.tutorialVideo.findFirst({
                where: {
                    id: videoId,
                    tenantId
                }
            });
            if (!videoRecord) {
                return false;
            }
            // Delete from MongoDB GridFS
            await this.deleteVideoFromMongoDB(videoRecord.videoFileId);
            // Delete related records
            await prisma.tutorialVideoView.deleteMany({
                where: { videoId }
            });
            await prisma.tutorialVideoRating.deleteMany({
                where: { videoId }
            });
            // Delete metadata from SQLite
            await prisma.tutorialVideo.delete({
                where: { id: videoId }
            });
            return true;
        }
        catch (error) {
            console.error('Error deleting tutorial video:', error);
            throw error;
        }
    }
    async deleteVideoFromMongoDB(videoFileId) {
        try {
            if (!mongoService.isConnected()) {
                return;
            }
            const gridFS = mongoService.getGridFS();
            // Try to find the file by filename first, then by _id
            let specificFiles = await gridFS.find({ filename: videoFileId }).toArray();
            // If not found by filename, try by _id (ObjectId)
            if (specificFiles.length === 0) {
                try {
                    const ObjectId = require('mongodb').ObjectId;
                    specificFiles = await gridFS.find({ _id: new ObjectId(videoFileId) }).toArray();
                }
                catch (objectIdError) {
                    // videoFileId is not a valid ObjectId, continuing with filename search
                }
            }
            if (specificFiles.length > 0) {
                // Use the found file's _id for deletion
                const fileId = specificFiles[0]._id;
                await gridFS.delete(fileId);
            }
        }
        catch (error) {
            console.error('Error deleting video from MongoDB:', error);
            // Don't throw error here as it's cleanup
        }
    }
    /**
     * Stream video from MongoDB GridFS
     */
    async streamVideo(videoId, res, req) {
        try {
            const video = await prisma.tutorialVideo.findUnique({
                where: { id: videoId }
            });
            if (!video) {
                throw new Error('Video not found');
            }
            if (!mongoService.isConnected()) {
                throw new Error('MongoDB not connected');
            }
            const bucket = mongoService.getGridFS();
            // Try to find the specific file by filename first, then by _id
            let specificFiles = await bucket.find({ filename: video.videoFileId }).toArray();
            // If not found by filename, try by _id (ObjectId)
            if (specificFiles.length === 0) {
                try {
                    const ObjectId = require('mongodb').ObjectId;
                    specificFiles = await bucket.find({ _id: new ObjectId(video.videoFileId) }).toArray();
                }
                catch (objectIdError) {
                    // videoFileId is not a valid ObjectId, continuing with filename search
                }
            }
            if (specificFiles.length === 0) {
                throw new Error(`Video file not found in GridFS with filename or ID: ${video.videoFileId}`);
            }
            const file = specificFiles[0];
            const fileSize = file.length;
            // Handle range requests
            const range = req?.headers?.range;
            if (range) {
                // Parse range header
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                // Set partial content headers
                res.status(206);
                res.set({
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize.toString(),
                    'Content-Type': 'video/mp4',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
                    'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type, x-tenant-id, x-company-id, Authorization, Origin, X-Requested-With, Accept',
                    'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type, Content-Disposition',
                    'Access-Control-Allow-Credentials': 'false'
                });
                // Create range stream
                const downloadStream = bucket.openDownloadStream(file._id, { start, end: end + 1 });
                downloadStream.pipe(res);
            }
            else {
                // No range request - stream entire file
                res.set({
                    'Content-Type': 'video/mp4',
                    'Accept-Ranges': 'bytes',
                    'Content-Length': fileSize.toString(),
                    'Content-Disposition': `inline; filename="${video.title}.mp4"`,
                    'Cache-Control': 'public, max-age=3600',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
                    'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type, x-tenant-id, x-company-id, Authorization, Origin, X-Requested-With, Accept',
                    'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type, Content-Disposition',
                    'Access-Control-Allow-Credentials': 'false'
                });
                const downloadStream = bucket.openDownloadStream(file._id);
                downloadStream.pipe(res);
            }
        }
        catch (error) {
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream video' });
            }
        }
    }
}
export const tutorialVideoService = new TutorialVideoService();
export default tutorialVideoService;
