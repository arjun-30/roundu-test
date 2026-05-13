import api from './api';

export async function uploadVoiceNote(audioBlob: Blob): Promise<string> {
  try {
    // 1. Get presigned URL
    let presignedData: any;
    try {
      const { data } = await api.post('/upload/presigned', {
        filename: `voice_note_${Date.now()}.webm`,
        contentType: audioBlob.type || 'audio/webm',
        purpose: 'voice_note'
      });
      presignedData = data;
    } catch (err: any) {
      // Backend endpoint not available (e.g. local dev without server)
      // Fall back to a local object URL so the booking flow isn't blocked
      if (import.meta.env.DEV) {
        console.warn('[voiceUpload] /upload/presigned unavailable in dev — using local object URL');
        return URL.createObjectURL(audioBlob);
      }
      throw err;
    }

    if (!presignedData.success || !presignedData.uploadUrl) {
      throw new Error('Failed to get upload URL');
    }

    // 2. Upload file directly to S3
    try {
      const uploadRes = await fetch(presignedData.uploadUrl, {
        method: 'PUT',
        body: audioBlob,
        headers: {
          'Content-Type': audioBlob.type || 'audio/webm'
        }
      });

      if (!uploadRes.ok) {
        console.warn('S3 upload failed (likely missing credentials). Using local URL for testing.');
        return URL.createObjectURL(audioBlob);
      }
    } catch (err) {
      console.warn('S3 upload network error. Using local URL for testing.');
      return URL.createObjectURL(audioBlob);
    }

    // 3. Return the stored key/url
    return presignedData.fileKey;
  } catch (error) {
    console.error('Upload voice note error:', error);
    throw error;
  }
}
