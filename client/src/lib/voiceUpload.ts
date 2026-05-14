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
    const isLocal = !!presignedData.isLocal;

    // 2. Upload file
    try {
      if (isLocal) {
        // Multipart upload to local backend
        const formData = new FormData();
        formData.append('file', audioBlob, `voice_note_${Date.now()}.webm`);
        
        const uploadRes = await fetch(presignedData.uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('Backend upload failed');
        const uploadData = await uploadRes.json();
        return uploadData.url; // Full URL from backend
      } else {
        // Direct PUT to S3
        const uploadRes = await fetch(presignedData.uploadUrl, {
          method: 'PUT',
          body: audioBlob,
          headers: {
            'Content-Type': audioBlob.type || 'audio/webm'
          }
        });

        if (!uploadRes.ok) {
          console.warn('S3 upload failed. Using local URL for testing.');
          return URL.createObjectURL(audioBlob);
        }
        return presignedData.fileKey; // Return key for S3
      }
    } catch (err) {
      console.warn('Upload network error. Using local URL for testing.');
      return URL.createObjectURL(audioBlob);
    }
  } catch (error) {
    console.error('Upload voice note error:', error);
    throw error;
  }
}
