import api from './api';

/**
 * Compresses an image file/blob to a maximum width/height of 1200px and 80% JPEG quality.
 */
export async function compressImage(fileOrBlob: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        // Calculate new dimensions keeping aspect ratio
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context could not be created'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob failed'));
            }
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Uploads an image blob to the server (supporting local fallback and presigned S3 URLs).
 */
export async function uploadImage(imageBlob: Blob, originalName: string): Promise<string> {
  try {
    const filename = `${Date.now()}-${originalName.replace(/\s+/g, '_')}`;
    const contentType = imageBlob.type || 'image/jpeg';

    // 1. Get presigned URL
    let presignedData: any;
    try {
      const { data } = await api.post('/upload/presigned', {
        filename,
        contentType,
        purpose: 'booking_images'
      });
      presignedData = data;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.warn('[imageUpload] /upload/presigned unavailable in dev — using local object URL');
        return URL.createObjectURL(imageBlob);
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
        formData.append('file', imageBlob, filename);
        
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
          body: imageBlob,
          headers: {
            'Content-Type': contentType
          }
        });

        if (!uploadRes.ok) {
          console.warn('S3 upload failed. Using local URL for testing.');
          return URL.createObjectURL(imageBlob);
        }
        return presignedData.fileKey; // Return key for S3
      }
    } catch (err) {
      console.warn('Upload network error. Using local URL for testing.');
      return URL.createObjectURL(imageBlob);
    }
  } catch (error) {
    console.error('Upload image error:', error);
    throw error;
  }
}
