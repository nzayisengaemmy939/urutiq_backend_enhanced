import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import { loadConfig } from "@urutiq/config";
import { authMiddleware, requireRoles, signDemoToken } from "./auth";
import type { Role } from './auth';
import { prisma } from "./prisma";
import { tenantMiddleware, TenantRequest } from "./tenant";
import mongoService from "./config/mongodb";
import { config, getApiUrl } from "./config";

// Import all routes (simplified for serverless)
import { mountAccountRoutes } from "./routes.accounts";
import { mountJournalRoutes } from "./routes.journal";
import { mountTransactionRoutes } from "./routes.transactions";
import { mountSalesRoutes } from "./routes.sales";
import { mountPurchaseRoutes } from "./routes.purchases";
import { mountInventoryRoutes } from "./routes.inventory";
import { mountPOSRoutes } from "./routes/pos";
import { mountCategoryRoutes } from "./routes.categories";
import { mountAiRoutes } from "./routes.ai";
import { mountDashboardRoutes } from "./routes.dashboard";

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
mountAccountRoutes(app);
mountJournalRoutes(app);
mountTransactionRoutes(app);
mountSalesRoutes(app);
mountPurchaseRoutes(app);
mountInventoryRoutes(app);
mountPOSRoutes(app);
mountCategoryRoutes(app);
mountAiRoutes(app);
mountDashboardRoutes(app);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export for Vercel
export default app;
