/**
 * Formats a number as currency
 * @param amount - The amount to format
 * @param currency - Currency code ('MXN' or 'USD')
 * @returns Formatted currency string
 */
export function formatPrice(amount: number, currency: 'MXN' | 'USD' = 'MXN'): string {
  return new Intl.NumberFormat(currency === 'MXN' ? 'es-MX' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a number as compact currency (e.g., $1.2M)
 */
export function formatPriceCompact(amount: number, currency: 'MXN' | 'USD' = 'MXN'): string {
  return new Intl.NumberFormat(currency === 'MXN' ? 'es-MX' : 'en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}
