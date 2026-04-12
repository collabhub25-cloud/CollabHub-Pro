/**
 * MongoDB Index Creation Script
 * Run with: npx tsx scripts/db-indexes.ts
 *
 * Creates indexes for frequently queried fields to optimize query performance.
 * Safe to run multiple times — createIndex is idempotent.
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

async function createIndexes() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set. Set it in .env.local');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('❌ Could not get database instance');
    process.exit(1);
  }

  const indexes: { collection: string; index: Record<string, 1 | -1>; options?: mongoose.mongo.CreateIndexesOptions }[] = [
    // ==================
    // USERS
    // ==================
    { collection: 'users', index: { email: 1 }, options: { unique: true, name: 'idx_users_email' } },
    { collection: 'users', index: { role: 1, updatedAt: -1 }, options: { name: 'idx_users_role_updated' } },
    { collection: 'users', index: { role: 1, verificationLevel: -1 }, options: { name: 'idx_users_role_verification' } },

    // ==================
    // STARTUPS
    // ==================
    { collection: 'startups', index: { founderId: 1 }, options: { name: 'idx_startups_founder' } },
    { collection: 'startups', index: { isActive: 1, createdAt: -1 }, options: { name: 'idx_startups_active_created' } },
    { collection: 'startups', index: { isActive: 1, industry: 1 }, options: { name: 'idx_startups_active_industry' } },
    { collection: 'startups', index: { isActive: 1, fundingStage: 1 }, options: { name: 'idx_startups_active_funding' } },

    // ==================
    // JOBS
    // ==================
    { collection: 'jobs', index: { startupId: 1, isActive: 1 }, options: { name: 'idx_jobs_startup_active' } },
    { collection: 'jobs', index: { isActive: 1, createdAt: -1 }, options: { name: 'idx_jobs_active_created' } },

    // ==================
    // APPLICATIONS
    // ==================
    { collection: 'applications', index: { startupId: 1, status: 1 }, options: { name: 'idx_applications_startup_status' } },
    { collection: 'applications', index: { talentId: 1, status: 1 }, options: { name: 'idx_applications_talent_status' } },
    { collection: 'applications', index: { startupId: 1, createdAt: -1 }, options: { name: 'idx_applications_startup_created' } },

    // ==================
    // NOTIFICATIONS
    // ==================
    { collection: 'notifications', index: { userId: 1, createdAt: -1 }, options: { name: 'idx_notifications_user_created' } },
    { collection: 'notifications', index: { userId: 1, read: 1 }, options: { name: 'idx_notifications_user_read' } },

    // ==================
    // INVESTMENTS
    // ==================
    { collection: 'investments', index: { investorId: 1 }, options: { name: 'idx_investments_investor' } },
    { collection: 'investments', index: { startupId: 1 }, options: { name: 'idx_investments_startup' } },

    // ==================
    // MILESTONES
    // ==================
    { collection: 'milestones', index: { startupId: 1, status: 1 }, options: { name: 'idx_milestones_startup_status' } },

    // ==================
    // PITCHES
    // ==================
    { collection: 'pitches', index: { startupId: 1, pitchStatus: 1 }, options: { name: 'idx_pitches_startup_status' } },
    { collection: 'pitches', index: { investorId: 1 }, options: { name: 'idx_pitches_investor' } },

    // ==================
    // TEAM MEMBERS
    // ==================
    { collection: 'teammembers', index: { userId: 1, startupId: 1 }, options: { name: 'idx_team_user_startup', unique: true } },
    { collection: 'teammembers', index: { startupId: 1, status: 1 }, options: { name: 'idx_team_startup_status' } },

    // ==================
    // ACHIEVEMENTS
    // ==================
    { collection: 'achievements', index: { startupId: 1, createdAt: -1 }, options: { name: 'idx_achievements_startup_created' } },
  ];

  let created = 0;
  let skipped = 0;

  for (const { collection, index, options } of indexes) {
    try {
      await db.collection(collection).createIndex(index, options || {});
      console.log(`  ✅ ${collection}: ${JSON.stringify(index)}`);
      created++;
    } catch (error: any) {
      if (error.code === 85 || error.code === 86) {
        // Index already exists with different options — skip
        console.log(`  ⏭️  ${collection}: ${JSON.stringify(index)} (already exists)`);
        skipped++;
      } else {
        console.error(`  ❌ ${collection}: ${JSON.stringify(index)} — ${error.message}`);
      }
    }
  }

  console.log(`\n📊 Done: ${created} created, ${skipped} skipped, ${indexes.length} total`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

createIndexes().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
