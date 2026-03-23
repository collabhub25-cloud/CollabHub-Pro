import { connectDB } from './src/lib/mongodb';
import mongoose from 'mongoose';

async function clearDatabase() {
  console.log('Connecting to DB...');
  await connectDB();
  console.log('Connected. Clearing collections...');
  const collections = Object.keys(mongoose.connection.collections);
  for (const collectionName of collections) {
    const collection = mongoose.connection.collections[collectionName];
    await collection.deleteMany({});
    console.log(`Cleared ${collectionName}`);
  }
  console.log('All collections cleared successfully!');
  process.exit(0);
}

clearDatabase().catch(err => {
  console.error('Error clearing database:', err);
  process.exit(1);
});
