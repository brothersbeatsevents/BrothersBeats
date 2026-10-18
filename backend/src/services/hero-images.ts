import { HeroImage, OrgSettings } from '../types';

export const MAX_HERO_IMAGES = 6;

export function getHeroImages(settings: Partial<OrgSettings> | null): HeroImage[] {
  // An explicitly empty list hides the banner; only legacy records use the fallback.
  if (settings?.heroImages) return settings.heroImages;
  return settings?.heroImageUrl ? [{
    url: settings.heroImageUrl,
    position: settings.heroImagePosition || '50% 50%',
    zoom: settings.heroImageZoom || 1,
  }] : [];
}

export function validateHeroImages(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > MAX_HERO_IMAGES) {
    return 'Hero images must be a list of up to 6 images.';
  }
  for (const image of value) {
    if (!image || typeof image !== 'object' || typeof image.url !== 'string') {
      return 'Each hero image must have an image URL.';
    }
    try {
      const url = new URL(image.url);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid protocol');
    } catch {
      return 'Hero image URLs must be valid http(s) URLs.';
    }
    if (image.position !== undefined) {
      const match = typeof image.position === 'string' && image.position.match(/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/);
      if (!match || Number(match[1]) > 100 || Number(match[2]) > 100) {
        return 'Hero image positions must use percentages between 0 and 100.';
      }
    }
    if (image.zoom !== undefined && (typeof image.zoom !== 'number' || !Number.isFinite(image.zoom) || image.zoom < 1 || image.zoom > 3)) {
      return 'Hero image zoom must be between 1 and 3.';
    }
    if (image.alt !== undefined && (typeof image.alt !== 'string' || image.alt.length > 300)) {
      return 'Hero image descriptions must be text of up to 300 characters.';
    }
  }
  return null;
}
