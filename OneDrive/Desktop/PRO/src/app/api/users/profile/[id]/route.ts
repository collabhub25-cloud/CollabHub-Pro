import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Verification, Startup, Investor, Alliance } from '@/lib/models';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

// Helper to generate conversation ID between two users
function generateConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

// GET /api/users/profile/[id] - Get public profile of any user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    let currentUserId: string | null = null;
    let currentUserRole: string | null = null;
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        currentUserId = decoded.userId;
        currentUserRole = decoded.role;
      }
    }

    await connectDB();

    const user = await User.findById(id).select('-passwordHash -email -kycStatus').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Base public profile
    const publicProfile: Record<string, unknown> = {
      _id: user._id.toString(),
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      trustScore: user.trustScore,
      verificationLevel: user.verificationLevel,
      location: user.location,
      createdAt: user.createdAt,
    };

    // Role-specific public data
    if (user.role === 'talent') {
      publicProfile.skills = user.skills || [];
      publicProfile.experience = user.experience;
      publicProfile.githubUrl = user.githubUrl;
      publicProfile.linkedinUrl = user.linkedinUrl;
      publicProfile.portfolioUrl = user.portfolioUrl;
      
      // Get verification status for resume
      const resumeVerification = await Verification.findOne({
        userId: id,
        type: 'resume',
        status: 'approved',
      }).lean();
      
      // Resume is visible only to founders and investors
      if (resumeVerification && (currentUserRole === 'founder' || currentUserRole === 'investor')) {
        publicProfile.hasResume = true;
        publicProfile.resumeUrl = resumeVerification.resumeUrl;
      } else if (resumeVerification) {
        publicProfile.hasResume = true;
      }
    }

    if (user.role === 'founder') {
      // Get startups
      const startups = await Startup.find({ founderId: id, isActive: true })
        .select('name vision description stage industry fundingStage trustScore logo')
        .lean();
      
      publicProfile.startups = startups;
    }

    if (user.role === 'investor') {
      const investorProfile = await Investor.findOne({ userId: id }).lean();
      if (investorProfile) {
        publicProfile.ticketSize = investorProfile.ticketSize;
        publicProfile.preferredIndustries = investorProfile.preferredIndustries;
        publicProfile.stagePreference = investorProfile.stagePreference;
        publicProfile.investmentThesis = investorProfile.investmentThesis;
        
        // Get investment count (without revealing specific deals)
        publicProfile.investmentCount = investorProfile.dealHistory?.length || 0;
      }
    }

    // Check if current user can message this user
    if (currentUserId && currentUserId !== id) {
      publicProfile.canMessage = true;
      publicProfile.conversationId = generateConversationId(currentUserId, id);
    }

    // Add alliance count
    const allianceCount = await Alliance.countDocuments({
      status: 'accepted',
      $or: [{ requesterId: id }, { receiverId: id }],
    });
    publicProfile.allianceCount = allianceCount;

    return NextResponse.json({ profile: publicProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
