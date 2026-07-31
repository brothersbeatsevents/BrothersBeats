import { Router, Response } from 'express';
import { AuthRequest, authenticate, requireAdmin } from '../middleware/auth';
import { generatePresignedUpload, ALLOWED_TYPES, MAX_SIZE, PDF_MAX_SIZE } from '../services/s3';

const router = Router();

// POST /api/media/presigned-upload — Get a presigned URL for uploading
router.post(
  '/presigned-upload',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { contentType, folder } = req.body;

    if (!contentType) {
      res
        .status(400)
        .json({ success: false, error: 'contentType is required' });
      return;
    }

    if (!ALLOWED_TYPES[contentType]) {
      res.status(400).json({
        success: false,
        error: `Unsupported file type. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}`,
      });
      return;
    }

    const validFolders = ['events', 'campaigns', 'general', 'gallery'];
    const safeFolder = validFolders.includes(folder) ? folder : 'general';

    const maxSize = contentType === 'application/pdf' ? PDF_MAX_SIZE : MAX_SIZE;
    const { fileSize } = req.body;
    if (fileSize !== undefined && typeof fileSize === 'number' && fileSize > maxSize) {
      res.status(400).json({
        success: false,
        error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)} MB for ${contentType}.`,
      });
      return;
    }

    try {
      const result = await generatePresignedUpload(contentType, safeFolder);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// POST /api/media/avatar-upload — Any authenticated user can upload their own avatar
router.post(
  '/avatar-upload',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { contentType } = req.body;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!contentType || !allowed.includes(contentType)) {
      res.status(400).json({
        success: false,
        error: 'contentType must be image/jpeg, image/png, or image/webp',
      });
      return;
    }

    try {
      const result = await generatePresignedUpload(contentType, 'avatars');
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

export default router;
