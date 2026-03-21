import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { User, Startup, Alliance, Agreement } from '../src/lib/models';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') }); // Also load .local if exists

async function setupAlliances() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB.');

        const targetEmails = [
            'murarijagansai@gmail.com',
            'jaganloveyou3000@gmail.com',
            'collabhub25@gmail.com'
        ];

        console.log('Searching for users...');
        const users = await User.find({ email: { $in: targetEmails } });
        
        console.log(`Found ${users.length} users.`);
        if (users.length < targetEmails.length) {
            console.warn('Some users were not found!');
            const foundEmails = users.map(u => u.email);
            console.warn('Found:', foundEmails);
            console.warn('Missing:', targetEmails.filter(e => !foundEmails.includes(e)));
            if (users.length < 2) {
                throw new Error('Need at least 2 users to form alliances.');
            }
        }

        const userIds = users.map(u => u._id);
        const murari = users.find(u => u.email === 'murarijagansai@gmail.com');

        console.log('Creating Alliances...');
        let alliancedCount = 0;
        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                const requesterId = users[i]._id;
                const receiverId = users[j]._id;

                const existingAlliance = await Alliance.findOne({
                    $or: [
                        { requesterId, receiverId },
                        { requesterId: receiverId, receiverId: requesterId }
                    ]
                });

                if (!existingAlliance) {
                    await Alliance.create({
                        requesterId,
                        receiverId,
                        status: 'accepted'
                    });
                    alliancedCount++;
                } else if (existingAlliance.status !== 'accepted') {
                    existingAlliance.status = 'accepted';
                    await existingAlliance.save();
                    alliancedCount++;
                }
            }
        }
        console.log(`Created/updated ${alliancedCount} alliances.`);

        // Create or find a Startup for team formation
        let startup = await Startup.findOne({ founderId: { $in: userIds } });
        if (!startup) {
            console.log('No startup found for these users. Creating a dummy startup...');
            const founder = murari || users[0];
            startup = await Startup.create({
                founderId: founder._id,
                name: 'CollabHub Innovation Lab',
                vision: 'Transforming the future of work',
                description: 'A cutting edge platform for global innovation.',
                stage: 'growth',
                industry: 'Technology',
                fundingStage: 'seed',
                trustScore: 90,
                team: userIds, // Add everyone to the team
                isActive: true
            });
            console.log('Created Startup:', startup.name);
        } else {
            console.log(`Found existing startup: ${startup.name}`);
            // Add missing users to team
            const teamSet = new Set(startup.team.map((id: mongoose.Types.ObjectId) => id.toString()));
            let added = false;
            for (const id of userIds) {
                if (!teamSet.has(id.toString())) {
                    startup.team.push(id);
                    added = true;
                }
            }
            if (added) {
                await startup.save();
                console.log('Updated startup team members.');
            }
        }

        // Create Agreements (NDA and Investment)
        console.log('Creating Agreements...');
        const agreementTypes = ['nda', 'investment'];
        let agreementCount = 0;

        for (const type of agreementTypes) {
            const existingAgreement = await Agreement.findOne({
                startupId: startup._id,
                type: type,
                parties: { $all: userIds }
            });

            if (!existingAgreement) {
                await Agreement.create({
                    type: type,
                    startupId: startup._id,
                    parties: userIds,
                    status: 'active',
                    version: 1,
                    content: `This is a standard ${type.toUpperCase()} agreement between all participating parties for the startup ${startup.name}. Created automatically by system.`,
                    terms: {
                        equityPercent: type === 'investment' ? 10 : undefined,
                        compensation: type === 'investment' ? 100000 : undefined,
                        deliverables: ['Product MVP', 'Market Strategy'],
                    },
                    auditLog: [{
                        action: 'created_by_admin',
                        userId: users[0]._id, // Use the first user as admin logger
                        timestamp: new Date()
                    }]
                });
                agreementCount++;
            }
        }
        console.log(`Created ${agreementCount} agreements.`);

        console.log('Setup finished successfully.');
    } catch (error) {
        console.error('Error in setup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

setupAlliances();
