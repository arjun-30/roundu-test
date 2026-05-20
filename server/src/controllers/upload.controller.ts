import { Request, Response } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import fs from 'fs';

// This assumes environment variables like AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY are set,
// or that the environment provides them (like an EC2 IAM role).
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
  }
});

export const getPresignedUrl = async (req: Request, res: Response) => {
  try {
    const { filename, contentType, purpose } = req.body;
    
    if (!filename || !contentType || !purpose) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Generate a unique file key
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileKey = `${purpose}/${uniqueSuffix}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || 'roundu-uploads-bucket',
      Key: fileKey,
      ContentType: contentType,
    });

    try {
      // Check if AWS keys are dummy. If so, don't even try to sign, just fallback to local.
      if (process.env.AWS_ACCESS_KEY_ID === 'dummy' || !process.env.AWS_ACCESS_KEY_ID) {
        throw new Error('Using local fallback');
      }

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      res.json({ success: true, uploadUrl, fileKey });
    } catch (signError) {
      // Fallback to local upload endpoint
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      
      res.json({ 
        success: true, 
        uploadUrl: `${baseUrl}/api/upload`, 
        fileKey,
        isLocal: true 
      });
    }
  } catch (error: any) {
    console.error('Presigned URL error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    // Convert backslashes to forward slashes for URL
    const relativePath = req.file.path.replace(/\\/g, '/');
    // Assuming uploads folder is in the root of the project (server/uploads)
    // and served at /uploads
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    res.json({ 
      success: true, 
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
};
