// ──────────────────────────────────────────
// Admin: Gallery media — dedicated workspace independent of the event form.
// Photos are presigned-S3 uploads; YouTube entries are validated URL records.
// Never stores arbitrary iframe/script/embed HTML.
// ──────────────────────────────────────────

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../../store';
import { AuthRequest, authenticate, requireAdmin } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { GalleryMediaEntity, EventEntity } from '../../types';
import { normalizeYouTubeUrl } from '../../services/youtube';
import { validateGalleryMediaForPublish } from '../../services/gallery-validation';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/gallery — list all media (any status), filterable
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, type, eventId } = req.query as Record<string, string>;
  let items = await db.getAll<GalleryMediaEntity>('galleryMedia');

  if (status) items = items.filter((m) => m.status === status);
  if (type === 'IMAGE' || type === 'YOUTUBE_VIDEO') items = items.filter((m) => m.type === type);
  if (eventId) items = items.filter((m) => m.eventId === eventId);

  items.sort((a, b) => a.sortOrder - b.sortOrder || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ success: true, data: items });
});

// POST /api/admin/gallery — create a draft media record (photo or YouTube video)
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, title, caption, altText, eventId, imageS3Key, imageUrl, imageWidth, imageHeight, youtubeUrl, featured, sortOrder } = req.body;

  if (type !== 'IMAGE' && type !== 'YOUTUBE_VIDEO') {
    res.status(400).json({ success: false, error: 'type must be IMAGE or YOUTUBE_VIDEO' });
    return;
  }
  if (!title || typeof title !== 'string') {
    res.status(400).json({ success: false, error: 'title is required' });
    return;
  }

  let eventTitleSnapshot: string | undefined;
  if (eventId) {
    const event = await db.get<EventEntity>('events', eventId);
    if (!event) {
      res.status(400).json({ success: false, error: 'Related event not found' });
      return;
    }
    eventTitleSnapshot = event.title;
  }

  const now = new Date().toISOString();
  const base: Omit<GalleryMediaEntity, 'type' | 'imageS3Key' | 'imageUrl' | 'imageWidth' | 'imageHeight' | 'youtubeUrl' | 'youtubeVideoId'> = {
    id: `media-${uuid()}`,
    status: 'DRAFT',
    title,
    caption: typeof caption === 'string' ? caption : undefined,
    altText: typeof altText === 'string' ? altText : undefined,
    eventId: eventId || undefined,
    eventTitleSnapshot,
    featured: featured === true,
    sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
    createdBy: req.user!.id,
    updatedBy: req.user!.id,
    created_at: now,
    updated_at: now,
  };

  let media: GalleryMediaEntity;

  if (type === 'IMAGE') {
    if (!imageS3Key || !imageUrl) {
      res.status(400).json({ success: false, error: 'imageS3Key and imageUrl are required for an image (upload via /api/media/presigned-upload first)' });
      return;
    }
    media = {
      ...base,
      type: 'IMAGE',
      imageS3Key,
      imageUrl,
      imageWidth: typeof imageWidth === 'number' ? imageWidth : undefined,
      imageHeight: typeof imageHeight === 'number' ? imageHeight : undefined,
    };
  } else {
    const normalized = normalizeYouTubeUrl(youtubeUrl);
    if (!normalized) {
      res.status(400).json({
        success: false,
        error: 'A valid youtube.com or youtu.be video URL is required (playlists, channels, shorts, and live links are not supported)',
      });
      return;
    }
    media = {
      ...base,
      type: 'YOUTUBE_VIDEO',
      youtubeUrl: normalized.canonicalUrl,
      youtubeVideoId: normalized.videoId,
    };
  }

  await db.put('galleryMedia', media);
  auditLog(req.user!.id, 'CREATE_GALLERY_MEDIA', 'GALLERY_MEDIA', media.id, {
    actorRole: req.user!.role as any,
    eventId: media.eventId,
    summary: `Created gallery ${media.type === 'IMAGE' ? 'photo' : 'YouTube video'} "${media.title}"`,
  });

  res.status(201).json({ success: true, data: media });
});

// GET /api/admin/gallery/:mediaId
router.get('/:mediaId', async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await db.get<GalleryMediaEntity>('galleryMedia', req.params.mediaId);
  if (!item) {
    res.status(404).json({ success: false, error: 'Gallery item not found' });
    return;
  }
  res.json({ success: true, data: item });
});

const EDITABLE_FIELDS = ['title', 'caption', 'altText', 'eventId', 'featured', 'sortOrder'] as const;

// PATCH /api/admin/gallery/:mediaId — edit metadata (media source itself is immutable; re-upload/re-add instead)
router.patch('/:mediaId', async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await db.get<GalleryMediaEntity>('galleryMedia', req.params.mediaId);
  if (!item) {
    res.status(404).json({ success: false, error: 'Gallery item not found' });
    return;
  }

  if (req.body.eventId !== undefined) {
    if (req.body.eventId) {
      const event = await db.get<EventEntity>('events', req.body.eventId);
      if (!event) {
        res.status(400).json({ success: false, error: 'Related event not found' });
        return;
      }
      item.eventTitleSnapshot = event.title;
    } else {
      item.eventTitleSnapshot = undefined;
    }
  }

  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) (item as any)[field] = req.body[field];
  }

  item.updatedBy = req.user!.id;
  item.updated_at = new Date().toISOString();
  await db.put('galleryMedia', item);

  auditLog(req.user!.id, 'UPDATE_GALLERY_MEDIA', 'GALLERY_MEDIA', item.id, {
    actorRole: req.user!.role as any,
    eventId: item.eventId,
    summary: `Updated gallery item "${item.title}"`,
  });

  res.json({ success: true, data: item });
});

// POST /api/admin/gallery/:mediaId/publish — validates before publication
router.post('/:mediaId/publish', async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await db.get<GalleryMediaEntity>('galleryMedia', req.params.mediaId);
  if (!item) {
    res.status(404).json({ success: false, error: 'Gallery item not found' });
    return;
  }
  if (item.status === 'ARCHIVED') {
    res.status(400).json({ success: false, error: 'An archived item cannot be published — create a new item instead' });
    return;
  }

  const errors = validateGalleryMediaForPublish(item);
  if (errors.length) {
    res.status(400).json({ success: false, error: errors.join('; ') });
    return;
  }

  item.status = 'PUBLISHED';
  item.publishedAt = new Date().toISOString();
  item.updatedBy = req.user!.id;
  item.updated_at = item.publishedAt;
  await db.put('galleryMedia', item);

  auditLog(req.user!.id, 'PUBLISH_GALLERY_MEDIA', 'GALLERY_MEDIA', item.id, {
    actorRole: req.user!.role as any,
    eventId: item.eventId,
    summary: `Published gallery item "${item.title}"`,
  });

  res.json({ success: true, data: item });
});

// POST /api/admin/gallery/:mediaId/unpublish
router.post('/:mediaId/unpublish', async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await db.get<GalleryMediaEntity>('galleryMedia', req.params.mediaId);
  if (!item) {
    res.status(404).json({ success: false, error: 'Gallery item not found' });
    return;
  }

  item.status = 'DRAFT';
  item.updatedBy = req.user!.id;
  item.updated_at = new Date().toISOString();
  await db.put('galleryMedia', item);

  auditLog(req.user!.id, 'UNPUBLISH_GALLERY_MEDIA', 'GALLERY_MEDIA', item.id, {
    actorRole: req.user!.role as any,
    eventId: item.eventId,
    summary: `Unpublished gallery item "${item.title}"`,
  });

  res.json({ success: true, data: item });
});

// POST /api/admin/gallery/:mediaId/archive
router.post('/:mediaId/archive', async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await db.get<GalleryMediaEntity>('galleryMedia', req.params.mediaId);
  if (!item) {
    res.status(404).json({ success: false, error: 'Gallery item not found' });
    return;
  }

  item.status = 'ARCHIVED';
  item.updatedBy = req.user!.id;
  item.updated_at = new Date().toISOString();
  await db.put('galleryMedia', item);

  auditLog(req.user!.id, 'ARCHIVE_GALLERY_MEDIA', 'GALLERY_MEDIA', item.id, {
    actorRole: req.user!.role as any,
    eventId: item.eventId,
    summary: `Archived gallery item "${item.title}"`,
  });

  res.json({ success: true, data: item });
});

// POST /api/admin/gallery/reorder — body: { items: [{ id, sortOrder }] }
router.post('/reorder', async (req: AuthRequest, res: Response): Promise<void> => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.some((i) => !i.id || typeof i.sortOrder !== 'number')) {
    res.status(400).json({ success: false, error: 'items must be an array of { id, sortOrder }' });
    return;
  }

  const updated: GalleryMediaEntity[] = [];
  for (const { id, sortOrder } of items) {
    const item = await db.get<GalleryMediaEntity>('galleryMedia', id);
    if (!item) continue;
    item.sortOrder = sortOrder;
    item.updatedBy = req.user!.id;
    item.updated_at = new Date().toISOString();
    await db.put('galleryMedia', item);
    updated.push(item);
  }

  auditLog(req.user!.id, 'REORDER_GALLERY_MEDIA', 'GALLERY_MEDIA', '*', {
    actorRole: req.user!.role as any,
    summary: `Reordered ${updated.length} gallery item(s)`,
  });

  res.json({ success: true, data: updated });
});

// DELETE /api/admin/gallery/:mediaId — hard delete (prefer archiving referenced/published items)
router.delete('/:mediaId', async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await db.get<GalleryMediaEntity>('galleryMedia', req.params.mediaId);
  if (!item) {
    res.status(404).json({ success: false, error: 'Gallery item not found' });
    return;
  }

  await db.delete('galleryMedia', item.id);

  auditLog(req.user!.id, 'DELETE_GALLERY_MEDIA', 'GALLERY_MEDIA', item.id, {
    actorRole: req.user!.role as any,
    eventId: item.eventId,
    summary: `Deleted gallery item "${item.title}"`,
  });

  res.json({ success: true, message: 'Gallery item deleted' });
});

export default router;
