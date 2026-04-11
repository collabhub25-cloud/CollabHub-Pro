import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Notification } from '@/lib/models';
import { MentorSession } from '@/lib/models/mentor-session.model';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { createOrder } from '@/lib/payments/razorpay';
import { MENTOR_MIN_FEE, MENTOR_MAX_FEE } from '@/lib/payments/constants';
import { createLogger } from '@/lib/logger';

const log = createLogger('payments:mentor-session');

/**
 * GET /api/payments/mentor-session
 * List mentor sessions for the current user (as mentor or student).
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await connectDB();

    const sessions = await MentorSession.find({
      $or: [{ mentorId: payload.userId }, { studentId: payload.userId }],
    })
      .populate('mentorId', 'name avatar')
      .populate('studentId', 'name avatar')
      .sort({ scheduledAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    log.error('List mentor sessions error', error);
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}

/**
 * POST /api/payments/mentor-session
 * Book a mentor session with payment.
 * Body: { mentorId, scheduledAt, duration, topic, sessionFee }
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await connectDB();

    const body = await request.json();
    const { mentorId, scheduledAt, duration, topic, sessionFee } = body;

    // Validation
    if (!mentorId || !scheduledAt || !duration || !sessionFee) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (![30, 45, 60].includes(duration)) {
      return NextResponse.json({ error: 'Invalid session duration' }, { status: 400 });
    }

    if (sessionFee < MENTOR_MIN_FEE || sessionFee > MENTOR_MAX_FEE) {
      return NextResponse.json({
        error: `Session fee must be between ₹${MENTOR_MIN_FEE / 100} and ₹${MENTOR_MAX_FEE / 100}`,
      }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: 'Session must be scheduled in the future' }, { status: 400 });
    }

    // Verify mentor exists
    const mentor = await User.findById(mentorId).select('name email').lean() as any;
    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    // Can't book yourself
    if (mentorId === payload.userId) {
      return NextResponse.json({ error: 'Cannot book a session with yourself' }, { status: 400 });
    }

    // Check for time slot conflicts
    const conflictWindow = new Date(scheduledDate);
    const conflictEnd = new Date(scheduledDate);
    conflictEnd.setMinutes(conflictEnd.getMinutes() + duration);

    const conflict = await MentorSession.findOne({
      mentorId,
      status: { $in: ['booked', 'in_progress'] },
      scheduledAt: { $gte: scheduledDate, $lt: conflictEnd },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Time slot not available' }, { status: 409 });
    }

    // Create Razorpay order
    const receipt = `mentor_${payload.userId}_${Date.now()}`;
    const order = await createOrder({
      amount: sessionFee,
      receipt,
      notes: {
        userId: payload.userId,
        mentorId,
        purpose: 'mentor_session',
      },
    });

    // Create session record (pending payment)
    const session = await MentorSession.create({
      mentorId,
      studentId: payload.userId,
      scheduledAt: scheduledDate,
      duration,
      status: 'pending_payment',
      sessionFee,
      razorpayOrderId: order.id,
      paymentStatus: 'pending',
      topic: topic || '',
      meetingLink: `https://meet.alloysphere.com/${order.id.slice(-8)}`, // Placeholder
    });

    log.info(`Mentor session created: ${session._id}, mentor=${mentorId}, order=${order.id}`);

    return NextResponse.json({
      success: true,
      session,
      orderId: order.id,
      amount: sessionFee,
      currency: 'INR',
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    log.error('Create mentor session error', error);
    return NextResponse.json({ error: 'Failed to create mentor session' }, { status: 500 });
  }
}
