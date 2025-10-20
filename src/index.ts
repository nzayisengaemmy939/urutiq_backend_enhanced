// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the API directory
const envPath = path.join(__dirname, '..', '.env');
console.log('🔧 Looking for .env at:', envPath);
console.log('🔧 File exists:', fs.existsSync(envPath));

const result = dotenv.config({ path: envPath });
console.log('🔧 dotenv result:', result);
console.log('🔧 DATABASE_URL:', process.env.DATABASE_URL ? '***configured***' : 'missing');
console.log('🔧 SMTP_HOST:', process.env.SMTP_HOST);
console.log('🔧 SMTP_USER:', process.env.SMTP_USER ? '***configured***' : 'missing');
console.log('🔧 SMTP_PASS:', process.env.SMTP_PASS ? '***configured***' : 'missing');

// Import config AFTER dotenv is loaded
import { config, getApiUrl } from "./config.js";
import { authMiddleware, requireRoles, signDemoToken } from "./auth.js";
import type { Role } from './auth.js';
import { prisma } from "./prisma.js";

import express from "express";
import cors from "cors";
import crypto from "crypto";

import multer from "multer";
import { tenantMiddleware, TenantRequest } from "./tenant.js";
import mongoService from "./config/mongodb.js";
import { mountAccountRoutes } from "./routes.accounts.js";
import { mountAccountingOverviewRoutes } from "./routes.accounting-overview.js";
import { mountJournalRoutes } from "./routes.journal.js";
import { mountJournalHubRoutes } from "./routes.journal-hub.js";
import { mountSupplierPortalRoutes } from "./routes.supplier-portal.js";
import { mountTransactionRoutes } from "./routes.transactions.js";
import { mountSalesRoutes } from "./routes.sales.js";
import { mountSalesAccountingRoutes } from "./routes/sales-accounting.js";
import { mountPurchaseRoutes } from "./routes.purchases.js";
import { mountPurchaseOrderRoutes } from "./routes.purchase-orders.js";
import { mountAccountsPayableRoutes } from "./routes.accounts-payable.js";
import { paymentsRouter } from "./routes.payments.js";
import purchaseOrderPDFRouter from "./routes.purchase-order-pdf.js";
import goodReceiptPDFRouter from "./routes.good-receipt-pdf.js";
import { mountExpenseRoutes } from "./routes.expenses.js";
import { mountFixedAssetRoutes } from "./routes.fixed-assets.js";
import billsRouter from "./routes.bills.js";
import { mountApprovalRoutes } from "./routes.approvals.js";
import { mountUnifiedApprovalRoutes } from "./routes.unified-approvals.js";
import { mountImportShipmentRoutes } from "./routes.import-shipments.js";
import { mountBankingRoutes } from "./routes.banking.js";
import { mountInventoryRoutes } from "./routes.inventory.js";
import { mountPOSRoutes } from "./routes/pos.js";
import { mountPayrollRoutes } from "./routes.payroll.js";
import { mountCategoryRoutes } from "./routes.categories.js";
import { mountMappingRoutes } from "./routes.mappings.js";
import { mountAiRoutes } from "./routes.ai.js";
import { mountEnhancedAIRoutes } from "./routes.ai-enhanced.js";
import { mountAIConfigRoutes } from "./routes.ai-config.js";
import aiRoutes from "./routes/ai-routes.js";
import { mountConversationalParserRoutes } from "./routes.conversational-parser.js";
import { mountAnalyticsRoutes } from "./routes.analytics.js";
import { mountDashboardRoutes } from "./routes.dashboard.js";
import { mountAIInsightsRoutes } from "./routes.ai-insights.js";
import { mountComplianceRoutes } from "./routes.compliance.js";
import { mountCollaborationRoutes } from "./routes.collaboration.js";
import { mountWorkspaceRoutes } from "./routes.workspaces.js";
import { mountAdminRoutes } from "./routes.admin.js";
import enhancedFinancialReportsRouter from "./routes/enhanced-financial-reports.js";
import enhancedConversationalAIRouter from "./routes/enhanced-conversational-ai.js";
import enhancedBankIntegrationRouter from './routes/enhanced-bank-integration.js';
import enhancedJournalManagementRouter from "./routes/enhanced-journal-management.js";
import aiFinancialCoachRouter from "./routes/ai-financial-coach.js";
import enhancedTransactionProcessingRouter from './routes/enhanced-transaction-processing.js';
import llamaAIRouter from "./routes/llama-ai.js";
import periodCloseRouter from './routes/period-close.js';
import bankRulesRouter from './routes/bank-rules.js';
import voiceRouter from './routes/voice-enabled-accounting.js';
import gamificationRouter from './routes/gamification.js';
import inventoryAiRouter from './routes/inventory-ai.js';
import { errorHandler, ApiError, asyncHandler } from "./errors.js";
import { validateBody, schemas, budgetSchemas } from "./validate.js";
import { createRateLimiters, securityConfig } from "./security.js";
import swaggerUi from "swagger-ui-express";
import { buildOpenApi } from "./openapi.js";
import type { Request, Response, NextFunction } from "express";
import reportsRouter from './routes.reports.js';
import bankFeedsRouter from './routes.bankfeeds.js';
import taxRouter from './routes.tax.js';
import clientsRouter from './routes.clients.js';
import accountingReportsRouter from './routes.accounting-reports.js';
import { mountCardRoutes } from './routes.card.js';
import { mountReconciliationRoutes } from './routes.reconciliation.js';
import oauth2Router from './routes.oauth2.js';
import taxManagementRouter from './routes.tax-management.js';
import mfaRouter from './routes.mfa.js';
import { performanceMonitoringMiddleware } from './services/performance-monitoring.service.js';
import { redisCache } from './services/redis-cache.service.js';
import creditNotesRouter from './routes/credit-notes.js';
import threeWayMatchRouter from './routes/three-way-match.js';
import fixedAssetsRouter from './routes/fixed-assets.js';
import revenueRecognitionRouter from './routes/revenue-recognition.js';
import currencyAlertsRouter from './routes/currency-alerts.js';
import financialReportingRouter from './routes/financial-reporting.js';
import taxCalculationRouter from './routes/tax-calculation.js';
import inventoryManagementRouter from './routes/inventory-management.js';
import budgetManagementRouter from './routes/budget-management.js';
import customReportBuilderRouter from './routes/custom-report-builder.js';
import seedRouter from './routes/seed.js';
import securityRouter from './routes/security.js';
import helpRouter from './routes/help.js';
import filesRouter from './routes/files.js';
import tutorialVideosRouter from './routes/tutorial-videos.js';
import { mountDocumentRoutes } from './routes.documents.js';
import { mountWorkflowRoutes } from './routes.workflows.js';
import { mountAuthRoutes } from './routes.auth.js';
import tutorialVideoService from './services/tutorial-video-service.js';
import aiIntelligenceRouter from './routes/ai-intelligence.js';
import aiTestRouter from './routes/ai-test.js';
import simpleAiTestRouter from './routes/simple-ai-test.js';
import validationRouter from './routes.validation.js';

const resolved = config;
const env = process.env;
const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    // Ensure uploads directory exists
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Allow only image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Security middleware
app.use(securityConfig);

// CORS configuration (dev: allow all origins; keep credentials and headers)
// Allow the frontend to send our custom tenant/company headers during CORS preflight
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-tenant-id','x-company-id','Range','Accept-Ranges','Content-Range','Content-Length'],
  exposedHeaders: ['Content-Range','Accept-Ranges','Content-Length','Content-Type'],
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions));

// Allow iframe embedding for document previews
app.use((req, res, next) => {
  // Only apply to document streaming routes
  if (req.path.startsWith('/api/documents/stream/')) {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
  }
  next();
});

// Performance monitoring middleware
app.use(performanceMonitoringMiddleware);

// Redis health check
app.get('/health/redis', async (req, res) => {
  try {
    const isConnected = await redisCache.ping();
    const stats = await redisCache.getStats();
    
    res.json({
      status: isConnected ? 'healthy' : 'unhealthy',
      connected: isConnected,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
app.options('*', cors(corsOptions));

// Rate limiting
const { generalLimiter, authLimiter, uploadLimiter } = createRateLimiters();
app.use(generalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Image serving endpoint for inline display (no download) - PUBLIC ENDPOINT
app.get('/api/images/:fileId',
  asyncHandler(async (req: Request, res: Response) => {
    const fileId = req.params.fileId;
    console.log('Image request for fileId:', fileId);

    try {
      const gridFS = mongoService.getGridFS();
      const { ObjectId } = await import('mongodb');
      
      console.log('ObjectId.isValid check for:', fileId, 'result:', ObjectId.isValid(fileId));
      
      if (!ObjectId.isValid(fileId)) {
        console.log('Invalid ObjectId format:', fileId);
        throw new ApiError(400, 'invalid_file_id', 'Invalid file ID');
      }

      // First, try to get file metadata
      const objectId = ObjectId.createFromHexString(fileId);
      console.log('Created ObjectId:', objectId);
      
      const files = await gridFS.find({ _id: objectId }).toArray();
      console.log('Found files:', files.length);
      
      if (files.length === 0) {
        console.log('No files found for ObjectId:', objectId);
        throw new ApiError(404, 'file_not_found', 'Image not found');
      }

      const fileInfo = files[0];
      console.log('Serving image:', fileInfo.filename, 'Content-Type:', fileInfo.metadata?.mimeType || 'image/jpeg');
      console.log('File metadata:', fileInfo.metadata);

      // Set headers for inline image display BEFORE starting the stream
      res.setHeader('Content-Type', fileInfo.metadata?.mimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.setHeader('Content-Length', fileInfo.length);
      res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for images
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      const downloadStream = gridFS.openDownloadStream(objectId);
      
      downloadStream.on('data', (chunk) => {
        res.write(chunk);
      });
      
      downloadStream.on('end', () => {
        res.end();
      });
      
      downloadStream.on('error', (error) => {
        console.error('Download stream error:', error);
        if (!res.headersSent) {
          res.status(404).json({ error: 'file_not_found', message: 'Image not found' });
        }
      });
      
    } catch (error) {
      console.error('Image serving error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'internal_error', message: 'Failed to serve image' });
      }
    }
  })
);

// Tenant middleware (allow public endpoints)
app.use(tenantMiddleware("x-tenant-id", {
  publicPaths: [
    "/health",
    "/openapi.json",
    "/docs",
    "/auth/", // allow register/login/refresh/logout/demo-token
    "/api/auth/", // allow API auth endpoints
    "/reports/", // allow PDF file serving
    "/api/reports/", // allow PDF file serving from compliance routes
    "/api/pdf/", // allow PDF file serving from dedicated PDF route
    "/api/tutorial-videos/stream/", // allow video streaming
    "/api/images/", // allow image serving for company logos
    "/api/tutorial-videos/stream", // allow video streaming OPTIONS
    "/api/documents/stream/", // allow document streaming
    "/api/documents/stream", // allow document streaming OPTIONS
    "/api/ai-intelligence/debug/", // allow debug endpoints
    "/api/ai-test/", // allow AI test endpoints
    "/api/simple-ai-test/", // allow simple AI test endpoints
  ]
}));

// OpenAPI docs
const openapiDoc = buildOpenApi(config.api.baseUrl);
app.get('/openapi.json', (_req: Request, res: Response) => res.json(openapiDoc));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));


// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ 
    ok: true, 
    env, 
    time: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '0.1.0'
  });
});

// Health check alias for frontend
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ 
    ok: true, 
    env, 
    time: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '0.1.0'
  });
});



// Handle CORS preflight for video streaming
app.options("/api/tutorial-videos/stream/:videoId", (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Content-Type, x-tenant-id, x-company-id, Authorization, Origin, X-Requested-With, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type, Content-Disposition');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.status(200).end();
});

// Handle CORS preflight for document streaming
app.options("/api/documents/stream/:documentId", (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Content-Type, x-tenant-id, x-company-id, Authorization, Origin, X-Requested-With, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type, Content-Disposition');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.status(200).end();
});

// Handle CORS preflight for document streaming
app.options("/api/documents/stream/:documentId", (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Content-Type, x-tenant-id, x-company-id, Authorization, Origin, X-Requested-With, Accept, Cache-Control');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type, Content-Disposition, Cache-Control, ETag');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(200).end();
});

// Document streaming endpoint (bypasses all middleware for CORS compatibility)
app.get("/api/documents/stream/:documentId", async (req: Request, res: Response) => {
  
  const documentId = req.params.documentId;
  const tenantId = req.query.tenantId as string || 'tenant_demo';
  const companyId = req.query.companyId as string || 'seed-company-1';
  const authToken = req.query.token as string;

  // Basic authentication check
  if (!authToken || !tenantId) {
    return res.status(401).json({ error: 'missing_token', message: 'Authentication required' });
  }

  try {
    // Set CORS headers BEFORE any response is sent
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Content-Type, x-tenant-id, x-company-id, Authorization, Origin, X-Requested-With, Accept, Cache-Control');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type, Content-Disposition, Cache-Control, ETag');
    res.setHeader('Access-Control-Allow-Credentials', 'false');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Allow iframe embedding
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");

    // Check if MongoDB is connected
    if (!mongoService.isConnected()) {
      return res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'MongoDB not connected. Document streaming requires MongoDB for file storage.'
      });
    }

    // Find document in database
    const document = await prisma.fileAsset.findFirst({
      where: { 
        id: documentId, 
        tenantId: tenantId 
      }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'document_not_found', message: 'Document not found' });
    }


    const gridFS = mongoService.getGridFS();
    
    // Try to find file by filename first (newer uploads)
    let downloadStream;
    try {
      downloadStream = gridFS.openDownloadStreamByName(document.storageKey);
    } catch (error) {
      // If not found by filename, try by ObjectId (older uploads)
      try {
        const { ObjectId } = await import('mongodb');
        if (ObjectId.isValid(document.storageKey)) {
          downloadStream = gridFS.openDownloadStream(ObjectId.createFromHexString(document.storageKey));
        } else {
          throw new Error('Invalid storage key format');
        }
      } catch (idError) {
        // Try to find by searching for files with similar names
        try {
          const files = await gridFS.find({ filename: { $regex: document.storageKey, $options: 'i' } }).toArray();
          if (files.length > 0) {
            downloadStream = gridFS.openDownloadStream(files[0]._id);
          } else {
            return res.status(404).json({ error: 'file_not_found', message: 'File not found in MongoDB' });
          }
        } catch (searchError) {
          return res.status(404).json({ error: 'file_not_found', message: 'File not found in MongoDB' });
        }
      }
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.name}"`);
    res.setHeader('Content-Length', document.sizeBytes.toString());
    
    // Add cache headers for images
    if (document.mimeType.startsWith('image/')) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('ETag', `"${document.id}"`);
    }
    
    // Stream the file from MongoDB
    downloadStream.pipe(res);
    
    downloadStream.on('error', (error) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'stream_error', message: 'Failed to stream document' });
      }
    });
    
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'internal_error', message: 'Internal server error' });
    }
  }
});

// Video streaming endpoint (bypasses all middleware for CORS compatibility)
app.get("/api/tutorial-videos/stream/:videoId", async (req: Request, res: Response) => {
  const videoId = req.params.videoId;
  const tenantId = req.query.tenantId as string || 'tenant_demo';
  const companyId = req.query.companyId as string || 'cmg0qxjh9003nao3ftbaz1oc1';
  const authToken = req.query.token as string;


  try {
    // Set CORS headers BEFORE any response is sent
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length, Content-Type, x-tenant-id, x-company-id, Authorization, Origin, X-Requested-With, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type, Content-Disposition');
    res.setHeader('Access-Control-Allow-Credentials', 'false');

    // Check if MongoDB is connected
    if (!mongoService.isConnected()) {
      return res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'MongoDB not connected. Video streaming requires MongoDB for file storage.'
      });
    }

    // Stream video using the service
    await tutorialVideoService.streamVideo(videoId, res, req);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'STREAM_ERROR',
        message: 'Failed to stream video'
      });
    }
  }
});


// Simple test endpoint for file upload debugging (bypasses all middleware)
app.post("/test-upload", (req: Request, res: Response) => {
  console.log('Simple test upload request:', {
    headers: req.headers,
    body: req.body,
    hasFile: !!req.file
  });
  
  res.json({
    success: true,
    message: 'Simple test endpoint reached',
    hasFile: !!req.file,
    headers: req.headers
  });
});
app.head("/api/health", (_req: Request, res: Response) => {
  res.status(200).end();
});

// Mount conversational parser endpoints under /api
mountConversationalParserRoutes(app);

// Demo token endpoint with rate limiting
app.post("/api/auth/demo-token", authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  const tenantId = String(req.header("x-tenant-id") || "tenant_demo");
  const roles = (req.body?.roles as string[] | undefined) || ["admin"]; 
  
  // Validate roles
  const validRoles = ["admin", "accountant", "auditor", "employee"] as const;
  const validUserRoles = roles.filter(role => validRoles.includes(role as any)) as Role[];
  if (validUserRoles.length === 0) {
    validUserRoles.push("employee"); // Default role
  }
  
  // Find or create a real demo user in the database
  let demoUser = await prisma.appUser.findFirst({
    where: { 
      tenantId,
      email: 'demo@urutiiq.com' // Use a consistent demo email
    }
  });
  
  // If no demo user exists, create one
  if (!demoUser) {
    const password = 'demo123';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    demoUser = await prisma.appUser.create({
      data: {
        tenantId,
        email: 'demo@urutiiq.com',
        name: 'Demo User',
        role: validUserRoles[0] as any,
        passwordHash: hash,
        passwordSalt: salt,
        mfaEnabled: false
      }
    });
  }
  
  // Use the real user ID from the database
  const token = signDemoToken({ sub: demoUser.id, tenantId, roles: validUserRoles }, secret, "30m");
  res.json({ 
    token,
    expiresIn: "30m",
    user: { sub: demoUser.id, tenantId, roles: validUserRoles, email: demoUser.email }
  });
}));

// Register real auth routes (register/login/refresh/logout) under /api
app.use('/api', (() => {
  const router = express.Router();
  mountAuthRoutes(router);
  return router;
})());

// Protected example endpoint
app.get(
  "/reports/financial",
  authMiddleware(process.env.JWT_SECRET || "dev-secret"),
  requireRoles(["accountant"]),
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ 
      ok: true, 
      report: "Financial report placeholder",
      generatedAt: new Date().toISOString()
    });
  })
);

// Mount all feature routes
app.use('/api', (() => {
  const router = express.Router();
  mountAccountRoutes(router);
  return router;
})());
// Mount accounting overview routes under /api/accounting prefix
app.use('/api/accounting', (() => {
  const router = express.Router();
  mountAccountingOverviewRoutes(router);
  return router;
})());
// Mount journal routes under /api/journal prefix
app.use('/api/journal', tenantMiddleware(), (() => {
  const router = express.Router();
  mountJournalRoutes(router);
  return router;
})());

// Mount journal hub routes under /journal-hub prefix (not /api/journal-hub)
console.log('🔍 Mounting journal hub routes...');
app.use('/journal-hub', authMiddleware(process.env.JWT_SECRET || "dev-secret"), tenantMiddleware(), (() => {
  console.log('🔍 Creating journal hub router...');
  const router = express.Router();
  mountJournalHubRoutes(router);
  console.log('🔍 Journal hub routes mounted successfully');
  return router;
})());

// Mount supplier portal routes under /api/supplier-portal prefix
app.use('/api/supplier-portal', tenantMiddleware(), (() => {
  const router = express.Router();
  mountSupplierPortalRoutes(router);
  return router;
})());
app.use('/api', (() => {
  const router = express.Router();
  // Apply auth and tenant middleware to all routes in this block
  router.use(authMiddleware(process.env.JWT_SECRET || "dev-secret"));
  router.use(tenantMiddleware());
  
  mountTransactionRoutes(router);
  mountSalesRoutes(router);
  
  // Mount sales-accounting routes under /api/sales-accounting
  const salesAccountingRouter = express.Router();
  mountSalesAccountingRoutes(salesAccountingRouter);
  router.use('/sales-accounting', salesAccountingRouter);
  mountPurchaseRoutes(router);
  mountPurchaseOrderRoutes(router);
  router.use('/purchase-orders', purchaseOrderPDFRouter);
  router.use('/good-receipts', goodReceiptPDFRouter);
  // Mount accounts payable routes with prefix
  const accountsPayableRouter = express.Router();
  mountAccountsPayableRoutes(accountsPayableRouter);
  router.use('/accounts-payable', accountsPayableRouter);
  // Mount payments routes
  router.use('/payments', paymentsRouter);
  mountExpenseRoutes(router);
  mountFixedAssetRoutes(router);
  router.use('/bills', billsRouter);
  mountApprovalRoutes(router);
  
  // Mount unified approval routes with prefix
  const unifiedApprovalRouter = express.Router();
  unifiedApprovalRouter.use(tenantMiddleware());
  mountUnifiedApprovalRoutes(unifiedApprovalRouter);
  router.use('/unified-approvals', unifiedApprovalRouter);
  mountImportShipmentRoutes(router);
  mountBankingRoutes(router);
  mountInventoryRoutes(router);
  mountPOSRoutes(router);
  mountCategoryRoutes(router);
  mountPayrollRoutes(router);
  mountMappingRoutes(router);
  mountAiRoutes(router);
  mountEnhancedAIRoutes(router);
  mountAIConfigRoutes(router);
  return router;
})());
// Mount new comprehensive AI learning routes
app.use('/api', aiRoutes);
app.use('/api', (() => {
  const router = express.Router();
  mountConversationalParserRoutes(router);
  mountAnalyticsRoutes(router);
  mountDashboardRoutes(router);
  mountAIInsightsRoutes(router);
  mountCollaborationRoutes(router);
  mountWorkspaceRoutes(router);
  mountDocumentRoutes(router);
  mountCardRoutes(router);
  mountReconciliationRoutes(router);
  return router;
})());

// Mount compliance routes at /api/compliance to avoid conflicts with /api/reports
app.use('/api/compliance', (() => {
  const router = express.Router();
  mountComplianceRoutes(router);
  return router;
})());

// Financial Reports routes
app.use('/api/financial-reports', tenantMiddleware(), financialReportingRouter);
app.use('/api', tenantMiddleware(), periodCloseRouter);
app.use('/api', tenantMiddleware(), bankRulesRouter);
app.use('/api', tenantMiddleware(), creditNotesRouter);
app.use('/api', tenantMiddleware(), threeWayMatchRouter);
app.use('/api', tenantMiddleware(), fixedAssetsRouter);
app.use('/api', tenantMiddleware(), revenueRecognitionRouter);
app.use('/api', tenantMiddleware(), currencyAlertsRouter);
app.use('/api', tenantMiddleware(), financialReportingRouter);
app.use('/api', tenantMiddleware(), taxCalculationRouter);
app.use('/api/budget-management', tenantMiddleware(), budgetManagementRouter);
app.use('/api/seed', tenantMiddleware(), seedRouter);
app.use('/api/security', tenantMiddleware(), securityRouter);
app.use('/api/help', tenantMiddleware(), helpRouter);
app.use('/api/files', tenantMiddleware(), filesRouter);

// Create document router
const documentRouter = express.Router();
mountDocumentRoutes(documentRouter);

// Create workflow router
const workflowRouter = express.Router();
mountWorkflowRoutes(workflowRouter);

// Mount streaming routes without tenant middleware for CORS compatibility
app.use('/api/tutorial-videos/stream', tutorialVideosRouter);
app.use('/api/documents/stream', documentRouter);
app.use('/api/tutorial-videos', authMiddleware(process.env.JWT_SECRET || "dev-secret"), tenantMiddleware(), tutorialVideosRouter);
app.use('/api/documents', tenantMiddleware(), documentRouter);
app.use('/api', tenantMiddleware(), workflowRouter);
app.use('/api/ai-intelligence', tenantMiddleware(), aiIntelligenceRouter);
app.use('/api/ai-test', aiTestRouter);
app.use('/api/simple-ai-test', simpleAiTestRouter);
app.use('/api/validation', tenantMiddleware(), validationRouter);
app.use('/api', tenantMiddleware(), inventoryManagementRouter);
app.use('/api', tenantMiddleware(), customReportBuilderRouter);
// app.use('/api/enhanced-transaction-processing', tenantMiddleware(), enhancedTransactionProcessingRouter); // Temporarily disabled

// Internal admin routes (protected)
{
  const adminRouter = express.Router();
  mountAdminRoutes(adminRouter);
  app.use('/internal', authMiddleware(process.env.JWT_SECRET || "dev-secret"), requireRoles(["admin"]), adminRouter);
}

// Company management endpoints with enhanced validation and error handling
app.get("/api/companies", 
  authMiddleware(process.env.JWT_SECRET || "dev-secret"), 
  requireRoles(["admin", "accountant"]), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { country, currency, q, status } = req.query as Record<string, string | undefined>;
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || "20", 10)));
    
    // First, get all companies for this tenant
    const allCompanies = await prisma.company.findMany({ 
      where: {
        tenantId: req.tenantId,
        country: country || undefined,
        currency: currency || undefined,
        name: q ? { contains: q, mode: "insensitive" as const } : undefined
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            invoices: true,
            bills: true,
            customers: true,
            vendors: true
          }
        },
        companySettings: true
      }
    });

    // Filter companies by status - default to active companies only
    let companies = allCompanies;
    
    if (status && status !== 'all') {
      // Filter by specific status if provided
      const companyIds = allCompanies.map(c => c.id);
      const statusSettings = await prisma.companySetting.findMany({
        where: {
          companyId: { in: companyIds },
          key: 'status',
          value: status
        }
      });
      
      const filteredCompanyIds = statusSettings.map(s => s.companyId);
      companies = allCompanies.filter(c => filteredCompanyIds.includes(c.id));
    } else {
      // Default behavior: only show active companies
      const companyIds = allCompanies.map(c => c.id);
      const activeStatusSettings = await prisma.companySetting.findMany({
        where: {
          companyId: { in: companyIds },
          key: 'status',
          value: { in: ['active', 'ACTIVE'] } // Accept both lowercase and uppercase
        }
      });
      
      const activeCompanyIds = activeStatusSettings.map(s => s.companyId);
      
      // Only include companies that explicitly have active status in companySettings
      // Companies without status settings are treated as inactive
      companies = allCompanies.filter(c => activeCompanyIds.includes(c.id));
    }

    // Apply pagination to filtered companies
    const total = companies.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const rows = companies.slice(startIndex, endIndex);

    // Dev bootstrap: if tenant has no companies, create two defaults and re-query
    if (total === 0 && process.env.NODE_ENV !== 'production') {
      const defaults = [
        { id: 'seed-company-1', name: 'Urutiq Demo Company', country: 'US', currency: 'USD' },
        { id: 'seed-company-2', name: 'Acme Trading Co', country: 'US', currency: 'USD' },
      ];
      for (const c of defaults) {
        await prisma.company.upsert({ 
          where: { id: c.id },
          update: {},
          create: { tenantId: req.tenantId!, ...c } as any
        });
        
        // Ensure the company has active status
        await prisma.companySetting.upsert({
          where: {
            tenantId_companyId_key: {
              tenantId: req.tenantId!,
              companyId: c.id,
              key: 'status'
            }
          },
          update: { value: 'active' },
          create: {
            tenantId: req.tenantId!,
            companyId: c.id,
            key: 'status',
            value: 'active'
          }
        });
      }
      // Re-fetch companies with active status filter applied
      const newAllCompanies = await prisma.company.findMany({ 
        where: { tenantId: req.tenantId! },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              invoices: true,
              bills: true,
              customers: true,
              vendors: true
            }
          },
          companySettings: true
        }
      });
      
      // Apply active status filter to new companies
      const newCompanyIds = newAllCompanies.map(c => c.id);
      const newActiveStatusSettings = await prisma.companySetting.findMany({
        where: {
          companyId: { in: newCompanyIds },
          key: 'status',
          value: { in: ['active', 'ACTIVE'] }
        }
      });
      
      const newActiveCompanyIds = newActiveStatusSettings.map(s => s.companyId);
      const filteredNewCompanies = newAllCompanies.filter(c => newActiveCompanyIds.includes(c.id));
      
      total = filteredNewCompanies.length;
      const newStartIndex = (page - 1) * pageSize;
      const newEndIndex = newStartIndex + pageSize;
      rows = filteredNewCompanies.slice(newStartIndex, newEndIndex);
    }
    
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.json({ 
      data: rows, 
      page, 
      pageSize, 
      total, 
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    });
  })
);

app.post("/api/companies", 
  authMiddleware(process.env.JWT_SECRET || "dev-secret"), 
  requireRoles(["admin"]), 
  validateBody(schemas.companyCreate), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { 
      name, 
      industry, 
      taxId, 
      country, 
      currency, 
      fiscalYearStart,
      email,
      phone,
      website,
      address,
      city,
      state,
      postalCode,
      description,
      employees,
      foundedYear,
      status,
      businessType,
      registrationNumber,
      timezone,
      settings
    } = req.body as any;
    
    // Handle nested address structure
    let addressData = {
      address: typeof address === 'string' ? address : address?.street || '',
      city: city || address?.city || '',
      state: state || address?.state || '',
      country: country || address?.country || '',
      postalCode: postalCode || address?.zipCode || ''
    };
    
    // Check for duplicate company names in the same tenant
    const existing = await prisma.company.findFirst({
      where: { 
        tenantId: req.tenantId!, 
        name: { equals: name }
      }
    });
    
    if (existing) {
      throw new ApiError(409, 'duplicate_company', 'A company with this name already exists');
    }
    
    const created = await prisma.company.create({ 
      data: { 
        tenantId: req.tenantId!, 
        name, 
        industry, 
        taxId, 
        country: addressData.country, 
        currency, 
        fiscalYearStart,
        email,
        phone,
        website,
        address: addressData.address,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode
      } 
    });
    
    // Handle settings and additional fields
    const additionalFields = {
      description,
      employees,
      foundedYear,
      status,
      businessType,
      registrationNumber,
      timezone,
      ...settings
    };
    
    const settingsData = Object.entries(additionalFields)
      .filter(([key, value]) => value !== undefined && value !== null)
      .map(([key, value]) => ({
        tenantId: req.tenantId!,
        companyId: created.id,
        key,
        value: String(value)
      }));
    
    if (settingsData.length > 0) {
      await prisma.companySetting.createMany({
        data: settingsData
      });
    }
    
    res.status(201).json(created);
  })
);

app.put("/api/companies/:id", 
  authMiddleware(process.env.JWT_SECRET || "dev-secret"), 
  requireRoles(["admin"]), 
  validateBody(schemas.companyUpdate), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { 
      name, 
      industry, 
      taxId, 
      country, 
      currency, 
      fiscalYearStart,
      email,
      phone,
      website,
      address,
      city,
      state,
      postalCode,
      description,
      employees,
      foundedYear,
      status,
      businessType,
      registrationNumber,
      timezone,
      settings
    } = req.body as any;
    
    // Handle nested address structure
    let addressData = {
      address: typeof address === 'string' ? address : address?.street || '',
      city: city || address?.city || '',
      state: state || address?.state || '',
      country: country || address?.country || '',
      postalCode: postalCode || address?.zipCode || ''
    };
    
    // Verify company exists and belongs to tenant
    const existing = await prisma.company.findFirst({
      where: { id, tenantId: req.tenantId }
    });
    
    if (!existing) {
      throw new ApiError(404, 'company_not_found', 'Company not found');
    }
    
    const updated = await prisma.company.update({ 
      where: { id }, 
      data: { 
        name, 
        industry, 
        taxId, 
        country: addressData.country, 
        currency, 
        fiscalYearStart,
        email,
        phone,
        website,
        address: addressData.address,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode
      } 
    });
    
    // Handle settings and additional fields
    const additionalFields = {
      description,
      employees,
      foundedYear,
      status,
      businessType,
      registrationNumber,
      timezone,
      ...settings
    };
    
    // Delete existing settings for this company
    await prisma.companySetting.deleteMany({
      where: { companyId: id, tenantId: req.tenantId }
    });
    
    // Create new settings
    const settingsData = Object.entries(additionalFields)
      .filter(([key, value]) => value !== undefined && value !== null)
      .map(([key, value]) => ({
        tenantId: req.tenantId!,
        companyId: id,
        key,
        value: String(value)
      }));
    
    if (settingsData.length > 0) {
      await prisma.companySetting.createMany({
        data: settingsData
      });
    }
    
    res.json(updated);
  })
);

// Archive company endpoint
app.patch("/api/companies/:id/archive", 
  authMiddleware(process.env.JWT_SECRET || "dev-secret"), 
  requireRoles(["admin"]), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    
    // Verify company exists and belongs to tenant
    const existing = await prisma.company.findFirst({
      where: { id, tenantId: req.tenantId }
    });
    
    if (!existing) {
      throw new ApiError(404, 'company_not_found', 'Company not found');
    }
    
    // Check if company is already archived (using a custom field or setting)
    const archivedSetting = await prisma.companySetting.findFirst({
      where: { companyId: id, tenantId: req.tenantId!, key: 'status' }
    });
    
    if (archivedSetting?.value === 'archived') {
      throw new ApiError(400, 'already_archived', 'Company is already archived');
    }
    
    // Update company status via settings
    await prisma.companySetting.upsert({
      where: { 
        tenantId_companyId_key: { 
          tenantId: req.tenantId!, 
          companyId: id, 
          key: 'status' 
        } 
      },
      update: { value: 'archived' },
      create: { 
        tenantId: req.tenantId!, 
        companyId: id, 
        key: 'status', 
        value: 'archived' 
      }
    });
    
    const archived = await prisma.company.findFirst({
      where: { id, tenantId: req.tenantId }
    });
    
    res.json({ 
      message: 'Company archived successfully',
      company: archived 
    });
  })
);

// Unarchive company endpoint
app.patch("/api/companies/:id/unarchive", 
  authMiddleware(process.env.JWT_SECRET || "dev-secret"), 
  requireRoles(["admin"]), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    
    // Verify company exists and belongs to tenant
    const existing = await prisma.company.findFirst({
      where: { id, tenantId: req.tenantId }
    });
    
    if (!existing) {
      throw new ApiError(404, 'company_not_found', 'Company not found');
    }
    
    // Check if company is archived (using settings)
    const archivedSetting = await prisma.companySetting.findFirst({
      where: { companyId: id, tenantId: req.tenantId!, key: 'status' }
    });
    
    if (archivedSetting?.value !== 'archived') {
      throw new ApiError(400, 'not_archived', 'Company is not archived');
    }
    
    // Update company status via settings
    await prisma.companySetting.upsert({
      where: { 
        tenantId_companyId_key: { 
          tenantId: req.tenantId!, 
          companyId: id, 
          key: 'status' 
        } 
      },
      update: { value: 'active' },
      create: { 
        tenantId: req.tenantId!, 
        companyId: id, 
        key: 'status', 
        value: 'active' 
      }
    });
    
    const unarchived = await prisma.company.findFirst({
      where: { id, tenantId: req.tenantId }
    });
    
    res.json({ 
      message: 'Company unarchived successfully',
      company: unarchived 
    });
  })
);

// Company recovery endpoint
app.post("/api/companies/:id/recover", 
  authMiddleware(process.env.JWT_SECRET || "dev-secret"), 
  requireRoles(["admin"]), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    
    console.log(`🔄 Attempting to recover company: ${id}`);
    
    try {
      // 1. Check if company already exists
      const existingCompany = await prisma.company.findFirst({
        where: { id, tenantId: req.tenantId }
      });
      
      if (existingCompany) {
        return res.status(400).json({
          success: false,
          error: 'company_exists',
          message: 'Company already exists and is not deleted'
        });
      }
      
      // 2. Check for orphaned data
      const orphanedData = {
        invoices: await prisma.invoice.count({ where: { companyId: id } }),
        bills: await prisma.bill.count({ where: { companyId: id } }),
        customers: await prisma.customer.count({ where: { companyId: id } }),
        vendors: await prisma.vendor.count({ where: { companyId: id } }),
        transactions: await prisma.transaction.count({ where: { companyId: id } }),
        accounts: await prisma.account.count({ where: { companyId: id } }),
        journalEntries: await prisma.journalEntry.count({ where: { companyId: id } })
      };
      
      const totalOrphanedData = Object.values(orphanedData).reduce((sum, count) => sum + count, 0);
      
      if (totalOrphanedData === 0) {
        return res.status(404).json({
          success: false,
          error: 'no_orphaned_data',
          message: 'No orphaned data found. Company may have been completely deleted.'
        });
      }
      
      // 3. Get company settings to restore company info
      const settings = await prisma.companySetting.findMany({
        where: { companyId: id, tenantId: req.tenantId }
      });
      
      // Extract company info from settings
      const companyInfo: any = {};
      settings.forEach(setting => {
        companyInfo[setting.key] = setting.value;
      });
      
      // 4. Recreate the company
      const recoveredCompany = await prisma.company.create({
        data: {
          id, // Use the same ID to maintain relationships
          tenantId: req.tenantId!,
          name: companyInfo.name || 'Recovered Company',
          industry: companyInfo.industry || null,
          taxId: companyInfo.taxId || null,
          country: companyInfo.country || null,
          currency: companyInfo.currency || 'USD',
          fiscalYearStart: companyInfo.fiscalYearStart || null,
          email: companyInfo.email || null,
          phone: companyInfo.phone || null,
          website: companyInfo.website || null,
          address: companyInfo.address || null,
          city: companyInfo.city || null,
          state: companyInfo.state || null,
          postalCode: companyInfo.postalCode || null
        }
      });
      
      // 5. Log the recovery action
      await prisma.aiAuditTrail.create({
        data: {
          tenantId: req.tenantId!,
          companyId: id,
          userId: req.user?.sub,
          action: `Company ${id} recovered from orphaned data`,
          aiValidationResult: JSON.stringify({
            recoveredAt: new Date().toISOString(),
            orphanedRecords: orphanedData,
            recoveredBy: req.user?.sub || 'unknown',
            companyName: recoveredCompany.name
          })
        }
      });
      
      res.json({
        success: true,
        message: 'Company recovered successfully',
        data: {
          company: recoveredCompany,
          orphanedData,
          settingsRestored: settings.length
        }
      });
      
    } catch (error) {
      console.error('Error recovering company:', error);
      res.status(500).json({
        success: false,
        error: 'recovery_failed',
        message: 'Failed to recover company'
      });
    }
  })
);

// Check company recovery status endpoint
app.get("/api/companies/:id/recovery-status", 
  authMiddleware(process.env.JWT_SECRET || "dev-secret"), 
  requireRoles(["admin"]), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    
    try {
      // Check if company exists
      const existingCompany = await prisma.company.findFirst({
        where: { id, tenantId: req.tenantId }
      });
      
      if (existingCompany) {
        return res.json({
          canRecover: false,
          reason: 'company_exists',
          company: existingCompany
        });
      }
      
      // Check for orphaned data
      const orphanedData = {
        invoices: await prisma.invoice.count({ where: { companyId: id } }),
        bills: await prisma.bill.count({ where: { companyId: id } }),
        customers: await prisma.customer.count({ where: { companyId: id } }),
        vendors: await prisma.vendor.count({ where: { companyId: id } }),
        transactions: await prisma.transaction.count({ where: { companyId: id } }),
        accounts: await prisma.account.count({ where: { companyId: id } }),
        journalEntries: await prisma.journalEntry.count({ where: { companyId: id } })
      };
      
      const totalOrphanedData = Object.values(orphanedData).reduce((sum, count) => sum + count, 0);
      
      // Get company settings
      const settings = await prisma.companySetting.findMany({
        where: { companyId: id, tenantId: req.tenantId }
      });
      
      // Get recent audit logs
      const auditLogs = await prisma.aiAuditTrail.findMany({
        where: { companyId: id, tenantId: req.tenantId },
        orderBy: { timestamp: 'desc' },
        take: 5
      });
      
      res.json({
        canRecover: totalOrphanedData > 0,
        orphanedData,
        totalOrphanedRecords: totalOrphanedData,
        settings: settings.length,
        auditLogs: auditLogs.map(log => ({
          timestamp: log.timestamp,
          action: log.action
        })),
        suggestedCompanyData: settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as any)
      });
      
    } catch (error) {
      console.error('Error checking recovery status:', error);
      res.status(500).json({
        success: false,
        error: 'check_failed',
        message: 'Failed to check recovery status'
      });
    }
  })
);

app.delete("/api/companies/:id", 
  authMiddleware(process.env.JWT_SECRET || "dev-secret"), 
  requireRoles(["admin"]), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    
    // Check if company exists and get its status
    const company = await prisma.company.findFirst({
      where: { id, tenantId: req.tenantId },
      include: {
        _count: {
          select: {
            invoices: true,
            bills: true,
            customers: true,
            vendors: true,
            transactions: true
          }
        }
      }
    });
    
    if (!company) {
      throw new ApiError(404, 'company_not_found', 'Company not found');
    }
    
    // Check company status via settings
    const statusSetting = await prisma.companySetting.findFirst({
      where: { companyId: id, tenantId: req.tenantId!, key: 'status' }
    });
    
    const companyStatus = statusSetting?.value || 'active';
    
    // Only allow deletion of archived companies or companies with no related data
    const totalRelated = Object.values(company._count).reduce((sum, count) => sum + count, 0);
    if (companyStatus !== 'archived' && totalRelated > 0) {
      throw new ApiError(400, 'company_has_data', `Cannot delete company with ${totalRelated} related records. Please archive the company first using PATCH /api/companies/${id}/archive`);
    }
    
    // Log the deletion action before deleting
    await prisma.aiAuditTrail.create({
      data: {
        tenantId: req.tenantId!,
        companyId: id,
        userId: req.user?.sub,
        action: `Company ${company.name} deleted`,
        aiValidationResult: JSON.stringify({
          deletedAt: new Date().toISOString(),
          deletedBy: req.user?.sub || 'unknown',
          companyName: company.name,
          relatedRecords: company._count
        })
      }
    });
    
    await prisma.company.delete({ where: { id } });
    res.status(204).end();
  })
);

app.get("/api/companies/:id", 
  authMiddleware(process.env.JWT_SECRET || "dev-secret"), 
  requireRoles(["admin", "accountant", "auditor"]), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const company = await prisma.company.findFirst({ 
      where: { id, tenantId: req.tenantId },
        include: {
          _count: {
            select: {
              invoices: true,
              bills: true,
              customers: true,
              vendors: true,
              transactions: true,
              products: true
            }
          },
          companySettings: true
        }
    });
    
    if (!company) {
      throw new ApiError(404, 'company_not_found', 'Company not found');
    }
    
    // Check if company has active status
    const statusSetting = await prisma.companySetting.findFirst({
      where: {
        companyId: id,
        key: 'status'
      }
    });
    
    // If status setting exists, only return if it's active
    if (statusSetting && !['active', 'ACTIVE'].includes(statusSetting.value)) {
      throw new ApiError(404, 'company_not_found', 'Company not found or inactive');
    }
    
    res.json(company);
  })
);

// Company logo upload endpoint
app.post("/api/companies/:id/logo", 
  authMiddleware(process.env.JWT_SECRET || "dev-secret"), 
  requireRoles(["admin"]),
  upload.single('logo'),
  (err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: {
            code: 'file_too_large',
            message: 'File size must be less than 5MB'
          }
        });
      }
      return res.status(400).json({
        error: {
          code: 'upload_error',
          message: err.message
        }
      });
    } else if (err) {
      return res.status(400).json({
        error: {
          code: 'upload_error',
          message: err.message
        }
      });
    }
    next();
  },
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    
    // Verify company exists and belongs to tenant
    const company = await prisma.company.findFirst({
      where: { id, tenantId: req.tenantId }
    });
    
    if (!company) {
      throw new ApiError(404, 'company_not_found', 'Company not found');
    }
    
    if (!req.file) {
      throw new ApiError(400, 'no_file', 'No logo file provided');
    }
    
    const file = req.file;
    
    // Validate file type (additional check)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      // Clean up the uploaded file
      if (file.path) {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.error('Failed to clean up file:', cleanupError);
        }
      }
      throw new ApiError(400, 'invalid_file_type', 'Only image files are allowed');
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      // Clean up the uploaded file
      if (file.path) {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.error('Failed to clean up file:', cleanupError);
        }
      }
      throw new ApiError(400, 'file_too_large', 'File size must be less than 5MB');
    }
    
    try {
      // Generate unique filename
      const filename = `company-${id}-logo-${Date.now()}.${file.originalname.split('.').pop()}`;
      
      // Upload to MongoDB GridFS
      const gridFS = mongoService.getGridFS();
      const fileBuffer = fs.readFileSync(file.path);
      
      const uploadStream = gridFS.openUploadStream(filename, {
        metadata: {
          tenantId: req.tenantId!,
          companyId: id,
          originalName: file.originalname,
          uploadedBy: req.user?.sub || 'unknown',
          uploadedByName: 'Unknown User',
          category: 'company_logo',
          description: `Logo for company: ${company.name}`,
          tags: ['logo', 'company'],
          isPublic: false
        }
      });
      
      const document = await new Promise((resolve, reject) => {
        uploadStream.on('error', (error) => {
          reject(error);
        });
        
        uploadStream.on('finish', async () => {
          try {
            // Update company with logo URL - use relative path for frontend proxy
            const logoUrl = `/api/images/${uploadStream.id}`;
            console.log('Generated logo URL:', logoUrl);
            
            const updatedCompany = await prisma.company.update({
              where: { id },
              data: { logoUrl }
            });
            
            console.log('Updated company:', updatedCompany);
            
            // Clean up local file
            fs.unlinkSync(file.path);
            
            resolve(updatedCompany);
          } catch (dbError) {
            // If SQLite save fails, clean up MongoDB file
            try {
              await gridFS.delete(uploadStream.id);
            } catch (cleanupError) {
              console.error('Failed to clean up MongoDB file:', cleanupError);
            }
            reject(dbError);
          }
        });
        
        uploadStream.end(fileBuffer);
      });
      
      res.json({
        success: true,
        message: 'Logo uploaded successfully',
        data: document
      });
    } catch (error) {
      // Clean up local file if it exists
      if (file.path) {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.error('Failed to clean up file:', cleanupError);
        }
      }
      throw error;
    }
  })
);

app.use('/api/reports', tenantMiddleware(), reportsRouter);

// Public PDF serving route (bypasses all authentication) - only for PDF files
// Mounted at /api/pdf to avoid conflicts with /api/reports
app.get('/api/pdf/:filename', async (req: Request, res: Response) => {
  const filename = req.params.filename;
  
  // Only handle PDF files
  if (!filename || !filename.endsWith('.pdf')) {
    console.log('🔧 Non-PDF request to PDF route:', filename);
    return res.status(400).json({ error: 'invalid_filename', message: 'Only PDF files are supported' });
  }
  
  // Extract tenant ID from query parameter or headers
  const tenantId = req.query.tenantId as string || req.headers['x-tenant-id'] as string || 'tenant_demo';
  
  console.log('🔧 Public PDF Request:', {
    path: req.path,
    filename: filename,
    query: req.query,
    tenantId: tenantId,
    headers: req.headers
  });
  
  try {
    console.log('🔧 Serving PDF:', filename, 'for tenant:', tenantId);

    // Generate a proper PDF content with multiple pages and content
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 500
>>
stream
BT
/F1 16 Tf
50 750 Td
(UrutiIQ Financial Report) Tj
0 -30 Td
/F1 12 Tf
(Filename: ${filename}) Tj
0 -20 Td
(Generated: ${new Date().toLocaleString()}) Tj
0 -20 Td
(Tenant ID: ${tenantId}) Tj
0 -40 Td
/F1 14 Tf
(Report Summary) Tj
0 -20 Td
/F1 10 Tf
(This is a generated financial report from UrutiIQ.) Tj
0 -15 Td
(The report contains important financial data and analysis.) Tj
0 -15 Td
(Please review all sections carefully.) Tj
0 -30 Td
/F1 12 Tf
(Report Details:) Tj
0 -15 Td
/F1 10 Tf
(- Balance Sheet Information) Tj
0 -12 Td
(- Income Statement Data) Tj
0 -12 Td
(- Cash Flow Analysis) Tj
0 -12 Td
(- Financial Ratios) Tj
0 -30 Td
/F1 10 Tf
(For questions about this report, please contact your accountant.) Tj
0 -20 Td
(Report ID: ${filename.replace('.pdf', '')}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
753
%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfContent.length);
    res.send(pdfContent);
    
  } catch (error) {
    console.error('❌ Error serving PDF:', error);
    console.error('❌ Request details:', {
      path: req.path,
      filename: filename,
      params: req.params,
      query: req.query,
      headers: req.headers
    });
    res.status(500).json({ 
      error: 'failed_to_serve_pdf',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        path: req.path,
        filename: filename,
        params: req.params,
        query: req.query
      }
    });
  }
});

app.use('/api/enhanced-financial-reports', tenantMiddleware(), enhancedFinancialReportsRouter);
app.use('/api/enhanced-conversational-ai', tenantMiddleware(), enhancedConversationalAIRouter);
app.use('/api/enhanced-bank-integration', tenantMiddleware(), enhancedBankIntegrationRouter);
app.use('/api/enhanced-journal-management', tenantMiddleware(), enhancedJournalManagementRouter);
app.use('/api/coach', tenantMiddleware(), aiFinancialCoachRouter);
app.use('/api/enhanced-transaction-processing', tenantMiddleware(), enhancedTransactionProcessingRouter);
app.use('/api/bank-feeds', tenantMiddleware(), bankFeedsRouter);
app.use('/api/llama-ai', tenantMiddleware(), llamaAIRouter);
app.use('/api/voice', tenantMiddleware(), voiceRouter);
app.use('/api/gamification', tenantMiddleware(), gamificationRouter);
app.use('/api/inventory/ai', tenantMiddleware(), inventoryAiRouter);
app.use('/api/tax', tenantMiddleware(), taxRouter);
app.use('/api/clients', tenantMiddleware(), clientsRouter);
app.use('/api/accounting-reports', tenantMiddleware(), accountingReportsRouter);
app.use('/api', oauth2Router);
app.use('/api', financialReportingRouter);
app.use('/api', taxManagementRouter);
app.use('/api', mfaRouter);
app.use('/api', customReportBuilderRouter);
app.use('/api', enhancedBankIntegrationRouter);

// 404 handler
app.use((req, _res, next) => next(new ApiError(404, "not_found", `Cannot ${req.method} ${req.path}`)));

// Centralized error handler
app.use(errorHandler);

const port = Number(process.env.PORT_BACKEND || resolved?.services?.api?.port || 4000);
app.listen(port, async () => {
  console.log(`🚀 UrutiIQ API listening on port ${port}`);
  console.log(`📚 API Documentation: ${config.api.baseUrl}/docs`);
  console.log(`🔍 OpenAPI Spec: ${config.api.baseUrl}/openapi.json`);
  console.log(`🏥 Health Check: ${config.api.baseUrl}/health`);
  
  // Initialize MongoDB connection
  try {
    await mongoService.connect();
    console.log(`📁 MongoDB connected for file storage`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.log('⚠️  File storage will not be available');
  }
  
  // Start AI Worker in background (temporarily disabled for testing)
  /*
  try {
    const { startAiWorker } = await import('./worker');
    await startAiWorker();
    console.log('🤖 AI Worker started successfully');
  } catch (error) {
    console.warn('⚠️ AI Worker failed to start:', error);
    console.log('📝 AI features will be limited - some background processing may not work');
  }
  */
  console.log('🤖 AI Worker temporarily disabled for testing');
});

// Simple Budget API Routes
app.get('/api/budgets', 
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.query;
    
    const whereClause: any = {
      tenantId: req.tenantId
    };
    
    if (companyId) {
      whereClause.companyId = companyId;
    }
    
    const budgets = await prisma.budget.findMany({
      where: whereClause,
      include: {
        category: true,
        company: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(budgets);
  })
);

app.post('/api/budgets', 
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'), 
  validateBody(budgetSchemas.budgetCreate),
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { name, description, amount, companyId, categoryId, period, startDate, endDate, alertThreshold } = req.body;
    
    if (!name || !amount || !companyId) {
      throw new ApiError(400, 'validation_error', 'Missing required fields: name, amount, companyId');
    }
    
    if (!req.tenantId) {
      throw new ApiError(400, 'tenant_required', 'Tenant ID is required');
    }
    
    // Get or create a default category
    let finalCategoryId = categoryId;
    if (!finalCategoryId) {
      // Try to find an existing category for this company
      const existingCategory = await prisma.expenseCategory.findFirst({
        where: {
          tenantId: req.tenantId,
          companyId,
          isActive: true
        }
      });
      
      if (existingCategory) {
        finalCategoryId = existingCategory.id;
      } else {
        // Create a default category
        const defaultCategory = await prisma.expenseCategory.create({
          data: {
            tenantId: req.tenantId,
            companyId: companyId as string,
            name: 'General Budget',
            description: 'Default budget category',
            isActive: true,
            taxTreatment: 'deductible'
          }
        });
        finalCategoryId = defaultCategory.id;
      }
    }
    
    const budget = await prisma.budget.create({
      data: {
        tenantId: req.tenantId,
        companyId: companyId as string,
        categoryId: finalCategoryId,
        name,
        description: description || null,
        period: period || 'monthly',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        amount: parseFloat(amount),
        spentAmount: 0,
        isActive: true,
        alertThreshold: alertThreshold ? parseFloat(alertThreshold) : null
      },
      include: {
        category: true,
        company: true
      }
    });
    
    res.status(201).json(budget);
  })
);

app.put('/api/budgets/:id', 
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'), 
  validateBody(budgetSchemas.budgetUpdate),
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { name, description, amount, categoryId, period, startDate, endDate, isActive, alertThreshold } = req.body;
    
    // Verify budget exists and belongs to tenant
    const existing = await prisma.budget.findFirst({
      where: { id, tenantId: req.tenantId }
    });
    
    if (!existing) {
      throw new ApiError(404, 'budget_not_found', 'Budget not found');
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (period !== undefined) updateData.period = period;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (alertThreshold !== undefined) updateData.alertThreshold = alertThreshold ? parseFloat(alertThreshold) : null;
    
    const budget = await prisma.budget.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        company: true
      }
    });
    
    res.json(budget);
  })
);

app.delete('/api/budgets/:id', 
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    
    // Verify budget exists and belongs to tenant
    const existing = await prisma.budget.findFirst({
      where: { id, tenantId: req.tenantId }
    });
    
    if (!existing) {
      throw new ApiError(404, 'budget_not_found', 'Budget not found');
    }
    
    await prisma.budget.delete({
      where: { id }
    });
    
    res.status(204).end();
  })
);

app.get('/api/budgets/analytics', 
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'), 
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.query;
    
    const whereClause: any = {
      tenantId: req.tenantId
    };
    
    if (companyId) {
      whereClause.companyId = companyId;
    }
    
    const budgets = await prisma.budget.findMany({
      where: whereClause,
      include: {
        category: true
      }
    });
    
    const totalBudget = budgets.reduce((sum, budget) => sum + Number(budget.amount), 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + Number(budget.spentAmount), 0);
    const totalRemaining = totalBudget - totalSpent;
    const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    const analytics = {
      totalBudgets: budgets.length,
      totalBudget,
      totalSpent,
      totalRemaining,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      budgetsByCategory: budgets.reduce((acc, budget) => {
        const categoryName = budget.category.name;
        if (!acc[categoryName]) {
          acc[categoryName] = { budget: 0, spent: 0, remaining: 0 };
        }
        acc[categoryName].budget += Number(budget.amount);
        acc[categoryName].spent += Number(budget.spentAmount);
        acc[categoryName].remaining += Number(budget.amount) - Number(budget.spentAmount);
        return acc;
      }, {} as Record<string, { budget: number; spent: number; remaining: number }>)
    };
    
    res.json(analytics);
  })
);

app.get('/api/budget-analysis',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, startDate, endDate } = req.query;
    
    const whereClause: any = {
      tenantId: req.tenantId
    };
    
    if (companyId) {
      whereClause.companyId = companyId;
    }
    
    if (startDate && endDate) {
      whereClause.startDate = {
        gte: new Date(startDate as string)
      };
      whereClause.endDate = {
        lte: new Date(endDate as string)
      };
    }
    
    const budgets = await prisma.budget.findMany({
      where: whereClause,
      include: {
        category: true
      }
    });
    
    const analysis = {
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      summary: {
        totalBudgets: budgets.length,
        totalBudget: budgets.reduce((sum, budget) => sum + Number(budget.amount), 0),
        totalSpent: budgets.reduce((sum, budget) => sum + Number(budget.spentAmount), 0),
        averageUtilization: budgets.length > 0 ? 
          budgets.reduce((sum, budget) => sum + (Number(budget.spentAmount) / Number(budget.amount)) * 100, 0) / budgets.length : 0
      },
      budgets: budgets.map(budget => ({
        id: budget.id,
        name: budget.name,
        category: budget.category.name,
        budget: Number(budget.amount),
        spent: Number(budget.spentAmount),
        remaining: Number(budget.amount) - Number(budget.spentAmount),
        utilization: Number(budget.amount) > 0 ? (Number(budget.spentAmount) / Number(budget.amount)) * 100 : 0,
        status: Number(budget.spentAmount) > Number(budget.amount) ? 'over' : 
                Number(budget.spentAmount) > Number(budget.amount) * 0.8 ? 'warning' : 'good'
      }))
    };
    
    res.json(analysis);
  })
);

