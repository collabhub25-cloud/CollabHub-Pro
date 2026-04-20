import mongoose from 'mongoose';

// ============================================
// ADMIN USER MODEL — Separate admin auth collection
// Only for admin panel login, NOT for platform users
// ============================================
const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: 'Admin' },
    role: { type: String, enum: ['superadmin', 'admin', 'moderator'], default: 'superadmin' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);
