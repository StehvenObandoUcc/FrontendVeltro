// src/utils/formatCurrency.ts

/**
 * Formats a monetary value for display in the Colombian locale (es-CO / COP).
 * Returns integer format when no fractional part exists,
 * otherwise limits to 2 decimal places.
 *
 * @param value - The raw price value from the API (string or number)
 * @returns Formatted currency string (e.g., "$ 15.000" or "$ 15.000,50")
 */
export const formatCurrency = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
};
