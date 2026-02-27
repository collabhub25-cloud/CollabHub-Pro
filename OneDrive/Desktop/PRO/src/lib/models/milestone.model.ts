import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// MILESTONE SCHEMA
// ============================================
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'disputed';
export type PaymentStatus = 'pending' | 'marked_paid' | 'confirmed' | 'disputed';

export interface IMilestone extends Document {
    startupId: mongoose.Types.ObjectId;
    assignedTo: mongoose.Types.ObjectId;
    agreementId?: mongoose.Types.ObjectId;
    title: string;
    description: string;
    amount: number;
    dueDate: Date;
    status: MilestoneStatus;

    // Off-platform Payment Tracking
    paymentStatus: PaymentStatus;
    paymentMethod?: string;
    paymentProofUrl?: string;
    transactionReference?: string;
    paidAt?: Date;
    confirmedAt?: Date;

    completedAt?: Date;
    approvedAt?: Date;
    notes?: string;
    attachments?: string[];
    mediaUrls?: string[];
    createdAt: Date;
    updatedAt: Date;
}

const MilestoneSchema = new Schema<IMilestone>(
    {
        startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
        assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        agreementId: { type: Schema.Types.ObjectId, ref: 'Agreement' },
        title: { type: String, required: true },
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'disputed'], default: 'pending' },

        paymentStatus: { type: String, enum: ['pending', 'marked_paid', 'confirmed', 'disputed'], default: 'pending' },
        paymentMethod: { type: String },
        paymentProofUrl: { type: String },
        transactionReference: { type: String },
        paidAt: { type: Date },
        confirmedAt: { type: Date },

        completedAt: { type: Date },
        approvedAt: { type: Date },
        notes: { type: String },
        attachments: [{ type: String }],
        mediaUrls: [{ type: String }],
    },
    { timestamps: true }
);

MilestoneSchema.index({ startupId: 1 });
MilestoneSchema.index({ assignedTo: 1 });
MilestoneSchema.index({ status: 1 });
MilestoneSchema.index({ paymentStatus: 1 });

export const Milestone = mongoose.models.Milestone || mongoose.model<IMilestone>('Milestone', MilestoneSchema);
