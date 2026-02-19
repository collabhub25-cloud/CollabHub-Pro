/**
 * Database Migration Script
 * 
 * Purpose: Migrate existing subscription data to new monetization model
 * 
 * New Model:
 * - Founders: Paid subscription plans (free_founder, pro_founder, scale_founder, enterprise_founder)
 * - Talent: Free (no subscription required)
 * - Investor: Free (no subscription required)
 * - Admin: Free (no subscription required)
 * 
 * This script:
 * 1. Maps legacy plan names to new founder plans
 * 2. Removes subscription documents for non-founders (optional)
 * 3. Updates existing founder subscriptions with new plan names
 * 
 * Usage: npx ts-node scripts/migrate-subscriptions.ts
 */

import mongoose from 'mongoose';

// Plan mapping
const PLAN_MAPPING: Record<string, string> = {
  free: 'free_founder',
  pro: 'pro_founder',
  scale: 'scale_founder',
  premium: 'enterprise_founder',
};

// Subscription Schema (minimal for migration)
const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
  plan: { type: String, required: true },
  status: { type: String, default: 'active' },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
}, { timestamps: true });

const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function migrateSubscriptions(mongoUri: string) {
  console.log('🔄 Starting subscription migration...');
  
  // Connect to MongoDB
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');
  
  // Get all subscriptions
  const subscriptions = await Subscription.find({});
  console.log(`📊 Found ${subscriptions.length} subscriptions to process`);
  
  let updated = 0;
  let removed = 0;
  let skipped = 0;
  
  for (const subscription of subscriptions) {
    // Get the user for this subscription
    const user = await User.findById(subscription.userId);
    
    if (!user) {
      console.log(`⚠️ User not found for subscription ${subscription._id}, removing orphan`);
      await Subscription.findByIdAndDelete(subscription._id);
      removed++;
      continue;
    }
    
    // Non-founders don't need subscriptions (optional: remove or keep)
    if (user.role !== 'founder') {
      console.log(`🗑️ Removing subscription for non-founder user ${user.email} (${user.role})`);
      await Subscription.findByIdAndDelete(subscription._id);
      removed++;
      continue;
    }
    
    // Founders: Update plan name if using legacy plan
    const currentPlan = subscription.plan;
    if (PLAN_MAPPING[currentPlan]) {
      const newPlan = PLAN_MAPPING[currentPlan];
      console.log(`✏️ Updating founder ${user.email}: ${currentPlan} → ${newPlan}`);
      subscription.plan = newPlan;
      await subscription.save();
      updated++;
    } else if (currentPlan.includes('_founder')) {
      console.log(`✅ Founder ${user.email} already on new plan: ${currentPlan}`);
      skipped++;
    } else {
      // Unknown plan, default to free_founder
      console.log(`⚠️ Unknown plan "${currentPlan}" for ${user.email}, defaulting to free_founder`);
      subscription.plan = 'free_founder';
      await subscription.save();
      updated++;
    }
  }
  
  console.log('\n📈 Migration Summary:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Removed: ${removed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('✅ Migration complete!');
  
  await mongoose.disconnect();
  
  return { updated, removed, skipped };
}

// Run migration
const MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI or DATABASE_URL environment variable is required');
  process.exit(1);
}

migrateSubscriptions(MONGO_URI)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });

export { migrateSubscriptions };
