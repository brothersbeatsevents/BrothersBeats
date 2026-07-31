export function formatMoney(amountMinor: number, currency: string = 'EUR') {
  try {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

export function formatEventDate(iso: string, timezone?: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: timezone,
    });
  } catch {
    return new Date(iso).toLocaleDateString('en-IE');
  }
}

export function formatEventTime(iso: string, timezone?: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-IE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    });
  } catch {
    return new Date(iso).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
  }
}
