import mongoose from 'mongoose';

// ============================================
// PAYMENT MODEL — Referenced by Startup.profilePaymentId
// Minimal schema to satisfy AdminJS reference resolution
// ============================================
const PaymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String },
    amount: { type: Number },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
