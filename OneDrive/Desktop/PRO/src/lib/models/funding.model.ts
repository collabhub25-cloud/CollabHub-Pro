import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// INVESTOR SCHEMA
// ============================================

export type FundingStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'ipo';

export interface IInvestor extends Document {
    userId: mongoose.Types.ObjectId;
    ticketSize: {
        min: number;
        max: number;
    };
    preferredIndustries: string[];
    stagePreference: FundingStage[];
    investmentThesis?: string;
    dealHistory: {
        startupId: mongoose.Types.ObjectId;
        amount: number;
        date: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const InvestorSchema = new Schema<IInvestor>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        ticketSize: {
            min: { type: Number, required: true },
            max: { type: Number, required: true },
        },
        preferredIndustries: [{ type: String }],
        stagePreference: [{ type: String, enum: ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'] }],
        investmentThesis: { type: String, maxlength: 2000 },
        dealHistory: [{
            startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
            amount: { type: Number },
            date: { type: Date },
        }],
    },
    { timestamps: true }
);

InvestorSchema.index({ userId: 1 });

export const Investor = mongoose.models.Investor || mongoose.model<IInvestor>('Investor', InvestorSchema);

// ============================================
// FUNDING ROUND SCHEMA
// ============================================
export type RoundStatus = 'open' | 'closing' | 'closed' | 'cancelled';

export interface IFundingRound extends Document {
    startupId: mongoose.Types.ObjectId;
    roundName: string;
    targetAmount: number;
    raisedAmount: number;
    equityOffered: number;
    valuation: number;
    minInvestment: number;
    status: RoundStatus;
    investors: {
        investorId: mongoose.Types.ObjectId;
        amount: number;
        equityAllocated: number;
        investedAt: Date;
    }[];
    termSheetUrl?: string;
    closesAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const FundingRoundSchema = new Schema<IFundingRound>(
    {
        startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
        roundName: { type: String, required: true },
        targetAmount: { type: Number, required: true },
        raisedAmount: { type: Number, default: 0 },
        equityOffered: { type: Number, required: true, min: 0, max: 100 },
        valuation: { type: Number, required: true },
        minInvestment: { type: Number, required: true },
        status: { type: String, enum: ['open', 'closing', 'closed', 'cancelled'], default: 'open' },
        investors: [{
            investorId: { type: Schema.Types.ObjectId, ref: 'User' },
            amount: { type: Number },
            equityAllocated: { type: Number },
            investedAt: { type: Date },
        }],
        termSheetUrl: { type: String },
        closesAt: { type: Date },
    },
    { timestamps: true }
);

FundingRoundSchema.index({ startupId: 1 });
FundingRoundSchema.index({ status: 1 });

export const FundingRound = mongoose.models.FundingRound || mongoose.model<IFundingRound>('FundingRound', FundingRoundSchema);
