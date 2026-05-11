import { Request, Response } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

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
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      res.json({ success: true, uploadUrl, fileKey });
    } catch (signError) {
      console.warn('Failed to sign URL (expected if AWS keys are dummy):', signError);
      res.json({ success: true, uploadUrl: 'http://localhost:5000/mock-upload', fileKey });
    }
  } catch (error: any) {
    console.error('Presigned URL error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
