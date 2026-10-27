import type { GalleryMediaCardData } from './GalleryMediaCard';

export default function GalleryMediaThumbnail({ item }: { item: GalleryMediaCardData }) {
  const thumbnailUrl = item.type === 'IMAGE'
    ? item.imageUrl
    : item.type === 'YOUTUBE_VIDEO' && item.youtubeVideoId
      ? `https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg`
      : undefined;

  if (item.type === 'INSTAGRAM_REEL') {
    return (
      <div role="img" aria-label={`${item.title} (Instagram Reel)`} className="w-full h-full bg-gradient-to-br from-purple-700 via-pink-600 to-orange-400 flex flex-col items-center justify-center gap-2 px-4 pb-8 text-white">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <path d="m10 8 6 4-6 4z" fill="currentColor" stroke="none" />
        </svg>
        <span className="text-sm font-semibold">Instagram Reel</span>
      </div>
    );
  }

  return thumbnailUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={thumbnailUrl} alt={item.altText || item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-bb-text-muted text-sm">No preview</div>
  );
}
