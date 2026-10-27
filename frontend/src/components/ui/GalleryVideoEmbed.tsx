import type { GalleryMediaCardData } from './GalleryMediaCard';
import SafeInstagramEmbed from './SafeInstagramEmbed';
import SafeYouTubeEmbed from './SafeYouTubeEmbed';

export default function GalleryVideoEmbed({ item }: { item: GalleryMediaCardData }) {
  return item.type === 'INSTAGRAM_REEL' ? (
    <SafeInstagramEmbed shortcode={item.instagramShortcode || ''} title={item.title} />
  ) : (
    <SafeYouTubeEmbed videoId={item.youtubeVideoId || ''} title={item.title} portrait={item.youtubeUrl?.includes('/shorts/')} />
  );
}
