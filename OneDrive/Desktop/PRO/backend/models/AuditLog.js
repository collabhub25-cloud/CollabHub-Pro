import mongoose from 'mongoose';

// ============================================
// AUDIT LOG MODEL — Tracks all admin actions
// ============================================
const AuditLogSchema = new mongoose.Schema(
  {
    adminEmail: { type: String, required: true },
    action: { type: String, required: true }, // create, update, delete, login, logout
    resource: { type: String }, // User, Startup, Pitch, etc.
    resourceId: { type: String },
    details: { type: mongoose.Schema.Types.Mixed }, // changed fields, old/new values
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

AuditLogSchema.index({ adminEmail: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
