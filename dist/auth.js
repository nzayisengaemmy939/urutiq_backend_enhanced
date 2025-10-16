import jwt from "jsonwebtoken";
export function signDemoToken(payload, secret, expiresIn = "60m") {
    // jwt.sign has overloads; provide options as SignOptions via any to satisfy TS in this codebase
    return jwt.sign(payload, secret, { expiresIn });
}
export function authMiddleware(secret) {
    return function (req, res, next) {
        console.log('🔍 authMiddleware called for:', req.path, req.method);
        console.log('🔍 authMiddleware using secret:', secret);
        const auth = req.headers["authorization"];
        if (!auth || !auth.startsWith("Bearer ")) {
            console.log('❌ authMiddleware: Missing or invalid authorization header');
            return res.status(401).json({ error: "missing_token" });
        }
        const token = auth.slice("Bearer ".length);
        console.log('🔍 authMiddleware: Token to verify:', token);
        try {
            const decoded = jwt.verify(token, secret);
            req.user = decoded;
            console.log('✅ authMiddleware: Token verified, user:', {
                sub: decoded.sub,
                tenantId: decoded.tenantId,
                roles: decoded.roles
            });
            const requestTenant = req.header("x-tenant-id");
            if (requestTenant && decoded.tenantId && requestTenant !== decoded.tenantId) {
                console.log('❌ authMiddleware: Tenant mismatch');
                return res.status(403).json({ error: "tenant_mismatch" });
            }
            next();
        }
        catch (e) {
            console.log('❌ authMiddleware: Token verification failed:', e);
            return res.status(401).json({ error: "invalid_token" });
        }
    };
}
export function requireRoles(required) {
    return function (req, res, next) {
        console.log('🔍 requireRoles middleware called:', {
            required,
            user: req.user,
            roles: req.user?.roles || [],
            path: req.path,
            method: req.method
        });
        const roles = req.user?.roles || [];
        const ok = required.some(r => roles.includes(r));
        console.log('🔍 requireRoles check:', {
            roles,
            required,
            ok
        });
        if (!ok) {
            console.log('❌ requireRoles: Access denied');
            return res.status(403).json({ error: "forbidden" });
        }
        console.log('✅ requireRoles: Access granted');
        next();
    };
}
