import { connectDB } from '@/lib/mongodb';
import { User, Job, Startup } from '@/lib/models';
import { Investment } from '@/lib/models/investment.model';

// ============================================
// RECOMMENDATION ENGINE v2
// Enhanced algorithmic matching with weighted scoring,
// fuzzy matching, recency bias, engagement signals, caching
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
// HELPERS
// ============================================

// In-memory cache: key → { data, expiry }
const cache = new Map<string, { data: Recommendation[]; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): Recommendation[] | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: Recommendation[]) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

/** Normalize a skill string for comparison */
function normalizeSkill(s: string): string {
  return s.toLowerCase().trim()
    .replace(/\.js$/i, '')
    .replace(/js$/i, '')
    .replace(/\./g, '')
    .replace(/-/g, '')
    .replace(/_/g, '');
}

/** Fuzzy skill match: "react" matches "react.js", "reactjs", "React" */
function skillsMatch(a: string, b: string): boolean {
  const na = normalizeSkill(a);
  const nb = normalizeSkill(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Levenshtein-like: if strings are very close (1 edit distance for short strings)
  if (na.length > 3 && nb.length > 3) {
    if (na.startsWith(nb.substring(0, 3)) || nb.startsWith(na.substring(0, 3))) return true;
  }
  return false;
}

/** Jaccard similarity between two skill sets */
function jaccardSimilarity(setA: string[], setB: string[]): number {
  if (setA.length === 0 && setB.length === 0) return 0;
  let intersection = 0;
  for (const a of setA) {
    if (setB.some(b => skillsMatch(a, b))) intersection++;
  }
  const union = new Set([...setA.map(normalizeSkill), ...setB.map(normalizeSkill)]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Days since a date */
function daysSince(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return Math.max(0, (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/** Recency bonus: newer items score higher */
function recencyBonus(createdAt: Date | string, maxBonus: number = 10, halfLifeDays: number = 7): number {
  const days = daysSince(createdAt);
  return Math.round(maxBonus * Math.exp(-days / halfLifeDays));
}

// ============================================
// 1. TALENT → JOB RECOMMENDATIONS
// Score = skillMatch(60%) + roleMatch(20%) + recency(10%) + startupQuality(10%)
// ============================================
export async function getRecommendedJobs(talentId: string): Promise<Recommendation[]> {
  const cacheKey = `jobs:${talentId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  await connectDB();

  const talent = await User.findById(talentId)
    .select('skills interestedRoles experience name')
    .lean() as any;

  if (!talent) return [];

  const talentSkills = (talent.skills || []).map((s: string) => s.toLowerCase().trim());
  const interestedRoles = (talent.interestedRoles || []).map((r: string) => r.toLowerCase().trim());

  // Broader pool: 100 candidates
  const jobs = await Job.find({ isActive: true })
    .populate('startupId', 'name industry stage logo AlloySphereVerified team')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean() as any[];

  if (jobs.length === 0) return [];

  const scored = jobs.map((job: any) => {
    const jobSkills = (job.skillsRequired || []).map((s: string) => s.toLowerCase().trim());
    const jobTitle = (job.title || '').toLowerCase();

    // Skill overlap score using Jaccard similarity (60% weight)
    const skillSimilarity = jaccardSimilarity(talentSkills, jobSkills);
    const skillScore = skillSimilarity * 60;

    // Role match score (20% weight)
    let roleMatch = 0;
    if (interestedRoles.length > 0) {
      const titleWords = jobTitle.split(/\s+/);
      const hasMatch = interestedRoles.some((role: string) =>
        jobTitle.includes(role) || titleWords.some(w => skillsMatch(w, role))
      );
      if (hasMatch) roleMatch = 20;
    }

    // Recency bias (10% weight) - newer jobs score higher
    const recency = job.createdAt ? recencyBonus(job.createdAt, 10, 7) : 0;

    // Startup quality signals (10% weight)
    let qualityScore = 0;
    if (job.startupId?.AlloySphereVerified) qualityScore += 5;
    if ((job.startupId?.team?.length || 0) >= 3) qualityScore += 3;
    if (job.startupId?.stage) qualityScore += 2;

    const score = Math.round(skillScore + roleMatch + recency + qualityScore);
    
    const matchedSkills = jobSkills.filter((js: string) =>
      talentSkills.some((ts: string) => skillsMatch(ts, js))
    );

    let explanation: string;
    if (score >= 70) {
      explanation = `Strong match — ${Math.round(skillSimilarity * 100)}% skill overlap`;
    } else if (score >= 40) {
      explanation = matchedSkills.length > 0
        ? `${matchedSkills.length} of ${jobSkills.length} required skills match`
        : roleMatch > 0 ? 'Role aligns with your interests' : 'Potential growth opportunity';
    } else {
      explanation = 'Explore this role to expand your experience';
    }

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
        skillOverlapPercent: Math.round(skillSimilarity * 100),
        daysOld: job.createdAt ? Math.round(daysSince(job.createdAt)) : undefined,
      },
    };
  });

  const results = scored
    .sort((a: Recommendation, b: Recommendation) => b.score - a.score)
    .slice(0, 10);

  setCache(cacheKey, results);
  return results;
}

// ============================================
// 2. INVESTOR → STARTUP RECOMMENDATIONS
// Score: sector(30%) + stage(25%) + quality(20%) + history(15%) + founder(10%)
// ============================================
export async function getRecommendedStartups(investorId: string): Promise<Recommendation[]> {
  const cacheKey = `startups:${investorId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

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

  // Broader pool: 100 candidates, exclude already invested
  const startups = await Startup.find({
    isActive: true,
    _id: { $nin: investedStartupIds },
  })
    .populate('founderId', 'name verificationLevel')
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean() as any[];

  if (startups.length === 0) return [];

  // Portfolio diversity: count how many investments per industry
  const industryConcentration = new Map<string, number>();
  investedIndustries.forEach((ind: string) => {
    industryConcentration.set(ind, (industryConcentration.get(ind) || 0) + 1);
  });

  const scored = startups.map((startup: any) => {
    let score = 15; // Base score
    const reasons: string[] = [];
    const industry = (startup.industry || '').toLowerCase();
    const stage = (startup.fundingStage || '').toLowerCase();

    // Sector match (30%)
    if (preferredSectors.length > 0 && preferredSectors.includes(industry)) {
      score += 30;
      reasons.push(`Matches preferred sector: ${startup.industry}`);
    } else if (investedIndustries.includes(industry)) {
      // Reduce score if over-concentrated in this industry
      const concentration = industryConcentration.get(industry) || 0;
      const diversityPenalty = Math.min(concentration * 3, 10);
      score += Math.max(20 - diversityPenalty, 10);
      reasons.push(`Previously invested in ${startup.industry}`);
    }

    // Stage preference (25%)
    if (stagePrefs.length > 0 && stagePrefs.includes(stage)) {
      score += 25;
      reasons.push(`${startup.fundingStage} stage aligns with your preference`);
    }

    // Quality & engagement signals (20%)
    const teamSize = startup.team?.length || 0;
    if (teamSize >= 5) {
      score += 8;
      reasons.push(`Strong team of ${teamSize} members`);
    } else if (teamSize >= 3) {
      score += 5;
      reasons.push(`Growing team of ${teamSize} members`);
    }
    if (startup.fundingAmount && startup.fundingAmount > 0) {
      score += 6;
      reasons.push('Has existing funding traction');
    }
    if (startup.AlloySphereVerified) {
      score += 6;
      reasons.push('AlloySphere verified startup');
    }

    // Founder trust (10%)
    if (startup.founderId?.verificationLevel >= 2) {
      score += 10;
      reasons.push('Verified founder');
    } else if (startup.founderId?.verificationLevel >= 1) {
      score += 5;
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

  const results = scored
    .sort((a: Recommendation, b: Recommendation) => b.score - a.score)
    .slice(0, 10);

  setCache(cacheKey, results);
  return results;
}

// ============================================
// 3. FOUNDER → TALENT RECOMMENDATIONS
// Match: job skills → talent skills + experience + availability
// ============================================
export async function getRecommendedTalents(startupId: string): Promise<Recommendation[]> {
  const cacheKey = `talents:${startupId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

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

  // Broader pool: 100 candidates
  const talents = await User.find({ role: 'talent' })
    .select('name skills experience avatar verificationLevel interestedRoles updatedAt')
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean() as any[];

  if (talents.length === 0) return [];

  const expRankMap: Record<string, number> = {
    'entry': 1, 'mid': 2, 'senior': 3, 'lead': 4, 'executive': 5,
  };

  const scored = talents.map((talent: any) => {
    const talentSkills = (talent.skills || []).map((s: string) => s.toLowerCase().trim());
    let score = 10; // Base
    const reasons: string[] = [];

    // Skill overlap using Jaccard (60%)
    const similarity = jaccardSimilarity(requiredArray, talentSkills);
    score += Math.round(similarity * 60);
    const matchedSkills = requiredArray.filter((req: string) =>
      talentSkills.some((ts: string) => skillsMatch(req, ts))
    );
    if (matchedSkills.length > 0) {
      reasons.push(`${matchedSkills.length} of ${requiredArray.length} required skills match`);
    }

    // Experience level alignment (15%)
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
        score += 15;
        reasons.push('Experience level aligns');
      }
    }

    // Recency / activity bonus (10%) — recently active talent scored higher
    if (talent.updatedAt) {
      score += recencyBonus(talent.updatedAt, 10, 14);
      if (daysSince(talent.updatedAt) < 7) {
        reasons.push('Recently active');
      }
    }

    // Interest alignment (5%) — talent interested in roles matching job titles
    const interestedRoles = (talent.interestedRoles || []).map((r: string) => r.toLowerCase());
    const jobTitles = jobs.map(j => (j.title || '').toLowerCase());
    const interestMatch = interestedRoles.some((role: string) =>
      jobTitles.some(title => title.includes(role) || role.includes(title.split(' ')[0]))
    );
    if (interestMatch) {
      score += 5;
      reasons.push('Interested in relevant roles');
    }

    // Verification bonus (10%)
    if (talent.verificationLevel >= 2) {
      score += 10;
      reasons.push('Verified profile');
    }

    if (reasons.length === 0) {
      reasons.push('Active talent on the platform');
    }

    const explanation = score >= 70
      ? `Strong match — skills overlap ${Math.round(similarity * 100)}%`
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

  const results = scored
    .sort((a: Recommendation, b: Recommendation) => b.score - a.score)
    .slice(0, 10);

  setCache(cacheKey, results);
  return results;
}

// ============================================
// 4. FOUNDER → INVESTOR RECOMMENDATIONS
// Match: startup industry/stage → investor preferences + history + activity
// ============================================
export async function getRecommendedInvestors(founderId: string): Promise<Recommendation[]> {
  const cacheKey = `investors:${founderId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  await connectDB();

  // Get founder's startups
  const startups = await Startup.find({ founderId })
    .select('industry fundingStage stage name')
    .lean() as any[];

  if (startups.length === 0) return [];

  const founderIndustries = startups.map((s: any) => s.industry?.toLowerCase()).filter(Boolean);
  const founderStages = startups.map((s: any) => s.fundingStage?.toLowerCase()).filter(Boolean);

  // Broader pool: 100 investors
  const investors = await User.find({ role: 'investor' })
    .select('name preferredIndustries stagePreference bio verificationLevel avatar experience updatedAt')
    .sort({ updatedAt: -1 })
    .limit(100)
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

    // Industry match (30%)
    const industryMatch = founderIndustries.some((ind: string) => prefIndustries.includes(ind));
    if (industryMatch) {
      score += 30;
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

    // Activity signal (10%) — recently active investors ranked higher
    if (investor.updatedAt) {
      const activityBonus = recencyBonus(investor.updatedAt, 10, 14);
      score += activityBonus;
      if (activityBonus >= 7) {
        reasons.push('Recently active investor');
      }
    }

    // Verification bonus (10%)
    if (investor.verificationLevel >= 2) {
      score += 10;
      reasons.push('Verified investor');
    }

    if (reasons.length === 0) {
      reasons.push('Active investor on the platform');
    }

    // Deduplicate explanation reasons
    const uniqueReasons = [...new Set(reasons)];

    const explanation = score >= 70
      ? `Strong match — ${uniqueReasons[0]}`
      : score >= 40
        ? uniqueReasons[0]
        : 'Potential investor to connect with';

    return {
      id: investor._id.toString(),
      name: investor.name,
      subtitle: investor.experience || 'Investor',
      score: Math.min(score, 100),
      explanation,
      tags: uniqueReasons.slice(0, 3),
      metadata: {
        avatar: investor.avatar,
        verificationLevel: investor.verificationLevel,
        preferredIndustries: investor.preferredIndustries,
      },
    };
  });

  const results = scored
    .sort((a: Recommendation, b: Recommendation) => b.score - a.score)
    .slice(0, 10);

  setCache(cacheKey, results);
  return results;
}
