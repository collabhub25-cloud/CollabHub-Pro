import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Verification, Notification } from '@/lib/models';
import { SkillTest, UserTestAttempt } from '@/lib/models/skill-test.model';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import { canTakeSkillTest, getLevelForType } from '@/lib/verification-service';

// GET /api/verification/skill-test - Get available skill tests (Talent only)
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(decoded.userId).select('role skills');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = user.role as 'talent' | 'founder' | 'investor';

    // Check if skill test is allowed for this role
    if (!canTakeSkillTest(userRole)) {
      return NextResponse.json(
        { error: 'Skill tests are only available for Talent users' },
        { status: 403 }
      );
    }

    // Get available skill tests (strip correct answers)
    const skillTests = await SkillTest.find({ isActive: true })
      .select('title skill description difficulty durationMinutes totalPoints passingScore attemptCount averageScore')
      .lean();

    // Get user's completed test attempts
    const testAttempts = await UserTestAttempt.find({
      userId: decoded.userId,
      status: { $in: ['completed', 'timed_out'] },
    })
      .sort({ percentage: -1 })
      .lean();

    // Map test results to tests
    const testsWithResults = skillTests.map((test: any) => {
      const bestAttempt = testAttempts.find(
        (a: any) => a.testId.toString() === test._id.toString()
      );
      return {
        ...test,
        hasAttempted: !!bestAttempt,
        score: bestAttempt?.percentage,
        passed: bestAttempt?.passed,
        completedAt: bestAttempt?.completedAt,
      };
    });

    // Get verification status for skill test
    const verification = await Verification.findOne({
      userId: decoded.userId,
      type: 'skill_test',
      role: userRole,
    });

    return NextResponse.json({
      tests: testsWithResults,
      verificationStatus: verification?.status || 'pending',
      testScore: verification?.testScore,
      testPassed: verification?.testPassed,
    });
  } catch (error) {
    console.error('Error fetching skill tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill tests' },
      { status: 500 }
    );
  }
}

// POST /api/verification/skill-test - Submit skill test result for verification (Talent only)
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = user.role as 'talent' | 'founder' | 'investor';

    // Check if skill test is allowed for this role
    if (!canTakeSkillTest(userRole)) {
      return NextResponse.json(
        { error: 'Skill tests are only available for Talent users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { testId, attemptId } = body;

    if (!testId) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      );
    }

    // Get the test
    const test = await SkillTest.findById(testId);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Get the user's best completed attempt for this test
    const bestAttempt = await UserTestAttempt.findOne({
      userId: decoded.userId,
      testId,
      status: { $in: ['completed', 'timed_out'] },
    })
      .sort({ percentage: -1 })
      .lean();

    if (!bestAttempt) {
      return NextResponse.json(
        { error: 'No completed attempt found. Please take the test first.' },
        { status: 400 }
      );
    }

    const score = bestAttempt.percentage;
    const passed = bestAttempt.passed;

    // Get the level for skill_test verification
    const level = getLevelForType(userRole, 'skill_test');

    // Update or create verification
    let verification = await Verification.findOne({
      userId: decoded.userId,
      type: 'skill_test',
      role: userRole,
    });

    if (verification) {
      // Only update if the new score is better
      if (score > (verification.testScore || 0)) {
        verification.testScore = score;
        verification.testPassed = passed;
        verification.status = passed ? 'approved' : 'submitted';
        await verification.save();
      }
    } else {
      verification = await Verification.create({
        userId: decoded.userId,
        role: userRole,
        type: 'skill_test',
        level: level || 2,
        status: passed ? 'approved' : 'submitted',
        testScore: score,
        testPassed: passed,
      });
    }

    // If passed, update user's verification level
    if (passed) {
      const currentLevel = user.verificationLevel || 0;
      if ((level || 2) > currentLevel) {
        user.verificationLevel = level;
        await user.save();
      }

      // Create notification
      await Notification.create({
        userId: decoded.userId,
        type: 'verification_update',
        title: 'Skill Test Passed!',
        message: `Congratulations! You passed the ${test.title} test with a score of ${score}%.`,
        metadata: { testId, score, passed },
      });
    } else {
      // Create notification for failed test
      await Notification.create({
        userId: decoded.userId,
        type: 'verification_update',
        title: 'Skill Test Result',
        message: `You scored ${score}% on ${test.title}. You need ${test.passingScore}% to pass. Please try again.`,
        metadata: { testId, score, passed },
      });
    }

    return NextResponse.json({
      success: true,
      score,
      passed,
      passingScore: test.passingScore,
      verification,
    });
  } catch (error) {
    console.error('Error submitting skill test:', error);
    return NextResponse.json(
      { error: 'Failed to submit skill test' },
      { status: 500 }
    );
  }
}
