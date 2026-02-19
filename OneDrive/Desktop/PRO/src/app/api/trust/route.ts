import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, TrustScoreLog, Milestone, Application, Agreement } from '@/lib/models';
import { requireAuth, requireAdmin } from '@/lib/security';
import { AuthResult } from '@/lib/security';

// Calculate trust score based on various factors
async function calculateTrustScore(userId: string): Promise<number> {
  const [
    completedMilestones,
    totalMilestones,
    agreementsSigned,
    successfulApplications,
    disputes,
  ] = await Promise.all([
    Milestone.countDocuments({ assignedTo: userId, status: 'completed' }),
    Milestone.countDocuments({ assignedTo: userId }),
    Agreement.countDocuments({ 'signedBy.userId': userId }),
    Application.countDocuments({ talentId: userId, status: 'accepted' }),
    Application.countDocuments({ talentId: userId, status: 'rejected' }),
  ]);

  // Base score
  let score = 30;

  // Milestone completion rate (max +30)
  if (totalMilestones > 0) {
    const completionRate = completedMilestones / totalMilestones;
    score += Math.round(completionRate * 30);
  }

  // Agreements signed (max +15)
  score += Math.min(agreementsSigned * 3, 15);

  // Successful applications (max +15)
  score += Math.min(successfulApplications * 2, 15);

  // Penalties for disputes/rejections
  score -= Math.min(disputes * 5, 20);

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, score));
}

// GET /api/trust - Get trust score and logs
// SECURITY FIX: Only allow users to view their own trust score, or admins to view any
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    
    // SECURITY: Determine target user ID
    // Users can only view their own trust score unless they are admin
    let targetUserId = authResult.user.userId;
    
    if (requestedUserId && requestedUserId !== authResult.user.userId) {
      // If requesting another user's trust score, must be admin
      if (authResult.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Permission denied. You can only view your own trust score.' },
          { status: 403 }
        );
      }
      targetUserId = requestedUserId;
    }

    const user = await User.findById(targetUserId).select('trustScore verificationLevel name');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const logs = await TrustScoreLog.find({ userId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(20);

    return NextResponse.json({
      success: true,
      trustScore: user.trustScore,
      verificationLevel: user.verificationLevel,
      userName: user.name,
      logs,
    });
  } catch (error) {
    console.error('Get trust score error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/trust - Recalculate trust score
// SECURITY: Only allow admins or self to recalculate
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();

    const body = await request.json();
    const { userId } = body;
    
    // SECURITY: Determine target user ID
    let targetUserId = authResult.user.userId;
    
    if (userId && userId !== authResult.user.userId) {
      // If requesting to recalculate another user's trust score, must be admin
      if (authResult.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Permission denied. You can only recalculate your own trust score.' },
          { status: 403 }
        );
      }
      targetUserId = userId;
    }

    // Get previous score
    const previousUser = await User.findById(targetUserId).select('trustScore');
    const previousScore = previousUser?.trustScore || 50;

    const newScore = await calculateTrustScore(targetUserId);

    // Update user's trust score
    const user = await User.findByIdAndUpdate(
      targetUserId,
      { $set: { trustScore: newScore, updatedAt: new Date() } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Log the recalculation if score changed
    if (newScore !== previousScore) {
      await TrustScoreLog.create({
        userId: targetUserId,
        scoreChange: newScore - previousScore,
        reason: 'Trust score recalculated',
        category: 'other',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Trust score recalculated',
      trustScore: newScore,
      previousScore,
    });
  } catch (error) {
    console.error('Recalculate trust score error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
