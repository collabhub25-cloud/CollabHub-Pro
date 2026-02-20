import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Verification, Notification, SkillTest, UserTestResult } from '@/lib/models';
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

    // Get available skill tests
    const skillTests = await SkillTest.find({}).select('-questions.correctAnswer').lean();

    // Get user's test results
    const testResults = await UserTestResult.find({ userId: decoded.userId }).lean();

    // Map test results to tests
    const testsWithResults = skillTests.map((test) => {
      const result = testResults.find((r) => r.testId.toString() === test._id.toString());
      return {
        ...test,
        hasAttempted: !!result,
        score: result?.score,
        passed: result?.passed,
        completedAt: result?.completedAt,
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

// POST /api/verification/skill-test - Submit skill test result (Talent only)
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
    const { testId, answers } = body;

    if (!testId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Test ID and answers are required' },
        { status: 400 }
      );
    }

    // Get the test
    const test = await SkillTest.findById(testId);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Calculate score
    let correctAnswers = 0;
    test.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / test.questions.length) * 100);
    const passed = score >= test.passingScore;

    // Save test result
    await UserTestResult.create({
      userId: decoded.userId,
      testId,
      score,
      passed,
      answers,
      completedAt: new Date(),
    });

    // Get the level for skill_test verification
    const level = getLevelForType(userRole, 'skill_test');

    // Update or create verification
    let verification = await Verification.findOne({
      userId: decoded.userId,
      type: 'skill_test',
      role: userRole,
    });

    if (verification) {
      verification.testScore = score;
      verification.testPassed = passed;
      verification.status = passed ? 'approved' : 'submitted';
      await verification.save();
    } else {
      verification = await Verification.create({
        userId: decoded.userId,
        role: userRole,
        type: 'skill_test',
        level: level || 1,
        status: passed ? 'approved' : 'submitted',
        testScore: score,
        testPassed: passed,
      });
    }

    // If passed, update user's verification level
    if (passed) {
      // Update user verification level if this level is higher
      const currentLevel = user.verificationLevel || 0;
      if ((level || 1) > currentLevel) {
        user.verificationLevel = level;
        await user.save();
      }

      // Update trust score
      await User.findByIdAndUpdate(decoded.userId, {
        $inc: { trustScore: 5 },
      });

      // Create notification
      await Notification.create({
        userId: decoded.userId,
        type: 'verification_update',
        title: 'Skill Test Passed!',
        message: `Congratulations! You passed the ${test.name} test with a score of ${score}%.`,
        metadata: { testId, score, passed },
      });
    } else {
      // Create notification for failed test
      await Notification.create({
        userId: decoded.userId,
        type: 'verification_update',
        title: 'Skill Test Result',
        message: `You scored ${score}% on ${test.name}. You need ${test.passingScore}% to pass. Please try again.`,
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
