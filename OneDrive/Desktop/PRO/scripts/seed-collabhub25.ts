require('dotenv').config({ path: '.env.local' });
const { connectDB } = require('../src/lib/mongodb');
const { User, Startup, FundingRound, Alliance } = require('../src/lib/models');
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');

// Use CommonJS requires for local files inside scripts to bypass TS Node module issues
async function seedInvestorData() {
  try {
    await connectDB();
    const email = 'collabhub25@gmail.com';
    let investor = await User.findOne({ email });

    if (!investor) {
      console.log('Creating investor collabhub25@gmail.com');
      investor = await User.create({
        name: 'Arun Kumar',
        email,
        role: 'investor',
        verificationLevel: 3,
        bio: 'Tech investor focused on early-stage B2B SaaS and CleanTech startups in India. Managing Partner at VentureTech Capital.',
        location: 'Mumbai, India',
        avatar: faker.image.avatar()
      });
    }

    // Ensure they have proper fields
    investor.name = 'Rahul Sharma';
    investor.bio = 'Experienced early-stage investor focusing on DeepTech, SaaS, and Clean energy. Looking to back visionary founders from India building global products. Over $50M deployed across 20+ startups.';
    investor.location = 'Mumbai, India';
    investor.verificationLevel = 3;
    investor.experience = 'Managing Partner at Nexus India Ventures (2015 - Present). Leading investments in early-stage tech startups.';

    // Create a real founder user to associate
    let founder = await User.findOne({ email: 'murarijagansai@gmail.com' });
    if (!founder) {
       founder = await User.create({
           name: 'Murari Jagan Sai',
           email: 'murarijagansai@gmail.com',
           role: 'founder',
           verificationLevel: 2,
           location: 'Bangalore, India'
       });
    }

    // Clear old startups for these founders specifically for cleaner demo, or just create new ones
    console.log('Seeding startups...');
    
    // Create 3 successful portfolio startups
    for (let i = 0; i < 3; i++) {
        const startupName = faker.company.name() + ' Tech';
        const startup = await Startup.create({
            founderId: founder._id,
            name: startupName,
            description: faker.company.catchPhrase(),
            vision: 'To revolutionize the ' + faker.company.buzzNoun() + ' industry.',
            industry: faker.helpers.arrayElement(['SaaS', 'DeepTech', 'FinTech']),
            stage: faker.helpers.arrayElement(['idea', 'validation', 'mvp', 'growth']),
            fundingStage: faker.helpers.arrayElement(['pre-seed', 'seed', 'series-a']),
            location: 'Bangalore, India',
            website: `https://${startupName.toLowerCase().replace(/ /g, '')}.com`,
            isActive: true,
            logo: faker.image.urlPicsumPhotos({ width: 150, height: 150 })
        });

        const amount = faker.number.int({ min: 5000000, max: 20000000 });
        const equity = faker.number.int({ min: 2, max: 10 });

        // Create the funding round record
        await FundingRound.create({
            startupId: startup._id,
            roundName: startup.fundingStage === 'seed' ? 'Seed Round' : 'Series A',
            targetAmount: amount * 3,
            raisedAmount: amount,
            equityOffered: equity * 3,
            valuation: amount * 10,
            minInvestment: amount / 10,
            status: 'closed',
            investors: [{
                investorId: investor._id,
                amount: amount,
                equityAllocated: equity,
                investedAt: new Date()
            }],
            createdAt: faker.date.past()
        });
    }

    // Form Alliance once
    try {
        await Alliance.create({
            requesterId: investor._id,
            receiverId: founder._id,
            status: 'accepted',
            message: `Looking forward to partnering!`
        });
    } catch (e) {
        // ignore if already exists
    }

    // Create 2 open deal flow opportunities
    for (let i = 0; i < 2; i++) {
        const startup = await Startup.create({
            founderId: founder._id,
            name: faker.company.name() + ' AI',
            description: faker.company.catchPhrase(),
            vision: 'Innovative AI generation platforms.',
            industry: 'DeepTech',
            stage: 'mvp',
            fundingStage: 'seed',
            location: 'Hyderabad, India',
            isActive: true,
            logo: faker.image.urlPicsumPhotos({ width: 150, height: 150 })
        });

        await FundingRound.create({
            startupId: startup._id,
            roundName: 'Pre-Seed',
            targetAmount: 10000000, // 1Cr
            raisedAmount: 2000000, // 20L
            equityOffered: 10,
            valuation: 100000000, // 10Cr
            minInvestment: 500000, // 5L
            status: 'open',
            investors: [],
            closesAt: faker.date.future()
        });
    }

    await investor.save();
    console.log(`Success! Data seeded for investor: ${email}`);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    process.exit(0);
  }
}

seedInvestorData();
