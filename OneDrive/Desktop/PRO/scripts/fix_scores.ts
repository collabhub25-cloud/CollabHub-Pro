import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fixScores() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI in .env.local');

  await mongoose.connect(uri);
  console.log('Connected to DB');

  // Define minimal User schema
  const User = mongoose.model('User', new mongoose.Schema({ trustScore: Number }, { strict: false }));

  const result = await User.updateMany(
    { trustScore: { $gt: 100 } },
    { $set: { trustScore: 100 } }
  );

  console.log(`Capped ${result.modifiedCount} users whose trustScore exceeded 100.`);

  await mongoose.disconnect();
}

fixScores().catch(console.error);
