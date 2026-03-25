/**
 * Fix script: Seed remaining collections that failed in the first run.
 * Run: npx tsx scripts/seed-fix.ts
 */
import mongoose from 'mongoose';
import crypto from 'crypto';

const MONGODB_URI = 'mongodb+srv://collabhubAdmin:murarijagansai@collabhub.18ydvxf.mongodb.net/?appName=CollabHub';

function hash(s: string) { return crypto.createHash('sha256').update(s).digest('hex'); }
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000); }
function convId(a: string, b: string) { return [a, b].sort().join('_'); }

async function main() {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db!;

  // Get all user and startup IDs we need
  const usersCol = db.collection('users');
  const startupsCol = db.collection('startups');

  const founders = await usersCol.find({ role: 'founder' }).sort({ createdAt: 1 }).toArray();
  const talents = await usersCol.find({ role: 'talent' }).sort({ createdAt: 1 }).toArray();
  const investors = await usersCol.find({ role: 'investor' }).sort({ createdAt: 1 }).toArray();
  const startups = await startupsCol.find({}).sort({ createdAt: 1 }).toArray();

  console.log(`Found: ${founders.length} founders, ${talents.length} talents, ${investors.length} investors, ${startups.length} startups`);

  // ── AGREEMENTS ──
  console.log('Creating agreements...');
  const agreementsCol = db.collection('agreements');
  let agrCount = 0;

  // Work agreements: each startup founder + first 2 team members
  for (const startup of startups) {
    const founder = founders.find(f => f._id.equals(startup.founderId));
    if (!founder || !startup.team?.length) continue;
    const teamSlice = startup.team.slice(0, 2);
    for (const talentId of teamSlice) {
      const talent = await usersCol.findOne({ _id: talentId });
      if (!talent) continue;
      try {
        await agreementsCol.insertOne({
          type: 'work',
          startupId: startup._id,
          parties: [founder._id, talent._id],
          terms: { equityPercent: 1.5, vestingPeriod: 48, cliffPeriod: 12, startDate: daysAgo(60), compensation: 80000 },
          content: `Work Agreement between ${startup.name} and ${talent.name}. The talent agrees to contribute with equity vesting over 4 years with a 1-year cliff.`,
          status: 'signed',
          version: 1,
          signedBy: [
            { userId: founder._id, signedAt: daysAgo(58), signatureHash: hash(`${founder._id}-work-${startup._id}`) },
            { userId: talent._id, signedAt: daysAgo(55), signatureHash: hash(`${talent._id}-work-${startup._id}`) },
          ],
          auditLog: [
            { action: 'created', userId: founder._id, timestamp: daysAgo(60) },
            { action: 'signed', userId: talent._id, timestamp: daysAgo(55) },
          ],
          createdAt: daysAgo(60),
          updatedAt: daysAgo(55),
        });
        agrCount++;
      } catch (e: any) { if (e.code !== 11000) console.log('Agreement error:', e.message); }
    }
  }

  // Investment agreements
  for (const inv of investors) {
    const investmentsDocs = await db.collection('investments').find({ investorId: inv._id, status: 'completed' }).toArray();
    for (const investment of investmentsDocs) {
      const startup = startups.find(s => s._id.equals(investment.startupId));
      if (!startup) continue;
      const founder = founders.find(f => f._id.equals(startup.founderId));
      if (!founder) continue;
      try {
        await agreementsCol.insertOne({
          type: 'investment',
          startupId: startup._id,
          parties: [founder._id, inv._id],
          terms: { equityPercent: 5, startDate: daysAgo(30), compensation: investment.amount },
          content: `Investment Agreement: ${inv.name} invests in ${startup.name} for equity stake. Terms as per SAFE note.`,
          status: 'signed',
          version: 1,
          signedBy: [
            { userId: founder._id, signedAt: daysAgo(28), signatureHash: hash(`${founder._id}-inv-${startup._id}`) },
            { userId: inv._id, signedAt: daysAgo(25), signatureHash: hash(`${inv._id}-inv-${startup._id}`) },
          ],
          auditLog: [
            { action: 'created', userId: founder._id, timestamp: daysAgo(30) },
            { action: 'signed', userId: inv._id, timestamp: daysAgo(25) },
          ],
          createdAt: daysAgo(30),
          updatedAt: daysAgo(25),
        });
        agrCount++;
      } catch (e: any) { if (e.code !== 11000) console.log('Agreement error:', e.message); }
    }
  }
  console.log(`  ${agrCount} agreements created`);

  // ── MILESTONES ──
  console.log('Creating milestones...');
  const milestonesCol = db.collection('milestones');
  let msCount = 0;
  const msTemplates = [
    { title: 'MVP Launch', description: 'Launch minimum viable product with core features', amount: 50000, status: 'completed', paymentStatus: 'confirmed' },
    { title: 'First 100 Users', description: 'Achieve 100 active users on the platform', amount: 30000, status: 'completed', paymentStatus: 'confirmed' },
    { title: 'Revenue Target Q1', description: 'Hit first revenue milestone', amount: 80000, status: 'in_progress', paymentStatus: 'pending' },
    { title: 'Series A Readiness', description: 'Prepare pitch deck and data room', amount: 20000, status: 'pending', paymentStatus: 'pending' },
  ];
  for (const startup of startups) {
    for (let mi = 0; mi < msTemplates.length; mi++) {
      const ms = msTemplates[mi];
      const existingMs = await milestonesCol.findOne({ startupId: startup._id, title: ms.title });
      if (existingMs) continue;
      try {
        await milestonesCol.insertOne({
          startupId: startup._id,
          assignedTo: startup.team?.[0] || undefined,
          title: ms.title,
          description: ms.description,
          amount: ms.amount,
          dueDate: daysAgo(-30 * (mi + 1)),
          status: ms.status,
          paymentStatus: ms.paymentStatus,
          completedAt: ms.status === 'completed' ? daysAgo(10 - mi * 3) : undefined,
          createdAt: daysAgo(60),
          updatedAt: daysAgo(5),
        });
        msCount++;
      } catch (e: any) { console.log('Milestone error:', e.message); }
    }
  }
  console.log(`  ${msCount} milestones created`);

  // ── ALLIANCES ──
  console.log('Creating alliances...');
  const alliancesCol = db.collection('alliances');
  let alCount = 0;
  const alliancePairs: [any, any, string][] = [];

  // Founder-Founder alliances
  if (founders.length >= 10) {
    alliancePairs.push(
      [founders[0]._id, founders[1]._id, 'Cross-platform AI integration collaboration'],
      [founders[2]._id, founders[4]._id, 'Fintech API integration partnership'],
      [founders[3]._id, founders[6]._id, 'EdTech content partnership for farmer education'],
      [founders[7]._id, founders[8]._id, 'IoT and solar hardware collaboration'],
      [founders[5]._id, founders[9]._id, 'Healthcare data security partnership'],
    );
  }
  // Founder-Investor alliances
  if (investors.length >= 5 && founders.length >= 3) {
    alliancePairs.push(
      [founders[0]._id, investors[0]._id, 'Strategic advisory and investment discussion'],
      [founders[1]._id, investors[3]._id, 'HealthTech investment and mentorship'],
      [founders[2]._id, investors[4]._id, 'Fintech scaling advisory'],
    );
  }
  // Founder-Talent alliances
  if (talents.length >= 3 && founders.length >= 2) {
    alliancePairs.push(
      [founders[0]._id, talents[0]._id, 'Core engineering collaboration'],
      [founders[0]._id, talents[1]._id, 'Design partnership for platform UI'],
      [founders[1]._id, talents[2]._id, 'ML engineering for diagnostics'],
    );
  }

  for (const [reqId, recId, msg] of alliancePairs) {
    const existing = await alliancesCol.findOne({ requesterId: reqId, receiverId: recId });
    if (existing) continue;
    try {
      await alliancesCol.insertOne({
        requesterId: reqId, receiverId: recId, status: 'accepted', message: msg,
        createdAt: daysAgo(20), updatedAt: daysAgo(18),
      });
      alCount++;
    } catch (e: any) { if (e.code !== 11000) console.log('Alliance error:', e.message); }
  }
  console.log(`  ${alCount} alliances created`);

  // ── CONVERSATIONS & MESSAGES ──
  console.log('Creating conversations and messages...');
  const conversationsCol = db.collection('conversations');
  const messagesCol = db.collection('messages');
  let msgCount = 0;

  const convos: { p: [any, any]; msgs: { s: number; t: string }[] }[] = [];
  if (founders.length > 0 && talents.length > 0) {
    convos.push({
      p: [founders[0]._id, talents[0]._id],
      msgs: [
        { s: 0, t: 'Hi! We are looking for a full-stack developer. Your React/Next.js expertise is exactly what we need.' },
        { s: 1, t: 'Thanks for reaching out! I would love to contribute. Can we discuss the role details?' },
        { s: 0, t: 'We are offering 2% equity with a 4-year vest plus a competitive stipend. Can you start next week?' },
        { s: 1, t: 'That sounds great! I can start Monday. I will review the codebase over the weekend.' },
        { s: 0, t: 'Perfect! Welcome aboard!' },
      ],
    });
  }
  if (founders.length > 0 && investors.length > 0) {
    convos.push({
      p: [founders[0]._id, investors[0]._id],
      msgs: [
        { s: 0, t: 'Hi! I wanted to share our progress. We have onboarded 500+ users and 50 startups in the first month.' },
        { s: 1, t: 'Impressive traction! What is your current MRR and burn rate?' },
        { s: 0, t: 'We are pre-revenue but have strong engagement metrics. 85% weekly retention.' },
        { s: 1, t: 'Solid numbers. Let us schedule a call to discuss investment terms.' },
        { s: 0, t: 'I will send over the pitch deck and data room access right away.' },
      ],
    });
  }
  if (founders.length >= 3 && talents.length >= 4) {
    convos.push({
      p: [founders[2]._id, talents[3]._id],
      msgs: [
        { s: 0, t: 'Hi! We are scaling fast and need a growth marketing lead. Your B2B SaaS experience is what we need.' },
        { s: 1, t: 'Exciting! I have scaled SaaS products to 500K users. When can we discuss the role?' },
        { s: 0, t: 'We need someone for paid acquisition, content marketing, and partnerships. Are you available this week?' },
        { s: 1, t: 'Absolutely! Let me share some growth strategies I have in mind for the fintech space.' },
      ],
    });
  }
  if (talents.length >= 9) {
    convos.push({
      p: [talents[0]._id, talents[8]._id],
      msgs: [
        { s: 0, t: 'Hey! Working on the deployment pipeline. Do you have experience with Vercel + MongoDB Atlas in production?' },
        { s: 1, t: 'Yes! I have set up similar stacks. For Atlas, make sure you configure connection pooling properly.' },
        { s: 0, t: 'That would be great. Let me share the current config and we can optimize together.' },
      ],
    });
  }
  if (founders.length >= 6 && investors.length >= 3) {
    convos.push({
      p: [founders[5]._id, investors[2]._id],
      msgs: [
        { s: 0, t: 'We completed our pilot with 3 hospitals. Results show 94% diagnostic accuracy for chest X-rays.' },
        { s: 1, t: 'Impressive results! What is your regulatory pathway looking like?' },
        { s: 0, t: 'We are in the process of Class B medical device registration. Expected approval by Q3.' },
        { s: 1, t: 'Let me review the clinical data. If the accuracy holds at scale, I am very interested.' },
      ],
    });
  }
  if (founders.length >= 8 && talents.length >= 17) {
    convos.push({
      p: [founders[7]._id, talents[16]._id],
      msgs: [
        { s: 0, t: 'We need your IoT expertise for sensor modules. Can you design a low-power soil moisture sensor array?' },
        { s: 1, t: 'I can prototype a module within 2 weeks using ESP32 + LoRaWAN. What is the target battery life?' },
        { s: 0, t: 'Our farmers need something that lasts 6+ months on battery. Can LoRa handle that range?' },
      ],
    });
  }

  for (const convo of convos) {
    const cId = convId(convo.p[0].toString(), convo.p[1].toString());
    const existing = await conversationsCol.findOne({ participants: { $all: convo.p } });
    if (!existing) {
      const lastMsg = convo.msgs[convo.msgs.length - 1];
      try {
        await conversationsCol.insertOne({
          participants: convo.p, lastMessage: lastMsg.t, lastMessageAt: daysAgo(1), unreadCount: {},
          createdAt: daysAgo(5), updatedAt: daysAgo(1),
        });
      } catch (e: any) { console.log('Conversation error:', e.message); }
    }
    for (let mi = 0; mi < convo.msgs.length; mi++) {
      const m = convo.msgs[mi];
      const existingMsg = await messagesCol.findOne({ conversationId: cId, content: m.t });
      if (existingMsg) continue;
      try {
        await messagesCol.insertOne({
          senderId: convo.p[m.s], receiverId: convo.p[m.s === 0 ? 1 : 0], conversationId: cId,
          content: m.t, read: true, readAt: daysAgo(1),
          createdAt: daysAgo(5 - mi), updatedAt: daysAgo(5 - mi),
        });
        msgCount++;
      } catch (e: any) { console.log('Message error:', e.message); }
    }
  }
  console.log(`  ${convos.length} conversations, ${msgCount} messages created`);

  // ── NOTIFICATIONS ──
  console.log('Creating notifications...');
  const notifsCol = db.collection('notifications');
  let notifCount = 0;
  const notifEntries: { userId: any; type: string; title: string; message: string }[] = [];

  for (let i = 0; i < Math.min(5, founders.length); i++) {
    notifEntries.push({ userId: founders[i]._id, type: 'application_received', title: 'New Application Received', message: `A talented developer has applied to join your startup.` });
    notifEntries.push({ userId: founders[i]._id, type: 'milestone_completed', title: 'Milestone Completed', message: 'MVP Launch milestone has been marked as completed.' });
    notifEntries.push({ userId: founders[i]._id, type: 'funding_update', title: 'New Investment', message: 'A new investment has been recorded for your startup.' });
  }
  for (const inv of investors) {
    notifEntries.push({ userId: inv._id, type: 'agreement_signed', title: 'Agreement Signed', message: 'Your investment agreement has been signed successfully.' });
  }
  for (let i = 0; i < Math.min(8, talents.length); i++) {
    notifEntries.push({ userId: talents[i]._id, type: 'application_status', title: 'Application Update', message: 'Your application has been shortlisted! The founder will reach out soon.' });
  }
  for (let i = 0; i < Math.min(5, talents.length); i++) {
    notifEntries.push({ userId: talents[i]._id, type: 'alliance_accepted', title: 'Alliance Accepted', message: 'Your alliance request has been accepted!' });
  }

  for (const n of notifEntries) {
    const existing = await notifsCol.findOne({ userId: n.userId, type: n.type, title: n.title });
    if (existing) continue;
    try {
      await notifsCol.insertOne({ ...n, read: Math.random() > 0.4, createdAt: daysAgo(Math.floor(Math.random() * 10)) });
      notifCount++;
    } catch (e: any) { console.log('Notification error:', e.message); }
  }
  console.log(`  ${notifCount} notifications created`);

  // ── TRUST SCORE LOGS ──
  console.log('Creating trust score logs...');
  const tsCol = db.collection('trustscorelogs');
  let tsCount = 0;
  for (const f of founders) {
    for (const cat of ['milestone', 'agreement', 'alliance']) {
      const existing = await tsCol.findOne({ userId: f._id, category: cat });
      if (existing) continue;
      try {
        await tsCol.insertOne({ userId: f._id, scoreChange: 5 + Math.floor(Math.random() * 10), reason: `${cat} activity completed`, category: cat, createdAt: daysAgo(Math.floor(Math.random() * 20)) });
        tsCount++;
      } catch (e: any) { console.log('TrustScore error:', e.message); }
    }
  }
  console.log(`  ${tsCount} trust score logs created`);

  console.log('\nDone! Disconnecting...');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
