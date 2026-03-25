/**
 * AlloySphere Production Data Seed Script
 * Run: npx tsx scripts/seed-production.ts
 */
import mongoose from 'mongoose';
import crypto from 'crypto';

// ── MongoDB Connection ──
const MONGODB_URI = 'mongodb+srv://collabhubAdmin:murarijagansai@collabhub.18ydvxf.mongodb.net/?appName=CollabHub';

async function connectDB() {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log('✅ Connected to MongoDB Atlas');
}

// ── Import all models (side-effect imports to register Mongoose schemas) ──
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

// ════════════════════════════════════════
// DATA DEFINITIONS
// ════════════════════════════════════════

const FOUNDERS = [
  { email: 'murarijagansai@gmail.com', name: 'Murari Jagan Sai', location: 'Hyderabad', bio: 'Serial entrepreneur building the future of connected capital. Passionate about ecosystem development and startup growth.', skills: ['Leadership', 'Product Strategy', 'Fundraising', 'Business Development'], experience: '6 years in startup ecosystem development' },
  { email: 'arjun.mehta@alloysphere.io', name: 'Arjun Mehta', location: 'Bengaluru', bio: 'AI/ML founder focused on healthcare automation. Ex-Google engineer with deep expertise in NLP.', skills: ['Machine Learning', 'Python', 'TensorFlow', 'Healthcare AI'], experience: '8 years in AI/ML engineering' },
  { email: 'priya.sharma@alloysphere.io', name: 'Priya Sharma', location: 'Mumbai', bio: 'Fintech innovator democratizing wealth management for Bharat. Former VP at Paytm Money.', skills: ['Fintech', 'Product Management', 'UPI', 'Regulatory Compliance'], experience: '10 years in financial technology' },
  { email: 'vikram.reddy@alloysphere.io', name: 'Vikram Reddy', location: 'Chennai', bio: 'EdTech visionary making quality education accessible. Built platforms serving 2M+ students.', skills: ['EdTech', 'Curriculum Design', 'Growth Hacking', 'React'], experience: '7 years in education technology' },
  { email: 'sneha.gupta@alloysphere.io', name: 'Sneha Gupta', location: 'Delhi', bio: 'SaaS builder creating next-gen HR tools for Indian SMEs. Y Combinator W24 alumni.', skills: ['SaaS', 'HR Tech', 'Go-to-Market', 'Node.js'], experience: '5 years in B2B SaaS' },
  { email: 'rahul.verma@alloysphere.io', name: 'Rahul Verma', location: 'Pune', bio: 'HealthTech founder building AI diagnostics for Tier-2 hospitals. AIIMS graduate.', skills: ['HealthTech', 'Medical AI', 'Computer Vision', 'PyTorch'], experience: '9 years in health technology' },
  { email: 'ananya.krishnan@alloysphere.io', name: 'Ananya Krishnan', location: 'Kochi', bio: 'Web3 pioneer building decentralized identity for India. Ethereum core contributor.', skills: ['Blockchain', 'Solidity', 'Web3', 'Cryptography'], experience: '6 years in blockchain development' },
  { email: 'deepak.joshi@alloysphere.io', name: 'Deepak Joshi', location: 'Jaipur', bio: 'AgriTech founder connecting farmers directly to markets using IoT and analytics.', skills: ['AgriTech', 'IoT', 'Supply Chain', 'Data Analytics'], experience: '8 years in agriculture technology' },
  { email: 'kavita.nair@alloysphere.io', name: 'Kavita Nair', location: 'Thiruvananthapuram', bio: 'CleanTech innovator building solar micro-grids for rural India. IIT Madras alumna.', skills: ['CleanTech', 'Renewable Energy', 'Hardware', 'Embedded Systems'], experience: '7 years in clean energy' },
  { email: 'sanjay.patel@alloysphere.io', name: 'Sanjay Patel', location: 'Ahmedabad', bio: 'CyberSecurity founder protecting Indian enterprises from advanced threats. Ex-DRDO.', skills: ['Cybersecurity', 'Threat Intelligence', 'Rust', 'Network Security'], experience: '12 years in cybersecurity' },
];

const TALENTS = [
  { email: 'jaganloveyou3000@gmail.com', name: 'Jagan Mohan', location: 'Hyderabad', bio: 'Full-stack developer specializing in React, Next.js and cloud architecture. Open source contributor.', skills: ['React', 'Next.js', 'TypeScript', 'AWS', 'Node.js'], experience: '4 years in full-stack development', role_title: 'Full Stack Developer' },
  { email: 'aisha.khan@alloysphere.io', name: 'Aisha Khan', location: 'Bengaluru', bio: 'UI/UX designer crafting beautiful, accessible interfaces. Figma & Framer expert.', skills: ['UI/UX Design', 'Figma', 'Framer', 'Design Systems', 'User Research'], experience: '5 years in product design', role_title: 'UI/UX Designer' },
  { email: 'rohan.das@alloysphere.io', name: 'Rohan Das', location: 'Kolkata', bio: 'ML Engineer building production-grade recommendation systems and NLP pipelines.', skills: ['Machine Learning', 'NLP', 'Python', 'PyTorch', 'MLOps'], experience: '6 years in ML engineering', role_title: 'ML Engineer' },
  { email: 'meera.iyer@alloysphere.io', name: 'Meera Iyer', location: 'Mumbai', bio: 'Growth marketer driving 10x user acquisition for B2B SaaS products.', skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics', 'Growth Hacking'], experience: '5 years in growth marketing', role_title: 'Marketing Lead' },
  { email: 'amit.singh@alloysphere.io', name: 'Amit Singh', location: 'Delhi', bio: 'Product manager with a track record of launching 0-to-1 products at scale.', skills: ['Product Management', 'Agile', 'User Stories', 'Roadmapping', 'Analytics'], experience: '7 years in product management', role_title: 'Product Manager' },
  { email: 'divya.menon@alloysphere.io', name: 'Divya Menon', location: 'Chennai', bio: 'Backend engineer passionate about distributed systems and microservices.', skills: ['Go', 'Kubernetes', 'PostgreSQL', 'gRPC', 'Docker'], experience: '5 years in backend engineering', role_title: 'Backend Developer' },
  { email: 'karthik.raj@alloysphere.io', name: 'Karthik Raj', location: 'Bengaluru', bio: 'Mobile developer building cross-platform apps with Flutter and React Native.', skills: ['Flutter', 'React Native', 'Dart', 'iOS', 'Android'], experience: '4 years in mobile development', role_title: 'Mobile Developer' },
  { email: 'nisha.agarwal@alloysphere.io', name: 'Nisha Agarwal', location: 'Pune', bio: 'Data scientist turning business problems into data-driven solutions.', skills: ['Data Science', 'Python', 'SQL', 'Tableau', 'Statistics'], experience: '3 years in data science', role_title: 'Data Scientist' },
  { email: 'varun.chopra@alloysphere.io', name: 'Varun Chopra', location: 'Gurugram', bio: 'DevOps engineer automating infrastructure at scale. AWS & GCP certified.', skills: ['DevOps', 'AWS', 'Terraform', 'CI/CD', 'Linux'], experience: '6 years in DevOps', role_title: 'DevOps Engineer' },
  { email: 'tanvi.bhatt@alloysphere.io', name: 'Tanvi Bhatt', location: 'Ahmedabad', bio: 'Frontend developer creating pixel-perfect, performant web experiences.', skills: ['React', 'TypeScript', 'CSS', 'Tailwind', 'Next.js'], experience: '3 years in frontend development', role_title: 'Frontend Developer' },
  { email: 'suresh.kumar@alloysphere.io', name: 'Suresh Kumar', location: 'Hyderabad', bio: 'Blockchain developer building DeFi protocols and smart contracts.', skills: ['Solidity', 'Ethereum', 'Web3.js', 'DeFi', 'Rust'], experience: '4 years in blockchain', role_title: 'Blockchain Developer' },
  { email: 'pooja.rathore@alloysphere.io', name: 'Pooja Rathore', location: 'Jaipur', bio: 'Content strategist crafting compelling narratives for tech brands.', skills: ['Content Writing', 'SEO', 'Social Media', 'Branding', 'Copywriting'], experience: '4 years in content marketing', role_title: 'Content Strategist' },
  { email: 'manish.tiwari@alloysphere.io', name: 'Manish Tiwari', location: 'Lucknow', bio: 'QA engineer ensuring software quality through automated testing frameworks.', skills: ['QA', 'Selenium', 'Cypress', 'Jest', 'API Testing'], experience: '5 years in quality assurance', role_title: 'QA Engineer' },
  { email: 'riya.saxena@alloysphere.io', name: 'Riya Saxena', location: 'Indore', bio: 'Cloud architect designing scalable, cost-efficient infrastructure.', skills: ['Cloud Architecture', 'AWS', 'Azure', 'Microservices', 'Serverless'], experience: '7 years in cloud engineering', role_title: 'Cloud Architect' },
  { email: 'aditya.bansal@alloysphere.io', name: 'Aditya Bansal', location: 'Chandigarh', bio: 'Computer vision engineer working on real-time video analytics.', skills: ['Computer Vision', 'OpenCV', 'TensorFlow', 'CUDA', 'C++'], experience: '4 years in computer vision', role_title: 'CV Engineer' },
  { email: 'shruti.pandey@alloysphere.io', name: 'Shruti Pandey', location: 'Bhopal', bio: 'Information security analyst protecting enterprise systems.', skills: ['Security', 'Penetration Testing', 'SIEM', 'SOC', 'Compliance'], experience: '5 years in cybersecurity', role_title: 'Security Analyst' },
  { email: 'harsh.goyal@alloysphere.io', name: 'Harsh Goyal', location: 'Nagpur', bio: 'Embedded systems developer building IoT solutions for agriculture.', skills: ['Embedded C', 'IoT', 'Arduino', 'Raspberry Pi', 'MQTT'], experience: '3 years in embedded systems', role_title: 'IoT Developer' },
  { email: 'neha.jain@alloysphere.io', name: 'Neha Jain', location: 'Surat', bio: 'Business analyst bridging technical and business stakeholders.', skills: ['Business Analysis', 'SQL', 'Jira', 'Requirements', 'Stakeholder Mgmt'], experience: '4 years in business analysis', role_title: 'Business Analyst' },
  { email: 'rajiv.kapoor@alloysphere.io', name: 'Rajiv Kapoor', location: 'Noida', bio: 'Full-stack engineer with expertise in real-time systems and WebSockets.', skills: ['Node.js', 'React', 'Socket.io', 'Redis', 'MongoDB'], experience: '5 years in full-stack', role_title: 'Full Stack Developer' },
  { email: 'aditi.mishra@alloysphere.io', name: 'Aditi Mishra', location: 'Patna', bio: 'Junior developer eager to grow in startup environments. IIIT graduate.', skills: ['JavaScript', 'React', 'HTML/CSS', 'Git', 'Python'], experience: '1 year (fresher)', role_title: 'Junior Developer' },
];

const INVESTORS_DATA = [
  { email: 'collabhub25@gmail.com', name: 'CollabHub Ventures', location: 'Mumbai', bio: 'Strategic angel investor focused on early-stage deep-tech and SaaS startups in India.', skills: ['Angel Investing', 'Due Diligence', 'Portfolio Mgmt'], experience: '10 years in venture investing', thesis: 'Investing in founders solving India-first problems with global potential. Focus on AI, SaaS, and FinTech.', industries: ['AI', 'SaaS', 'Fintech'], stages: ['pre-seed', 'seed'] as any, ticketMin: 500000, ticketMax: 5000000 },
  { email: 'ravi.sundaram@alloysphere.io', name: 'Ravi Sundaram', location: 'Bengaluru', bio: 'GP at Nexus Ventures. 15 years backing category-defining Indian startups.', skills: ['Venture Capital', 'Board Advisory', 'M&A'], experience: '15 years in venture capital', thesis: 'Backing exceptional founders building for the next billion users. Sector agnostic, conviction driven.', industries: ['HealthTech', 'EdTech', 'SaaS'], stages: ['seed', 'series-a'] as any, ticketMin: 2000000, ticketMax: 20000000 },
  { email: 'lakshmi.narayan@alloysphere.io', name: 'Lakshmi Narayan', location: 'Chennai', bio: 'Angel investor and mentor. Former CTO of Infosys Labs.', skills: ['Technology Advisory', 'Mentoring', 'Strategic Planning'], experience: '20 years in technology leadership', thesis: 'Supporting technical founders building deep-tech solutions. Strong preference for AI and cybersecurity.', industries: ['AI', 'Cybersecurity', 'Web3'], stages: ['pre-seed', 'seed'] as any, ticketMin: 1000000, ticketMax: 10000000 },
  { email: 'meenakshi.reddy@alloysphere.io', name: 'Meenakshi Reddy', location: 'Hyderabad', bio: 'Impact investor focused on sustainability and clean-tech. Former World Bank consultant.', skills: ['Impact Investing', 'ESG', 'Climate Finance'], experience: '12 years in impact investing', thesis: 'Investing in climate-positive startups solving real problems for rural and semi-urban India.', industries: ['CleanTech', 'AgriTech', 'HealthTech'], stages: ['seed', 'series-a'] as any, ticketMin: 3000000, ticketMax: 15000000 },
  { email: 'vikas.khanna@alloysphere.io', name: 'Vikas Khanna', location: 'Delhi', bio: 'Serial entrepreneur turned investor. Founded and exited two fintech companies.', skills: ['Fintech', 'Startup Scaling', 'Fundraising Advisory'], experience: '18 years in entrepreneurship and investing', thesis: 'Backing repeat founders and first-time founders with domain expertise in fintech and logistics.', industries: ['Fintech', 'Logistics', 'SaaS'], stages: ['pre-seed', 'seed', 'series-a'] as any, ticketMin: 1000000, ticketMax: 25000000 },
];

const STARTUPS_DATA = [
  { name: 'NeuraMed AI', industry: 'HealthTech', stage: 'mvp' as const, fundingStage: 'seed' as const, vision: 'Democratizing AI-powered diagnostics for every hospital in India', description: 'NeuraMed AI builds intelligent diagnostic tools that help doctors in Tier-2 and Tier-3 hospitals detect diseases early using computer vision and NLP analysis of medical reports. Our platform has already processed 50,000+ scans with 94% accuracy.', fundingAmount: 5000000, revenue: 200000, skillsNeeded: ['Machine Learning', 'React', 'Python', 'Medical AI'], founderIdx: 5 },
  { name: 'PayBharat', industry: 'Fintech', stage: 'growth' as const, fundingStage: 'series-a' as const, vision: 'Making wealth management accessible to every Indian household', description: 'PayBharat is a micro-investment platform enabling users to invest as little as ₹10 in mutual funds, gold, and digital assets. 500K+ users onboarded, processing ₹2Cr daily transactions.', fundingAmount: 30000000, revenue: 5000000, skillsNeeded: ['React Native', 'Node.js', 'Fintech', 'Compliance'], founderIdx: 2 },
  { name: 'LearnSphere', industry: 'EdTech', stage: 'growth' as const, fundingStage: 'seed' as const, vision: 'Personalized learning paths powered by AI for every student', description: 'LearnSphere uses adaptive learning algorithms to create customized study plans for K-12 students. Partnered with 200+ schools across Karnataka and Tamil Nadu. 2M+ learning sessions completed.', fundingAmount: 10000000, revenue: 1500000, skillsNeeded: ['React', 'Python', 'EdTech', 'UI/UX'], founderIdx: 3 },
  { name: 'HireOS', industry: 'SaaS', stage: 'mvp' as const, fundingStage: 'pre-seed' as const, vision: 'The operating system for modern Indian HR teams', description: 'HireOS automates the entire employee lifecycle for SMEs — from hiring to payroll to compliance. Currently in beta with 50 companies. Reducing HR overhead by 60%.', fundingAmount: 3000000, revenue: 100000, skillsNeeded: ['Next.js', 'PostgreSQL', 'SaaS', 'HR Tech'], founderIdx: 4 },
  { name: 'MedScan Pro', industry: 'HealthTech', stage: 'validation' as const, fundingStage: 'pre-seed' as const, vision: 'Instant medical report analysis using smartphone cameras', description: 'MedScan Pro lets patients scan their lab reports with a smartphone to get instant AI-powered health insights and doctor recommendations. Early pilot with 5,000 users.', fundingAmount: 2000000, revenue: 0, skillsNeeded: ['Computer Vision', 'Flutter', 'Python', 'Healthcare'], founderIdx: 1 },
  { name: 'ChainID India', industry: 'Web3', stage: 'mvp' as const, fundingStage: 'seed' as const, vision: 'Decentralized digital identity infrastructure for India', description: 'ChainID builds self-sovereign identity solutions leveraging blockchain for KYC, education credentials, and government services. Pilot with Kerala State IT Mission.', fundingAmount: 8000000, revenue: 300000, skillsNeeded: ['Solidity', 'React', 'Blockchain', 'Cryptography'], founderIdx: 6 },
  { name: 'KrishiConnect', industry: 'AgriTech', stage: 'growth' as const, fundingStage: 'series-a' as const, vision: 'Connecting 10 million farmers to fair-price markets', description: 'KrishiConnect is a B2B marketplace + IoT platform helping farmers get real-time crop prices, weather data, and direct buyer connections. Active in Rajasthan, MP, and Gujarat with 100K+ farmers.', fundingAmount: 25000000, revenue: 4000000, skillsNeeded: ['IoT', 'React', 'Data Analytics', 'Supply Chain'], founderIdx: 7 },
  { name: 'SolarGrid Micro', industry: 'CleanTech', stage: 'validation' as const, fundingStage: 'seed' as const, vision: 'Affordable solar micro-grids for every Indian village', description: 'SolarGrid Micro designs and deploys modular solar micro-grids for off-grid rural communities. 15 installations powering 3,000+ households in Kerala and Tamil Nadu.', fundingAmount: 12000000, revenue: 800000, skillsNeeded: ['Embedded Systems', 'IoT', 'Hardware', 'Renewable Energy'], founderIdx: 8 },
  { name: 'CyberShield', industry: 'Cybersecurity', stage: 'mvp' as const, fundingStage: 'seed' as const, vision: 'AI-powered threat detection for Indian enterprises', description: 'CyberShield provides real-time AI threat detection, automated incident response, and compliance dashboards for Indian mid-market enterprises. Protecting 30+ clients with zero breaches.', fundingAmount: 7000000, revenue: 1200000, skillsNeeded: ['Cybersecurity', 'Rust', 'ML', 'Network Security'], founderIdx: 9 },
  { name: 'AlloySphere', industry: 'SaaS', stage: 'mvp' as const, fundingStage: 'pre-seed' as const, vision: 'The innovation network connecting founders, talent, and investors', description: 'AlloySphere is a comprehensive collaboration platform that brings together startup founders, elite talent, and strategic investors. AI-powered matching, verified profiles, and end-to-end deal workflows.', fundingAmount: 5000000, revenue: 0, skillsNeeded: ['React', 'Next.js', 'MongoDB', 'TypeScript'], founderIdx: 0 },
];

// Talent → Startup assignments (talentIdx → [startupIdx, ...])
const TALENT_ASSIGNMENTS: Record<number, number[]> = {
  0: [9, 3],     // Jagan → AlloySphere, HireOS
  1: [9, 2],     // Aisha → AlloySphere, LearnSphere
  2: [0, 4],     // Rohan → NeuraMed, MedScan
  3: [1, 3],     // Meera → PayBharat, HireOS
  4: [2, 9],     // Amit → LearnSphere, AlloySphere
  5: [1, 8],     // Divya → PayBharat, CyberShield
  6: [4, 2],     // Karthik → MedScan, LearnSphere
  7: [0, 6],     // Nisha → NeuraMed, KrishiConnect
  8: [9, 8],     // Varun → AlloySphere, CyberShield
  9: [3, 9],     // Tanvi → HireOS, AlloySphere
  10: [5],       // Suresh → ChainID
  11: [6, 2],    // Pooja → KrishiConnect, LearnSphere
  12: [3, 1],    // Manish → HireOS, PayBharat
  13: [8, 9],    // Riya → CyberShield, AlloySphere
  14: [0, 4],    // Aditya → NeuraMed, MedScan
  15: [8, 5],    // Shruti → CyberShield, ChainID
  16: [7, 6],    // Harsh → SolarGrid, KrishiConnect
  17: [1, 3],    // Neha → PayBharat, HireOS
  18: [9, 5],    // Rajiv → AlloySphere, ChainID
  19: [2, 7],    // Aditi → LearnSphere, SolarGrid
};

// Investor → Startup investments (investorIdx → [{startupIdx, amount, equity}])
const INVESTOR_INVESTMENTS: Record<number, {si: number; amount: number; equity: number}[]> = {
  0: [{ si: 9, amount: 2000000, equity: 5 }, { si: 3, amount: 1500000, equity: 4 }],
  1: [{ si: 1, amount: 10000000, equity: 8 }, { si: 2, amount: 5000000, equity: 6 }],
  2: [{ si: 8, amount: 3000000, equity: 5 }, { si: 5, amount: 4000000, equity: 6 }],
  3: [{ si: 7, amount: 8000000, equity: 7 }, { si: 0, amount: 3000000, equity: 5 }],
  4: [{ si: 1, amount: 5000000, equity: 4 }, { si: 6, amount: 7000000, equity: 6 }],
};

// ════════════════════════════════════════
// MAIN SEED FUNCTION
// ════════════════════════════════════════
async function seed() {
  await connectDB();
  console.log('🌱 Starting production data seed...\n');

  // ── 1. CREATE USERS ──
  console.log('👤 Creating users...');
  const founderIds: any[] = [];
  const talentIds: any[] = [];
  const investorIds: any[] = [];

  for (const f of FOUNDERS) {
    const user = await User.findOneAndUpdate(
      { email: f.email },
      { $setOnInsert: { email: f.email, name: f.name, role: 'founder', authProvider: 'google', isEmailVerified: true, verificationLevel: 2, kycStatus: 'verified', kycLevel: 2, kycVerifiedAt: daysAgo(30), bio: f.bio, skills: f.skills, experience: f.experience, location: f.location, linkedinUrl: `https://linkedin.com/in/${f.name.toLowerCase().replace(/\s/g, '-')}`, lastActive: daysAgo(0) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    founderIds.push(user._id);
  }
  console.log(`   ✅ ${founderIds.length} founders`);

  for (const t of TALENTS) {
    const user = await User.findOneAndUpdate(
      { email: t.email },
      { $setOnInsert: { email: t.email, name: t.name, role: 'talent', authProvider: 'google', isEmailVerified: true, verificationLevel: 2, kycStatus: 'verified', kycLevel: 2, kycVerifiedAt: daysAgo(25), bio: t.bio, skills: t.skills, experience: t.experience, location: t.location, linkedinUrl: `https://linkedin.com/in/${t.name.toLowerCase().replace(/\s/g, '-')}`, lastActive: daysAgo(Math.floor(Math.random() * 3)) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    talentIds.push(user._id);
  }
  console.log(`   ✅ ${talentIds.length} talents`);

  for (const inv of INVESTORS_DATA) {
    const user = await User.findOneAndUpdate(
      { email: inv.email },
      { $setOnInsert: { email: inv.email, name: inv.name, role: 'investor', authProvider: 'google', isEmailVerified: true, verificationLevel: 2, kycStatus: 'verified', kycLevel: 2, kycVerifiedAt: daysAgo(40), bio: inv.bio, skills: inv.skills, experience: inv.experience, location: inv.location, linkedinUrl: `https://linkedin.com/in/${inv.name.toLowerCase().replace(/\s/g, '-')}`, lastActive: daysAgo(1) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    investorIds.push(user._id);
  }
  console.log(`   ✅ ${investorIds.length} investors`);

  // ── 2. CREATE VERIFICATIONS ──
  console.log('🔒 Creating verifications...');
  const allUsers = [...founderIds.map((id, i) => ({ id, role: 'founder', idx: i })), ...talentIds.map((id, i) => ({ id, role: 'talent', idx: i })), ...investorIds.map((id, i) => ({ id, role: 'investor', idx: i }))];
  for (const u of allUsers) {
    for (const vType of [{ type: 'profile', level: 0 }, { type: 'kyc-id', level: 1 }]) {
      await Verification.findOneAndUpdate(
        { userId: u.id, type: vType.type },
        { $setOnInsert: { userId: u.id, role: u.role, type: vType.type, level: vType.level, status: 'approved', submittedAt: daysAgo(35), verifiedAt: daysAgo(30) } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }
  console.log(`   ✅ Verifications for ${allUsers.length} users`);

  // ── 3. CREATE STARTUPS ──
  console.log('🏢 Creating startups...');
  const startupIds: any[] = [];
  for (let i = 0; i < STARTUPS_DATA.length; i++) {
    const s = STARTUPS_DATA[i];
    const teamMembers = Object.entries(TALENT_ASSIGNMENTS).filter(([, sIdxs]) => sIdxs.includes(i)).map(([tIdx]) => talentIds[parseInt(tIdx)]);
    const rolesNeeded = [
      { title: 'Senior Developer', description: `Build core ${s.industry} platform features`, skills: s.skillsNeeded.slice(0, 2), compensationType: 'mixed', equityPercent: 1.5, cashAmount: 80000, status: 'filled' },
      { title: 'Product Designer', description: 'Design user interfaces and experiences', skills: ['UI/UX', 'Figma'], compensationType: 'equity', equityPercent: 1.0, status: 'open' },
    ];
    const startup = await Startup.findOneAndUpdate(
      { name: s.name, founderId: founderIds[s.founderIdx] },
      { $setOnInsert: { founderId: founderIds[s.founderIdx], name: s.name, vision: s.vision, description: s.description, stage: s.stage, industry: s.industry, team: teamMembers, rolesNeeded, fundingStage: s.fundingStage, fundingAmount: s.fundingAmount, revenue: s.revenue, skillsNeeded: s.skillsNeeded, pastProgress: 'Strong early traction with pilot customers', achievements: 'Featured in TechCrunch India, selected for NASSCOM 10K Startups', isActive: true, AlloySphereVerified: true, AlloySphereVerifiedAt: daysAgo(20) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    startupIds.push(startup._id);
  }
  console.log(`   ✅ ${startupIds.length} startups`);

  // ── 4. INVESTOR PROFILES ──
  console.log('💼 Creating investor profiles...');
  for (let i = 0; i < INVESTORS_DATA.length; i++) {
    const inv = INVESTORS_DATA[i];
    const deals = INVESTOR_INVESTMENTS[i].map(d => ({ startupId: startupIds[d.si], amount: d.amount, date: daysAgo(15 + i * 5) }));
    await Investor.findOneAndUpdate(
      { userId: investorIds[i] },
      { $setOnInsert: { userId: investorIds[i], ticketSize: { min: inv.ticketMin, max: inv.ticketMax }, preferredIndustries: inv.industries, stagePreference: inv.stages, investmentThesis: inv.thesis, dealHistory: deals } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`   ✅ ${INVESTORS_DATA.length} investor profiles`);

  // ── 5. FUNDING ROUNDS ──
  console.log('💰 Creating funding rounds...');
  for (let si = 0; si < startupIds.length; si++) {
    const s = STARTUPS_DATA[si];
    const investors = Object.entries(INVESTOR_INVESTMENTS).filter(([, deals]) => deals.some(d => d.si === si)).map(([invIdx, deals]) => {
      const deal = deals.find(d => d.si === si)!;
      return { investorId: investorIds[parseInt(invIdx)], amount: deal.amount, equityAllocated: deal.equity, investedAt: daysAgo(15) };
    });
    const raised = investors.reduce((sum, inv) => sum + inv.amount, 0);
    await FundingRound.findOneAndUpdate(
      { startupId: startupIds[si], roundName: `${s.fundingStage.charAt(0).toUpperCase() + s.fundingStage.slice(1)} Round` },
      { $setOnInsert: { startupId: startupIds[si], roundName: `${s.fundingStage.charAt(0).toUpperCase() + s.fundingStage.slice(1)} Round`, targetAmount: s.fundingAmount, raisedAmount: raised, equityOffered: investors.reduce((s, i) => s + i.equityAllocated, 0) || 10, valuation: s.fundingAmount * 8, minInvestment: 500000, status: raised >= s.fundingAmount ? 'closed' : 'open', investors } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`   ✅ ${startupIds.length} funding rounds`);

  // ── 6. INVESTMENTS ──
  console.log('📈 Creating investment records...');
  let invCount = 0;
  for (const [invIdx, deals] of Object.entries(INVESTOR_INVESTMENTS)) {
    for (const deal of deals) {
      await Investment.findOneAndUpdate(
        { startupId: startupIds[deal.si], investorId: investorIds[parseInt(invIdx)] },
        { $setOnInsert: { startupId: startupIds[deal.si], investorId: investorIds[parseInt(invIdx)], amount: deal.amount, status: 'completed' } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      invCount++;
    }
  }
  console.log(`   ✅ ${invCount} investments`);

  // ── 7. APPLICATIONS ──
  console.log('📋 Creating applications...');
  let appCount = 0;
  const statuses: any[] = ['accepted', 'accepted', 'shortlisted', 'pending', 'reviewed'];
  for (const [tIdx, sIdxs] of Object.entries(TALENT_ASSIGNMENTS)) {
    for (const sIdx of sIdxs) {
      const t = TALENTS[parseInt(tIdx)];
      await Application.findOneAndUpdate(
        { startupId: startupIds[sIdx], talentId: talentIds[parseInt(tIdx)] },
        { $setOnInsert: { startupId: startupIds[sIdx], talentId: talentIds[parseInt(tIdx)], roleId: 'senior-dev', status: statuses[appCount % statuses.length], coverLetter: `I am excited to contribute to ${STARTUPS_DATA[sIdx].name}. With my experience in ${t.skills.slice(0, 3).join(', ')}, I can help accelerate your ${STARTUPS_DATA[sIdx].industry} product. I'm particularly drawn to your vision of "${STARTUPS_DATA[sIdx].vision}".` } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      appCount++;
    }
  }
  console.log(`   ✅ ${appCount} applications`);

  // ── 8. AGREEMENTS ──
  console.log('📄 Creating agreements...');
  let agrCount = 0;
  // Work agreements: Founder ↔ first 2 talents per startup
  for (let si = 0; si < startupIds.length; si++) {
    const assignedTalents = Object.entries(TALENT_ASSIGNMENTS).filter(([, sIdxs]) => sIdxs.includes(si)).map(([tIdx]) => parseInt(tIdx)).slice(0, 2);
    for (const tIdx of assignedTalents) {
      const parties = [founderIds[STARTUPS_DATA[si].founderIdx], talentIds[tIdx]];
      await Agreement.findOneAndUpdate(
        { startupId: startupIds[si], type: 'work', parties: { $all: parties } },
        { $setOnInsert: { type: 'work', startupId: startupIds[si], parties, terms: { equityPercent: 1.5, vestingPeriod: 48, cliffPeriod: 12, startDate: daysAgo(60), compensation: 80000 }, content: `Work Agreement between ${STARTUPS_DATA[si].name} and ${TALENTS[tIdx].name}. The talent agrees to contribute as ${TALENTS[tIdx].role_title} with equity vesting over 4 years with a 1-year cliff.`, status: 'signed', version: 1, signedBy: parties.map(p => ({ userId: p, signedAt: daysAgo(55), signatureHash: hash(`${p}-work-${si}`) })), auditLog: [{ action: 'created', userId: parties[0], timestamp: daysAgo(60) }, { action: 'signed', userId: parties[1], timestamp: daysAgo(55) }] } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      agrCount++;
    }
  }
  // Investment agreements
  for (const [invIdx, deals] of Object.entries(INVESTOR_INVESTMENTS)) {
    for (const deal of deals) {
      const parties = [founderIds[STARTUPS_DATA[deal.si].founderIdx], investorIds[parseInt(invIdx)]];
      await Agreement.findOneAndUpdate(
        { startupId: startupIds[deal.si], type: 'investment', parties: { $all: parties } },
        { $setOnInsert: { type: 'investment', startupId: startupIds[deal.si], parties, terms: { equityPercent: deal.equity, startDate: daysAgo(30), compensation: deal.amount }, content: `Investment Agreement: ${INVESTORS_DATA[parseInt(invIdx)].name} invests ₹${(deal.amount/100000).toFixed(0)}L in ${STARTUPS_DATA[deal.si].name} for ${deal.equity}% equity.`, status: 'signed', version: 1, signedBy: parties.map(p => ({ userId: p, signedAt: daysAgo(25), signatureHash: hash(`${p}-invest-${deal.si}`) })), auditLog: [{ action: 'created', userId: parties[0], timestamp: daysAgo(30) }, { action: 'signed', userId: parties[1], timestamp: daysAgo(25) }] } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      agrCount++;
    }
  }
  console.log(`   ✅ ${agrCount} agreements`);

  // ── 9. MILESTONES ──
  console.log('🏁 Creating milestones...');
  let msCount = 0;
  const msTemplates = [
    { title: 'MVP Launch', description: 'Launch minimum viable product with core features', amount: 50000, status: 'completed' },
    { title: 'First 100 Users', description: 'Achieve 100 active users on the platform', amount: 30000, status: 'completed' },
    { title: 'Revenue Target Q1', description: 'Hit first revenue milestone of ₹5L MRR', amount: 80000, status: 'in_progress' },
    { title: 'Series A Readiness', description: 'Prepare pitch deck, data room, and metrics for fundraise', amount: 20000, status: 'pending' },
  ];
  for (let si = 0; si < startupIds.length; si++) {
    for (let mi = 0; mi < msTemplates.length; mi++) {
      const ms = msTemplates[mi];
      const assignedTalent = Object.entries(TALENT_ASSIGNMENTS).find(([, sIdxs]) => sIdxs.includes(si));
      await Milestone.findOneAndUpdate(
        { startupId: startupIds[si], title: ms.title },
        { $setOnInsert: { startupId: startupIds[si], assignedTo: assignedTalent ? talentIds[parseInt(assignedTalent[0])] : undefined, title: ms.title, description: ms.description, amount: ms.amount, dueDate: daysAgo(-30 * (mi + 1)), status: ms.status, paymentStatus: ms.status === 'completed' ? 'confirmed' : 'pending', completedAt: ms.status === 'completed' ? daysAgo(10 - mi * 3) : undefined } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      msCount++;
    }
  }
  console.log(`   ✅ ${msCount} milestones`);

  // ── 10. ALLIANCES ──
  console.log('🤝 Creating alliances...');
  let alCount = 0;
  const alliancePairs = [
    // Founder ↔ Founder (startup collabs)
    [founderIds[0], founderIds[1], 'Cross-platform AI integration between AlloySphere and NeuraMed'],
    [founderIds[2], founderIds[4], 'Fintech API integration between PayBharat and HireOS payroll'],
    [founderIds[3], founderIds[6], 'EdTech content partnership with KrishiConnect for farmer education'],
    [founderIds[7], founderIds[8], 'IoT + solar hardware collaboration between KrishiConnect and SolarGrid'],
    [founderIds[5], founderIds[9], 'Healthcare data security partnership between NeuraMed and CyberShield'],
    // Founder ↔ Investor
    [founderIds[0], investorIds[0], 'Strategic advisory and investment discussion'],
    [founderIds[1], investorIds[3], 'HealthTech investment and mentorship'],
    [founderIds[2], investorIds[4], 'Fintech scaling advisory'],
    // Founder ↔ Talent
    [founderIds[0], talentIds[0], 'Core engineering collaboration on AlloySphere'],
    [founderIds[0], talentIds[1], 'Design partnership for AlloySphere UI'],
    [founderIds[1], talentIds[2], 'ML engineering for NeuraMed diagnostics'],
  ];
  for (const [reqId, recId, msg] of alliancePairs) {
    await Alliance.findOneAndUpdate(
      { requesterId: reqId, receiverId: recId },
      { $setOnInsert: { requesterId: reqId, receiverId: recId, status: 'accepted', message: msg } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    alCount++;
  }
  console.log(`   ✅ ${alCount} alliances`);

  // ── 11. CONVERSATIONS & MESSAGES ──
  console.log('💬 Creating conversations & messages...');
  const convos = [
    { p: [founderIds[0], talentIds[0]], msgs: [
      { s: 0, t: 'Hi Jagan! We are looking for a full-stack developer to lead the AlloySphere frontend. Your React/Next.js expertise is exactly what we need.' },
      { s: 1, t: 'Hey Murari! Thanks for reaching out. I have been following AlloySphere — love the vision of connecting the startup ecosystem. I would be thrilled to contribute.' },
      { s: 0, t: 'Great! We are offering 2% equity with a 4-year vest and 1-year cliff, plus a competitive stipend. Can you start next week?' },
      { s: 1, t: 'That sounds fair. I can start Monday. Should I set up the dev environment and review the current codebase first?' },
      { s: 0, t: 'Perfect! I will send over the agreement. Welcome aboard to AlloySphere! 🚀' },
    ]},
    { p: [founderIds[0], investorIds[0]], msgs: [
      { s: 0, t: 'Hi! I wanted to share our progress on AlloySphere. We have onboarded 500+ users and 50 startups in the first month.' },
      { s: 1, t: 'Impressive traction! What is your current MRR and burn rate? I am interested in discussing a pre-seed investment.' },
      { s: 0, t: 'We are pre-revenue but have strong engagement metrics. 85% weekly retention and 12 min avg session time. Burn is ₹3L/month.' },
      { s: 1, t: 'Those are solid engagement numbers. Let us schedule a call this week to discuss terms. I am thinking ₹20L for 5% equity.' },
      { s: 0, t: 'That works! I will send over the pitch deck and data room access. Looking forward to the call.' },
    ]},
    { p: [founderIds[2], talentIds[3]], msgs: [
      { s: 0, t: 'Hi Meera! PayBharat is scaling fast and we need a growth marketing lead. Your B2B SaaS experience is exactly what we are looking for.' },
      { s: 1, t: 'Hi Priya! PayBharat is doing amazing things in fintech. I would love to help with user acquisition. What channels are you currently using?' },
      { s: 0, t: 'Primarily organic and referral. We need someone to build out paid acquisition, content marketing, and partnership channels.' },
      { s: 1, t: 'I can definitely help. I have scaled SaaS products from 10K to 500K users. When can we discuss the role details?' },
    ]},
    { p: [talentIds[0], talentIds[8]], msgs: [
      { s: 0, t: 'Hey Varun! Working on the AlloySphere deployment pipeline. Do you have experience with Vercel + MongoDB Atlas in production?' },
      { s: 1, t: 'Yes! I have set up similar stacks. For Atlas, make sure you configure connection pooling properly. I can help with the CI/CD pipeline.' },
      { s: 0, t: 'That would be great. Let me share the current config and we can optimize it together.' },
    ]},
    { p: [founderIds[5], investorIds[2]], msgs: [
      { s: 0, t: 'Hi Lakshmi! NeuraMed has completed our pilot with 3 hospitals in Hyderabad. Results show 94% diagnostic accuracy for chest X-rays.' },
      { s: 1, t: 'Those are impressive results, Rahul. What is your regulatory pathway looking like? CDSCO approval timeline?' },
      { s: 0, t: 'We are in the process of Class B medical device registration. Expected approval by Q3.  Would love to discuss potential investment.' },
      { s: 1, t: 'Let me review the clinical data. If the accuracy holds at scale, I am very interested. Send me the detailed validation report.' },
    ]},
    { p: [founderIds[7], talentIds[16]], msgs: [
      { s: 0, t: 'Harsh, we need your IoT expertise for KrishiConnect sensor modules. Can you design a low-power soil moisture sensor array?' },
      { s: 1, t: 'Deepak, I have been working with similar LoRa-based sensor networks. I can prototype a module within 2 weeks using ESP32 + LoRaWAN.' },
      { s: 0, t: 'Excellent! Our farmers need something that lasts 6+ months on battery. What is the power consumption looking like?' },
    ]},
  ];

  let msgCount = 0;
  for (const convo of convos) {
    const cId = convId(convo.p[0].toString(), convo.p[1].toString());
    const lastMsg = convo.msgs[convo.msgs.length - 1];
    await Conversation.findOneAndUpdate(
      { participants: { $all: convo.p } },
      { $setOnInsert: { participants: convo.p, lastMessage: lastMsg.t, lastMessageAt: daysAgo(1), unreadCount: {} } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    for (let mi = 0; mi < convo.msgs.length; mi++) {
      const m = convo.msgs[mi];
      await Message.findOneAndUpdate(
        { conversationId: cId, content: m.t },
        { $setOnInsert: { senderId: convo.p[m.s], receiverId: convo.p[m.s === 0 ? 1 : 0], conversationId: cId, content: m.t, read: true, readAt: daysAgo(1), createdAt: daysAgo(5 - mi) } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      msgCount++;
    }
  }
  console.log(`   ✅ ${convos.length} conversations, ${msgCount} messages`);

  // ── 12. NOTIFICATIONS ──
  console.log('🔔 Creating notifications...');
  const notifs = [
    ...founderIds.slice(0, 5).map((id: any, i: number) => ({ userId: id, type: 'application_received', title: 'New Application Received', message: `A talented developer has applied to join ${STARTUPS_DATA[i].name}.` })),
    ...investorIds.map((id: any, i: number) => ({ userId: id, type: 'agreement_signed', title: 'Agreement Signed', message: `Your investment agreement has been signed successfully.` })),
    ...talentIds.slice(0, 8).map((id: any) => ({ userId: id, type: 'application_status', title: 'Application Update', message: 'Your application has been shortlisted! The founder will reach out soon.' })),
    ...founderIds.map((id: any) => ({ userId: id, type: 'milestone_completed', title: 'Milestone Completed', message: 'MVP Launch milestone has been marked as completed.' })),
    ...founderIds.slice(0, 5).map((id: any) => ({ userId: id, type: 'funding_update', title: 'New Investment', message: 'A new investment has been recorded for your startup.' })),
    ...talentIds.slice(0, 5).map((id: any) => ({ userId: id, type: 'alliance_accepted', title: 'Alliance Accepted', message: 'Your alliance request has been accepted!' })),
  ];
  for (const n of notifs) {
    await Notification.findOneAndUpdate(
      { userId: n.userId, title: n.title, type: n.type },
      { $setOnInsert: { ...n, read: Math.random() > 0.4 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`   ✅ ${notifs.length} notifications`);

  // ── 13. TRUST SCORE LOGS ──
  console.log('⭐ Creating trust score logs...');
  let tsCount = 0;
  for (const fId of founderIds) {
    for (const cat of ['milestone', 'agreement', 'alliance'] as const) {
      await TrustScoreLog.create({ userId: fId, scoreChange: 5 + Math.floor(Math.random() * 10), reason: `${cat} activity completed`, category: cat }).catch(() => {});
      tsCount++;
    }
  }
  console.log(`   ✅ ${tsCount} trust score logs`);

  console.log('\n🎉 Production seed complete!');
  console.log('   Users:', founderIds.length + talentIds.length + investorIds.length);
  console.log('   Startups:', startupIds.length);
  console.log('   Run `npm run dev` and log in to verify.\n');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => { console.error('❌ Seed failed:', err); process.exit(1); });
