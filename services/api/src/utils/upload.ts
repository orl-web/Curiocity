import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';

const s3Client = new S3Client({
  region: config.S3_REGION,
  credentials: { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/mp3'];

export async function getPresignedUploadUrl(userId: string, fileName: string, contentType: string, folder: 'guides' | 'avatars' | 'stops' | 'audio' = 'guides') {
  if (!ALLOWED_TYPES.includes(contentType)) throw new Error('Invalid file type');

  const extension = fileName.split('.').pop() || '';
  const key = `${folder}/${userId}/${crypto.randomUUID()}.${extension}`;

  const command = new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  const fileUrl = config.S3_CDN_URL ? `${config.S3_CDN_URL}/${key}` : `https://${config.S3_BUCKET}.s3.${config.S3_REGION}.amazonaws.com/${key}`;
  return { uploadUrl, fileUrl, key };
}

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key });
  await s3Client.send(command);
}