/**
 * Custom hook to access user's preferred currency
 */
import { useAuthStore } from '@/lib/store'
import { formatCurrency, getCurrencySymbol } from '@/lib/currency'

export function useCurrency() {
  const user = useAuthStore((state) => state.user)
  const currency = user?.preferred_currency || 'INR'
  
  return {
    currency,
    symbol: getCurrencySymbol(currency),
    format: (amount: number) => formatCurrency(amount, currency),
  }
}
