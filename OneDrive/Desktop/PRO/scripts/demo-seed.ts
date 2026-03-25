import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from '../src/lib/mongodb';
import { User, Startup, FundingRound, Milestone, Agreement } from '../src/lib/models';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedDemoData() {
  await connectDB();

  const founderEmail = 'murarijagansai@gmail.com';
  const talentEmail = 'jaganloveyou3000@gmail.com';
  const investorEmail = 'collabhub25@gmail.com';

  const founder = await User.findOne({ email: founderEmail });
  const talent = await User.findOne({ email: talentEmail });
  const investor = await User.findOne({ email: investorEmail });

  if (!founder || !talent || !investor) {
    console.log('Error: One or more key users missing from DB.');
    process.exit(1);
  }

  console.log('--- Cleaning Up Old Data ---');
  const oldStartups = await Startup.find({ founderId: founder._id });
  const oldStartupIds = oldStartups.map(s => s._id);

  if (oldStartupIds.length > 0) {
    await FundingRound.deleteMany({ startupId: { $in: oldStartupIds } });
    await Milestone.deleteMany({ startupId: { $in: oldStartupIds } });
    await Agreement.deleteMany({ startupId: { $in: oldStartupIds }, parties: { $in: [founder._id] } });
    await Startup.deleteMany({ _id: { $in: oldStartupIds } });
    console.log(`Deleted ${oldStartupIds.length} old startups and their related data.`);
  }

  console.log('--- Creating New Startup ---');
  
  // Find 5 other random users to act as team members + the main talent
  const otherTalents = await User.find({ role: 'talent', email: { $ne: talentEmail } }).limit(5);
  const teamMembers = [
    { user: talent._id, role: 'Lead Developer', joinedAt: new Date() },
    ...otherTalents.map(t => ({ user: t._id, role: 'Team Member', joinedAt: new Date() }))
  ];

  const startup = await Startup.create({
    name: 'AlloySphere DeepTech',
    vision: 'Revolutionizing the AI infrastructure landscape with scalable solutions.',
    description: 'We are building the next generation of AI collaboration and deployment platforms for enterprise teams.',
    industry: 'DeepTech',
    stage: 'mvp',
    fundingStage: 'seed',
    fundingAmount: 1500000,
    founderId: founder._id,
    isActive: true,
    team: teamMembers.map(tm => tm.user), // Note: original model might just take user IDs or objects. I will use IDs as per standard array of objectIds.
    skillsNeeded: ['React', 'Node.js', 'Python', 'Machine Learning'],
    rolesNeeded: [],
  });
  console.log(`Created startup: ${startup.name}`);

  console.log('--- Creating Milestones ---');
  await Milestone.create([
    {
      startupId: startup._id,
      title: 'MVP Launch',
      description: 'Successfully deployed core features to early access users.',
      dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      status: 'completed',
      amount: 50000,
    },
    {
      startupId: startup._id,
      title: 'Enterprise Pilot',
      description: 'Onboarding 3 enterprise clients for beta testing.',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      status: 'in_progress',
      amount: 120000,
    },
    {
      startupId: startup._id,
      title: 'Series A Preparation',
      description: 'Finalize metrics and pitch deck for Series A.',
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      status: 'pending',
      amount: 80000,
    }
  ]);
  console.log('Created 3 milestones tied ONLY to this startup.');

  console.log('--- Creating Agreements ---');
  await Agreement.create([
    {
      startupId: startup._id,
      type: 'work',
      parties: [founder._id, talent._id],
      terms: { compensation: 120000, equityPercent: 2, vestingPeriod: 48, cliffPeriod: 12 },
      status: 'signed',
      content: 'Standard Work Agreement with 4-year vesting.',
      signedAt: new Date(),
    },
    {
      startupId: startup._id,
      type: 'safe',
      parties: [founder._id, investor._id],
      terms: { valuation: 10000000, discount: 20 },
      status: 'active',
      content: 'Simple Agreement for Future Equity.',
      signedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    }
  ]);
  console.log(`Created agreements between startup & talent (${talent.name}) and investor (${investor.name}).`);

  console.log('--- Creating Funding Round ---');
  await FundingRound.create({
    startupId: startup._id,
    roundName: 'Seed Round - Lead',
    targetAmount: 2000000,
    raisedAmount: 500000,
    equityOffered: 15,
    valuation: 10000000,
    minInvestment: 50000,
    status: 'open',
    investors: [
      {
        investorId: investor._id,
        amount: 500000,
        equityAllocated: 3.75, // 500k of 2M for 15% -> ~3.75%
        investedAt: new Date()
      }
    ],
    closesAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
  });
  console.log(`Created Funding Round invested by ${investor.name}.`);

  console.log('=== DEMO DATA SEEDED SUCCESSFULLY ===');
  process.exit(0);
}

seedDemoData().catch(err => {
  console.error(err);
  process.exit(1);
});
