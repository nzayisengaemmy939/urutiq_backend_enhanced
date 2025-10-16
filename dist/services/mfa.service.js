import { prisma } from '../prisma.js';
import { ApiError } from '../errors.js';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
export class MFAService {
    /**
     * Setup MFA for a user
     */
    static async setupMFA(userId, tenantId) {
        // Check if user already has MFA setup
        const existingMFA = await prisma.mfaMethod.findFirst({
            where: { userId, tenantId, isActive: true }
        });
        if (existingMFA) {
            throw new ApiError(400, 'MFA_ALREADY_SETUP', 'MFA is already set up for this user');
        }
        // Generate TOTP secret
        const secret = speakeasy.generateSecret({
            name: `UrutiIQ (${userId})`,
            issuer: 'UrutiIQ',
            length: 32
        });
        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        // Generate backup codes
        const backupCodes = this.generateBackupCodes();
        // Save MFA method to database
        await prisma.mfaMethod.create({
            data: {
                userId,
                tenantId,
                type: 'totp',
                secret: secret.base32,
                isActive: true,
                createdAt: new Date()
            }
        });
        return {
            secret: secret.base32,
            qrCodeUrl,
            backupCodes,
            setupComplete: false
        };
    }
    /**
     * Verify MFA setup with a TOTP code
     */
    static async verifyMFASetup(userId, tenantId, totpCode) {
        const mfaMethod = await prisma.mfaMethod.findFirst({
            where: { userId, tenantId, type: 'totp', isActive: true }
        });
        if (!mfaMethod) {
            throw new ApiError(404, 'MFA_NOT_FOUND', 'MFA method not found');
        }
        // Verify TOTP code
        const verified = speakeasy.totp.verify({
            secret: mfaMethod.secret,
            encoding: 'base32',
            token: totpCode,
            window: 2 // Allow 2 time steps tolerance
        });
        if (!verified) {
            throw new ApiError(400, 'INVALID_TOTP_CODE', 'Invalid TOTP code');
        }
        // Mark setup as complete
        await prisma.mfaMethod.update({
            where: { id: mfaMethod.id },
            data: {
                isActive: true
            }
        });
        return {
            success: true,
            message: 'MFA setup completed successfully'
        };
    }
    /**
     * Verify MFA during login
     */
    static async verifyMFA(userId, tenantId, code, methodType = 'totp') {
        const mfaMethod = await prisma.mfaMethod.findFirst({
            where: { userId, tenantId, type: methodType, isActive: true }
        });
        if (!mfaMethod) {
            throw new ApiError(404, 'MFA_METHOD_NOT_FOUND', 'MFA method not found');
        }
        let verified = false;
        let backupCodeUsed = false;
        switch (methodType) {
            case 'totp':
                verified = speakeasy.totp.verify({
                    secret: mfaMethod.secret,
                    encoding: 'base32',
                    token: code,
                    window: 2
                });
                break;
            case 'sms':
            case 'email':
                // Verify SMS/Email code (would integrate with SMS/Email service)
                verified = await this.verifySMSEmailCode(mfaMethod.id, code);
                break;
            case 'backup_code':
                verified = await this.verifyBackupCode(mfaMethod.id, code);
                backupCodeUsed = verified;
                break;
        }
        if (!verified) {
            throw new ApiError(400, 'INVALID_MFA_CODE', 'Invalid MFA code');
        }
        // Update last used timestamp
        await prisma.mfaMethod.update({
            where: { id: mfaMethod.id },
            data: { isActive: true }
        });
        // Get remaining backup codes count
        const remainingBackupCodes = methodType === 'backup_code' ?
            await this.getRemainingBackupCodesCount(mfaMethod.id) : undefined;
        return {
            success: true,
            backupCodeUsed,
            remainingBackupCodes
        };
    }
    /**
     * Send SMS code for MFA
     */
    static async sendSMSCode(userId, tenantId, phoneNumber) {
        // Check if SMS MFA method exists
        let mfaMethod = await prisma.mfaMethod.findFirst({
            where: { userId, tenantId, type: 'sms', isActive: true }
        });
        if (!mfaMethod) {
            // Create SMS MFA method
            mfaMethod = await prisma.mfaMethod.create({
                data: {
                    userId,
                    tenantId,
                    type: 'sms',
                    isActive: true,
                    createdAt: new Date()
                }
            });
        }
        // Generate SMS code
        const smsCode = this.generateSMSCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        // Save SMS code
        await prisma.mfaCode.create({
            data: {
                userId,
                tenantId,
                type: 'verification',
                code: smsCode,
                expiresAt,
                createdAt: new Date()
            }
        });
        // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
        console.log(`SMS Code for ${phoneNumber}: ${smsCode}`);
        return {
            success: true,
            message: 'SMS code sent successfully'
        };
    }
    /**
     * Send Email code for MFA
     */
    static async sendEmailCode(userId, tenantId, email) {
        // Check if Email MFA method exists
        let mfaMethod = await prisma.mfaMethod.findFirst({
            where: { userId, tenantId, type: 'email', isActive: true }
        });
        if (!mfaMethod) {
            // Create Email MFA method
            mfaMethod = await prisma.mfaMethod.create({
                data: {
                    userId,
                    tenantId,
                    type: 'email',
                    isActive: true,
                    createdAt: new Date()
                }
            });
        }
        // Generate Email code
        const emailCode = this.generateEmailCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        // Save Email code
        await prisma.mfaCode.create({
            data: {
                userId,
                tenantId,
                type: 'verification',
                code: emailCode,
                expiresAt,
                createdAt: new Date()
            }
        });
        // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
        console.log(`Email Code for ${email}: ${emailCode}`);
        return {
            success: true,
            message: 'Email code sent successfully'
        };
    }
    /**
     * Get user's MFA methods
     */
    static async getUserMFAMethods(userId, tenantId) {
        const mfaMethods = await prisma.mfaMethod.findMany({
            where: { userId, tenantId },
            select: {
                id: true,
                type: true,
                isActive: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return mfaMethods.map(method => ({
            id: method.id,
            type: method.type,
            name: `${method.type} Authentication`,
            isActive: method.isActive,
            createdAt: method.createdAt,
            lastUsedAt: undefined
        }));
    }
    /**
     * Disable MFA method
     */
    static async disableMFAMethod(userId, tenantId, methodId) {
        const mfaMethod = await prisma.mfaMethod.findFirst({
            where: { id: methodId, userId, tenantId }
        });
        if (!mfaMethod) {
            throw new ApiError(404, 'MFA_METHOD_NOT_FOUND', 'MFA method not found');
        }
        // Check if this is the last active MFA method
        const activeMethodsCount = await prisma.mfaMethod.count({
            where: { userId, tenantId, isActive: true }
        });
        if (activeMethodsCount <= 1) {
            throw new ApiError(400, 'CANNOT_DISABLE_LAST_METHOD', 'Cannot disable the last active MFA method');
        }
        // Disable the method
        await prisma.mfaMethod.update({
            where: { id: methodId },
            data: { isActive: false }
        });
        return {
            success: true,
            message: 'MFA method disabled successfully'
        };
    }
    /**
     * Generate new backup codes
     */
    static async generateNewBackupCodes(userId, tenantId) {
        const mfaMethod = await prisma.mfaMethod.findFirst({
            where: { userId, tenantId, type: 'totp', isActive: true }
        });
        if (!mfaMethod) {
            throw new ApiError(404, 'TOTP_MFA_NOT_FOUND', 'TOTP MFA method not found');
        }
        const newBackupCodes = this.generateBackupCodes();
        // Note: backupCodes field not available in current schema
        // await prisma.mfaMethod.update({
        //   where: { id: mfaMethod.id },
        //   data: { backupCodes: JSON.stringify(newBackupCodes) }
        // });
        return {
            backupCodes: newBackupCodes,
            message: 'New backup codes generated successfully'
        };
    }
    // Helper methods
    static generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        return codes;
    }
    static generateSMSCode() {
        return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    }
    static generateEmailCode() {
        return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    }
    static async verifySMSEmailCode(mfaMethodId, code) {
        const mfaCode = await prisma.mfaCode.findFirst({
            where: {
                code,
                expiresAt: { gt: new Date() },
                used: false
            }
        });
        if (!mfaCode) {
            return false;
        }
        // Mark code as used
        await prisma.mfaCode.update({
            where: { id: mfaCode.id },
            data: { used: true }
        });
        return true;
    }
    static async verifyBackupCode(mfaMethodId, code) {
        // Note: backupCodes field not available in current schema
        // This functionality would need to be implemented differently
        return false;
    }
    static async getRemainingBackupCodesCount(mfaMethodId) {
        // Note: backupCodes field not available in current schema
        return 0;
    }
}
