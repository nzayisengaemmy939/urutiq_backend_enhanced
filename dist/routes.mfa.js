import { Router } from 'express';
import { MFAService } from './services/mfa.service.js';
import { authMiddleware, requireRoles } from './auth.js';
import { asyncHandler, ApiError } from './errors.js';
import { z } from 'zod';
const router = Router();
// Validation schemas
const mfaSetupSchema = z.object({
    userId: z.string().min(1)
});
const mfaVerificationSchema = z.object({
    userId: z.string().min(1),
    code: z.string().min(1),
    methodType: z.enum(['totp', 'sms', 'email', 'backup_code']).default('totp')
});
const smsCodeSchema = z.object({
    userId: z.string().min(1),
    phoneNumber: z.string().min(10)
});
const emailCodeSchema = z.object({
    userId: z.string().min(1),
    email: z.string().email()
});
// Setup MFA
router.post('/mfa/setup', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { userId } = mfaSetupSchema.parse(req.body);
    const result = await MFAService.setupMFA(userId, req.tenantId);
    res.json({
        success: true,
        data: result,
        message: 'MFA setup initiated successfully'
    });
}));
// Verify MFA setup
router.post('/mfa/verify-setup', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { userId, code } = z.object({
        userId: z.string().min(1),
        code: z.string().min(1)
    }).parse(req.body);
    const result = await MFAService.verifyMFASetup(userId, req.tenantId, code);
    res.json({
        success: result.success,
        message: result.message
    });
}));
// Verify MFA during login
router.post('/mfa/verify', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const params = mfaVerificationSchema.parse(req.body);
    const result = await MFAService.verifyMFA(params.userId, req.tenantId, params.code, params.methodType);
    res.json({
        success: result.success,
        data: {
            backupCodeUsed: result.backupCodeUsed,
            remainingBackupCodes: result.remainingBackupCodes
        }
    });
}));
// Send SMS code
router.post('/mfa/send-sms', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const params = smsCodeSchema.parse(req.body);
    const result = await MFAService.sendSMSCode(params.userId, req.tenantId, params.phoneNumber);
    res.json({
        success: result.success,
        message: result.message
    });
}));
// Send Email code
router.post('/mfa/send-email', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const params = emailCodeSchema.parse(req.body);
    const result = await MFAService.sendEmailCode(params.userId, req.tenantId, params.email);
    res.json({
        success: result.success,
        message: result.message
    });
}));
// Get user's MFA methods
router.get('/mfa/methods/:userId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const methods = await MFAService.getUserMFAMethods(userId, req.tenantId);
    res.json({
        success: true,
        data: methods
    });
}));
// Disable MFA method
router.delete('/mfa/methods/:methodId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { methodId } = req.params;
    const { userId } = req.query;
    if (!userId) {
        throw new ApiError(400, 'USER_ID_REQUIRED', 'User ID is required');
    }
    const result = await MFAService.disableMFAMethod(userId, req.tenantId, methodId);
    res.json({
        success: result.success,
        message: result.message
    });
}));
// Generate new backup codes
router.post('/mfa/backup-codes/generate', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        throw new ApiError(400, 'USER_ID_REQUIRED', 'User ID is required');
    }
    const result = await MFAService.generateNewBackupCodes(userId, req.tenantId);
    res.json({
        success: true,
        data: {
            backupCodes: result.backupCodes
        },
        message: result.message
    });
}));
// Check if user has MFA enabled
router.get('/mfa/status/:userId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const methods = await MFAService.getUserMFAMethods(userId, req.tenantId);
    const hasActiveMFA = methods.some(method => method.isActive);
    res.json({
        success: true,
        data: {
            userId,
            hasMFA: hasActiveMFA,
            methods: methods.filter(method => method.isActive),
            totalMethods: methods.length
        }
    });
}));
// MFA configuration for organization
router.get('/mfa/config', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin']), asyncHandler(async (req, res) => {
    // TODO: Implement organization-level MFA configuration
    const config = {
        requireMFA: true,
        allowedMethods: ['totp', 'sms', 'email', 'backup_code'],
        totpWindow: 2,
        smsCodeLength: 6,
        emailCodeLength: 6,
        backupCodesCount: 10,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        maxFailedAttempts: 5,
        lockoutDuration: 15 * 60 * 1000 // 15 minutes
    };
    res.json({
        success: true,
        data: config
    });
}));
// Update MFA configuration
router.put('/mfa/config', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin']), asyncHandler(async (req, res) => {
    const configSchema = z.object({
        requireMFA: z.boolean(),
        allowedMethods: z.array(z.enum(['totp', 'sms', 'email', 'backup_code'])),
        totpWindow: z.number().min(1).max(10),
        smsCodeLength: z.number().min(4).max(8),
        emailCodeLength: z.number().min(4).max(8),
        backupCodesCount: z.number().min(5).max(20),
        sessionTimeout: z.number().min(5 * 60 * 1000).max(24 * 60 * 60 * 1000),
        maxFailedAttempts: z.number().min(3).max(10),
        lockoutDuration: z.number().min(5 * 60 * 1000).max(60 * 60 * 1000)
    });
    const config = configSchema.parse(req.body);
    // TODO: Save configuration to database
    // await prisma.tenantConfig.update({
    //   where: { tenantId: req.tenantId },
    //   data: { mfaConfig: JSON.stringify(config) }
    // });
    res.json({
        success: true,
        data: config,
        message: 'MFA configuration updated successfully'
    });
}));
export default router;
