import { MongoClient, GridFSBucket } from 'mongodb';
class MongoDBService {
    client = null;
    db = null;
    gridFS = null;
    config;
    constructor() {
        this.config = {
            url: process.env.MONGO_URL || process.env.MONGODB_URL || 'mongodb://localhost:27017',
            dbName: process.env.MONGODB_DB_NAME || 'urutiq_files'
        };
    }
    async connect() {
        try {
            this.client = new MongoClient(this.config.url);
            await this.client.connect();
            this.db = this.client.db(this.config.dbName);
            this.gridFS = new GridFSBucket(this.db);
            console.log('✅ MongoDB connected successfully');
            console.log(`📁 Database: ${this.config.dbName}`);
        }
        catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            this.gridFS = null;
            console.log('🔌 MongoDB disconnected');
        }
    }
    getDatabase() {
        if (!this.db) {
            throw new Error('MongoDB not connected. Call connect() first.');
        }
        return this.db;
    }
    getGridFS() {
        if (!this.gridFS) {
            throw new Error('MongoDB not connected. Call connect() first.');
        }
        return this.gridFS;
    }
    isConnected() {
        return this.client !== null && this.db !== null;
    }
}
// Singleton instance
export const mongoService = new MongoDBService();
// File storage collections
export const COLLECTIONS = {
    FILES: 'files',
    DOCUMENTS: 'documents',
    VIDEOS: 'videos',
    IMAGES: 'images'
};
export default mongoService;
