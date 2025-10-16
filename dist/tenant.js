export function tenantMiddleware(headerName = "x-tenant-id", options = {}) {
    const publicPrefixes = options.publicPaths || [];
    return function (req, res, next) {
        console.log('🔍 tenantMiddleware called for:', req.path, req.method);
        const isPublic = publicPrefixes.some((prefix) => req.path.startsWith(prefix));
        if (isPublic) {
            console.log('✅ tenantMiddleware: Public path, skipping');
            return next();
        }
        const headerVal = req.header(headerName);
        console.log('🔍 tenantMiddleware: Header value:', headerVal);
        if (!headerVal) {
            console.log('❌ tenantMiddleware: Missing tenant header');
            return res
                .status(400)
                .json({ error: "missing_tenant", message: `Header ${headerName} is required` });
        }
        req.tenantId = String(headerVal);
        console.log('✅ tenantMiddleware: Tenant ID set:', req.tenantId);
        next();
    };
}
