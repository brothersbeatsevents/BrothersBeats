// Build the iframe URL from a validated shortcode; never render supplied HTML.
export default function SafeInstagramEmbed({ shortcode, title }: { shortcode: string; title: string }) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(shortcode)) {
    return <div className="rounded-xl bg-bb-neutral p-8 text-center text-bb-text-muted">Reel unavailable</div>;
  }

  const reelUrl = `https://www.instagram.com/reel/${shortcode}/`;
  return (
    <div className="mx-auto w-full max-w-sm">
      <iframe
        src={`${reelUrl}embed/`}
        title={title}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="w-full h-[min(65vh,640px)] rounded-xl border-0 bg-white"
      />
      <a href={reelUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-center text-sm text-bb-gold hover:underline">
        Open on Instagram
      </a>
    </div>
  );
}
