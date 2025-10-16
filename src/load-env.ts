// Load environment variables before any other imports
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Debug: Log that environment variables are loaded
console.log('🔧 Environment variables loaded');
console.log('🔧 PORT_BACKEND:', process.env.PORT_BACKEND);
console.log('🔧 DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔧 JWT_SECRET exists:', !!process.env.JWT_SECRET);
