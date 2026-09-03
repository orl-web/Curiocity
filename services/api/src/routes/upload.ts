import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

const router = Router();

const s3Client = new S3Client({
  region: config.S3_REGION,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/mp3'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const presignSchema = z.object({
  contentType: z.enum(ALLOWED_TYPES as [string, ...string[]]),
  fileName: z.string().min(1).max(255),
  folder: z.enum(['guides', 'avatars', 'stops', 'audio']).default('guides'),
});

router.post('/presign', authenticate, validateBody(presignSchema), async (req: Request, res: Response) => {
  const { contentType, fileName, folder } = req.body;
  const userId = req.user!.userId;

  const extension = fileName.split('.').pop() || '';
  const key = `${folder}/${userId}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: 'public-read',
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const cdnUrl = config.S3_CDN_URL ? `${config.S3_CDN_URL}/${key}` : `https://${config.S3_BUCKET}.s3.${config.S3_REGION}.amazonaws.com/${key}`;

  res.json({ uploadUrl: signedUrl, fileUrl: cdnUrl, key });
});

const deleteSchema = z.object({
  key: z.string().min(1),
});

router.delete('/', authenticate, validateBody(deleteSchema), async (req: Request, res: Response) => {
  const { key } = req.body;
  const userId = req.user!.userId;

  const userPrefixes = [`guides/${userId}/`, `avatars/${userId}/`, `stops/${userId}/`, `audio/${userId}/`];
  if (!userPrefixes.some(prefix => key.startsWith(prefix))) {
    throw AppError.forbidden('Not authorized to delete this file');
  }

  const command = new DeleteObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
  res.json({ message: 'File deleted' });
});

export { router as uploadRouter };