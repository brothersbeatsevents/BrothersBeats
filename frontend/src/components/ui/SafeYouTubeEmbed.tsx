// Privacy-enhanced YouTube embed. Only ever renders a controlled
// youtube-nocookie.com/embed/<id> iframe built from a validated video ID —
// never accepts or renders arbitrary iframe/embed HTML from user input.
'use client';

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export default function SafeYouTubeEmbed({
  videoId,
  title,
  className = '',
}: {
  videoId: string;
  title: string;
  className?: string;
}) {
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    return (
      <div className={`aspect-video bg-bb-neutral flex items-center justify-center text-bb-text-muted text-sm rounded-xl ${className}`}>
        Video unavailable
      </div>
    );
  }

  return (
    <div className={`aspect-video overflow-hidden rounded-xl bg-black ${className}`}>
      <iframe
        className="w-full h-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
