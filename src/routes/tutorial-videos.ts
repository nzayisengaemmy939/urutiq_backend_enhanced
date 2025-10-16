import express from 'express';
import multer from 'multer';
import { requireRoles } from '../auth';
import { TenantRequest } from '../tenant';
import { asyncHandler, ApiError } from '../errors';
import tutorialVideoService from '../services/tutorial-video-service';
import mongoService from '../config/mongodb';
import { prisma } from '../prisma';

const router = express.Router();

// Configure multer for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for videos
  },
  fileFilter: (req: any, file: any, cb: any) => {
    console.log('Multer file filter:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Allow video files only
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      console.log('File rejected - not a video:', file.mimetype);
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// Test endpoint to debug file upload (bypasses auth and tenant middleware)
router.post('/test-upload', 
  upload.single('video'),
  asyncHandler(async (req: any, res: any, next: any) => {
    console.log('Test upload request:', {
      hasFile: !!req.file,
      fileField: req.file?.fieldname,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      contentType: req.file?.mimetype,
      body: req.body,
      headers: req.headers
    });
    
    res.json({
      success: true,
      message: 'Test upload received',
      hasFile: !!req.file,
      fileInfo: req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null
    });
  })
);

/**
 * Get All Tutorial Videos
 * GET /api/tutorial-videos
 */
router.get('/', 
  requireRoles(['admin', 'accountant', 'auditor', 'employee']),
  asyncHandler(async (req: TenantRequest, res: any, next: any) => {
    const tenantId = req.tenantId!;
    
    try {
      const videos = await prisma.tutorialVideo.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: videos
      });
    } catch (error) {
      console.error('Error fetching tutorial videos:', error instanceof Error ? error.message : 'Unknown error');
      throw new ApiError(500, 'FETCH_ERROR', 'Failed to fetch tutorial videos');
    }
  })
);

/**
 * Upload Tutorial Video
 * POST /api/tutorial-videos/upload
 */
router.post('/upload', 
  requireRoles(['admin', 'accountant', 'auditor', 'employee']),
  upload.single('video'),
  asyncHandler(async (req: TenantRequest, res: any, next: any) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.sub;
    
    console.log('Upload request received:', {
      hasFile: !!req.file,
      fileField: req.file?.fieldname,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      contentType: req.file?.mimetype,
      body: req.body,
      headers: {
        'x-tenant-id': req.headers['x-tenant-id'],
        'x-company-id': req.headers['x-company-id'],
        'authorization': req.headers['authorization'] ? 'Present' : 'Missing'
      }
    });
    
    if (!req.file) {
      console.log('No file found in request');
      throw new ApiError(400, 'NO_VIDEO', 'No video file provided');
    }

    try {
      // Debug user info
      console.log('User info:', {
        userId,
        userSub: req.user?.sub,
        user: req.user
      });

      // Get user info - use req.prisma if available, otherwise use global prisma

      let userName = 'Unknown User';
      if (userId) {
        const user = await prisma.appUser.findUnique({
          where: { id: userId },
          select: { name: true, email: true }
        });
        userName = user ? user.name || 'Unknown User' : 'Unknown User';
      }

      // Prepare video data
      const videoData = {
        title: req.body.title,
        description: req.body.description || '',
        category: req.body.category || 'general',
        difficulty: req.body.difficulty || 'beginner',
        duration: parseInt(req.body.duration) || 0,
        thumbnailUrl: req.body.thumbnailUrl || '',
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        isPublished: req.body.isPublished === 'true',
        tenantId,
        createdBy: userId || 'unknown',
        createdByName: userName
      };

      // Upload video
      const videoMetadata = await tutorialVideoService.uploadTutorialVideo(req.file.buffer, videoData);

      // Log the video upload (only if we have a valid userId)
      if (userId) {
        try {
          await prisma.auditLog.create({
            data: {
              tenantId,
              userId,
              action: 'TUTORIAL_VIDEO_UPLOADED',
              entityType: 'TutorialVideo',
              entityId: videoMetadata.id,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent') || 'Unknown'
            }
          });
        } catch (auditError) {
          // Log audit error but don't fail the upload
          console.error('Failed to create audit log:', auditError);
        }
      }

      res.json({
        success: true,
        message: 'Tutorial video uploaded successfully',
        data: videoMetadata
      });
    } catch (error) {
      console.error('Error uploading tutorial video:', error instanceof Error ? error.message : 'Unknown error');
      throw new ApiError(500, 'UPLOAD_ERROR', 'Failed to upload tutorial video');
    }
  })
);

/**
 * Handle CORS preflight for video streaming
 * OPTIONS /api/tutorial-videos/stream/:videoId
 */
router.options('/stream/:videoId', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Content-Type, x-tenant-id, x-company-id, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
  res.status(200).end();
});

/**
 * Stream Tutorial Video
 * GET /api/tutorial-videos/stream/:videoId
 */
router.get('/stream/:videoId',
  asyncHandler(async (req: TenantRequest, res: any, next: any) => {
    const videoId = req.params.videoId;
    
    // Get tenant and company IDs from headers or query parameters
    const tenantId = req.headers['x-tenant-id'] as string || req.query.tenantId as string || 'tenant_demo';
    const companyId = req.headers['x-company-id'] as string || req.query.companyId as string || 'cmg0qxjh9003nao3ftbaz1oc1';
    const authToken = req.headers['authorization'] as string || req.query.token as string;
    
    // If token is provided, validate it (optional for streaming)
    if (authToken && authToken !== '') {
      try {
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'dev-secret';
        const decoded = jwt.verify(authToken.replace('Bearer ', ''), secret);
        console.log('Token validated for user:', decoded.sub);
      } catch (error) {
        console.log('Invalid token, but continuing with streaming:', error.message);
      }
    }

    console.log('Video streaming request:', {
      videoId,
      tenantId,
      companyId,
      hasAuthToken: !!authToken,
      headers: req.headers
    });

    try {
      
      // Get video metadata
      const video = await prisma.tutorialVideo.findFirst({
        where: { 
          id: videoId,
          tenantId: tenantId
        }
      });

      console.log('Video found:', {
        found: !!video,
        videoId: video?.id,
        videoFileId: video?.videoFileId,
        title: video?.title
      });

      if (!video) {
        console.log('Video not found for:', { videoId, tenantId });
        throw new ApiError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      }

      // Set CORS headers for video streaming
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

      // Stream video from MongoDB GridFS
      await tutorialVideoService.streamVideo(videoId, res);
      
    } catch (error) {
      console.error('Error streaming video:', error instanceof Error ? error.message : 'Unknown error');
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'STREAM_ERROR',
          message: 'Failed to stream video'
        });
      }
    }
  })
);

/**
 * Get Tutorial Video Metadata
 * GET /api/tutorial-videos/:videoId
 */
router.get('/:videoId',
  requireRoles(['admin', 'accountant', 'auditor', 'employee']),
  asyncHandler(async (req: TenantRequest, res: any, next: any) => {
    const tenantId = req.tenantId!;
    const videoId = req.params.videoId;

    try {
      const metadata = await tutorialVideoService.getTutorialVideoMetadata(videoId, tenantId);
      
      if (!metadata) {
        throw new ApiError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      }

      res.json({
        success: true,
        data: metadata
      });
    } catch (error) {
      console.error('Error getting tutorial video metadata:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'FETCH_ERROR', 'Failed to fetch video metadata');
    }
  })
);

/**
 * List Tutorial Videos
 * GET /api/tutorial-videos
 */
router.get('/',
  requireRoles(['admin', 'accountant', 'auditor', 'employee']),
  asyncHandler(async (req: TenantRequest, res: any, next: any) => {
    const tenantId = req.tenantId!;
    const { category, difficulty, isPublished, createdBy } = req.query;

    try {
      const filters: any = {};
      
      if (category) filters.category = category as string;
      if (difficulty) filters.difficulty = difficulty as string;
      if (isPublished !== undefined) filters.isPublished = isPublished === 'true';
      if (createdBy) filters.createdBy = createdBy as string;

      const videos = await tutorialVideoService.listTutorialVideos(tenantId, filters);

      res.json({
        success: true,
        data: {
          videos,
          totalCount: videos.length
        }
      });
    } catch (error) {
      console.error('Error listing tutorial videos:', error instanceof Error ? error.message : 'Unknown error');
      throw new ApiError(500, 'LIST_ERROR', 'Failed to list tutorial videos');
    }
  })
);

/**
 * Rate Tutorial Video
 * POST /api/tutorial-videos/:videoId/rate
 */
router.post('/:videoId/rate',
  requireRoles(['admin', 'accountant', 'auditor', 'employee']),
  asyncHandler(async (req: TenantRequest, res: any, next: any) => {
    const tenantId = req.tenantId!;
    const videoId = req.params.videoId;
    const userId = req.user?.sub;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      throw new ApiError(400, 'INVALID_RATING', 'Rating must be between 1 and 5');
    }

    try {
      // Get user info
      const user = await prisma.appUser.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      const userName = user ? user.name || 'Unknown User' : 'Unknown User';

      await tutorialVideoService.rateVideo(videoId, tenantId, userId || 'unknown', userName, rating, comment);

      res.json({
        success: true,
        message: 'Video rated successfully'
      });
    } catch (error) {
      console.error('Error rating tutorial video:', error instanceof Error ? error.message : 'Unknown error');
      throw new ApiError(500, 'RATING_ERROR', 'Failed to rate video');
    }
  })
);

/**
 * Record Video View
 * POST /api/tutorial-videos/:videoId/view
 */
router.post('/:videoId/view',
  requireRoles(['admin', 'accountant', 'auditor', 'employee']),
  asyncHandler(async (req: TenantRequest, res: any, next: any) => {
    const tenantId = req.tenantId!;
    const videoId = req.params.videoId;
    const userId = req.user?.sub;
    const { duration } = req.body;

    try {
      // Get user info - use req.prisma if available, otherwise use global prisma

      let userName = 'Unknown User';
      if (userId) {
        const user = await prisma.appUser.findUnique({
          where: { id: userId },
          select: { name: true, email: true }
        });
        userName = user ? user.name || 'Unknown User' : 'Unknown User';
      }

      await tutorialVideoService.recordVideoView(videoId, tenantId, userId || 'unknown', userName, duration);

      res.json({
        success: true,
        message: 'View recorded successfully'
      });
    } catch (error) {
      console.error('Error recording video view:', error instanceof Error ? error.message : 'Unknown error');
      throw new ApiError(500, 'VIEW_ERROR', 'Failed to record view');
    }
  })
);

/**
 * Delete Tutorial Video
 * DELETE /api/tutorial-videos/:videoId
 */
router.delete('/:videoId',
  requireRoles(['admin', 'accountant', 'auditor', 'employee']),
  asyncHandler(async (req: TenantRequest, res: any, next: any) => {
    const tenantId = req.tenantId!;
    const videoId = req.params.videoId;

    try {
      const deleted = await tutorialVideoService.deleteTutorialVideo(videoId, tenantId);

      if (!deleted) {
        throw new ApiError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      }

      // Log the video deletion
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: req.user?.sub || 'unknown',
          action: 'TUTORIAL_VIDEO_DELETED',
          entityType: 'TutorialVideo',
          entityId: videoId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || 'Unknown'
        }
      });

      res.json({
        success: true,
        message: 'Tutorial video deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting tutorial video:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DELETE_ERROR', 'Failed to delete tutorial video');
    }
  })
);


export default router;
