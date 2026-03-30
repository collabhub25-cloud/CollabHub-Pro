import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InvestmentConfirmation, Startup, User, Notification } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';

// POST /api/investment-confirmation/retry — Re-trigger a mismatched/expired confirmation
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { confirmationId } = body;

    if (!confirmationId) {
      return NextResponse.json({ error: 'Confirmation ID is required' }, { status: 400 });
    }

    const confirmation = await InvestmentConfirmation.findById(confirmationId);
    if (!confirmation) {
      return NextResponse.json({ error: 'Confirmation not found' }, { status: 404 });
    }

    // Only mismatched or expired can be retried
    if (!['mismatched', 'expired'].includes(confirmation.status)) {
      return NextResponse.json({
        error: `Cannot retry — current status is "${confirmation.status}"`,
      }, { status: 400 });
    }

    // Verify the user is a participant
    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const startup = await Startup.findById(confirmation.startupId);
    const isFounder = startup && startup.founderId.toString() === payload.userId;
    const isInvestor = confirmation.investorId.toString() === payload.userId;

    if (!isFounder && !isInvestor) {
      return NextResponse.json({ error: 'Not authorized for this confirmation' }, { status: 403 });
    }

    // Max 3 retries
    if (confirmation.retryCount >= 3) {
      return NextResponse.json({
        error: 'Maximum retry limit reached. Please contact support for manual resolution.',
      }, { status: 400 });
    }

    // Reset entries
    confirmation.founderAmount = undefined;
    confirmation.founderEquity = undefined;
    confirmation.founderSubmittedAt = undefined;
    confirmation.investorAmount = undefined;
    confirmation.investorEquity = undefined;
    confirmation.investorSubmittedAt = undefined;
    confirmation.mismatchDetails = undefined;
    confirmation.status = 'awaiting_entries';
    confirmation.retryCount = (confirmation.retryCount || 0) + 1;
    confirmation.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48hr deadline
    await confirmation.save();

    // Notify both parties
    const investorUser = await User.findById(confirmation.investorId).select('name');

    await Notification.create({
      userId: confirmation.investorId,
      type: 'investment_entry_prompt',
      title: 'Re-enter Investment Details',
      message: `Investment confirmation for ${startup?.name} has been reset. Please re-enter your details.`,
      actionUrl: '/dashboard/investor',
      metadata: { confirmationId: confirmation._id.toString() },
    });

    if (startup) {
      await Notification.create({
        userId: startup.founderId,
        type: 'investment_entry_prompt',
        title: 'Re-enter Investment Details',
        message: `Investment confirmation with ${investorUser?.name} for ${startup.name} has been reset. Please re-enter your details.`,
        actionUrl: '/dashboard/founder',
        metadata: { confirmationId: confirmation._id.toString() },
      });
    }

    return NextResponse.json({
      success: true,
      confirmation,
      message: 'Confirmation reset. Both parties can re-enter investment details.',
    });
  } catch (error) {
    console.error('Retry Confirmation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
