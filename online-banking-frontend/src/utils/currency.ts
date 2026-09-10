export type CurrencyCode = 'USD' | 'INR';

/**
 * Formats a monetary amount into a clean, localized currency string.
 * - USD: uses standard en-US format (e.g., $100,000.00 USD)
 * - INR: uses standard en-IN Indian numbering system (e.g., ₹1,00,000.00 INR)
 */
export function formatMoney(amount: number | string, currency: string = 'USD', includeCode = false): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return currency === 'INR' ? '₹0.00' : '$0.00';

  const isINR = currency?.toUpperCase() === 'INR';
  const locale = isINR ? 'en-IN' : 'en-US';
  const symbol = isINR ? '₹' : '$';

  const formattedNum = Math.abs(num).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = num < 0 ? '-' : '';
  const result = `${sign}${symbol}${formattedNum}`;

  return includeCode ? `${result} ${currency.toUpperCase()}` : result;
}

export function formatAmountOnly(amount: number | string, currency: string = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  const isINR = currency?.toUpperCase() === 'INR';
  const locale = isINR ? 'en-IN' : 'en-US';
  return num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getCurrencySymbol(currency: string = 'USD'): string {
  return currency?.toUpperCase() === 'INR' ? '₹' : '$';
}
