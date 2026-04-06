import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { uploadDriverPhoto } from '@/lib/supabase-storage';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'Admin' && session.user.role !== 'Executive') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const userId = (formData.get('userId') as string | null)?.trim() || null;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    const driver = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!driver) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (driver.role !== 'Driver') {
      return NextResponse.json({ error: 'Target user is not a driver' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const publicUrl = await uploadDriverPhoto(userId, buffer, file.type);

    await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: publicUrl },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: publicUrl.split('/').pop() || 'driver_photo',
    });
  } catch (error) {
    console.error('Error uploading driver photo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
