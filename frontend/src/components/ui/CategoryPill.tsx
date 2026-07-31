import { CATEGORY_LABELS } from '@/lib/site-config';

const CATEGORY_STYLES: Record<string, string> = {
  ENTERTAINMENT: 'bg-bb-pale-pink text-bb-pink',
  COMMUNITY: 'bg-bb-pale-green text-bb-green',
  CORPORATE: 'bg-bb-pale-blue text-bb-blue',
  WEDDING: 'bg-bb-pale-pink text-bb-pink',
  BIRTHDAY: 'bg-[#FFF7DA] text-[#B8860B]',
  OTHER: 'bg-bb-neutral text-bb-text-secondary',
};

export default function CategoryPill({ category }: { category: string }) {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.OTHER;
  const label = CATEGORY_LABELS[category] || category;
  return (
    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${style}`}>
      {label}
    </span>
  );
}
