/**
 * Create an Admin User for the AlloySphere Platform
 * 
 * This script creates a user with role='admin' in your MongoDB database.
 * The admin can then log in via the normal /login page and access /admin.
 * 
 * Usage:
 *   npx tsx scripts/create-admin.ts
 * 
 * Environment:
 *   Reads MONGODB_URI from .env.local
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
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

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// ----- CONFIGURE YOUR ADMIN CREDENTIALS HERE -----
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@alloysphere.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AlloySphere@Admin2026';
const ADMIN_NAME = process.env.ADMIN_NAME || 'AlloySphere Admin';
// --------------------------------------------------

// User Schema (matches src/lib/models/user.model.ts)
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, sparse: true, unique: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
    avatar: { type: String },
    verificationLevel: { type: Number, enum: [0, 1, 2, 3, 4, 5], default: 0 },
    bio: { type: String, maxlength: 1000 },
    skills: [{ type: String }],
    isEmailVerified: { type: Boolean, default: false },
    lastActive: { type: Date },
  },
  { timestamps: true }
);

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Check if admin exists
    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      console.log(`⚠️  Admin user already exists: ${ADMIN_EMAIL}`);
      
      // Update password and ensure role is admin
      existing.passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      existing.role = 'admin';
      existing.isEmailVerified = true;
      existing.verificationLevel = 5;
      await existing.save();
      
      console.log('✅ Password updated & role confirmed as admin');
    } else {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await User.create({
        email: ADMIN_EMAIL,
        passwordHash,
        authProvider: 'local',
        name: ADMIN_NAME,
        role: 'admin',
        isEmailVerified: true,
        verificationLevel: 5,
      });
      console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
    }

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║       🔐 Admin Login Credentials             ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Email:    ${ADMIN_EMAIL.padEnd(33)}║`);
    console.log(`║  Password: ${ADMIN_PASSWORD.padEnd(33)}║`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  Login at:  /login                           ║');
    console.log('║  Admin at:  /admin                           ║');
    console.log('╚══════════════════════════════════════════════╝');

  } catch (err: any) {
    console.error('❌ Failed to create admin:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
