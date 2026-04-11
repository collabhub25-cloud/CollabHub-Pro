import mongoose, { Schema, Document } from 'mongoose';

export type MentorSessionStatus = 'pending_payment' | 'booked' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface IMentorSession extends Document {
  mentorId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  startupId?: mongoose.Types.ObjectId;

  // Scheduling
  scheduledAt: Date;
  duration: number; // minutes
  status: MentorSessionStatus;

  // Payment
  sessionFee: number; // in paise
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';

  // Session
  meetingLink?: string;
  topic?: string;
  notes?: string;

  // Feedback
  rating?: number; // 1-5
  feedback?: string;
  mentorFeedback?: string;

  createdAt: Date;
  updatedAt: Date;
}

const MentorSessionSchema = new Schema<IMentorSession>(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },

    scheduledAt: { type: Date, required: true },
    duration: { type: Number, required: true, enum: [30, 45, 60] },
    status: {
      type: String,
      enum: ['pending_payment', 'booked', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'pending_payment',
    },

    sessionFee: { type: Number, required: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },

    meetingLink: { type: String },
    topic: { type: String, maxlength: 500 },
    notes: { type: String, maxlength: 2000 },

    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, maxlength: 1000 },
    mentorFeedback: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

MentorSessionSchema.index({ mentorId: 1, scheduledAt: 1 });
MentorSessionSchema.index({ studentId: 1 });
MentorSessionSchema.index({ status: 1 });
MentorSessionSchema.index({ razorpayOrderId: 1 }, { sparse: true });

export const MentorSession = mongoose.models.MentorSession || mongoose.model<IMentorSession>('MentorSession', MentorSessionSchema);
