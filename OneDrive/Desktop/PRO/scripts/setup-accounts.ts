import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// User Schema
const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
  avatar: { type: String },
  verificationLevel: { type: Number, enum: [0, 1, 2, 3, 4, 5], default: 0 },
  trustScore: { type: Number, default: 50, min: 0, max: 100 },
  kycStatus: { type: String, enum: ['not_submitted', 'pending', 'verified', 'rejected'], default: 'not_submitted' },
  kycLevel: { type: Number, enum: [0, 1, 2], default: 0 },
  kycVerifiedAt: { type: Date },
  kycVerifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  bio: { type: String, maxlength: 1000 },
  skills: [{ type: String }],
  experience: { type: String },
  githubUrl: { type: String },
  linkedinUrl: { type: String },
  portfolioUrl: { type: String },
  location: { type: String },
  isEmailVerified: { type: Boolean, default: false },
}, { timestamps: true });

// Verification Schema
const VerificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
  type: { type: String, required: true },
  level: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'submitted', 'under_review', 'approved', 'rejected'], default: 'pending' },
  userEmail: { type: String },
  verifiedAt: { type: Date },
}, { timestamps: true });

// Subscription Schema
const SubscriptionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
  plan: { type: String, default: 'free' },
  status: { type: String, default: 'active' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Verification = mongoose.models.Verification || mongoose.model('Verification', VerificationSchema);
const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);

async function main() {
  const uri = "mongodb+srv://collabhubAdmin:murarijagansai@collabhub.18ydvxf.mongodb.net/?appName=CollabHub";
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const passwordHash = await bcrypt.hash('1949Love@@', 10);

  const accounts = [
    { 
      email: 'murarijagansai@gmail.com', 
      name: 'Murari Jagan Sai', 
      role: 'founder',
      plan: 'pro_founder',
      verifications: [
        { type: 'profile', level: 0 },
        { type: 'kyc-business', level: 1 },
        { type: 'kyc-id', level: 2 }
      ]
    },
    { 
      email: 'collabhub25@gmail.com', 
      name: 'CollabHub Investments', 
      role: 'investor',
      plan: 'premium',
      verifications: [
        { type: 'profile', level: 0 },
        { type: 'kyc-id', level: 1 },
        { type: 'accredited_proof', level: 2 }
      ]
    },
    { 
      email: 'jaganloveyou3000@gmail.com', 
      name: 'Jagan Sai', 
      role: 'talent',
      plan: 'pro',
      verifications: [
        { type: 'profile', level: 0 },
        { type: 'resume', level: 1 },
        { type: 'skill_test', level: 2 },
        { type: 'kyc-id', level: 3 },
        { type: 'nda', level: 4 }
      ]
    }
  ];

  for (const account of accounts) {
    // 1. Update User
    const user = await User.findOneAndUpdate(
      { email: account.email },
      { 
        $set: {
          passwordHash,
          name: account.name,
          role: account.role,
          verificationLevel: account.role === 'talent' ? 5 : account.role === 'founder' ? 3 : 3, // Max levels
          trustScore: 100,
          kycStatus: 'verified',
          kycLevel: 2,
          isEmailVerified: true,
          lastActive: new Date(),
        } 
      },
      { new: true, upsert: true }
    );
    console.log(`Updated User: ${user.email}`);

    // 2. Add Verifications
    for (const v of account.verifications) {
      await Verification.findOneAndUpdate(
        { userId: user._id, type: v.type },
        { 
          $set: {
            role: user.role,
            level: v.level,
            status: 'approved',
            userEmail: user.email,
            verifiedAt: new Date()
          } 
        },
        { upsert: true }
      );
    }
    console.log(`Updated Verifications for ${user.email}`);

    // 3. Add Subscription
    await Subscription.findOneAndUpdate(
      { userId: user._id },
      { 
        $set: {
          role: user.role,
          plan: account.plan,
          status: 'active'
        } 
      },
      { upsert: true }
    );
    console.log(`Updated Subscription for ${user.email}`);
  }

  console.log('\n🎉 Setup complete! All 3 accounts are now fully verified and active.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
