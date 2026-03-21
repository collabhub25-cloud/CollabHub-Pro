import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { User, Startup } from '../src/lib/models';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function cleanupFounderStartups() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGODB_URI is not defined');

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email: 'murarijagansai@gmail.com' });
        if (!user) {
            console.log('User murarijagansai@gmail.com not found');
            return;
        }

        const startups = await Startup.find({ team: user._id });
        let updated = 0;

        for (const startup of startups) {
            // Keep the user in the team ONLY if they are the actual founder
            if (startup.founderId.toString() !== user._id.toString()) {
                startup.team = startup.team.filter((id: any) => id.toString() !== user._id.toString());
                await startup.save();
                updated++;
                console.log(`Removed user from team of startup: ${startup.name}`);
            }
        }

        console.log(`Complete. Removed from ${updated} startups.`);
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

cleanupFounderStartups();
