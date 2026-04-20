import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import AdminUser from '../models/AdminUser.js';

/**
 * Seed the super admin account
 * Run: npm run seed
 */
async function seedAdmin() {
  const MONGO_URI = process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = process.env.ADMIN_EMAIL || 'admin@alloysphere.com';
    const rawPassword = process.env.ADMIN_PASSWORD || 'AlloySphere@Admin2026';

    // Check if admin already exists
    const existing = await AdminUser.findOne({ email });
    if (existing) {
      console.log(`⚠️  Admin already exists: ${email}`);
      console.log('   Updating password...');
      existing.passwordHash = await bcrypt.hash(rawPassword, 12);
      await existing.save();
      console.log('✅ Password updated successfully');
    } else {
      const passwordHash = await bcrypt.hash(rawPassword, 12);
      await AdminUser.create({
        email,
        passwordHash,
        name: 'Super Admin',
        role: 'superadmin',
        isActive: true,
      });
      console.log(`✅ Admin created: ${email}`);
    }

    console.log('\n🔐 Admin Login Credentials:');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${rawPassword}`);
    console.log(`   URL:      http://localhost:${process.env.PORT || 5000}/admin`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdmin();
