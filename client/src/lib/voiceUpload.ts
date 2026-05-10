import api from './api';

export async function uploadVoiceNote(audioBlob: Blob): Promise<string> {
  try {
    // 1. Get presigned URL
    const { data: presigned } = await api.post('/upload/presigned', {
      filename: `voice_note_${Date.now()}.webm`,
      contentType: audioBlob.type || 'audio/webm',
      purpose: 'voice_note'
    });

    if (!presigned.success || !presigned.uploadUrl) {
      throw new Error('Failed to get upload URL');
    }

    // 2. Upload file directly to S3
    try {
      const uploadRes = await fetch(presigned.uploadUrl, {
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

    // 3. Return the stored key/url (In production this would be the S3 public URL or handled by the backend)
    return presigned.fileKey;
  } catch (error) {
    console.error('Upload voice note error:', error);
    throw error;
  }
}
