import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// AGREEMENT SCHEMA
// ============================================
export type AgreementType = 'nda' | 'work' | 'equity' | 'safe' | 'investment';
export type AgreementStatus = 'draft' | 'sent' | 'signed' | 'active' | 'disputed' | 'completed';

export interface IAgreement extends Document {
    type: AgreementType;
    startupId: mongoose.Types.ObjectId;
    parties: mongoose.Types.ObjectId[];
    terms: {
        equityPercent?: number;
        vestingPeriod?: number;
        cliffPeriod?: number;
        deliverables?: string[];
        startDate?: Date;
        endDate?: Date;
        compensation?: number;
        valuation?: number;
        discount?: number;
        investmentAmount?: number;
        interestRate?: number;
        maturityDate?: Date;
    };
    content: string; // The core text body of the agreement
    status: AgreementStatus;
    version: number;
    signedBy: {
        userId: mongoose.Types.ObjectId;
        signedAt: Date;
        signatureHash: string;
    }[];
    pdfSnapshotUrl?: string;
    auditLog: {
        action: string;
        userId: mongoose.Types.ObjectId;
        timestamp: Date;
        metadata?: Record<string, unknown>;
    }[];
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AgreementSchema = new Schema<IAgreement>(
    {
        type: { type: String, enum: ['nda', 'work', 'equity', 'safe', 'investment'], required: true },
        startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
        parties: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        terms: {
            equityPercent: { type: Number, min: 0, max: 100 },
            vestingPeriod: { type: Number },
            cliffPeriod: { type: Number },
            deliverables: [{ type: String }],
            startDate: { type: Date },
            endDate: { type: Date },
            compensation: { type: Number },
            valuation: { type: Number },
            discount: { type: Number },
            investmentAmount: { type: Number },
            interestRate: { type: Number },
            maturityDate: { type: Date },
        },
        content: { type: String, required: true },
        status: { type: String, enum: ['draft', 'sent', 'signed', 'active', 'disputed', 'completed'], default: 'draft' },
        version: { type: Number, default: 1 },
        signedBy: [{
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            signedAt: { type: Date },
            signatureHash: { type: String },
        }],
        pdfSnapshotUrl: { type: String },
        auditLog: [{
            action: { type: String, required: true },
            userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            timestamp: { type: Date, default: Date.now },
            metadata: { type: Schema.Types.Mixed }
        }],
        expiresAt: { type: Date },
    },
    { timestamps: true }
);

AgreementSchema.index({ startupId: 1 });
AgreementSchema.index({ type: 1 });
AgreementSchema.index({ status: 1 });
AgreementSchema.index({ parties: 1 });

export const Agreement = mongoose.models.Agreement || mongoose.model<IAgreement>('Agreement', AgreementSchema);
