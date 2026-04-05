import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SkillTest } from '@/lib/models/skill-test.model';

// GET: List available tests, optionally filter by skill
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const skill = searchParams.get('skill');
    const id = searchParams.get('id');

    // Get a specific test by ID (with questions but without correct answers for non-admin)
    if (id) {
      const test = await SkillTest.findById(id).lean();
      if (!test) {
        return NextResponse.json({ error: 'Test not found' }, { status: 404 });
      }

      const role = req.headers.get('x-user-role');
      // Strip correct answers for non-admin users
      const sanitizedTest = {
        ...test,
        questions: (test as any).questions.map((q: any) => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          points: q.points,
          // Only include correctOptionIndex for admins
          ...(role === 'admin' ? { correctOptionIndex: q.correctOptionIndex, explanation: q.explanation } : {}),
        })),
      };

      return NextResponse.json({ test: sanitizedTest });
    }

    // List all active tests
    const filter: any = { isActive: true };
    if (skill) {
      filter.skill = { $regex: new RegExp(skill, 'i') };
    }

    const tests = await SkillTest.find(filter)
      .select('title skill description difficulty durationMinutes totalPoints passingScore attemptCount averageScore createdAt')
      .sort({ skill: 1, difficulty: 1 })
      .lean();

    return NextResponse.json({ tests });
  } catch (error) {
    console.error('GET /api/skill-tests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Admin-only — create new skill test
export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    const { title, skill, description, difficulty, durationMinutes, questions, passingScore } = body;

    if (!title || !skill || !description || !difficulty || !durationMinutes || !questions?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate questions
    for (const q of questions) {
      if (!q.question || !q.options || q.options.length < 2 || q.correctOptionIndex === undefined) {
        return NextResponse.json({ error: 'Each question must have question text, at least 2 options, and a correctOptionIndex' }, { status: 400 });
      }
      if (q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
        return NextResponse.json({ error: `correctOptionIndex out of range for question: "${q.question}"` }, { status: 400 });
      }
    }

    const test = await SkillTest.create({
      title,
      skill: skill.toLowerCase().trim(),
      description,
      difficulty,
      durationMinutes,
      questions,
      passingScore: passingScore || 60,
      createdBy: userId,
    });

    return NextResponse.json({ test, message: 'Skill test created' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/skill-tests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
