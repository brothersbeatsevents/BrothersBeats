export default function TicketQuantitySelector({
  quantity,
  onChange,
  min = 1,
  max = 10,
}: {
  quantity: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        className="w-9 h-9 rounded-full border border-bb-border flex items-center justify-center text-bb-text disabled:opacity-40 hover:border-bb-green transition-colors"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-8 text-center font-semibold text-bb-text">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="w-9 h-9 rounded-full border border-bb-border flex items-center justify-center text-bb-text disabled:opacity-40 hover:border-bb-green transition-colors"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
