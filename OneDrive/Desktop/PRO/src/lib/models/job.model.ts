import mongoose, { Schema, Document } from 'mongoose';

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'cofounder';
export type LocationType = 'remote' | 'onsite' | 'hybrid';

export interface IJob extends Document {
    startupId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    skillsRequired: string[];
    experienceLevel: ExperienceLevel;
    employmentType: EmploymentType;
    locationType: LocationType;
    compensation: {
        minSalary?: number;
        maxSalary?: number;
        currency: string;
        equityRange?: string;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
    {
        startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
        title: { type: String, required: true, trim: true, maxlength: 100 },
        description: { type: String, required: true, maxlength: 5000 },
        skillsRequired: [{ type: String, trim: true }],
        experienceLevel: { 
            type: String, 
            enum: ['entry', 'mid', 'senior', 'lead', 'executive'], 
            required: true 
        },
        employmentType: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'internship', 'cofounder'],
            required: true,
            default: 'full-time'
        },
        locationType: { 
            type: String, 
            enum: ['remote', 'onsite', 'hybrid'], 
            required: true,
            default: 'remote'
        },
        compensation: {
            minSalary: { type: Number },
            maxSalary: { type: Number },
            currency: { type: String, default: 'USD' },
            equityRange: { type: String }
        },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

JobSchema.index({ startupId: 1 });
JobSchema.index({ isActive: 1 });
JobSchema.index({ skillsRequired: 1 });
JobSchema.index({ experienceLevel: 1 });

export const Job = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
