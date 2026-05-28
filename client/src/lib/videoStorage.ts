/**
 * Provider Video Storage Utility
 * Handles persistence of provider introduction videos to localStorage
 * Videos are stored as base64-encoded data with metadata
 */

export interface StoredVideo {
  dataUrl: string; // base64-encoded video data
  mimeType: string;
  timestamp: number;
  fileName?: string;
}

const STORAGE_KEY = "roundu_provider_intro_video";
const MAX_VIDEO_SIZE = 15 * 1024 * 1024; // 15MB

/**
 * Convert a Blob to base64-encoded data URL
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a base64 data URL back to a Blob
 */
export function base64ToBlob(dataUrl: string, mimeType: string): Blob {
  const parts = dataUrl.split(",");
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mimeType });
}

/**
 * Save a video blob to localStorage
 * Returns true if successful, false if storage quota exceeded or other error
 */
export async function saveProviderVideo(
  blob: Blob,
  fileName?: string
): Promise<boolean> {
  try {
    // Validate size
    if (blob.size > MAX_VIDEO_SIZE) {
      console.error("Video size exceeds 15MB limit");
      return false;
    }

    // Convert to base64
    const dataUrl = await blobToBase64(blob);

    // Create storage object
    const storedVideo: StoredVideo = {
      dataUrl,
      mimeType: blob.type,
      timestamp: Date.now(),
      fileName: fileName || `intro-video-${Date.now()}`,
    };

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedVideo));
    return true;
  } catch (error) {
    console.error("Failed to save provider video:", error);
    return false;
  }
}

/**
 * Load the saved provider video from localStorage
 * Returns null if no video is stored
 */
export function getProviderVideo(): StoredVideo | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredVideo;
  } catch (error) {
    console.error("Failed to load provider video:", error);
    return null;
  }
}

/**
 * Get the video as a blob URL that can be used in video elements
 */
export function getProviderVideoBlobUrl(): string | null {
  try {
    const storedVideo = getProviderVideo();
    if (!storedVideo) return null;
    
    const blob = base64ToBlob(storedVideo.dataUrl, storedVideo.mimeType);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Failed to create video blob URL:", error);
    return null;
  }
}

/**
 * Clear the saved provider video from localStorage
 */
export function clearProviderVideo(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear provider video:", error);
  }
}

/**
 * Check if a provider video is saved
 */
export function hasProviderVideo(): boolean {
  return getProviderVideo() !== null;
}

/**
 * Get metadata about the saved video without loading the full data
 */
export function getProviderVideoMetadata(): { timestamp: number; fileName?: string } | null {
  try {
    const storedVideo = getProviderVideo();
    if (!storedVideo) return null;
    return {
      timestamp: storedVideo.timestamp,
      fileName: storedVideo.fileName,
    };
  } catch (error) {
    console.error("Failed to get video metadata:", error);
    return null;
  }
}
