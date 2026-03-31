import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InvestmentConfirmation, Startup, User, Investment, TeamMember, Notification, Pitch } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';

/**
 * MATCHING LOGIC (same as founder route — ensures consistency)
 */
async function runMatchingLogic(confirmationId: string) {
  const confirmation = await InvestmentConfirmation.findById(confirmationId);
  if (!confirmation) return null;

  if (
    confirmation.founderAmount == null || confirmation.founderEquity == null ||
    confirmation.investorAmount == null || confirmation.investorEquity == null
  ) {
    return confirmation;
  }

  const amountMatch = confirmation.founderAmount === confirmation.investorAmount;
  const equityMatch = confirmation.founderEquity === confirmation.investorEquity;

  if (amountMatch && equityMatch) {
    const investment = await Investment.create({
      investorId: confirmation.investorId,
      startupId: confirmation.startupId,
      amountInvested: confirmation.founderAmount,
      equityPercentage: confirmation.founderEquity,
      investmentDate: new Date(),
      status: 'active',
    });

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

    confirmation.status = 'matched';
    confirmation.matchedAt = new Date();
    confirmation.investmentId = investment._id;
    await confirmation.save();

    await Pitch.findByIdAndUpdate(confirmation.pitchId, { pitchStatus: 'invested' });

    const startup = await Startup.findById(confirmation.startupId).select('name founderId');
    const investor = await User.findById(confirmation.investorId).select('name');

    await Notification.create({
      userId: confirmation.investorId,
      type: 'investment_matched',
      title: 'Investment Confirmed! 🎉',
      message: `Your investment of ₹${confirmation.founderAmount.toLocaleString('en-IN')} for ${confirmation.founderEquity}% equity in ${startup?.name} has been verified`,
      actionUrl: '/dashboard/investor',
      metadata: {
        confirmationId: confirmation._id.toString(),
        investmentId: investment._id.toString(),
        amount: confirmation.founderAmount,
        equity: confirmation.founderEquity,
      },
    });

    if (startup) {
      await Notification.create({
        userId: startup.founderId,
        type: 'investment_matched',
        title: 'Investment Confirmed! 🎉',
        message: `${investor?.name}'s investment of ₹${confirmation.founderAmount.toLocaleString('en-IN')} for ${confirmation.founderEquity}% equity in ${startup.name} has been verified`,
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
    confirmation.status = 'mismatched';
    confirmation.mismatchDetails = {
      amountDiff: Math.abs(confirmation.founderAmount - confirmation.investorAmount),
      equityDiff: Math.abs(confirmation.founderEquity - confirmation.investorEquity),
    };
    await confirmation.save();

    const startup = await Startup.findById(confirmation.startupId).select('name founderId');

    await Notification.create({
      userId: confirmation.investorId,
      type: 'investment_mismatched',
      title: 'Discrepancy Detected',
      message: `Investment details for ${startup?.name} don't match. Please review and re-enter.`,
      actionUrl: '/dashboard/investor',
      metadata: { confirmationId: confirmation._id.toString() },
    });

    if (startup) {
      await Notification.create({
        userId: startup.founderId,
        type: 'investment_mismatched',
        title: 'Discrepancy Detected',
        message: `Investment details for ${startup.name} don't match. Please review and re-enter.`,
        actionUrl: '/dashboard/founder',
        metadata: { confirmationId: confirmation._id.toString() },
      });
    }

    return confirmation;
  }
}

// POST /api/investment-confirmation/investor — Investor submits investment terms
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'investor') {
      return NextResponse.json({ error: 'Only investors can submit investor entries' }, { status: 403 });
    }

    const body = await request.json();
    const { confirmationId, investorAmount, investorEquity } = body;

    if (!confirmationId || investorAmount == null || investorEquity == null) {
      return NextResponse.json({ error: 'Missing required fields: confirmationId, investorAmount, investorEquity' }, { status: 400 });
    }

    if (investorAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    if (investorEquity <= 0 || investorEquity > 100) {
      return NextResponse.json({ error: 'Equity must be between 0 and 100' }, { status: 400 });
    }

    const confirmation = await InvestmentConfirmation.findById(confirmationId);
    if (!confirmation) {
      return NextResponse.json({ error: 'Confirmation not found' }, { status: 404 });
    }

    // Verify investor identity
    if (confirmation.investorId.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Not authorized for this confirmation' }, { status: 403 });
    }

    // Check status allows entry
    if (!['awaiting_entries', 'founder_submitted', 'mismatched'].includes(confirmation.status)) {
      return NextResponse.json({
        error: `Cannot submit — current status is "${confirmation.status}"`,
      }, { status: 400 });
    }

    // Prevent re-submission if already submitted (unless mismatch retry)
    if (confirmation.investorSubmittedAt && confirmation.status !== 'mismatched') {
      return NextResponse.json({ error: 'Investor entry already submitted' }, { status: 400 });
    }

    // Record investor's entry
    confirmation.investorAmount = investorAmount;
    confirmation.investorEquity = investorEquity;
    confirmation.investorSubmittedAt = new Date();

    if (confirmation.founderSubmittedAt && confirmation.status !== 'mismatched') {
      await confirmation.save();
      const result = await runMatchingLogic(confirmationId);
      return NextResponse.json({
        success: true,
        confirmation: result,
        matched: result?.status === 'matched',
      });
    } else if (confirmation.status === 'mismatched') {
      // Reset for re-entry
      confirmation.founderAmount = undefined;
      confirmation.founderEquity = undefined;
      confirmation.founderSubmittedAt = undefined;
      confirmation.mismatchDetails = undefined;
      confirmation.retryCount = (confirmation.retryCount || 0) + 1;
      confirmation.status = 'investor_submitted';
      await confirmation.save();
      return NextResponse.json({ success: true, confirmation, message: 'Investor entry submitted. Awaiting founder entry.' });
    } else {
      confirmation.status = 'investor_submitted';
      await confirmation.save();
      return NextResponse.json({ success: true, confirmation, message: 'Investor entry submitted. Awaiting founder entry.' });
    }
  } catch (error) {
    console.error('Investor Confirmation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
