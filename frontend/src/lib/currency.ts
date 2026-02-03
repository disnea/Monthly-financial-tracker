/**
 * Currency formatting utilities
 * Formats amounts based on user's preferred currency
 */

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
}

export const CURRENCY_CODES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'] as const
export type CurrencyCode = typeof CURRENCY_CODES[number]

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency
  
  // Format with commas for readability
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
  
  // Add negative sign if needed
  const sign = amount < 0 ? '-' : ''
  
  return `${sign}${symbol}${formatted}`
}

/**
 * Get currency symbol only
 */
export function getCurrencySymbol(currency: string = 'INR'): string {
  return CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency
}

/**
 * Format amount without currency symbol (for inputs)
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Parse formatted string back to number
 */
export function parseAmount(value: string): number {
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[₹$€£¥,\s]/g, '')
  return parseFloat(cleaned) || 0
}
