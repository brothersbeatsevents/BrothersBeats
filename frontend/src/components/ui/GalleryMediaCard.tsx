import GalleryMediaThumbnail from './GalleryMediaThumbnail';

export interface GalleryMediaCardData {
  id: string;
  type: 'IMAGE' | 'YOUTUBE_VIDEO' | 'INSTAGRAM_REEL';
  title: string;
  caption?: string;
  altText?: string;
  imageUrl?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  instagramShortcode?: string;
  eventTitleSnapshot?: string;
  featured?: boolean;
}

export default function GalleryMediaCard({
  item,
  onClick,
}: {
  item: GalleryMediaCardData;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full aspect-[4/3] overflow-hidden rounded-2xl border border-bb-border bg-bb-neutral text-left"
    >
      <GalleryMediaThumbnail item={item} />

      {item.type === 'YOUTUBE_VIDEO' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-bb-ink ml-0.5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      )}

      {item.featured && (
        <span className="absolute top-2 left-2 bg-bb-gold text-bb-ink text-xs font-semibold px-2 py-0.5 rounded-full">
          Featured
        </span>
      )}

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <p className="text-white text-sm font-semibold line-clamp-1">{item.title}</p>
        {item.eventTitleSnapshot && <p className="text-white/80 text-xs line-clamp-1">{item.eventTitleSnapshot}</p>}
      </div>
    </button>
  );
}
