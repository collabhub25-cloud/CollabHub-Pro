import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// EMAIL PREFERENCES MODEL
// Controls which email notifications users receive
// ============================================

export interface IEmailPreferences extends Document {
  userId: mongoose.Types.ObjectId;
  emailNotifications: boolean;
  preferences: {
    jobs: boolean;
    messages: boolean;
    pitches: boolean;
    investments: boolean;
    alliances: boolean;
    applications: boolean;
    milestones: boolean;
  };
  lastEmailSent?: Date;
  emailsSentThisHour: number;
  hourWindowStart?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmailPreferencesSchema = new Schema<IEmailPreferences>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    emailNotifications: { type: Boolean, default: true },
    preferences: {
      jobs: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      pitches: { type: Boolean, default: true },
      investments: { type: Boolean, default: true },
      alliances: { type: Boolean, default: true },
      applications: { type: Boolean, default: true },
      milestones: { type: Boolean, default: true },
    },
    lastEmailSent: { type: Date },
    emailsSentThisHour: { type: Number, default: 0 },
    hourWindowStart: { type: Date },
  },
  { timestamps: true }
);

EmailPreferencesSchema.index({ userId: 1 });

export const EmailPreferences =
  mongoose.models.EmailPreferences ||
  mongoose.model<IEmailPreferences>('EmailPreferences', EmailPreferencesSchema);
