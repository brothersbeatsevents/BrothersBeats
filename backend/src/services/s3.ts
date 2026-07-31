import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

const BUCKET = process.env.S3_MEDIA_BUCKET || '';
const REGION = process.env.S3_MEDIA_REGION || 'eu-west-1';

const s3 = new S3Client({ region: REGION });

// SVG intentionally excluded — SVG files can contain <script> tags (stored XSS)
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB (images)
const PDF_MAX_SIZE = 20 * 1024 * 1024; // 20 MB (PDFs)

export async function generatePresignedUpload(
  contentType: string,
  folder: string = 'uploads',
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    throw new Error(
      `Unsupported file type: ${contentType}. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}`,
    );
  }

  const key = `${folder}/${uuid()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return { uploadUrl, publicUrl, key };
}

// Server-side upload (used for generated ticket QR images / PDFs). Not
// publicly writable — objects are private and served via getSignedDownloadUrl.
export async function uploadBuffer(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export { ALLOWED_TYPES, MAX_SIZE, PDF_MAX_SIZE };
