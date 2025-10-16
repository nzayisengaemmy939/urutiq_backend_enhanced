import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import multer from 'multer';
const ROOT = path.resolve(process.cwd(), 'uploads');
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
export function tenantCompanyDir(tenantId, companyId) {
    const dir = path.join(ROOT, tenantId, companyId);
    ensureDir(dir);
    return dir;
}
export function computeSha256(filePath) {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    return new Promise((resolve, reject) => {
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}
export function createMulter(tenantId, companyId) {
    const dest = tenantCompanyDir(tenantId, companyId);
    const storage = multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, dest),
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname || '');
            cb(null, `${Date.now()}${ext}`);
        }
    });
    return multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB
}
export function localFilePath(storageKey) {
    return path.isAbsolute(storageKey) ? storageKey : path.join(ROOT, storageKey);
}
