/**
 * AlloySphere 1000 User Demo Data Seed Script
 * Run: npm run db:seed-demo
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import { faker } from '@faker-js/faker';

// ── MongoDB Connection ──
const MONGODB_URI = 'mongodb+srv://collabhubAdmin:murarijagansai@collabhub.18ydvxf.mongodb.net/?appName=CollabHub';

async function connectDB() {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log('✅ Connected to MongoDB Atlas');
}

// ── Import all models ──
require('../src/lib/models/user.model');
require('../src/lib/models/startup.model');
require('../src/lib/models/agreement.model');
require('../src/lib/models/application.model');
require('../src/lib/models/funding.model');
require('../src/lib/models/message.model');
require('../src/lib/models/milestone.model');
require('../src/lib/models/verification.model');
require('../src/lib/models/misc.model');
require('../src/lib/models');

const User = mongoose.model('User');
const Startup = mongoose.model('Startup');
const Agreement = mongoose.model('Agreement');
const Application = mongoose.model('Application');
const Investor = mongoose.model('Investor');
const FundingRound = mongoose.model('FundingRound');
const Message = mongoose.model('Message');
const Conversation = mongoose.model('Conversation');
const Milestone = mongoose.model('Milestone');
const Verification = mongoose.model('Verification');
const Alliance = mongoose.model('Alliance');
const Investment = mongoose.model('Investment');
const Notification = mongoose.model('Notification');
const TrustScoreLog = mongoose.model('TrustScoreLog');

function hash(s: string) { return crypto.createHash('sha256').update(s).digest('hex'); }
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000); }
function convId(a: string, b: string) { return [a, b].sort().join('_'); }

async function seed() {
  await connectDB();
  console.log('🌱 Starting 1000-User Demo Data Seed...\n');
  
  // ── 0. Fix Existing Users Verification ──
  console.log('🔄 Verifying existing users...');
  await User.updateMany({}, { 
    $set: { 
      isEmailVerified: true, 
      verificationLevel: 2, 
      kycStatus: 'verified', 
      kycLevel: 2, 
      kycVerifiedAt: daysAgo(30) 
    } 
  });
  console.log('   ✅ Fully verified all existing users.\n');

  // Distribution settings
  const TOTAL_USERS = 1000;
  const ROLES = ['founder', 'investor', 'talent'];
  const ROLE_WEIGHTS = [0.33, 0.33, 0.34];

  // Pickers
  const INDUSTRIES = ['AI', 'SaaS', 'Fintech', 'HealthTech', 'EdTech', 'AgriTech', 'CleanTech', 'Cybersecurity', 'Web3', 'Logistics'];
  const STAGES = ['idea', 'mvp', 'validation', 'growth', 'scaling'];
  const FUNDING_STAGES = ['pre-seed', 'seed', 'series-a', 'series-b'];

  const generatedUsers: any[] = [];
  const founders: any[] = [];
  const investors: any[] = [];
  const talents: any[] = [];

  // Fetch existing users to include in relationships
  const existingUsers = await User.find({}).lean();
  for (const eu of existingUsers) {
    if (eu.role === 'founder') founders.push(eu._id);
    else if (eu.role === 'investor') investors.push(eu._id);
    else talents.push(eu._id);
  }

  // ── 1. BULK CREATE NEW USERS ──
  console.log(`👤 Generating 1000 new random users...`);
  
  // Create 1000 users exactly
  const ops = [];
  for (let i = 0; i < TOTAL_USERS; i++) {
    const roleRnd = Math.random();
    let role = 'founder';
    if (roleRnd > 0.66) role = 'talent';
    else if (roleRnd > 0.33) role = 'investor';

    const sexType = Math.random() > 0.5 ? 'male' : 'female';
    const first = faker.person.firstName(sexType);
    const last = faker.person.lastName(sexType);
    
    ops.push({
      insertOne: {
        document: {
          email: faker.internet.email({ firstName: first, lastName: last, provider: 'demo.alloysphere.io' }).toLowerCase(),
          name: `${first} ${last}`,
          role: role,
          authProvider: 'google',
          isEmailVerified: true,
          verificationLevel: 2,
          kycStatus: 'verified',
          kycLevel: 2,
          kycVerifiedAt: daysAgo(faker.number.int({min: 1, max: 100})),
          bio: faker.person.bio(),
          skills: Array.from({ length: 4 }, () => faker.word.noun()),
          experience: `${faker.number.int({min: 1, max: 15})} years in industry`,
          location: faker.location.city() + ', ' + faker.location.country(),
          linkedinUrl: `https://linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase()}`,
          lastActive: daysAgo(faker.number.int({min: 0, max: 10})),
        }
      }
    });
  }

  const userResult = await User.bulkWrite(ops);
  console.log(`   ✅ Inserted ${userResult.insertedCount} custom users.\n`);

  // Re-fetch all users to map correctly
  const allGenerated = await User.find({ email: /.*demo\.alloysphere\.io.*/ }).lean();
  for (const gu of allGenerated) {
    if (gu.role === 'founder') founders.push(gu._id);
    else if (gu.role === 'investor') investors.push(gu._id);
    else talents.push(gu._id);
  }

  const newFounderIds = allGenerated.filter(u => u.role === 'founder').map(u => u._id);
  const newInvestorIds = allGenerated.filter(u => u.role === 'investor').map(u => u._id);
  const newTalentIds = allGenerated.filter(u => u.role === 'talent').map(u => u._id);

  // ── 2. NEW USER VERIFICATIONS ──
  console.log('🔒 Establishing verifications for new users...');
  const vOps = [];
  for (const u of allGenerated) {
    vOps.push({ insertOne: { document: { userId: u._id, role: u.role, type: 'profile', level: 0, status: 'approved', submittedAt: daysAgo(35), verifiedAt: daysAgo(30) } } });
    vOps.push({ insertOne: { document: { userId: u._id, role: u.role, type: 'kyc-id', level: 1, status: 'approved', submittedAt: daysAgo(35), verifiedAt: daysAgo(30) } } });
  }
  await Verification.bulkWrite(vOps);
  console.log(`   ✅ Verifications generated.\n`);

  // ── 3. CREATE STARTUPS (1 PER FOUNDER) ──
  console.log('🏢 Creating exactly 1 startup for each founder...');
  const startupOps = [];
  
  // We only run creation on new founders to avoid breaking existing setups, but we do give each new founder 1 startup
  for (const fId of newFounderIds) {
    const startupName = faker.company.name() + (Math.random() > 0.5 ? ' AI' : ' Tech');
    startupOps.push({
      insertOne: {
        document: {
          founderId: fId,
          name: startupName,
          vision: faker.company.catchPhrase(),
          description: faker.company.catchPhraseDescriptor() + " " + faker.lorem.paragraph(),
          stage: faker.helpers.arrayElement(STAGES),
          industry: faker.helpers.arrayElement(INDUSTRIES),
          team: [], 
          rolesNeeded: [],
          fundingStage: faker.helpers.arrayElement(FUNDING_STAGES),
          fundingAmount: faker.number.int({min: 1, max: 50}) * 1000000,
          revenue: faker.number.int({min: 0, max: 10}) * 100000,
          skillsNeeded: Array.from({ length: 3 }, () => faker.word.noun()),
          pastProgress: faker.lorem.sentence(),
          achievements: faker.lorem.sentence(),
          isActive: true,
          AlloySphereVerified: true,
          AlloySphereVerifiedAt: daysAgo(10)
        }
      }
    });
  }
  await Startup.bulkWrite(startupOps);
  const allStartups = await Startup.find({}).lean();
  console.log(`   ✅ Startups synchronized. Total globally: ${allStartups.length}\n`);

  // ── 4. INVESTOR PROFILES & DEAL FLOW ──
  console.log('💼 Building investor portfolios...');
  const iOps = [];
  
  for (const invId of newInvestorIds) {
    iOps.push({
      insertOne: {
        document: {
          userId: invId,
          ticketSize: { min: faker.number.int({min: 1, max: 5}) * 1000000, max: faker.number.int({min: 10, max: 50}) * 1000000 },
          preferredIndustries: faker.helpers.arrayElements(INDUSTRIES, 3),
          stagePreference: faker.helpers.arrayElements(FUNDING_STAGES, 2),
          investmentThesis: faker.lorem.sentences(2),
          dealHistory: []
        }
      }
    });
  }
  await Investor.bulkWrite(iOps);

  console.log('📈 Distributing investments randomly globally...');
  // Randomly distribute investments
  const investmentOps = [];
  const fundingRoundOps = [];
  const agreementOps = [];
  
  for (let s of allStartups) {
    // 30% of startups have funding
    if (Math.random() > 0.7 && investors.length > 0) {
      const invCount = faker.number.int({min: 1, max: 3});
      const selectedInvIds = faker.helpers.arrayElements(investors, invCount);
      const totalRaise = faker.number.int({min: 2, max: 20}) * 1000000;
      
      const invShares = [];
      for(const invId of selectedInvIds) {
          const invAmt = totalRaise / invCount;
          
          investmentOps.push({
            insertOne: {  
                document: { startupId: s._id, investorId: invId, amount: invAmt, status: 'completed' } 
            }
          });

          // Create investment agreement
          const parties = [s.founderId, invId];
          const agreementContent = `Investment Agreement: Standard terms for investment of ₹${(invAmt/100000).toFixed(0)}L.`;
          agreementOps.push({
            insertOne: {
                document: {
                    type: 'investment',
                    startupId: s._id,
                    parties,
                    terms: { equityPercent: faker.number.int({min: 2, max: 15}), startDate: daysAgo(30), compensation: invAmt },
                    content: agreementContent,
                    status: 'signed',
                    version: 1,
                    signedBy: parties.map(p => ({ userId: p, signedAt: daysAgo(25), signatureHash: hash(`${p}-invest-${s._id.toString()}`) }))
                }
            }
          });

          invShares.push({ investorId: invId, amount: invAmt, equityAllocated: faker.number.int({min:2, max:10}), investedAt: daysAgo(10) });
      }

      fundingRoundOps.push({
          insertOne: {
              document: {
                  startupId: s._id,
                  roundName: s.fundingStage + ' Round',
                  targetAmount: totalRaise,
                  raisedAmount: totalRaise,
                  equityOffered: 15,
                  valuation: totalRaise * 6,
                  minInvestment: totalRaise / 10,
                  status: 'closed',
                  investors: invShares
              }
          }
      });
    }
  }
  
  if(investmentOps.length > 0) await Investment.bulkWrite(investmentOps);
  if(fundingRoundOps.length > 0) await FundingRound.bulkWrite(fundingRoundOps);
  if(agreementOps.length > 0) await Agreement.bulkWrite(agreementOps);
  console.log(`   ✅ Created ${investmentOps.length} global investments.\n`);

  // ── 5. MILESTONES ──
  console.log('🏁 Creating milestones for startups...');
  const milestoneOps = [];
  for (let s of allStartups) {
      milestoneOps.push({
          insertOne: { document: { startupId: s._id, title: 'Platform Launch', description: 'Launch v1', amount: 500000, dueDate: daysAgo(-15), status: 'in_progress', paymentStatus: 'pending' } }
      });
      milestoneOps.push({
          insertOne: { document: { startupId: s._id, title: 'Beta Testing', description: 'Pilot with 10 users', amount: 200000, dueDate: daysAgo(5), status: 'completed', paymentStatus: 'confirmed', completedAt: daysAgo(2) } }
      });
  }
  await Milestone.bulkWrite(milestoneOps);
  console.log(`   ✅ 2 Milestones created per startup.\n`);

  // ── 5.5. TALENT NDAS & AGREEMENTS ──
  console.log('📄 Creating Talent NDAs & Work Agreements...');
  const ndaOps = [];
  for(let i=0; i<500; i++) {
     if(talents.length === 0 || allStartups.length === 0) break;
     const s = faker.helpers.arrayElement(allStartups);
     const tId = faker.helpers.arrayElement(talents);
     const parties = [s.founderId, tId];
     
     ndaOps.push({
         insertOne: {
             document: {
                 type: faker.helpers.arrayElement(['nda', 'work']),
                 startupId: s._id,
                 parties,
                 terms: { equityPercent: faker.number.int({min: 0, max: 2}), startDate: daysAgo(30), compensation: 50000 },
                 content: `Standard Platform Agreement between ${s.name} and Talent. Includes strong NDA clauses protecting IP.`,
                 status: 'signed',
                 version: 1,
                 signedBy: parties.map(p => ({ userId: p, signedAt: daysAgo(faker.number.int({min: 1, max: 25})), signatureHash: hash(`${p}-nda-${s._id.toString()}`) }))
             }
         }
     });
  }
  if(ndaOps.length > 0) {
      await Agreement.bulkWrite(ndaOps);
      console.log(`   ✅ Created ${ndaOps.length} NDAs/Work Agreements globally.\n`);
  }

  // ── 6. ALLIANCES & MESSAGES ──
  console.log('💬 Establishing chat histories & alliances globally...');
  const allianceOps = [];
  const conversationOps = [];
  const messageOps = [];

  // Random 2000 alliances globally
  for(let i=0; i<2000; i++) {
     const pool1 = faker.helpers.arrayElement([founders, talents, investors]);
     const pool2 = faker.helpers.arrayElement([founders, talents, investors]);
     if (pool1.length === 0 || pool2.length === 0) continue;
     
     const reqId = faker.helpers.arrayElement(pool1);
     const recId = faker.helpers.arrayElement(pool2);
     if (reqId === recId) continue;

     allianceOps.push({ insertOne: { document: { requesterId: reqId, receiverId: recId, status: 'accepted', message: 'Hello, I think we have strong platform synergy!' }}});

     const cId = convId(reqId.toString(), recId.toString());
     conversationOps.push({ insertOne: { document: { participants: [reqId, recId], lastMessage: 'Looking forward to collaboration.', lastMessageAt: daysAgo(1), unreadCount: {} } }});
     messageOps.push({ insertOne: { document: { senderId: reqId, receiverId: recId, conversationId: cId, content: 'Looking forward to collaboration.', read: true, readAt: daysAgo(1), createdAt: daysAgo(1) }}});
  }

  // Deduplicate before insertion to avoid constraint violations
  const uniqueConversations = new Map();
  conversationOps.forEach(op => {
     const p = op.insertOne.document.participants;
     const id = convId(p[0].toString(), p[1].toString());
     if (!uniqueConversations.has(id)) uniqueConversations.set(id, op);
  });
  
  if(allianceOps.length > 0) await Alliance.bulkWrite(allianceOps.slice(0, 1000));
  if(uniqueConversations.size > 0) await Conversation.bulkWrite(Array.from(uniqueConversations.values()));
  if(messageOps.length > 0) await Message.bulkWrite(messageOps.slice(0, uniqueConversations.size));
  console.log(`   ✅ Alliances & Global Messaging established.\n`);

  console.log('🎉 1000 USER DEMO DATA GENERATION FINISHED!');
  process.exit(0);
}

seed().catch((err) => { console.error('❌ Seed failed:', err); process.exit(1); });
