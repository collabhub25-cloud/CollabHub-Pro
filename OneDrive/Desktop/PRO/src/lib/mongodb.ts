import mongoose from 'mongoose';

// SECURITY: MongoDB URI comes from environment variable - NO HARDCODED CREDENTIALS
// The fallback allows development but logs a warning
const getMongoUri = () => {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error('⚠️ MONGODB_URI not set - check your .env.local file');
    return '__MONGO_URI_NOT_SET__';
  }
  return uri;
};

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * Connect to MongoDB
 * SECURITY: Uses environment variable for connection string - no hardcoded credentials
 */
export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const mongoUri = getMongoUri();
    
    // Check if URI is properly configured
    if (mongoUri === '__MONGO_URI_NOT_SET__') {
      throw new Error('MONGODB_URI environment variable is not set. Please configure it in .env.local');
    }

    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(mongoUri, opts)
      .then((mongoose) => {
        console.log('✅ MongoDB Atlas connected successfully');
        console.log(`   Database: ${mongoose.connection.name}`);
        console.log(`   Host: ${mongoose.connection.host}`);
        return mongoose;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection error:', error.message);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function disconnectDB() {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('MongoDB disconnected');
  }
}

export async function getDBStatus() {
  try {
    const conn = await connectDB();
    return {
      connected: true,
      database: conn.connection.name,
      host: conn.connection.host,
      readyState: conn.connection.readyState,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default connectDB;
