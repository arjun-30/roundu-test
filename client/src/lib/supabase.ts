import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

const isMock = supabaseUrl.includes('placeholder') || supabaseKey === 'placeholder-key';

// Startup diagnostic — visible in browser console in any environment
if (isMock) {
  console.warn(
    '[Supabase] ⚠️ MOCK MODE ACTIVE — videos will be stored in localStorage, NOT Supabase.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to enable real uploads.'
  );
} else {
  console.info(`[Supabase] ✅ Real mode — connected to ${supabaseUrl.replace('https://', '').split('.')[0]}.***.supabase.co`);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export interface VideoPortfolio {
  id: string;
  provider_id: string;
  video_url: string;
  storage_path: string;
  uploaded_at: string;
  updated_at: string;
  status: string;
  duration_seconds: number;
}

/**
 * Gets the video duration from a File/Blob.
 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };
    video.onerror = () => {
      resolve(0);
    };
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Fetch a provider's active video portfolio.
 */
export async function getProviderVideo(providerId: string): Promise<VideoPortfolio | null> {
  if (isMock) {
    const mockDataStr = localStorage.getItem(`mock_video_${providerId}`);
    if (mockDataStr) {
      try {
        return JSON.parse(mockDataStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('provider_video_portfolios')
      .select('*')
      .eq('provider_id', providerId)
      .eq('status', 'Active')
      .maybeSingle();

    if (error) {
      console.error('Error fetching provider video:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Unexpected error fetching provider video:', err);
    return null;
  }
}

/**
 * Uploads provider video to Supabase Storage and records metadata in database.
 */
export async function uploadProviderVideo(
  providerId: string,
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (isMock) {
    if (onProgress) onProgress(15);
    const duration = await getVideoDuration(videoFile);
    if (onProgress) onProgress(45);
    const base64Url = await fileToBase64(videoFile);
    if (onProgress) onProgress(80);
    const mockVideo: VideoPortfolio = {
      id: 'mock-id-' + Date.now(),
      provider_id: providerId,
      video_url: base64Url,
      storage_path: `mock_storage/provider_${providerId}/introduction_video.webm`,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'Active',
      duration_seconds: duration
    };
    localStorage.setItem(`mock_video_${providerId}`, JSON.stringify(mockVideo));
    if (onProgress) onProgress(100);
    return base64Url;
  }

  const duration = await getVideoDuration(videoFile);
  const ext = videoFile.name.split('.').pop() || 'mp4';
  const timestamp = Date.now();
  const storagePath = `provider_${providerId}/introduction_video_${timestamp}.${ext}`;

  // Step 1: Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('provider-video-portfolios')
    .upload(storagePath, videoFile, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('Error uploading video to storage:', uploadError);
    throw uploadError;
  }

  // Set progress to 50% after storage upload succeeds
  if (onProgress) onProgress(50);

  // Step 2: Get public URL
  const { data: urlData } = supabase.storage
    .from('provider-video-portfolios')
    .getPublicUrl(storagePath);

  const videoUrl = urlData.publicUrl;

  // Step 3: Save details to database
  const { error: dbError } = await supabase
    .from('provider_video_portfolios')
    .insert({
      provider_id: providerId,
      video_url: videoUrl,
      storage_path: storagePath,
      status: 'Active',
      duration_seconds: duration,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (dbError) {
    // Rollback: Clean up uploaded file if DB insert fails
    await supabase.storage.from('provider-video-portfolios').remove([storagePath]);
    console.error('Error inserting video metadata to database:', dbError);
    throw dbError;
  }

  // Set progress to 100% on complete success
  if (onProgress) onProgress(100);

  return videoUrl;
}

/**
 * Replaces an existing provider video portfolio with a new one.
 * Adheres to safety requirement: Upload new first, update DB, then delete old.
 */
export async function replaceProviderVideo(
  providerId: string,
  newVideoFile: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (isMock) {
    return uploadProviderVideo(providerId, newVideoFile, onProgress);
  }

  // Fetch existing video first (to delete later)
  const oldVideo = await getProviderVideo(providerId);

  if (onProgress) onProgress(10);

  // Step 1: Upload new video to Storage
  const duration = await getVideoDuration(newVideoFile);
  const ext = newVideoFile.name.split('.').pop() || 'mp4';
  const timestamp = Date.now();
  const newStoragePath = `provider_${providerId}/introduction_video_${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('provider-video-portfolios')
    .upload(newStoragePath, newVideoFile, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) {
    console.error('Error uploading new video:', uploadError);
    throw uploadError;
  }

  if (onProgress) onProgress(50);

  const { data: urlData } = supabase.storage
    .from('provider-video-portfolios')
    .getPublicUrl(newStoragePath);

  const newVideoUrl = urlData.publicUrl;

  // Step 2: Update Database
  let dbError;
  if (oldVideo) {
    const { error } = await supabase
      .from('provider_video_portfolios')
      .update({
        video_url: newVideoUrl,
        storage_path: newStoragePath,
        duration_seconds: duration,
        updated_at: new Date().toISOString()
      })
      .eq('id', oldVideo.id);
    dbError = error;
  } else {
    const { error } = await supabase
      .from('provider_video_portfolios')
      .insert({
        provider_id: providerId,
        video_url: newVideoUrl,
        storage_path: newStoragePath,
        status: 'Active',
        duration_seconds: duration,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    dbError = error;
  }

  if (dbError) {
    // Rollback: Clean up the new file if update fails
    await supabase.storage.from('provider-video-portfolios').remove([newStoragePath]);
    console.error('Error updating database with new video:', dbError);
    throw dbError;
  }

  if (onProgress) onProgress(80);

  // Step 3: Delete old video file from storage after successful update
  if (oldVideo && oldVideo.storage_path) {
    const { error: deleteError } = await supabase.storage
      .from('provider-video-portfolios')
      .remove([oldVideo.storage_path]);
    if (deleteError) {
      console.warn('Warning: Failed to delete old video file from storage:', deleteError);
    }
  }

  if (onProgress) onProgress(100);

  return newVideoUrl;
}

/**
 * Deletes the provider's video portfolio from storage and database.
 */
export async function deleteProviderVideo(providerId: string): Promise<void> {
  if (isMock) {
    localStorage.removeItem(`mock_video_${providerId}`);
    return;
  }

  const video = await getProviderVideo(providerId);
  if (!video) return;

  // Step 1: Delete from storage
  if (video.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('provider-video-portfolios')
      .remove([video.storage_path]);
    if (storageError) {
      console.error('Error deleting video from storage:', storageError);
      throw storageError;
    }
  }

  // Step 2: Delete from database
  const { error: dbError } = await supabase
    .from('provider_video_portfolios')
    .delete()
    .eq('id', video.id);

  if (dbError) {
    console.error('Error deleting video from database:', dbError);
    throw dbError;
  }
}
