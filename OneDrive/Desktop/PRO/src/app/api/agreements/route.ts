import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Agreement, Startup, User, Notification } from '@/lib/models';
import { extractTokenFromCookies, verifyAccessToken } from '@/lib/auth';
import crypto from 'crypto';

// GET /api/agreements - Get agreements
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const startupId = searchParams.get('startupId');

    const query: Record<string, unknown> = {
      parties: { $in: [decoded.userId] },
    };
    if (status) query.status = status;
    if (type) query.type = type;
    if (startupId) query.startupId = startupId;

    const agreements = await Agreement.find(query)
      .populate('startupId', 'name industry stage logo')
      .populate('parties', 'name email avatar role')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      agreements,
      total: agreements.length,
    });
  } catch (error) {
    console.error('Error fetching agreements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agreements' },
      { status: 500 }
    );
  }
}

// POST /api/agreements - Create agreement
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

    const body = await request.json();
    const { 
      startupId, 
      type, 
      parties, 
      terms, 
      content 
    } = body;

    // Validation
    if (!startupId || !type || !parties || parties.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify startup exists
    const startup = await Startup.findById(startupId);
    if (!startup) {
      return NextResponse.json(
        { error: 'Startup not found' },
        { status: 404 }
      );
    }

    // Generate agreement content if not provided
    const agreementContent = content || generateAgreementContent(type, startup, terms);

    // Create agreement
    const agreement = await Agreement.create({
      type,
      startupId,
      parties: [decoded.userId, ...parties.filter((p: string) => p !== decoded.userId)],
      terms: terms || {},
      content: agreementContent,
      status: 'pending_signature',
      signedBy: [],
    });

    // Notify other parties
    const otherParties = parties.filter((p: string) => p !== decoded.userId);
    for (const partyId of otherParties) {
      await Notification.create({
        userId: partyId,
        type: 'agreement_signed',
        title: 'New Agreement to Sign',
        message: `You have a new ${type} agreement to sign for ${startup.name}`,
        actionUrl: '/agreements',
        metadata: {
          agreementId: agreement._id,
          type,
          startupId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      agreement: {
        _id: agreement._id,
        type: agreement.type,
        status: agreement.status,
        createdAt: agreement.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating agreement:', error);
    return NextResponse.json(
      { error: 'Failed to create agreement' },
      { status: 500 }
    );
  }
}

function generateAgreementContent(
  type: string, 
  startup: any, 
  terms: any
): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  switch (type) {
    case 'NDA':
      return `
NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement (the "Agreement") is entered into as of ${date}.

CONFIDENTIAL INFORMATION
The parties acknowledge that in connection with the evaluation of ${startup.name} (the "Company"), each party may have access to certain confidential and proprietary information of the other party.

OBLIGATIONS
Each party agrees to:
1. Keep all confidential information strictly confidential
2. Not disclose any confidential information to third parties
3. Use confidential information solely for the purpose of evaluating the business relationship

TERM
This Agreement shall remain in effect for a period of two (2) years from the date of signing.

GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware.
      `.trim();

    case 'Work':
      return `
WORK AGREEMENT

This Work Agreement (the "Agreement") is entered into as of ${date}.

PARTIES
Company: ${startup.name}
Talent: [Party Name]

SCOPE OF WORK
The Talent agrees to perform services as described in the attached statement of work.

COMPENSATION
${terms?.compensation ? `Compensation: $${terms.compensation}` : 'Compensation as agreed upon'}
${terms?.equityPercent ? `Equity: ${terms.equityPercent}%` : ''}

VESTING
${terms?.vestingPeriod ? `Vesting Period: ${terms.vestingPeriod} months` : 'As per company policy'}
${terms?.cliffPeriod ? `Cliff Period: ${terms.cliffPeriod} months` : ''}

TERM
This Agreement shall commence on the date of signing and continue until terminated by either party with 30 days written notice.
      `.trim();

    case 'Equity':
      return `
EQUITY AGREEMENT

This Equity Agreement (the "Agreement") is entered into as of ${date}.

COMPANY: ${startup.name}

EQUITY GRANT
${terms?.equityPercent ? `Equity Percentage: ${terms.equityPercent}%` : 'Equity as specified in attached schedule'}

VESTING SCHEDULE
${terms?.vestingPeriod ? `Vesting Period: ${terms.vestingPeriod} months` : 'Standard 4-year vesting'}
${terms?.cliffPeriod ? `Cliff Period: ${terms.cliffPeriod} months` : '1-year cliff'}

RIGHTS AND RESTRICTIONS
The equity granted under this Agreement is subject to the Company's bylaws and any shareholders' agreement.
      `.trim();

    case 'SAFE':
      return `
SIMPLE AGREEMENT FOR FUTURE EQUITY (SAFE)

This SAFE is entered into as of ${date}.

COMPANY: ${startup.name}

INVESTMENT AMOUNT: [Amount]

VALUATION CAP: ${terms?.valuation ? `$${terms.valuation.toLocaleString()}` : 'As negotiated'}

DISCOUNT: 20% (if applicable)

This SAFE entitles the holder to receive equity in the Company upon a qualifying financing event, change of control, or dissolution.

GOVERNING LAW: Delaware
      `.trim();

    default:
      return `
AGREEMENT

This Agreement is entered into as of ${date}.

Company: ${startup.name}

Terms and conditions as agreed upon by the parties.
      `.trim();
  }
}
