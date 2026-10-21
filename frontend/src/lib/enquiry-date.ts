export function getTodayInDublin(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function getEnquiryDateError(value: unknown, required = false, now = new Date()): string | null {
  if (value === undefined || value === '') return required ? 'Please choose a preferred date.' : null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Please choose a valid date.';
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Please choose a valid date.';
  if (value < getTodayInDublin(now)) return 'Preferred date must be today or later.';
  return null;
}
