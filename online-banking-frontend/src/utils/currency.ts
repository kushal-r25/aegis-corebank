export type CurrencyCode = 'USD' | 'INR';

/**
 * Formats a monetary amount into a clean, localized currency string.
 * - INR: uses standard en-IN Indian numbering system (e.g., ₹1,00,000.00)
 * - USD: uses standard en-US format (e.g., $100,000.00 USD)
 * Default is INR.
 */
export function formatMoney(amount: number | string, currency: string = 'INR', includeCode = false): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return currency === 'USD' ? '$0.00' : '₹0.00';

  const isUSD = currency?.toUpperCase() === 'USD';
  const locale = isUSD ? 'en-US' : 'en-IN';
  const symbol = isUSD ? '$' : '₹';

  const formattedNum = Math.abs(num).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = num < 0 ? '-' : '';
  const result = `${sign}${symbol}${formattedNum}`;

  return includeCode ? `${result} ${currency.toUpperCase()}` : result;
}

export function formatAmountOnly(amount: number | string, currency: string = 'INR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  const isUSD = currency?.toUpperCase() === 'USD';
  const locale = isUSD ? 'en-US' : 'en-IN';
  return num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getCurrencySymbol(currency: string = 'INR'): string {
  return currency?.toUpperCase() === 'USD' ? '$' : '₹';
}
