import express from "express";
import cors from "cors";
import { loadConfig } from "@urutiq/config";
import { tenantMiddleware } from "./tenant";
import llamaAIRouter from "./routes/llama-ai";
import { errorHandler } from "./errors";
const { resolved, env } = loadConfig();
const app = express();
// CORS configuration
const corsOptions = {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-company-id']
};
app.use(cors(corsOptions));
app.use(express.json());
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
// Demo token endpoint
app.post('/api/auth/demo-token', async (req, res) => {
    try {
        // Simple JWT token generation for demo
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({
            userId: 'demo-user',
            tenantId: 'tenant_demo',
            roles: ['admin', 'accountant', 'viewer']
        }, 'dev-secret', { expiresIn: '24h' });
        res.json({
            success: true,
            token,
            user: {
                id: 'demo-user',
                tenantId: 'tenant_demo',
                roles: ['admin', 'accountant', 'viewer']
            }
        });
    }
    catch (error) {
        console.error('Demo token error:', error);
        res.status(500).json({ error: 'Failed to generate demo token' });
    }
});
// Mount Llama AI routes
app.use('/api/llama-ai', tenantMiddleware(), llamaAIRouter);
// Error handling
app.use(errorHandler);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Minimal API server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🤖 Llama AI: http://localhost:${PORT}/api/llama-ai/health`);
});
