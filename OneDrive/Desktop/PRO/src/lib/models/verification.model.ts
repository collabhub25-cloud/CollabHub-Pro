import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from './user.model';

// ============================================
// VERIFICATION SCHEMA (Role-Based)
// ============================================
export type VerificationLevelType = 0 | 1 | 2 | 3 | 4 | 5;
export type VerificationStatus = 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected';
export type VerificationType = 'profile' | 'skill_test' | 'resume' | 'kyc-id' | 'kyc-business' | 'nda';

// Role-based verification level definitions
export const VERIFICATION_LEVELS = {
    talent: [
        { level: 0, type: 'profile' as const, name: 'Profile Completion', description: 'Complete your profile information' },
        { level: 1, type: 'email_verified' as const, name: 'Email Verified', description: 'Verify your email address' },
        { level: 2, type: 'resume' as const, name: 'Resume Upload', description: 'Upload your resume' },
        { level: 3, type: 'skill_test' as const, name: 'Skill Test Passed', description: 'Pass a skill assessment test' },
        { level: 4, type: 'kyc-id' as const, name: 'ID Uploaded', description: 'Upload ID proof for identity verification' },
        { level: 5, type: 'nda' as const, name: 'NDA Signed', description: 'Sign the Non-Disclosure Agreement' },
    ],
    founder: [
        { level: 0, type: 'profile' as const, name: 'Profile Completion', description: 'Complete your profile information' },
        { level: 1, type: 'kyc-business' as const, name: 'Business KYC', description: 'Upload company registration' },
        { level: 2, type: 'kyc-id' as const, name: 'ID Uploaded', description: 'Upload ID proof for identity verification' },
    ],
    investor: [
        { level: 0, type: 'profile' as const, name: 'Profile Completion', description: 'Complete your profile information' },
        { level: 1, type: 'kyc-id' as const, name: 'ID Uploaded', description: 'Upload ID proof for identity verification' },
        { level: 2, type: 'accredited_proof' as const, name: 'Accreditation', description: 'Verify accredited status' },
    ],
    admin: [],
};

export interface IVerification extends Document {
    userId: mongoose.Types.ObjectId;
    role: UserRole;
    type: VerificationType;
    level: VerificationLevelType;
    status: VerificationStatus;
    userEmail?: string; // Denormalized for query ease
    documents?: {
        type: string;
        url: string;
        fileName?: string;
        fileSize?: number;
        uploadedAt: Date;
    }[];
    documentUrl?: string; // Top-level URL for KYC/NDAs
    testScore?: number;
    testPassed?: boolean;
    resumeUrl?: string;
    resumeFileName?: string;
    ndaSignedAt?: Date;
    ndaSignatureHash?: string;
    notes?: string;                 // Admin notes
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    submittedAt?: Date;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const VerificationSchema = new Schema<IVerification>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
        type: { type: String, enum: ['profile', 'skill_test', 'resume', 'kyc-id', 'kyc-business', 'nda'], required: true },
        level: { type: Number, enum: [0, 1, 2, 3, 4, 5], required: true },
        status: { type: String, enum: ['pending', 'submitted', 'under_review', 'approved', 'rejected'], default: 'pending' },
        userEmail: { type: String },
        documents: [{
            type: { type: String },
            url: { type: String },
            fileName: { type: String },
            fileSize: { type: Number },
            uploadedAt: { type: Date },
        }],
        documentUrl: { type: String },
        testScore: { type: Number },
        testPassed: { type: Boolean },
        resumeUrl: { type: String },
        resumeFileName: { type: String },
        ndaSignedAt: { type: Date },
        ndaSignatureHash: { type: String },
        notes: { type: String, maxlength: 1000 },
        verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: { type: Date },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: { type: Date },
        submittedAt: { type: Date },
        rejectionReason: { type: String },
    },
    { timestamps: true }
);

VerificationSchema.index({ userId: 1, type: 1 });
VerificationSchema.index({ userId: 1, role: 1 });
VerificationSchema.index({ status: 1 });

export const Verification = mongoose.models.Verification || mongoose.model<IVerification>('Verification', VerificationSchema);
