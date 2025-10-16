import { MongoClient, Db, GridFSBucket } from 'mongodb';

interface MongoDBConfig {
  url: string;
  dbName: string;
}

class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private gridFS: GridFSBucket | null = null;
  private config: MongoDBConfig;

  constructor() {
    this.config = {
      url: process.env.MONGO_URL || process.env.MONGODB_URL || 'mongodb://localhost:27017',
      dbName: process.env.MONGODB_DB_NAME || 'urutiq_files'
    };
  }

  async connect(): Promise<void> {
    try {
      this.client = new MongoClient(this.config.url);
      await this.client.connect();
      this.db = this.client.db(this.config.dbName);
      this.gridFS = new GridFSBucket(this.db);
      
      console.log('✅ MongoDB connected successfully');
      console.log(`📁 Database: ${this.config.dbName}`);
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.gridFS = null;
      console.log('🔌 MongoDB disconnected');
    }
  }

  getDatabase(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  getGridFS(): GridFSBucket {
    if (!this.gridFS) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.gridFS;
  }

  isConnected(): boolean {
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
} as const;

export default mongoService;
