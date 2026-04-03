import { connectDB } from '@/lib/mongodb';
import { User, Job, Startup } from '@/lib/models';
import { Investment } from '@/lib/models/investment.model';

// ============================================
// RECOMMENDATION ENGINE
// Real algorithmic matching with weighted scoring
// ============================================

export interface Recommendation {
  id: string;
  name: string;
  subtitle?: string;
  score: number;
  explanation: string;
  tags: string[];
  metadata?: Record<string, any>;
}

// ============================================
// 1. TALENT → JOB RECOMMENDATIONS
// Score = skillMatchWeight(70%) + roleMatchWeight(30%)
// ============================================
export async function getRecommendedJobs(talentId: string): Promise<Recommendation[]> {
  await connectDB();

  const talent = await User.findById(talentId)
    .select('skills interestedRoles experience name')
    .lean() as any;

  if (!talent) return [];

  const talentSkills = (talent.skills || []).map((s: string) => s.toLowerCase().trim());
  const interestedRoles = (talent.interestedRoles || []).map((r: string) => r.toLowerCase().trim());

  // Fetch active jobs
  const jobs = await Job.find({ isActive: true })
    .populate('startupId', 'name industry stage logo')
    .limit(50)
    .lean() as any[];

  if (jobs.length === 0) return [];

  const scored = jobs.map((job: any) => {
    const jobSkills = (job.skillsRequired || []).map((s: string) => s.toLowerCase().trim());
    const jobTitle = (job.title || '').toLowerCase();

    // Skill overlap score (70% weight)
    let skillOverlap = 0;
    if (jobSkills.length > 0 && talentSkills.length > 0) {
      const matchCount = jobSkills.filter((js: string) =>
        talentSkills.some((ts: string) => ts.includes(js) || js.includes(ts))
      ).length;
      skillOverlap = matchCount / Math.max(jobSkills.length, 1);
    }

    // Role match score (30% weight)
    let roleMatch = 0;
    if (interestedRoles.length > 0) {
      const titleMatch = interestedRoles.some((role: string) =>
        jobTitle.includes(role) || role.includes(jobTitle.split(' ')[0])
      );
      if (titleMatch) roleMatch = 1;
    }

    const score = Math.round((skillOverlap * 70) + (roleMatch * 30));
    const matchedSkills = jobSkills.filter((js: string) =>
      talentSkills.some((ts: string) => ts.includes(js) || js.includes(ts))
    );

    const explanation = score >= 70
      ? `Your skills match ${Math.round(skillOverlap * 100)}% of the requirements`
      : score >= 40
        ? `Partial skill match — ${matchedSkills.length} of ${jobSkills.length} skills align`
        : `Explore this role to expand your experience`;

    return {
      id: job._id.toString(),
      name: job.title,
      subtitle: job.startupId?.name || 'Unknown Startup',
      score: Math.max(score, 5),
      explanation,
      tags: [
        ...(matchedSkills.length > 0 ? matchedSkills.slice(0, 3) : []),
        job.experienceLevel,
        job.employmentType,
      ].filter(Boolean),
      metadata: {
        startupId: job.startupId?._id,
        industry: job.startupId?.industry,
        locationType: job.locationType,
        compensation: job.compensation,
        skillOverlapPercent: Math.round(skillOverlap * 100),
      },
    };
  });

  return scored
    .sort((a: Recommendation, b: Recommendation) => b.score - a.score)
    .slice(0, 10);
}

// ============================================
// 2. INVESTOR → STARTUP RECOMMENDATIONS
// Score based on: sector match, stage preference, growth signals
// ============================================
export async function getRecommendedStartups(investorId: string): Promise<Recommendation[]> {
  await connectDB();

  const investor = await User.findById(investorId)
    .select('bio experience preferredIndustries stagePreference')
    .lean() as any;

  if (!investor) return [];

  const preferredSectors = (investor.preferredIndustries || []).map((s: string) => s.toLowerCase().trim());
  const stagePrefs = (investor.stagePreference || []).map((s: string) => s.toLowerCase().trim());

  // Get investor's previous investments to understand patterns
  const previousInvestments = await Investment.find({ investorId })
    .populate('startupId', 'industry stage')
    .lean() as any[];

  const investedIndustries = previousInvestments
    .map((inv: any) => inv.startupId?.industry?.toLowerCase())
    .filter(Boolean);
  const investedStartupIds = previousInvestments
    .map((inv: any) => inv.startupId?._id?.toString())
    .filter(Boolean);

  // Fetch active startups (exclude already invested)
  const startups = await Startup.find({
    isActive: true,
    _id: { $nin: investedStartupIds },
  })
    .populate('founderId', 'name verificationLevel')
    .limit(50)
    .lean() as any[];

  if (startups.length === 0) return [];

  const scored = startups.map((startup: any) => {
    let score = 20; // Base score
    const reasons: string[] = [];
    const industry = (startup.industry || '').toLowerCase();
    const stage = (startup.fundingStage || '').toLowerCase();

    // Sector match (30%)
    if (preferredSectors.length > 0 && preferredSectors.includes(industry)) {
      score += 30;
      reasons.push(`Matches preferred sector: ${startup.industry}`);
    } else if (investedIndustries.includes(industry)) {
      score += 20;
      reasons.push(`Previously invested in ${startup.industry}`);
    }

    // Stage preference (25%)
    if (stagePrefs.length > 0 && stagePrefs.includes(stage)) {
      score += 25;
      reasons.push(`${startup.fundingStage} stage aligns with your preference`);
    }

    // Growth signals (25%)
    const teamSize = startup.team?.length || 0;
    if (teamSize >= 3) {
      score += 10;
      reasons.push(`Strong team of ${teamSize} members`);
    }
    if (startup.fundingAmount && startup.fundingAmount > 0) {
      score += 8;
      reasons.push('Has existing funding traction');
    }
    if (startup.AlloySphereVerified) {
      score += 7;
      reasons.push('AlloySphere verified startup');
    }

    // Founder trust (10%)
    if (startup.founderId?.verificationLevel >= 2) {
      score += 10;
      reasons.push('Verified founder');
    }

    if (reasons.length === 0) {
      reasons.push('Active startup on the platform');
    }

    const explanation = score >= 70
      ? `Strong match — ${reasons[0]}`
      : score >= 40
        ? reasons[0]
        : 'Potential opportunity to explore';

    return {
      id: startup._id.toString(),
      name: startup.name,
      subtitle: `${startup.industry} · ${startup.stage}`,
      score: Math.min(score, 100),
      explanation,
      tags: reasons.slice(0, 3),
      metadata: {
        industry: startup.industry,
        stage: startup.stage,
        fundingStage: startup.fundingStage,
        teamSize,
        founderName: startup.founderId?.name,
      },
    };
  });

  return scored
    .sort((a: Recommendation, b: Recommendation) => b.score - a.score)
    .slice(0, 10);
}

// ============================================
// 3. FOUNDER → TALENT RECOMMENDATIONS
// Match: job skills → talent skills + experience
// ============================================
export async function getRecommendedTalents(startupId: string): Promise<Recommendation[]> {
  await connectDB();

  // Get the startup and its jobs
  const startup = await Startup.findById(startupId)
    .select('skillsNeeded industry')
    .lean() as any;

  if (!startup) return [];

  const jobs = await Job.find({ startupId, isActive: true })
    .select('skillsRequired experienceLevel title')
    .lean() as any[];

  // Build required skill set from startup + all jobs
  const requiredSkills = new Set<string>();
  (startup.skillsNeeded || []).forEach((s: string) => requiredSkills.add(s.toLowerCase().trim()));
  jobs.forEach((job: any) => {
    (job.skillsRequired || []).forEach((s: string) => requiredSkills.add(s.toLowerCase().trim()));
  });

  const requiredArray = Array.from(requiredSkills);
  if (requiredArray.length === 0) return [];

  // Get experience levels needed
  const expLevels = jobs.map((j: any) => j.experienceLevel).filter(Boolean);

  // Fetch talent users
  const talents = await User.find({ role: 'talent' })
    .select('name skills experience avatar verificationLevel interestedRoles')
    .limit(50)
    .lean() as any[];

  if (talents.length === 0) return [];

  const expRankMap: Record<string, number> = {
    'entry': 1, 'mid': 2, 'senior': 3, 'lead': 4, 'executive': 5,
  };

  const scored = talents.map((talent: any) => {
    const talentSkills = (talent.skills || []).map((s: string) => s.toLowerCase().trim());
    let score = 10; // Base
    const reasons: string[] = [];

    // Skill overlap (70%)
    if (requiredArray.length > 0 && talentSkills.length > 0) {
      const matchCount = requiredArray.filter((req: string) =>
        talentSkills.some((ts: string) => ts.includes(req) || req.includes(ts))
      ).length;
      const overlapPct = matchCount / requiredArray.length;
      score += Math.round(overlapPct * 70);
      if (matchCount > 0) {
        reasons.push(`${matchCount} of ${requiredArray.length} required skills match`);
      }
    }

    // Experience level alignment (20%)
    if (expLevels.length > 0 && talent.experience) {
      const talentExp = talent.experience.toLowerCase();
      const hasMatch = expLevels.some((level: string) => {
        if (talentExp.includes(level)) return true;
        if (talentExp.includes('year')) {
          const years = parseInt(talentExp);
          const rank = expRankMap[level] || 0;
          if (rank <= 1 && years <= 2) return true;
          if (rank === 2 && years >= 2 && years <= 5) return true;
          if (rank >= 3 && years >= 5) return true;
        }
        return false;
      });
      if (hasMatch) {
        score += 20;
        reasons.push('Experience level aligns');
      }
    }

    // Verification bonus (10%)
    if (talent.verificationLevel >= 2) {
      score += 10;
      reasons.push('Verified profile');
    }

    if (reasons.length === 0) {
      reasons.push('Active talent on the platform');
    }

    const matchedSkills = requiredArray.filter((req: string) =>
      talentSkills.some((ts: string) => ts.includes(req) || req.includes(ts))
    );

    const explanation = score >= 70
      ? `Strong match — skills overlap ${Math.round((matchedSkills.length / requiredArray.length) * 100)}%`
      : score >= 40
        ? reasons[0]
        : 'Potential talent to explore';

    return {
      id: talent._id.toString(),
      name: talent.name,
      subtitle: talent.experience || 'Talent',
      score: Math.min(score, 100),
      explanation,
      tags: [
        ...matchedSkills.slice(0, 3),
        talent.verificationLevel >= 2 ? 'Verified' : '',
      ].filter(Boolean),
      metadata: {
        skills: talent.skills,
        avatar: talent.avatar,
        verificationLevel: talent.verificationLevel,
      },
    };
  });

  return scored
    .sort((a: Recommendation, b: Recommendation) => b.score - a.score)
    .slice(0, 10);
}

// ============================================
// 4. FOUNDER → INVESTOR RECOMMENDATIONS
// Match: startup industry/stage → investor preferences + history
// ============================================
export async function getRecommendedInvestors(founderId: string): Promise<Recommendation[]> {
  await connectDB();

  // Get founder's startups
  const startups = await Startup.find({ founderId })
    .select('industry fundingStage stage name')
    .lean() as any[];

  if (startups.length === 0) return [];

  const founderIndustries = startups.map((s: any) => s.industry?.toLowerCase()).filter(Boolean);
  const founderStages = startups.map((s: any) => s.fundingStage?.toLowerCase()).filter(Boolean);

  // Get all investors
  const investors = await User.find({ role: 'investor' })
    .select('name preferredIndustries stagePreference bio verificationLevel avatar experience')
    .limit(50)
    .lean() as any[];

  if (investors.length === 0) return [];

  // Get investment history
  const investmentHistory = await Investment.find({})
    .populate('startupId', 'industry')
    .lean() as any[];

  const scored = investors.map((investor: any) => {
    let score = 15; // Base score
    const reasons: string[] = [];

    const prefIndustries = (investor.preferredIndustries || []).map((s: string) => s.toLowerCase().trim());
    const stagePrefs = (investor.stagePreference || []).map((s: string) => s.toLowerCase().trim());

    // Industry match (35%)
    const industryMatch = founderIndustries.some((ind: string) => prefIndustries.includes(ind));
    if (industryMatch) {
      score += 35;
      const matchedIndustry = founderIndustries.find((ind: string) => prefIndustries.includes(ind));
      reasons.push(`Interested in ${matchedIndustry}`);
    }

    // Stage preference match (25%)
    const stageMatch = founderStages.some((stage: string) => stagePrefs.includes(stage));
    if (stageMatch) {
      score += 25;
      reasons.push('Stage preference aligns');
    }

    // Previous investments in similar industries (15%)
    const investorDeals = investmentHistory.filter((inv: any) => inv.investorId?.toString() === investor._id.toString());
    const investorIndustries = investorDeals.map((inv: any) => inv.startupId?.industry?.toLowerCase()).filter(Boolean);
    const historyMatch = founderIndustries.some((ind: string) => investorIndustries.includes(ind));
    if (historyMatch) {
      score += 15;
      reasons.push('Has invested in similar sectors');
    }

    // Verification bonus (10%)
    if (investor.verificationLevel >= 2) {
      score += 10;
      reasons.push('Verified investor');
    }

    if (reasons.length === 0) {
      reasons.push('Active investor on the platform');
    }

    const explanation = score >= 70
      ? `Strong match — ${reasons[0]}`
      : score >= 40
        ? reasons[0]
        : 'Potential investor to connect with';

    return {
      id: investor._id.toString(),
      name: investor.name,
      subtitle: investor.experience || 'Investor',
      score: Math.min(score, 100),
      explanation,
      tags: reasons.slice(0, 3),
      metadata: {
        avatar: investor.avatar,
        verificationLevel: investor.verificationLevel,
        preferredIndustries: investor.preferredIndustries,
      },
    };
  });

  return scored
    .sort((a: Recommendation, b: Recommendation) => b.score - a.score)
    .slice(0, 10);
}
