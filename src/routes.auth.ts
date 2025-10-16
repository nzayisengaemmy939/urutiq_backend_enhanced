import type { Router, Request } from 'express';
import crypto from 'crypto';
import { prisma } from './prisma.js';
import { asyncHandler, ApiError } from './errors.js';
import type { Response } from 'express';
import rateLimit from 'express-rate-limit';
import { signDemoToken } from './auth.js';
import { mfaLoginChallenge, mfaLoginVerify, mfaSetupVerify, mfaDisable, mfaBackupCodesRegenerate } from './validate.js';

// Minimal TOTP implementation (RFC 6238) without external deps
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of input.replace(/=+$/,'').toUpperCase()) {
    const val = alphabet.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTOTP(secretBase32: string, timeStep = 30, digits = 6, algo: 'sha1'|'sha256'|'sha512' = 'sha1'): string {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const key = base32Decode(secretBase32);
  const hmac = crypto.createHmac(algo, key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).toString().padStart(digits, '0');
  return code;
}

function verifyTOTP(secretBase32: string, token: string, window = 1): boolean {
  const step = 30;
  const digits = token.length;
  for (let w = -window; w <= window; w++) {
    const counter = Math.floor(Date.now() / 1000 / step) + w;
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigUInt64BE(BigInt(counter));
    const key = base32Decode(secretBase32);
    const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).toString().padStart(digits, '0');
    if (code === token) return true;
  }
  return false;
}

function randomBase32(length = 32): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateBackupCodes(count = 10): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(5).toString('hex'); // 10 hex chars
    plain.push(code);
    hashed.push(hashBackupCode(code));
  }
  return { plain, hashed };
}

function signAccessToken(payload: { sub: string; tenantId: string; roles: string[] }, expiresIn = '30m') {
  // reuse demo signer to avoid duplicating jwt import config
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const token = signDemoToken(payload as any, secret, expiresIn);
  return token;
}

// Password hashing helper (PBKDF2)
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: useSalt };
}

export function mountAuthRoutes(router: Router) {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 5 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV !== 'production',
  });
  // Get users (admin only)
  router.get('/auth/users', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
    
    const users = await prisma.appUser.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        users,
        totalCount: users.length
      }
    });
  }));

  // Create user (admin only)
  router.post('/auth/users', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
    const { name, email, role, password } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, 'validation_error', 'Name, email, and password are required');
    }

    // Check if user already exists
    const existingUser = await prisma.appUser.findFirst({
      where: { email, tenantId }
    });

    if (existingUser) {
      throw new ApiError(400, 'user_exists', 'User with this email already exists');
    }

    // Hash password
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

    // Create user
    const user = await prisma.appUser.create({
      data: {
        email,
        name,
        role: role || 'employee',
        passwordHash: hash,
        passwordSalt: salt,
        tenantId,
        mfaEnabled: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Log the action (skip if userId is not available)
    try {
      const currentUser = req.user as any;
      if (currentUser?.sub) {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: currentUser.sub,
            action: 'USER_CREATED',
            entityType: 'User',
            entityId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent') || 'Unknown'
          }
        });
      }
    } catch (error) {
      // Skip audit logging if it fails
      console.log('Audit log creation failed:', error);
    }

    res.json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  }));

  // Update user (admin only)
  router.put('/auth/users/:userId', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
    const { userId } = req.params;
    const { name, email, role, password } = req.body;

    if (!name || !email) {
      throw new ApiError(400, 'validation_error', 'Name and email are required');
    }

    // Check if user exists
    const existingUser = await prisma.appUser.findFirst({
      where: { id: userId, tenantId }
    });

    if (!existingUser) {
      throw new ApiError(404, 'user_not_found', 'User not found');
    }

    // Check if email is already taken by another user
    if (email !== existingUser.email) {
      const emailExists = await prisma.appUser.findFirst({
        where: { email, tenantId, id: { not: userId } }
      });

      if (emailExists) {
        throw new ApiError(400, 'email_exists', 'Email already taken by another user');
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      role: role || existingUser.role,
      updatedAt: new Date()
    };

    // Update password if provided
    if (password) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
      updateData.passwordHash = hash;
      updateData.passwordSalt = salt;
    }

    // Update user
    const user = await prisma.appUser.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Log the action (skip if userId is not available)
    try {
      const currentUser = req.user as any;
      if (currentUser?.sub) {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: currentUser.sub,
            action: 'USER_UPDATED',
            entityType: 'User',
            entityId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent') || 'Unknown'
          }
        });
      }
    } catch (error) {
      // Skip audit logging if it fails
      console.log('Audit log creation failed:', error);
    }

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  }));

  // Delete user (admin only)
  router.delete('/auth/users/:userId', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
    const { userId } = req.params;

    // Check if user exists
    const existingUser = await prisma.appUser.findFirst({
      where: { id: userId, tenantId }
    });

    if (!existingUser) {
      throw new ApiError(404, 'user_not_found', 'User not found');
    }

    // Prevent deletion of owner
    if (existingUser.role === 'owner') {
      throw new ApiError(400, 'cannot_delete_owner', 'Cannot delete owner account');
    }

    // Log the action before deletion (skip if userId is not available)
    try {
      const currentUser = req.user as any;
      if (currentUser?.sub) {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: currentUser.sub,
            action: 'USER_DELETED',
            entityType: 'User',
            entityId: userId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent') || 'Unknown'
          }
        });
      }
    } catch (error) {
      // Skip audit logging if it fails
      console.log('Audit log creation failed:', error);
    }

    // Delete user
    await prisma.appUser.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  }));

  // Register
  router.post('/auth/register', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    // Generate a unique tenant ID for new users
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { email, password, name, role, companyName } = (req.body || {}) as any;
    if (!email || !password) throw new ApiError(400, 'invalid_request', 'email and password are required');

    // Check if user exists across all tenants (email should be unique globally)
    const existing = await prisma.appUser.findFirst({ where: { email } });
    if (existing) throw new ApiError(409, 'email_exists', 'User with this email already exists');

    const { hash, salt } = hashPassword(password);
    
    // Create user with unique tenant
    const user = await prisma.appUser.create({ data: {
      tenantId,
      email,
      name: name || null,
      role: role || 'employee',
      passwordHash: hash,
      passwordSalt: salt,
    }});

    // Create company if companyName is provided
    let company = null;
    if (companyName) {
      company = await prisma.company.create({ data: {
        tenantId,
        name: companyName,
      }});
    }

    res.status(201).json({ 
      id: user.id, 
      email: user.email,
      tenantId,
      companyId: company?.id || null,
      companyName: company?.name || null
    });
  }));

  // Login
  router.post('/auth/login', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = mfaLoginChallenge.parse(req.body);

    // Find user by email first (email should be unique globally)
    let user = await prisma.appUser.findFirst({ where: { email } });
    if (!user) throw new ApiError(401, 'invalid_credentials', 'Invalid email or password');
    
    const tenantId = user.tenantId;

    // Dev convenience: auto-provision or repair credentials if missing (non-production only)
    if (process.env.NODE_ENV !== 'production') {
      if (!user) {
        // Auto-create a user with the provided email/password
        const { hash, salt } = hashPassword(password);
        user = await prisma.appUser.create({ data: {
          tenantId,
          email,
          name: 'Dev User',
          role: 'admin' as any,
          passwordHash: hash,
          passwordSalt: salt,
        }});
      } else if (!user.passwordHash || !user.passwordSalt) {
        // Repair missing credentials for existing record
        const { hash, salt } = hashPassword(password);
        user = await prisma.appUser.update({ where: { id: user.id }, data: {
          passwordHash: hash,
          passwordSalt: salt,
        }});
      }
    }

    if (!user || !user.passwordHash || !user.passwordSalt) throw new ApiError(401, 'invalid_credentials', 'Invalid email or password');

    const { hash } = hashPassword(password, user.passwordSalt);
    if (hash !== user.passwordHash) throw new ApiError(401, 'invalid_credentials', 'Invalid email or password');

    if (user.mfaEnabled && user.mfaSecret) {
      // Issue short-lived challenge token (signed JWT-like via signDemoToken)
      const challenge = signDemoToken({ sub: user.id, tenantId, purpose: 'mfa', ts: Date.now() } as any, process.env.JWT_SECRET || 'dev-secret', '5m');
      return res.status(401).json({ challengeRequired: true, challengeToken: challenge });
    }

    const roles = [user.role];
    const accessToken = signAccessToken({ sub: user.id, tenantId, roles }, '30m');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { tenantId, userId: user.id, token: refreshToken, expiresAt } });
    
    // Log successful login
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        entityType: 'AppUser',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'Unknown'
      }
    });
    
    res.json({ accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 1800 });
  }));

  // Refresh
  router.post('/auth/refresh', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
    const { refreshToken } = (req.body || {}) as any;
    if (!refreshToken) throw new ApiError(400, 'invalid_request', 'refreshToken is required');

    const token = await prisma.refreshToken.findFirst({ where: { tenantId, token: refreshToken } });
    if (!token || token.revokedAt) throw new ApiError(401, 'invalid_token', 'Refresh token invalid');
    if (token.expiresAt < new Date()) throw new ApiError(401, 'expired_token', 'Refresh token expired');

    const user = await prisma.appUser.findFirst({ where: { id: token.userId, tenantId } });
    if (!user) throw new ApiError(401, 'invalid_user', 'User not found');

    const roles = [user.role];
    const accessToken = signAccessToken({ sub: user.id, tenantId, roles }, '30m');
    
    // Log token refresh
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'TOKEN_REFRESH',
        entityType: 'AppUser',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'Unknown'
      }
    });
    
    res.json({ accessToken, tokenType: 'Bearer', expiresIn: 1800 });
  }));

  // Logout (revoke refresh token)
  router.post('/auth/logout', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
    const { refreshToken } = (req.body || {}) as any;
    if (!refreshToken) throw new ApiError(400, 'invalid_request', 'refreshToken is required');

    await prisma.refreshToken.updateMany({
      where: { tenantId, token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    res.status(204).end();
  }));

  // MFA: Start setup (returns secret and otpauth uri)
  router.post('/auth/mfa/setup/start', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
    const { userId } = (req as any);
    if (!userId) throw new ApiError(401, 'unauthorized', 'Login required');
    const user = await prisma.appUser.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new ApiError(404, 'not_found', 'User not found');

    const secret = randomBase32(32);
    const issuer = encodeURIComponent('UrutiIQ');
    const label = encodeURIComponent(user.email);
    const otpauth = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    // Temporarily store secret (not enabled yet)
    await prisma.appUser.update({ where: { id: user.id }, data: { mfaSecret: secret } });
    res.json({ secret, otpauth });
  }));

  // MFA: Verify and enable
  router.post('/auth/mfa/setup/verify', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
    const { userId } = (req as any);
    if (!userId) throw new ApiError(401, 'unauthorized', 'Login required');
    const { token } = mfaSetupVerify.parse(req.body);
    const user = await prisma.appUser.findFirst({ where: { id: userId, tenantId } });
    if (!user || !user.mfaSecret) throw new ApiError(400, 'mfa_not_initialized', 'Start MFA setup first');
    const ok = verifyTOTP(user.mfaSecret, token);
    if (!ok) throw new ApiError(400, 'invalid_token', 'Invalid MFA token');
    const { plain, hashed } = generateBackupCodes(10);
    await prisma.appUser.update({ where: { id: user.id }, data: { mfaEnabled: true, mfaEnabledAt: new Date(), mfaBackupCodes: hashed.join(',') } });
    res.json({ enabled: true, backupCodes: plain });
  }));

  // MFA: Disable (requires password)
  router.post('/auth/mfa/disable', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
    const { userId } = (req as any);
    if (!userId) throw new ApiError(401, 'unauthorized', 'Login required');
    const { password } = mfaDisable.parse(req.body);
    const user = await prisma.appUser.findFirst({ where: { id: userId, tenantId } });
    if (!user || !user.passwordSalt || !user.passwordHash) throw new ApiError(400, 'invalid_user', 'User not found');
    const { hash } = hashPassword(password, user.passwordSalt);
    if (hash !== user.passwordHash) throw new ApiError(401, 'invalid_credentials', 'Password incorrect');
    await prisma.appUser.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: null, mfaEnabledAt: null } });
    res.json({ disabled: true });
  }));

  // MFA: Regenerate backup codes
  router.post('/auth/mfa/backup/regenerate', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
    const { userId } = (req as any);
    if (!userId) throw new ApiError(401, 'unauthorized', 'Login required');
    mfaBackupCodesRegenerate.parse(req.body);
    const user = await prisma.appUser.findFirst({ where: { id: userId, tenantId } });
    if (!user || !user.mfaEnabled) throw new ApiError(400, 'mfa_not_enabled', 'MFA not enabled');
    const { plain, hashed } = generateBackupCodes(10);
    await prisma.appUser.update({ where: { id: user.id }, data: { mfaBackupCodes: hashed.join(',') } });
    res.json({ backupCodes: plain });
  }));

  // MFA: Verify login challenge (TOTP or backup)
  router.post('/auth/mfa/login/verify', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
    const { challengeToken, code } = mfaLoginVerify.parse(req.body);
    // Verify challenge token (decode via signDemoToken convention is not available; minimal check by storing pending state is skipped, so we rely on user lookup by token payload not available)
    // For demo purposes we accept challenge token as base64 payload {sub,tenantId}
    try {
      const raw = Buffer.from(challengeToken.split('.')[0] || '', 'base64').toString('utf8');
      const payload = JSON.parse(raw);
      if (!payload?.sub || payload?.tenantId !== tenantId) throw new Error('bad');
      const user = await prisma.appUser.findFirst({ where: { id: String(payload.sub), tenantId } });
      if (!user || !user.mfaEnabled || !user.mfaSecret) throw new ApiError(400, 'mfa_not_enabled', 'MFA not enabled');
      let ok = verifyTOTP(user.mfaSecret, code) || false;
      if (!ok && user.mfaBackupCodes) {
        const hashed = hashBackupCode(code);
        const parts = user.mfaBackupCodes.split(',').filter(Boolean);
        const idx = parts.indexOf(hashed);
        if (idx !== -1) {
          parts.splice(idx, 1); // consume
          await prisma.appUser.update({ where: { id: user.id }, data: { mfaBackupCodes: parts.join(',') } });
          ok = true;
        }
      }
      if (!ok) throw new ApiError(401, 'invalid_token', 'Invalid MFA code');
      const roles = [user.role];
      const accessToken = signAccessToken({ sub: user.id, tenantId, roles }, '30m');
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.refreshToken.create({ data: { tenantId, userId: user.id, token: refreshToken, expiresAt } });
      res.json({ accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 1800 });
    } catch {
      throw new ApiError(401, 'invalid_challenge', 'Invalid or expired challenge');
    }
  }));
}


