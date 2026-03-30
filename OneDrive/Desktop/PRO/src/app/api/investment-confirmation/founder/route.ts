import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InvestmentConfirmation, Startup, User, Investment, TeamMember, Notification, Pitch } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';

/**
 * MATCHING LOGIC — Core trust & financial system
 * Called when both parties have submitted their entries.
 * Exact match on amount + equity → creates Investment + TeamMember.
 */
async function runMatchingLogic(confirmationId: string) {
  const confirmation = await InvestmentConfirmation.findById(confirmationId);
  if (!confirmation) return null;

  // Both must have submitted
  if (
    confirmation.founderAmount == null || confirmation.founderEquity == null ||
    confirmation.investorAmount == null || confirmation.investorEquity == null
  ) {
    return confirmation;
  }

  const amountMatch = confirmation.founderAmount === confirmation.investorAmount;
  const equityMatch = confirmation.founderEquity === confirmation.investorEquity;

  if (amountMatch && equityMatch) {
    // ✅ MATCH → Create official Investment record
    const investment = await Investment.create({
      investorId: confirmation.investorId,
      startupId: confirmation.startupId,
      amountInvested: confirmation.founderAmount,
      equityPercentage: confirmation.founderEquity,
      investmentDate: new Date(),
      status: 'active',
    });

    // Add investor to startup team
    await TeamMember.findOneAndUpdate(
      { startupId: confirmation.startupId, userId: confirmation.investorId },
      {
        startupId: confirmation.startupId,
        userId: confirmation.investorId,
        role: 'Investor',
        isFounder: false,
        equity: confirmation.founderEquity,
        status: 'active',
        joinedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update confirmation
    confirmation.status = 'matched';
    confirmation.matchedAt = new Date();
    confirmation.investmentId = investment._id;
    await confirmation.save();

    // Update pitch status
    await Pitch.findByIdAndUpdate(confirmation.pitchId, { pitchStatus: 'invested' });

    // Get startup name for notifications
    const startup = await Startup.findById(confirmation.startupId).select('name founderId');

    // Notify both parties
    const [investor, founder] = await Promise.all([
      User.findById(confirmation.investorId).select('name'),
      startup ? User.findById(startup.founderId).select('name') : null,
    ]);

    // Notify investor
    await Notification.create({
      userId: confirmation.investorId,
      type: 'investment_matched',
      title: 'Investment Confirmed! 🎉',
      message: `Your investment of $${confirmation.founderAmount.toLocaleString()} for ${confirmation.founderEquity}% equity in ${startup?.name} has been verified`,
      actionUrl: '/dashboard/investor',
      metadata: {
        confirmationId: confirmation._id.toString(),
        investmentId: investment._id.toString(),
        amount: confirmation.founderAmount,
        equity: confirmation.founderEquity,
      },
    });

    // Notify founder
    if (startup) {
      await Notification.create({
        userId: startup.founderId,
        type: 'investment_matched',
        title: 'Investment Confirmed! 🎉',
        message: `${investor?.name}'s investment of $${confirmation.founderAmount.toLocaleString()} for ${confirmation.founderEquity}% equity in ${startup.name} has been verified`,
        actionUrl: '/dashboard/founder',
        metadata: {
          confirmationId: confirmation._id.toString(),
          investmentId: investment._id.toString(),
          amount: confirmation.founderAmount,
          equity: confirmation.founderEquity,
        },
      });
    }

    return confirmation;
  } else {
    // ❌ MISMATCH
    confirmation.status = 'mismatched';
    confirmation.mismatchDetails = {
      amountDiff: Math.abs(confirmation.founderAmount - confirmation.investorAmount),
      equityDiff: Math.abs(confirmation.founderEquity - confirmation.investorEquity),
    };
    await confirmation.save();

    const startup = await Startup.findById(confirmation.startupId).select('name founderId');

    // Notify both parties
    await Notification.create({
      userId: confirmation.investorId,
      type: 'investment_mismatched',
      title: 'Discrepancy Detected',
      message: `Investment details for ${startup?.name} don't match. Please review and re-enter.`,
      actionUrl: '/dashboard/investor',
      metadata: {
        confirmationId: confirmation._id.toString(),
        amountDiff: confirmation.mismatchDetails.amountDiff,
        equityDiff: confirmation.mismatchDetails.equityDiff,
      },
    });

    if (startup) {
      await Notification.create({
        userId: startup.founderId,
        type: 'investment_mismatched',
        title: 'Discrepancy Detected',
        message: `Investment details for ${startup.name} don't match. Please review and re-enter.`,
        actionUrl: '/dashboard/founder',
        metadata: {
          confirmationId: confirmation._id.toString(),
          amountDiff: confirmation.mismatchDetails.amountDiff,
          equityDiff: confirmation.mismatchDetails.equityDiff,
        },
      });
    }

    return confirmation;
  }
}

// POST /api/investment-confirmation/founder — Founder submits investment terms
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'founder') {
      return NextResponse.json({ error: 'Only founders can submit founder entries' }, { status: 403 });
    }

    const body = await request.json();
    const { confirmationId, founderAmount, founderEquity } = body;

    if (!confirmationId || founderAmount == null || founderEquity == null) {
      return NextResponse.json({ error: 'Missing required fields: confirmationId, founderAmount, founderEquity' }, { status: 400 });
    }

    if (founderAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    if (founderEquity <= 0 || founderEquity > 100) {
      return NextResponse.json({ error: 'Equity must be between 0 and 100' }, { status: 400 });
    }

    const confirmation = await InvestmentConfirmation.findById(confirmationId);
    if (!confirmation) {
      return NextResponse.json({ error: 'Confirmation not found' }, { status: 404 });
    }

    // Verify founder owns the startup
    const startup = await Startup.findById(confirmation.startupId);
    if (!startup || startup.founderId.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Not authorized for this startup' }, { status: 403 });
    }

    // Check status allows entry
    if (!['awaiting_entries', 'investor_submitted', 'mismatched'].includes(confirmation.status)) {
      return NextResponse.json({ 
        error: `Cannot submit — current status is "${confirmation.status}"` 
      }, { status: 400 });
    }

    // Prevent re-submission if already submitted (unless mismatch retry)
    if (confirmation.founderSubmittedAt && confirmation.status !== 'mismatched') {
      return NextResponse.json({ error: 'Founder entry already submitted' }, { status: 400 });
    }

    // Record founder's entry
    confirmation.founderAmount = founderAmount;
    confirmation.founderEquity = founderEquity;
    confirmation.founderSubmittedAt = new Date();

    // Update status based on whether investor has also submitted
    if (confirmation.investorSubmittedAt && confirmation.status !== 'mismatched') {
      // Both have submitted — run matching
      await confirmation.save();
      const result = await runMatchingLogic(confirmationId);
      return NextResponse.json({
        success: true,
        confirmation: result,
        matched: result?.status === 'matched',
      });
    } else if (confirmation.status === 'mismatched') {
      // Reset for re-entry
      confirmation.status = confirmation.investorSubmittedAt ? 'investor_submitted' : 'awaiting_entries';
      confirmation.investorAmount = undefined;
      confirmation.investorEquity = undefined;
      confirmation.investorSubmittedAt = undefined;
      confirmation.mismatchDetails = undefined;
      confirmation.retryCount = (confirmation.retryCount || 0) + 1;
      confirmation.status = 'founder_submitted';
      await confirmation.save();
      return NextResponse.json({ success: true, confirmation, message: 'Founder entry submitted. Awaiting investor entry.' });
    } else {
      confirmation.status = 'founder_submitted';
      await confirmation.save();
      return NextResponse.json({ success: true, confirmation, message: 'Founder entry submitted. Awaiting investor entry.' });
    }
  } catch (error) {
    console.error('Founder Confirmation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
