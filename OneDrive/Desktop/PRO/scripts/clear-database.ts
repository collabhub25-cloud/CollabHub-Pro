import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function clearDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI in .env.local');

  await mongoose.connect(uri);
  console.log('Connected to DB');

  const collections = await mongoose.connection.db!.listCollections().toArray();

  for (const col of collections) {
    const name = col.name;
    // Skip system collections
    if (name.startsWith('system.')) continue;

    const result = await mongoose.connection.db!.collection(name).deleteMany({});
    console.log(`Cleared ${name}: ${result.deletedCount} documents removed`);
  }

  console.log('\nAll platform data cleared successfully.');
  await mongoose.disconnect();
}

clearDatabase().catch(console.error);
