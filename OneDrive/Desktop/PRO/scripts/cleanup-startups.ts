import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from '../src/lib/mongodb';
import { User, Startup } from '../src/lib/models';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function cleanupStartups() {
  await connectDB();
  
  const email = 'murarijagansai@gmail.com';
  const founder = await User.findOne({ email });
  
  if (!founder) {
    console.log(`Founder ${email} not found.`);
    process.exit(0);
  }

  const startups = await Startup.find({ founderId: founder._id }).sort({ createdAt: 1 });
  
  console.log(`Found ${startups.length} startups for ${email}.`);
  
  if (startups.length <= 1) {
    console.log('No extra startups to delete.');
    process.exit(0);
  }

  // Keep the first one, delete the rest
  const startupToKeep = startups[0];
  const startupsToDelete = startups.slice(1);
  const idsToDelete = startupsToDelete.map(s => s._id);

  console.log(`Keeping startup: ${startupToKeep.name} (${startupToKeep._id})`);
  console.log(`Deleting ${idsToDelete.length} extra startups...`);

  await Startup.deleteMany({ _id: { $in: idsToDelete } });
  
  console.log('Cleanup complete.');
  process.exit(0);
}

cleanupStartups().catch(console.error);
