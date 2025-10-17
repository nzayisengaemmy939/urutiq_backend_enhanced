import { PrismaClient } from "@prisma/client";
// Lazy initialization to ensure DATABASE_URL is loaded
let prismaInstance = null;
export const prisma = new Proxy({}, {
    get(target, prop) {
        if (!prismaInstance) {
            if (!process.env.DATABASE_URL) {
                throw new Error('DATABASE_URL environment variable is not set. Make sure to load environment variables before using Prisma.');
            }
            prismaInstance = new PrismaClient({
                datasources: {
                    db: {
                        url: process.env.DATABASE_URL,
                    },
                },
                log: ['error', 'warn'],
            });
        }
        return prismaInstance[prop];
    }
});
