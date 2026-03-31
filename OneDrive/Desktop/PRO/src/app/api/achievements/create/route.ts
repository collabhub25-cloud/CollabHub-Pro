import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import Achievement from '@/lib/models/achievement.model';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();

        const formData = await request.formData();
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const image = formData.get('image') as File | null;

        if (!title?.trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        if (!image || !(image instanceof File)) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(image.type)) {
            return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 400 });
        }

        // Validate file size (5MB max)
        if (image.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image size must be under 5MB' }, { status: 400 });
        }

        // Save image to upload directory
        const uploadDir = path.join(process.cwd(), 'upload', 'achievements');
        await mkdir(uploadDir, { recursive: true });

        const ext = image.name.split('.').pop() || 'jpg';
        const filename = `${authResult.user.userId}-${Date.now()}.${ext}`;
        const filepath = path.join(uploadDir, filename);
        
        const buffer = Buffer.from(await image.arrayBuffer());
        await writeFile(filepath, buffer);

        const imageUrl = `/upload/achievements/${filename}`;

        const achievement = await Achievement.create({
            userId: authResult.user.userId,
            title: title.trim(),
            description: description?.trim() || undefined,
            imageUrl,
        });

        return NextResponse.json({ success: true, achievement }, { status: 201 });
    } catch (error) {
        console.error('Achievement Create Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
