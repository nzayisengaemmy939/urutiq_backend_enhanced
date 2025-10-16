import OAuth2Server from 'oauth2-server';
import { Request, Response } from 'oauth2-server';
import { prisma } from '../prisma.js';
import { ApiError } from '../errors.js';
import crypto from 'crypto';

// OAuth 2.1 Scopes
export const OAUTH_SCOPES = {
  // Account Management
  READ_ACCOUNTS: 'read:accounts',
  WRITE_ACCOUNTS: 'write:accounts',
  
  // Transaction Management
  READ_TRANSACTIONS: 'read:transactions',
  WRITE_TRANSACTIONS: 'write:transactions',
  
  // Reporting
  READ_REPORTS: 'read:reports',
  WRITE_REPORTS: 'write:reports',
  
  // AI Features
  READ_AI_INSIGHTS: 'read:ai_insights',
  WRITE_AI_INSIGHTS: 'write:ai_insights',
  
  // Banking
  READ_BANKING: 'read:banking',
  WRITE_BANKING: 'write:banking',
  
  // Inventory
  READ_INVENTORY: 'read:inventory',
  WRITE_INVENTORY: 'write:inventory',
  
  // Admin
  ADMIN: 'admin',
  
  // All scopes
  ALL: '*'
} as const;

export type OAuthScope = typeof OAUTH_SCOPES[keyof typeof OAUTH_SCOPES];

// OAuth 2.1 Model Implementation
export class OAuth2Model {
  // Get client by client ID
  async getClient(clientId: string, clientSecret?: string) {
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId }
    });

    if (!client || !client.isActive) {
      throw new ApiError(401, 'INVALID_CLIENT', 'Invalid client');
    }

    if (clientSecret && client.clientSecret !== clientSecret) {
      throw new ApiError(401, 'INVALID_CLIENT', 'Invalid client secret');
    }

    return {
      id: client.id,
      clientId: client.clientId,
      clientSecret: client.clientSecret,
      redirectUris: JSON.parse(client.redirectUris || '[]'),
      grants: ['authorization_code', 'refresh_token'],
      scopes: JSON.parse(client.scopes || '[]')
    };
  }

  // Save authorization code
  async saveAuthorizationCode(code: any, client: any, user: any) {
    const authCode = await prisma.oAuthAuthorizationCode.create({
      data: {
        tenantId: user.tenantId,
        clientId: client.clientId,
        userId: user.id,
        code: code.authorizationCode,
        codeChallenge: code.codeChallenge,
        codeChallengeMethod: code.codeChallengeMethod,
        redirectUri: code.redirectUri,
        scopes: JSON.stringify(code.scope ? code.scope.split(' ') : []),
        expiresAt: code.expiresAt
      }
    });

    return {
      authorizationCode: authCode.code,
      expiresAt: authCode.expiresAt,
      redirectUri: authCode.redirectUri,
      scope: JSON.parse(authCode.scopes || '[]').join(' '),
      client: { id: client.clientId },
      user: { id: user.id }
    };
  }

  // Get authorization code
  async getAuthorizationCode(authorizationCode: string) {
    const authCode = await prisma.oAuthAuthorizationCode.findUnique({
      where: { code: authorizationCode },
      include: {
        client: true,
        user: true
      }
    });

    if (!authCode || authCode.usedAt || authCode.expiresAt < new Date()) {
      return false;
    }

    return {
      code: authCode.code,
      expiresAt: authCode.expiresAt,
      redirectUri: authCode.redirectUri,
      scope: JSON.parse(authCode.scopes || '[]').join(' '),
      client: { id: authCode.client.clientId },
      user: { id: authCode.user.id, tenantId: authCode.user.tenantId }
    };
  }

  // Revoke authorization code
  async revokeAuthorizationCode(authorizationCode: any) {
    await prisma.oAuthAuthorizationCode.update({
      where: { code: authorizationCode.authorizationCode },
      data: { usedAt: new Date() }
    });

    return true;
  }

  // Save access token
  async saveToken(token: any, client: any, user: any) {
    const accessToken = await prisma.oAuthAccessToken.create({
      data: {
        tenantId: user.tenantId,
        clientId: client.clientId,
        userId: user.id,
        token: token.accessToken,
        scopes: token.scope ? token.scope.split(' ') : [],
        expiresAt: token.accessTokenExpiresAt
      }
    });

    let refreshToken = null;
    if (token.refreshToken) {
      refreshToken = await prisma.oAuthRefreshToken.create({
        data: {
          tenantId: user.tenantId,
          clientId: client.clientId,
          userId: user.id,
          token: token.refreshToken,
          scopes: token.scope ? token.scope.split(' ') : [],
          expiresAt: token.refreshTokenExpiresAt
        }
      });
    }

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken?.token,
      refreshTokenExpiresAt: refreshToken?.expiresAt,
      scope: accessToken.scopes.join(' '),
      client: { id: client.clientId },
      user: { id: user.id }
    };
  }

  // Get access token
  async getAccessToken(accessToken: string) {
    const token = await prisma.oAuthAccessToken.findUnique({
      where: { token: accessToken },
      include: {
        client: true,
        user: true
      }
    });

    if (!token || token.expiresAt < new Date()) {
      return false;
    }

    // Update last used timestamp
    await prisma.oAuthAccessToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() }
    });

    return {
      accessToken: token.token,
      accessTokenExpiresAt: token.expiresAt,
      scope: token.scopes.join(' '),
      client: { id: token.client.clientId },
      user: { id: token.user.id, tenantId: token.user.tenantId }
    };
  }

  // Get refresh token
  async getRefreshToken(refreshToken: string) {
    const token = await prisma.oAuthRefreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        client: true,
        user: true
      }
    });

    if (!token || token.expiresAt < new Date()) {
      return false;
    }

    return {
      refreshToken: token.token,
      refreshTokenExpiresAt: token.expiresAt,
      scope: token.scopes.join(' '),
      client: { id: token.client.clientId },
      user: { id: token.user.id, tenantId: token.user.tenantId }
    };
  }

  // Revoke refresh token
  async revokeToken(token: any) {
    if (token.refreshToken) {
      await prisma.oAuthRefreshToken.deleteMany({
        where: { token: token.refreshToken }
      });
    }

    return true;
  }

  // Verify scope
  async verifyScope(token: any, scope: string) {
    const tokenScopes = token.scope ? token.scope.split(' ') : [];
    const requestedScopes = scope.split(' ');

    // Check if all requested scopes are in token scopes
    return requestedScopes.every(s => tokenScopes.includes(s) || tokenScopes.includes(OAUTH_SCOPES.ALL));
  }
}

// OAuth 2.1 Server Configuration
export const oauth2Server = new OAuth2Server({
  model: new OAuth2Model(),
  allowBearerTokensInQueryString: false,
  accessTokenLifetime: 3600, // 1 hour
  refreshTokenLifetime: 1209600, // 14 days
  allowEmptyState: false,
  allowExtendedTokenAttributes: true
});

// OAuth 2.1 Middleware
export const oauth2Middleware = (requiredScopes?: string[]) => {
  return async (req: any, res: any, next: any) => {
    try {
      const request = new Request(req);
      const response = new Response(res);

      const token = await oauth2Server.authenticate(request, response);

      if (requiredScopes && requiredScopes.length > 0) {
        const hasScope = await oauth2Server.model.verifyScope(token, requiredScopes.join(' '));
        if (!hasScope) {
          throw new ApiError(403, 'INSUFFICIENT_SCOPE', 'Insufficient scope');
        }
      }

      req.user = token.user;
      req.client = token.client;
      req.token = token;

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          error: error.code,
          error_description: error.message
        });
      }

      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Invalid or expired token'
      });
    }
  };
};

// PKCE (Proof Key for Code Exchange) Utilities
export class PKCE {
  static generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  static generateCodeChallenge(verifier: string, method: 'S256' | 'plain' = 'S256'): string {
    if (method === 'S256') {
      return crypto.createHash('sha256').update(verifier).digest('base64url');
    }
    return verifier;
  }

  static verifyCodeChallenge(
    verifier: string,
    challenge: string,
    method: 'S256' | 'plain' = 'S256'
  ): boolean {
    const expectedChallenge = this.generateCodeChallenge(verifier, method);
    return expectedChallenge === challenge;
  }
}

// OAuth 2.1 Routes
export const oauth2Routes = {
  // Authorization endpoint
  authorize: async (req: any, res: any) => {
    try {
      const request = new Request(req);
      const response = new Response(res);

      const authCode = await oauth2Server.authorize(request, response);
      res.json(authCode);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          error: error.code,
          error_description: error.message
        });
      }

      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid authorization request'
      });
    }
  },

  // Token endpoint
  token: async (req: any, res: any) => {
    try {
      const request = new Request(req);
      const response = new Response(res);

      const token = await oauth2Server.token(request, response);
      res.json(token);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          error: error.code,
          error_description: error.message
        });
      }

      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid token request'
      });
    }
  },

  // Token revocation endpoint
  revoke: async (req: any, res: any) => {
    try {
      const request = new Request(req);
      const response = new Response(res);

      await oauth2Server.revoke(request, response);
      res.status(200).end();
    } catch (error) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid revocation request'
      });
    }
  }
};
