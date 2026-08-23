/**
 * Utility functions for formatting values in the UI
 * 
 * IMPORTANT: Database stores percentages as DECIMALS (0.xx)
 * UI must multiply by 100 for display
 */

/**
 * Formats a decimal value (0.xx) as a percentage string (xx.xx%)
 * @param value Decimal value from database (e.g., 0.1491)
 * @param decimals Number of decimal places (default 2)
 * @returns Formatted percentage string (e.g., "14.91%") or "—" if null/undefined
 */
export function formatPercentFromDecimal(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats a currency value in BRL
 * @param value Number value
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formats a number with fixed decimals
 * @param value Number value
 * @param decimals Number of decimal places (default 2)
 * @returns Formatted number string
 */
export function formatNumber(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals);
}

/**
 * Formats a large currency value in millions (for charts/reports)
 * @param value Number value
 * @returns Formatted string like "R$ 150.2M"
 * @deprecated Use formatCurrencyCompact() instead for automatic scale
 */
export function formatCurrencyInMillions(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) return "—";
  const inMillions = value / 1_000_000;
  return `R$ ${inMillions.toFixed(1)}M`;
}

/**
 * Formats large currency values with automatic scale (mi/bi/tri)
 * Uses compact notation for charts and tooltips
 * @param value Number value
 * @returns Formatted string like "R$ 38.1 bi"
 */
export function formatCurrencyCompact(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) return "—";
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  if (absValue >= 1e12) {
    return `${sign}R$ ${(absValue / 1e12).toFixed(1)} tri`;
  }
  if (absValue >= 1e9) {
    return `${sign}R$ ${(absValue / 1e9).toFixed(1)} bi`;
  }
  if (absValue >= 1e6) {
    return `${sign}R$ ${(absValue / 1e6).toFixed(1)} mi`;
  }
  
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formats value for chart Y-axis ticks (shorter format)
 * @param value Number value
 * @returns Formatted string like "38B" or "150M"
 */
export function formatAxisTick(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  if (absValue >= 1e12) return `${sign}${(absValue / 1e12).toFixed(0)}T`;
  if (absValue >= 1e9) return `${sign}${(absValue / 1e9).toFixed(0)}B`;
  if (absValue >= 1e6) return `${sign}${(absValue / 1e6).toFixed(0)}M`;
  return `${sign}${absValue.toFixed(0)}`;
}

/**
 * Checks if a value is out of normal percentage range
 * Used for data validation flags
 * @param value Decimal value
 * @returns true if |value| > 1 (unusual for decimal percentages)
 */
export function isPercentOutOfRange(value: number | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return Math.abs(value) > 1;
}
