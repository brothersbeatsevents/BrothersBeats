export const MAX_HERO_IMAGES = 7;

export interface HeroImage {
  url: string;
  position?: string;
  zoom?: number;
  alt?: string;
}

export interface HeroSettings {
  heroImages?: HeroImage[];
  heroImageUrl?: string | null;
  heroImagePosition?: string;
  heroImageZoom?: number;
}

export function getHeroImages(settings: HeroSettings | null): HeroImage[] {
  if (settings?.heroImages) return settings.heroImages.slice(0, MAX_HERO_IMAGES);
  return settings?.heroImageUrl ? [{
    url: settings.heroImageUrl,
    position: settings.heroImagePosition || '50% 50%',
    zoom: settings.heroImageZoom || 1,
  }] : [];
}
