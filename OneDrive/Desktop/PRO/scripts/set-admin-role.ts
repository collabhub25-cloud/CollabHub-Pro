/**
 * Set an existing user's role to admin in MongoDB
 * Usage: npx tsx scripts/set-admin-role.ts
 */
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key && value) process.env[key.trim()] = value.trim();
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;
const TARGET_EMAIL = 'murarijagansai@gmail.com';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function setAdminRole() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db!;
    const usersCollection = db.collection('users');

    // Find the user first
    const user = await usersCollection.findOne({ email: TARGET_EMAIL });

    if (!user) {
      console.error(`❌ User with email "${TARGET_EMAIL}" not found in database`);
      process.exit(1);
    }

    console.log(`\n📋 Found user:`);
    console.log(`   Name:  ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role:  ${user.role}`);
    console.log(`   Auth:  ${user.authProvider}`);

    if (user.role === 'admin') {
      console.log('\n✅ User already has admin role!');
    } else {
      // Update role to admin
      const result = await usersCollection.updateOne(
        { email: TARGET_EMAIL },
        { $set: { role: 'admin', verificationLevel: 5 } }
      );

      if (result.modifiedCount === 1) {
        console.log(`\n✅ Role updated: "${user.role}" → "admin"`);
      } else {
        console.error('\n❌ Update failed');
      }
    }

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║       🔐 Admin Access Ready                  ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Email: ${TARGET_EMAIL.padEnd(36)}║`);
    console.log('║  Role:  admin                                ║');
    console.log('║  Login: Google OAuth                         ║');
    console.log('║  URL:   https://alloysphere.online/admin     ║');
    console.log('╚══════════════════════════════════════════════╝');

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

setAdminRole();
