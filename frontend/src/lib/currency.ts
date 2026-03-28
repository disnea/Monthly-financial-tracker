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
 * Map currency codes to the correct locale for number formatting.
 * en-IN uses the Indian numbering system (lakhs/crores).
 * en-US uses standard Western grouping (thousands/millions).
 * Currencies use their country's native locale for proper formatting.
 */
const CURRENCY_LOCALE_MAP: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  CAD: 'en-CA',
}

function getLocaleForCurrency(currency: string): string {
  return CURRENCY_LOCALE_MAP[currency] || 'en-US'
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const locale = getLocaleForCurrency(currency)
  const fractionDigits = currency === 'JPY' ? 0 : 2

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount)
  } catch {
    // Fallback for unknown currency codes
    const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(Math.abs(amount))
    const sign = amount < 0 ? '-' : ''
    return `${sign}${symbol}${formatted}`
  }
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
export function formatAmount(amount: number, currency: string = 'INR'): string {
  const locale = getLocaleForCurrency(currency)
  const fractionDigits = currency === 'JPY' ? 0 : 2

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}

/**
 * Parse formatted string back to number
 */
export function parseAmount(value: string): number {
  // Remove currency symbols, commas, periods used as group separators, and spaces
  const cleaned = value.replace(/[₹$€£¥A-Za-z,\s]/g, '')
  return parseFloat(cleaned) || 0
}
