import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a base64 string to Supabase Storage and returns the public URL.
 * @param base64 The base64 string (including data prefix)
 * @param bucket Internal bucket name (e.g. 'job-documents')
 * @param path Folder path within the bucket (e.g. 'lifting-register')
 * @returns Public URL of the uploaded image
 */
export async function uploadBase64Image(base64: string, bucket: string, path: string): Promise<string> {
  if (!base64 || !base64.startsWith('data:')) return base64; // Already a URL or invalid

  try {
    // Extract format and data
    const parts = base64.split(';');
    const mime = parts[0].split(':')[1];
    const data = parts[1].split(',')[1];
    const extension = mime.split('/')[1] || 'jpg';
    
    // Convert to binary
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    
    const blob = new Blob([array], { type: mime });
    const filename = `${Math.random().toString(36).substring(2)}_${Date.now()}.${extension}`;
    const filePath = `${path}/${filename}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, blob, {
      contentType: mime,
      cacheControl: '3600',
      upsert: false
    });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    throw error;
  }
}
