const CURRENCY_PREFIX: Record<string, string> = { MYR: 'RM', IDR: 'Rp', PHP: '₱' };

export function formatAmount(amount: number, currency: string): string {
  return `${CURRENCY_PREFIX[currency] ?? ''}${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
