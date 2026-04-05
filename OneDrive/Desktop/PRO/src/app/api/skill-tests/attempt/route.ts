import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SkillTest, UserTestAttempt } from '@/lib/models/skill-test.model';
import { User } from '@/lib/models/user.model';

// POST: Start a test attempt
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    const { testId } = await req.json();

    if (!testId) {
      return NextResponse.json({ error: 'testId is required' }, { status: 400 });
    }

    const test = await SkillTest.findById(testId);
    if (!test || !test.isActive) {
      return NextResponse.json({ error: 'Test not found or inactive' }, { status: 404 });
    }

    // Check for existing in-progress attempt
    const existing = await UserTestAttempt.findOne({
      userId,
      testId,
      status: 'in_progress',
    });

    if (existing) {
      // Return existing attempt so user can resume
      return NextResponse.json({
        attempt: existing,
        test: {
          _id: test._id,
          title: test.title,
          skill: test.skill,
          durationMinutes: test.durationMinutes,
          totalPoints: test.totalPoints,
          questions: test.questions.map((q: any) => ({
            _id: q._id,
            question: q.question,
            options: q.options,
            points: q.points,
          })),
        },
        resumed: true,
      });
    }

    // Create new attempt
    const attempt = await UserTestAttempt.create({
      userId,
      testId,
      totalPoints: test.totalPoints,
      startedAt: new Date(),
    });

    return NextResponse.json({
      attempt,
      test: {
        _id: test._id,
        title: test.title,
        skill: test.skill,
        durationMinutes: test.durationMinutes,
        totalPoints: test.totalPoints,
        questions: test.questions.map((q: any) => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          points: q.points,
        })),
      },
      resumed: false,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/skill-tests/attempt error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Submit answers for an attempt
export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    const { attemptId, answers, timedOut } = await req.json();

    if (!attemptId || !answers) {
      return NextResponse.json({ error: 'attemptId and answers are required' }, { status: 400 });
    }

    const attempt = await UserTestAttempt.findOne({ _id: attemptId, userId, status: 'in_progress' });
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found or already completed' }, { status: 404 });
    }

    // Check if timed out (add 10s grace period)
    const test = await SkillTest.findById(attempt.testId);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const elapsed = (Date.now() - new Date(attempt.startedAt).getTime()) / 1000;
    const maxSeconds = test.durationMinutes * 60 + 10; // 10s grace
    const isTimedOut = timedOut || elapsed > maxSeconds;

    // Grade the answers
    let score = 0;
    const gradedAnswers = answers.map((a: { questionId: string; selectedOptionIndex: number }) => {
      const question = test.questions.find((q: any) => String(q._id) === String(a.questionId));
      if (!question) return { ...a, isCorrect: false, pointsEarned: 0 };

      const isCorrect = a.selectedOptionIndex === question.correctOptionIndex;
      const pointsEarned = isCorrect ? (question.points || 1) : 0;
      score += pointsEarned;

      return { ...a, isCorrect, pointsEarned };
    });

    const percentage = test.totalPoints > 0 ? Math.round((score / test.totalPoints) * 100) : 0;
    const passed = percentage >= test.passingScore;

    // Calculate percentile (how this score compares to other attempts)
    const betterAttempts = await UserTestAttempt.countDocuments({
      testId: test._id,
      status: { $in: ['completed', 'timed_out'] },
      percentage: { $lt: percentage },
    });
    const totalAttempts = await UserTestAttempt.countDocuments({
      testId: test._id,
      status: { $in: ['completed', 'timed_out'] },
    });
    const percentile = totalAttempts > 0 ? Math.round((betterAttempts / totalAttempts) * 100) : 50;

    // Update attempt
    attempt.answers = gradedAnswers;
    attempt.score = score;
    attempt.percentage = percentage;
    attempt.percentile = percentile;
    attempt.passed = passed;
    attempt.status = isTimedOut ? 'timed_out' : 'completed';
    attempt.completedAt = new Date();
    attempt.timeSpentSeconds = Math.round(elapsed);
    await attempt.save();

    // Update test stats
    await SkillTest.findByIdAndUpdate(test._id, {
      $inc: { attemptCount: 1 },
      $set: {
        averageScore: totalAttempts > 0
          ? Math.round(((test.averageScore * totalAttempts) + percentage) / (totalAttempts + 1))
          : percentage,
      },
    });

    // Update user's skill test scores
    await User.findByIdAndUpdate(userId, {
      $push: {
        skillTestScores: {
          skill: test.skill,
          score: percentage,
          percentile,
          testId: test._id,
          completedAt: new Date(),
        },
      },
    });

    return NextResponse.json({
      attempt: {
        _id: attempt._id,
        score,
        totalPoints: test.totalPoints,
        percentage,
        percentile,
        passed,
        status: attempt.status,
        timeSpentSeconds: attempt.timeSpentSeconds,
        answers: gradedAnswers.map((a: any) => ({
          questionId: a.questionId,
          selectedOptionIndex: a.selectedOptionIndex,
          isCorrect: a.isCorrect,
          pointsEarned: a.pointsEarned,
        })),
      },
      message: passed ? 'Congratulations! You passed!' : 'Keep practicing!',
    });
  } catch (error) {
    console.error('PUT /api/skill-tests/attempt error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
