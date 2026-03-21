import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { User, Startup, Alliance, Agreement, Milestone, FundingRound } from '../src/lib/models';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function populateAllStartups() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGODB_URI is not defined');

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected.');

        const allUsers = await User.find({}).select('_id role email name');
        const startups = await Startup.find({});

        console.log(`Found ${startups.length} startups and ${allUsers.length} users.`);

        if (allUsers.length < 2) {
            console.log('Not enough users to form teams and agreements.');
            return;
        }

        let updatedStartups = 0;
        for (const startup of startups) {
            console.log(`Processing Startup: ${startup.name}`);
            
            // 1. Team Formation
            // Ensure founder is in the team
            if (!startup.team) startup.team = [];
            let teamChanged = false;
            
            const teamSet = new Set(startup.team.map(id => id.toString()));
            if (!teamSet.has(startup.founderId.toString())) {
                startup.team.push(startup.founderId);
                teamSet.add(startup.founderId.toString());
                teamChanged = true;
            }

            // Add up to 3 random users as team members if team is small
            if (startup.team.length < 3) {
                const candidates = allUsers.filter(u => !teamSet.has(u._id.toString()));
                // Take 2 users
                const toAdd = candidates.slice(0, 2);
                for (const u of toAdd) {
                    startup.team.push(u._id);
                    teamSet.add(u._id.toString());
                    teamChanged = true;
                }
            }

            if (teamChanged) {
                await startup.save();
                console.log(`  -> Updated team for ${startup.name}. Team size: ${startup.team.length}`);
                updatedStartups++;
            }

            // 2. Agreements
            // Create a default NDA and Employment agreement if none exist
            const existingAgreements = await Agreement.countDocuments({ startupId: startup._id });
            if (existingAgreements === 0) {
                await Agreement.create({
                    type: 'nda',
                    startupId: startup._id,
                    parties: startup.team,
                    status: 'active',
                    version: 1,
                    content: `Standard Platform NDA for ${startup.name}`,
                    auditLog: [{ action: 'auto_generated', userId: startup.founderId, timestamp: new Date() }]
                });
                await Agreement.create({
                    type: 'work',
                    startupId: startup._id,
                    parties: startup.team,
                    status: 'active',
                    version: 1,
                    content: `Standard Employment Agreement for ${startup.name}`,
                    terms: { equityPercent: 5, vestingPeriod: 48 },
                    auditLog: [{ action: 'auto_generated', userId: startup.founderId, timestamp: new Date() }]
                });
                console.log(`  -> Created 2 Agreements for ${startup.name}`);
            }

            // 3. Milestones
            const existingMilestones = await Milestone.countDocuments({ startupId: startup._id });
            if (existingMilestones === 0) {
                // Assign a milestone to the first team member who is not the founder, or founder if alone
                const assigneeId = startup.team.find(id => id.toString() !== startup.founderId.toString()) || startup.founderId;
                await Milestone.create({
                    startupId: startup._id,
                    assignedTo: assigneeId,
                    title: 'MVP Launch',
                    description: 'Finalize and launch the minimal viable product for the startup.',
                    amount: 5000,
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    status: 'in_progress',
                    paymentStatus: 'pending'
                });
                await Milestone.create({
                    startupId: startup._id,
                    assignedTo: assigneeId,
                    title: 'Customer Acquisition',
                    description: 'Acquire first 100 paying customers.',
                    amount: 2000,
                    dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
                    status: 'pending',
                    paymentStatus: 'pending'
                });
                console.log(`  -> Created 2 Milestones for ${startup.name}`);
            }

            // 4. Funding Rounds
            const existingRounds = await FundingRound.countDocuments({ startupId: startup._id });
            if (existingRounds === 0) {
                await FundingRound.create({
                    startupId: startup._id,
                    roundName: 'Seed Round',
                    targetAmount: 500000,
                    raisedAmount: 150000,
                    equityOffered: 15,
                    valuation: 3333333,
                    minInvestment: 5000,
                    status: 'open',
                    closesAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                });
                console.log(`  -> Created Seed Funding Round for ${startup.name}`);
            }
        }

        console.log(`Completed population. Updated ${updatedStartups} startups.`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        console.log('Done.');
    }
}

populateAllStartups();
