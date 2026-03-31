import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// USER SCHEMA
// ============================================
export type UserRole = 'founder' | 'talent' | 'investor' | 'admin';
export type VerificationLevel = 0 | 1 | 2 | 3 | 4 | 5;


export interface IUser extends Document {
    email: string;
    passwordHash?: string;
    googleId?: string;
    authProvider: 'local' | 'google';
    name: string;
    role: UserRole;
    avatar?: string;
    verificationLevel: VerificationLevel;


    bio?: string;
    skills?: string[];
    interestedRoles?: string[];
    experience?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    location?: string;
    isEmailVerified: boolean;
    verificationOtpHash?: string;
    verificationOtpExpires?: Date;
    verificationOtpAttempts?: number;
    resetPasswordOtpHash?: string;
    resetPasswordOtpExpires?: Date;
    resetPasswordOtpAttempts?: number;
    lastActive?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: false }, // Optional for Google Auth users
        googleId: { type: String, sparse: true, unique: true },
        authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
        name: { type: String, required: true, trim: true },
        role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
        avatar: { type: String },
        verificationLevel: { type: Number, enum: [0, 1, 2, 3, 4, 5], default: 0 },


        bio: { type: String, maxlength: 1000 },
        skills: [{ type: String }],
        interestedRoles: [{ type: String }],
        experience: { type: String },
        githubUrl: { type: String },
        linkedinUrl: { type: String },
        portfolioUrl: { type: String },
        location: { type: String },
        isEmailVerified: { type: Boolean, default: false },
        verificationOtpHash: { type: String },
        verificationOtpExpires: { type: Date },
        verificationOtpAttempts: { type: Number, default: 0 },
        resetPasswordOtpHash: { type: String },
        resetPasswordOtpExpires: { type: Date },
        resetPasswordOtpAttempts: { type: Number, default: 0 },
        lastActive: { type: Date },
    },
    { timestamps: true }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });


export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
