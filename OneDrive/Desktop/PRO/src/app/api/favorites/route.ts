import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Favorite } from '@/lib/models';
import { verifyToken } from '@/lib/auth';

// POST /api/favorites - Toggle favorite
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { startupId } = body;

    if (!startupId) {
      return NextResponse.json(
        { error: 'Startup ID is required' },
        { status: 400 }
      );
    }

    // Check if favorite exists
    const existing = await Favorite.findOne({
      userId: decoded.userId,
      startupId,
    });

    if (existing) {
      // Remove favorite
      await Favorite.findByIdAndDelete(existing._id);
      return NextResponse.json({
        success: true,
        isFavorite: false,
        message: 'Removed from favorites',
      });
    } else {
      // Add favorite
      await Favorite.create({
        userId: decoded.userId,
        startupId,
      });
      return NextResponse.json({
        success: true,
        isFavorite: true,
        message: 'Added to favorites',
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json(
      { error: 'Failed to toggle favorite' },
      { status: 500 }
    );
  }
}

// GET /api/favorites - Get user's favorites
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const favorites = await Favorite.find({ userId: decoded.userId })
      .populate({
        path: 'startupId',
        populate: { path: 'founderId', select: 'name email avatar' },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Also get list of favorited startup IDs for quick lookup
    const favoriteIds = favorites.map((f: any) => f.startupId?._id?.toString()).filter(Boolean);

    return NextResponse.json({
      favorites,
      favoriteIds,
      total: favorites.length,
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

// DELETE /api/favorites - Remove favorite
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const startupId = searchParams.get('startupId');

    if (!startupId) {
      return NextResponse.json(
        { error: 'Startup ID is required' },
        { status: 400 }
      );
    }

    await Favorite.findOneAndDelete({
      userId: decoded.userId,
      startupId,
    });

    return NextResponse.json({
      success: true,
      message: 'Removed from favorites',
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
