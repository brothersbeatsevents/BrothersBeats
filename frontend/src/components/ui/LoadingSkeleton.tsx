export function EventCardSkeleton() {
  return (
    <div className="bg-bb-surface rounded-2xl border border-bb-border overflow-hidden">
      <div className="aspect-[4/3] skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-5 w-20 rounded-full skeleton" />
        <div className="h-5 w-3/4 rounded skeleton" />
        <div className="h-4 w-1/2 rounded skeleton" />
      </div>
    </div>
  );
}

export default function LoadingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
