// ──────────────────────────────────────────
// Public gallery — published Brothers Beats event photos and YouTube videos
// GET /api/gallery            — list published media (filters: eventId, type, year, featured)
// GET /api/gallery/:mediaId   — single published media item
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { db } from '../store';
import { GalleryMediaEntity } from '../types';
import { filterPublishedGallery, toPublicGalleryMedia } from '../services/gallery-query';

const router = Router();

router.get('/', async (req, res: Response): Promise<void> => {
  const { eventId, type, year, featured } = req.query as Record<string, string>;

  const all = await db.getAll<GalleryMediaEntity>('galleryMedia');
  const items = filterPublishedGallery(all, { eventId, type, year, featured });

  res.json({ success: true, data: items.map(toPublicGalleryMedia) });
});

router.get('/:mediaId', async (req, res: Response): Promise<void> => {
  const item = await db.get<GalleryMediaEntity>('galleryMedia', req.params.mediaId);
  if (!item || item.status !== 'PUBLISHED') {
    res.status(404).json({ success: false, error: 'Gallery item not found' });
    return;
  }
  res.json({ success: true, data: toPublicGalleryMedia(item) });
});

export default router;
