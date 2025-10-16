import { prisma } from '../prisma';
import { ApiError } from '../errors';
import crypto from 'crypto';
export class ApiKeyService {
    // Generate a secure API key
    static generateApiKey() {
        return `uruti_${crypto.randomBytes(32).toString('hex')}`;
    }
    // Hash API key for storage
    static async hashApiKey(key) {
        return crypto.createHash('sha256').update(key).digest('hex');
    }
    // Create a new API key
    static async createApiKey(request) {
        const plainKey = this.generateApiKey();
        const keyHash = await this.hashApiKey(plainKey);
        const keyPrefix = plainKey.substring(0, 8);
        // Validate permissions
        const validPermissions = this.getValidPermissions();
        const invalidPermissions = request.permissions.filter(p => !validPermissions.includes(p));
        if (invalidPermissions.length > 0) {
            throw new ApiError(400, 'INVALID_PERMISSIONS', `Invalid permissions: ${invalidPermissions.join(', ')}`);
        }
        const apiKey = await prisma.apiKey.create({
            data: {
                tenantId: request.tenantId,
                companyId: request.companyId,
                name: request.name,
                keyHash,
                keyPrefix,
                permissions: JSON.stringify(request.permissions),
                expiresAt: request.expiresAt,
                createdById: request.createdById
            }
        });
        return {
            id: apiKey.id,
            name: apiKey.name,
            keyPrefix: apiKey.keyPrefix,
            permissions: JSON.parse(apiKey.permissions || '[]'),
            expiresAt: apiKey.expiresAt || undefined,
            isActive: apiKey.isActive,
            createdAt: apiKey.createdAt,
            lastUsedAt: apiKey.lastUsedAt || undefined,
            plainKey // Only returned on creation
        };
    }
    // Validate API key
    static async validateApiKey(key) {
        const keyHash = await this.hashApiKey(key);
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                keyHash,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: {
                company: true,
                createdBy: true
            }
        });
        if (!apiKey) {
            return null;
        }
        // Update last used timestamp
        await prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() }
        });
        return {
            apiKey: {
                id: apiKey.id,
                name: apiKey.name,
                keyPrefix: apiKey.keyPrefix,
                permissions: JSON.parse(apiKey.permissions || '[]'),
                expiresAt: apiKey.expiresAt || undefined,
                isActive: apiKey.isActive,
                createdAt: apiKey.createdAt,
                lastUsedAt: new Date()
            },
            user: {
                id: apiKey.createdBy.id,
                tenantId: apiKey.tenantId,
                companyId: apiKey.companyId
            }
        };
    }
    // Get API keys for a company
    static async getApiKeys(tenantId, companyId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [apiKeys, total] = await Promise.all([
            prisma.apiKey.findMany({
                where: { tenantId, companyId },
                select: {
                    id: true,
                    name: true,
                    keyPrefix: true,
                    permissions: true,
                    expiresAt: true,
                    isActive: true,
                    createdAt: true,
                    lastUsedAt: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.apiKey.count({
                where: { tenantId, companyId }
            })
        ]);
        return {
            apiKeys: apiKeys.map(key => ({
                id: key.id,
                name: key.name,
                keyPrefix: key.keyPrefix,
                permissions: JSON.parse(key.permissions || '[]'),
                expiresAt: key.expiresAt || undefined,
                isActive: key.isActive,
                createdAt: key.createdAt,
                lastUsedAt: key.lastUsedAt || undefined
            })),
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
    }
    // Update API key
    static async updateApiKey(id, tenantId, updates) {
        // Validate permissions if provided
        if (updates.permissions) {
            const validPermissions = this.getValidPermissions();
            const invalidPermissions = updates.permissions.filter(p => !validPermissions.includes(p));
            if (invalidPermissions.length > 0) {
                throw new ApiError(400, 'INVALID_PERMISSIONS', `Invalid permissions: ${invalidPermissions.join(', ')}`);
            }
        }
        const updateData = { ...updates };
        if (updates.permissions) {
            updateData.permissions = JSON.stringify(updates.permissions);
        }
        const apiKey = await prisma.apiKey.update({
            where: { id, tenantId },
            data: updateData
        });
        return {
            id: apiKey.id,
            name: apiKey.name,
            keyPrefix: apiKey.keyPrefix,
            permissions: JSON.parse(apiKey.permissions || '[]'),
            expiresAt: apiKey.expiresAt || undefined,
            isActive: apiKey.isActive,
            createdAt: apiKey.createdAt,
            lastUsedAt: apiKey.lastUsedAt || undefined
        };
    }
    // Delete API key
    static async deleteApiKey(id, tenantId) {
        await prisma.apiKey.delete({
            where: { id, tenantId }
        });
    }
    // Check if API key has permission
    static hasPermission(apiKey, permission) {
        return apiKey.permissions.includes(permission) || apiKey.permissions.includes('*');
    }
    // Get valid permissions
    static getValidPermissions() {
        return [
            // Account Management
            'read:accounts',
            'write:accounts',
            // Transaction Management
            'read:transactions',
            'write:transactions',
            // Reporting
            'read:reports',
            'write:reports',
            // AI Features
            'read:ai_insights',
            'write:ai_insights',
            // Banking
            'read:banking',
            'write:banking',
            // Inventory
            'read:inventory',
            'write:inventory',
            // Admin
            'admin',
            // All permissions
            '*'
        ];
    }
    // Get permission groups for UI
    static getPermissionGroups() {
        return {
            'Account Management': ['read:accounts', 'write:accounts'],
            'Transaction Management': ['read:transactions', 'write:transactions'],
            'Reporting': ['read:reports', 'write:reports'],
            'AI Features': ['read:ai_insights', 'write:ai_insights'],
            'Banking': ['read:banking', 'write:banking'],
            'Inventory': ['read:inventory', 'write:inventory'],
            'Administration': ['admin', '*']
        };
    }
}
