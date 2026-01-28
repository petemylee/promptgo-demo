import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { uploadPassengerPhoto } from '@/lib/supabase-storage';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate a temporary booking ID for the upload (will be updated when booking is created)
    const tempBookingId = `temp_${session.user.id}_${Date.now()}`;

    // Upload to Supabase Storage
    const publicUrl = await uploadPassengerPhoto(tempBookingId, buffer, file.type);
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      filename: publicUrl.split('/').pop() || 'passenger_photo'
    });

  } catch (error) {
    console.error('Error uploading passenger photo:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    }, { status: 500 });
  }
}
