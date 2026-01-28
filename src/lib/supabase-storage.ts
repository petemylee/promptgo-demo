import { createServerClient } from './supabase';

/**
 * Upload a file to Supabase Storage
 * @param bucketName - Name of the storage bucket
 * @param filePath - Path within the bucket (e.g., 'signatures/user123_signature.png')
 * @param file - File buffer or Blob
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToSupabaseStorage(
  bucketName: string,
  filePath: string,
  file: Buffer | Blob,
  contentType: string
): Promise<string> {
  const supabase = createServerClient();

  // Convert to ArrayBuffer/Uint8Array
  let fileData: Uint8Array;
  if (file instanceof Blob) {
    const arrayBuffer = await file.arrayBuffer();
    fileData = new Uint8Array(arrayBuffer);
  } else {
    fileData = file;
  }

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileData, {
      contentType,
      upsert: true, // Overwrite if exists
    });

  if (error) {
    throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Upload signature image
 */
export async function uploadSignature(
  userId: string,
  file: Buffer | Blob,
  contentType: string = 'image/png'
): Promise<string> {
  const timestamp = Date.now();
  const fileExtension = contentType.includes('png') ? 'png' : 'jpg';
  const filePath = `signatures/signature_${userId}_${timestamp}.${fileExtension}`;
  
  return uploadToSupabaseStorage('uploads', filePath, file, contentType);
}

/**
 * Upload requester signature image
 */
export async function uploadRequesterSignature(
  userId: string,
  file: Buffer | Blob,
  contentType: string = 'image/png'
): Promise<string> {
  const timestamp = Date.now();
  const fileExtension = contentType.includes('png') ? 'png' : 'jpg';
  const filePath = `signatures/requester-signatures/requester_signature_${userId}_${timestamp}.${fileExtension}`;
  
  return uploadToSupabaseStorage('uploads', filePath, file, contentType);
}

/**
 * Upload vehicle image
 */
export async function uploadVehicleImage(
  vehicleId: string,
  file: Buffer | Blob,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const timestamp = Date.now();
  const fileExtension = contentType.includes('png') ? 'png' : 'jpg';
  const filePath = `vehicle-images/vehicle_${vehicleId}_${timestamp}.${fileExtension}`;
  
  return uploadToSupabaseStorage('uploads', filePath, file, contentType);
}

/**
 * Upload driver profile photo
 */
export async function uploadDriverPhoto(
  userId: string,
  file: Buffer | Blob,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const timestamp = Date.now();
  const fileExtension = contentType.includes('png') ? 'png' : 'jpg';
  const filePath = `driver-photos/driver_${userId}_${timestamp}.${fileExtension}`;
  
  return uploadToSupabaseStorage('uploads', filePath, file, contentType);
}

/**
 * Upload passenger photo
 */
export async function uploadPassengerPhoto(
  bookingId: string,
  file: Buffer | Blob,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const timestamp = Date.now();
  const fileExtension = contentType.includes('png') ? 'png' : 'jpg';
  const filePath = `passenger-photos/passenger_${bookingId}_${timestamp}.${fileExtension}`;
  
  return uploadToSupabaseStorage('uploads', filePath, file, contentType);
}
