import { supabase } from "@/integrations/supabase/client";

/**
 * Compresses an image from a data URL, Blob, or File.
 */
export async function compressImage(source: string | Blob | File, maxWidth = 1600, quality = 0.8): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    let dataUrl: string;
    if (typeof source !== 'string') {
      dataUrl = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(source);
      });
    } else {
      dataUrl = source;
    }

    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas conversion to blob failed'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = (err) => reject(err);
  });
}

/**
 * Uploads a base64 string to Supabase Storage with compression.
 * @param base64 The base64 string (including data prefix)
 * @param bucket Internal bucket name (e.g. 'job-documents')
 * @param path Folder path within the bucket (e.g. 'lifting-register')
 * @returns Public URL of the uploaded image
 */
export async function uploadBase64Image(base64: string, bucket: string, path: string): Promise<string> {
  if (!base64 || !base64.startsWith('data:')) return base64; // Already a URL or invalid

  try {
    const compressedBlob = await compressImage(base64);
    const filename = `${Math.random().toString(36).substring(2)}_${Date.now()}.jpg`;
    const filePath = `${path}/${filename}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, compressedBlob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false
    });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadBase64Image:', error);
    throw error;
  }
}

/**
 * Uploads a File or Blob to Supabase Storage with compression.
 * @param file The File or Blob to upload
 * @param bucket Internal bucket name
 * @param path Folder path within the bucket
 * @returns Public URL of the uploaded image
 */
export async function uploadCompressedFile(file: File | Blob, bucket: string, path: string): Promise<string> {
  try {
    const compressedBlob = await compressImage(file);
    const filename = `${Math.random().toString(36).substring(2)}_${Date.now()}.jpg`;
    const filePath = `${path}/${filename}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, compressedBlob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false
    });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadCompressedFile:', error);
    throw error;
  }
}

