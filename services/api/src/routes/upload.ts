import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

const router = Router();

// Local disk storage for uploaded images. S3 presigning stays available for
// when credentials exist; this endpoint keeps uploads working in dev and on
// a single-instance host without one.
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const LOCAL_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_LOCAL_IMAGE_BYTES = 5 * 1024 * 1024;

const localUploadSchema = z.object({
  dataUrl: z.string().min(20).max(9_000_000),
  folder: z.enum(['guides', 'avatars', 'stops']).default('guides'),
});

router.post('/local', authenticate, validateBody(localUploadSchema), async (req: Request, res: Response) => {
  const { dataUrl, folder } = req.body as { dataUrl: string; folder: string };
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw AppError.badRequest('dataUrl must be a base64 jpeg, png, or webp image');
  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) throw AppError.badRequest('Image is empty');
  if (buffer.length > MAX_LOCAL_IMAGE_BYTES) throw AppError.badRequest('Image exceeds the 5 MB limit');

  const key = `${folder}/${uuidv4()}.${LOCAL_MIME_EXT[mime]}`;
  const fullPath = path.join(UPLOADS_DIR, key);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);

  res.status(201).json({ fileUrl: `/uploads/${key}`, key });
});

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