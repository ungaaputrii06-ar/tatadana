/**
 * Formats a number into Indonesian Rupiah format.
 * Examples:
 * 15000 -> "Rp15.000"
 * 1500000 -> "Rp1.500.000"
 */
export function formatRupiah(amount: number | string | null | undefined, withPrefix = true): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return withPrefix ? 'Rp0' : '0';
  }
  const numeric = Math.round(Number(amount));
  const formatted = new Intl.NumberFormat('id-ID').format(numeric);
  return withPrefix ? `Rp${formatted}` : formatted;
}

/**
 * Compact Indonesian Rupiah representation:
 * 15000 -> "15 rb"
 * 1500000 -> "1,5 jt"
 */
export function formatRupiahCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp${(amount / 1_000_000_000).toFixed(1).replace('.0', '').replace('.', ',')} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp${(amount / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')} jt`;
  }
  if (amount >= 1_000) {
    return `Rp${(amount / 1_000).toFixed(0)} rb`;
  }
  return formatRupiah(amount);
}
