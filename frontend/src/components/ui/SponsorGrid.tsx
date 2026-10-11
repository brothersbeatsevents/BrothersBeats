interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string;
  description?: string;
}

export default function SponsorGrid({ sponsors }: { sponsors: Sponsor[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {sponsors.map((s) => {
        const logo = (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.logoUrl} alt={s.name} loading="lazy" className="max-h-20 w-auto max-w-full object-contain" />
        );
        return (
          <div key={s.id} className="flex flex-col items-center text-center gap-2">
            <div className="h-24 w-full flex items-center justify-center rounded-2xl border border-bb-border bg-bb-surface p-4">
              {s.websiteUrl ? (
                <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer sponsored" aria-label={s.name}>
                  {logo}
                </a>
              ) : (
                logo
              )}
            </div>
            {s.description && <p className="text-sm text-bb-text-secondary">{s.description}</p>}
          </div>
        );
      })}
    </div>
  );
}
