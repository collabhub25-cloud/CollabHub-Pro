import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb+srv://collabhubAdmin:murarijagansai@collabhub.18ydvxf.mongodb.net/?appName=CollabHub";
  await mongoose.connect(uri);
  // It looks like models are defined in 'src/lib/models' or similar. 
  // Let's assume we can query raw Mongoose or Prisma.
  // Actually, wait, let's just query Mongoose direct collection.
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ email: { $in: ['murarijagansai@gmail.com', 'collabhub25@gmail.com', 'jaganloveyou3000@gmail.com'] } }).toArray();

  for (const user of users) {
    console.log(`Email: ${user.email}, Role: ${user.role}, Password length: ${user.password?.length}`);
  }

  process.exit(0);
}

main().catch(console.error);
