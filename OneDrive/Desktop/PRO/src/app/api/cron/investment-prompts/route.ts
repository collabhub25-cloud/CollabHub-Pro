import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Pitch, InvestmentConfirmation, Startup, User, Notification } from '@/lib/models';

const TIMER_HOURS = 2;
const EXPIRY_HOURS = 48;

/**
 * GET /api/cron/investment-prompts
 * 
 * Cron job endpoint — checks for pitches sent more than 2 hours ago
 * that haven't yet triggered an investment confirmation prompt.
 * 
 * Can be called by:
 * - Vercel Cron (vercel.json cron config)
 * - External scheduler
 * - Admin force-trigger (?force=true bypasses timer for dev/demo)
 * 
 * Protected by CRON_SECRET or admin auth.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const cronSecret = searchParams.get('secret');
    const pitchIdForce = searchParams.get('pitchId'); // Force trigger for specific pitch

    // Auth: require cron secret OR valid admin/founder token
    const expectedSecret = process.env.CRON_SECRET || 'alloysphere-cron-2025';
    let isAuthorized = cronSecret === expectedSecret;

    if (!isAuthorized) {
      // Try token auth
      const { extractTokenFromCookies, verifyAccessToken } = await import('@/lib/auth');
      const token = extractTokenFromCookies(request);
      if (token) {
        const payload = verifyAccessToken(token);
        if (payload) {
          const user = await User.findById(payload.userId);
          if (user && (user.role === 'admin' || user.role === 'founder')) {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query for pitches that need confirmation triggers
    const timerThreshold = new Date(Date.now() - TIMER_HOURS * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pitchQuery: Record<string, any> = {
      pitchStatus: 'sent',
      confirmationTriggeredAt: { $exists: false },
    };

    if (pitchIdForce) {
      // Force trigger for specific pitch
      pitchQuery._id = pitchIdForce;
      if (force) {
        delete pitchQuery.confirmationTriggeredAt; // Allow re-trigger
      }
    } else if (!force) {
      // Only process pitches older than 2 hours
      pitchQuery.pitchSentAt = { $lte: timerThreshold };
    }

    const pitches = await Pitch.find(pitchQuery)
      .populate('startupId', 'name founderId')
      .populate('investorId', 'name email');

    let triggered = 0;

    for (const pitch of pitches) {
      try {
        const startup = pitch.startupId as unknown as { _id: string; name: string; founderId: string };
        const investor = pitch.investorId as unknown as { _id: string; name: string; email: string };

        if (!startup || !investor) continue;

        // Check if confirmation already exists
        const existing = await InvestmentConfirmation.findOne({
          pitchId: pitch._id,
        });

        if (existing && !force) continue;

        // Create InvestmentConfirmation
        const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

        let confirmation;
        if (existing && force) {
          // Reset existing on force
          existing.status = 'awaiting_entries';
          existing.promptSentAt = new Date();
          existing.expiresAt = expiresAt;
          existing.founderAmount = undefined;
          existing.founderEquity = undefined;
          existing.founderSubmittedAt = undefined;
          existing.investorAmount = undefined;
          existing.investorEquity = undefined;
          existing.investorSubmittedAt = undefined;
          existing.mismatchDetails = undefined;
          await existing.save();
          confirmation = existing;
        } else {
          confirmation = await InvestmentConfirmation.create({
            startupId: startup._id,
            investorId: investor._id,
            pitchId: pitch._id,
            status: 'awaiting_entries',
            promptSentAt: new Date(),
            expiresAt,
          });
        }

        // Mark pitch as triggered
        pitch.confirmationTriggeredAt = new Date();
        await pitch.save();

        // Notify INVESTOR
        await Notification.create({
          userId: investor._id,
          type: 'investment_entry_prompt',
          title: 'Enter Investment Details',
          message: `Time to finalize your investment in ${startup.name}. Please enter the agreed investment amount and equity percentage.`,
          actionUrl: '/dashboard/investor',
          metadata: {
            confirmationId: confirmation._id.toString(),
            pitchId: pitch._id.toString(),
            startupId: startup._id.toString(),
            startupName: startup.name,
          },
        });

        // Notify FOUNDER
        await Notification.create({
          userId: startup.founderId,
          type: 'investment_entry_prompt',
          title: 'Enter Investment Details',
          message: `Time to confirm investment details with ${investor.name} for ${startup.name}. Please enter the agreed investment amount and equity percentage.`,
          actionUrl: '/dashboard/founder',
          metadata: {
            confirmationId: confirmation._id.toString(),
            pitchId: pitch._id.toString(),
            investorId: investor._id.toString(),
            investorName: investor.name,
            startupName: startup.name,
          },
        });

        triggered++;
      } catch (pitchError) {
        console.error(`Error processing pitch ${pitch._id}:`, pitchError);
      }
    }

    // Also check for expired confirmations
    const expiredConfirmations = await InvestmentConfirmation.find({
      status: { $in: ['awaiting_entries', 'founder_submitted', 'investor_submitted'] },
      expiresAt: { $lte: new Date() },
    });

    let expired = 0;
    for (const conf of expiredConfirmations) {
      conf.status = 'expired';
      await conf.save();
      expired++;
    }

    return NextResponse.json({
      success: true,
      triggered,
      expired,
      totalPitchesChecked: pitches.length,
      message: `Processed ${triggered} new investment prompts. ${expired} confirmations expired.`,
    });
  } catch (error) {
    console.error('Cron Investment Prompts Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
