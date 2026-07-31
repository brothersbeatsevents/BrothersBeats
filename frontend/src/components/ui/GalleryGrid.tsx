import GalleryMediaCard, { GalleryMediaCardData } from './GalleryMediaCard';

export default function GalleryGrid({
  items,
  onSelect,
}: {
  items: GalleryMediaCardData[];
  onSelect: (index: number) => void;
}) {
  if (items.length === 0) {
    return <p className="text-center text-bb-text-secondary py-16">No gallery items to show yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <GalleryMediaCard key={item.id} item={item} onClick={() => onSelect(index)} />
      ))}
    </div>
  );
}
