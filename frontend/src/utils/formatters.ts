export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', INR: '\u20B9', EUR: '\u20AC', GBP: '\u00A3',
  JPY: '\u00A5', CAD: 'C$', AUD: 'A$',
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '$'
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${symbol}${formatted}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function getRecommendationColor(rec: string): string {
  switch (rec) {
    case 'YES': return 'text-green-600'
    case 'NO': return 'text-red-600'
    default: return 'text-yellow-600'
  }
}

export function getRecommendationBg(rec: string): string {
  switch (rec) {
    case 'YES': return 'bg-green-50 border-green-200'
    case 'NO': return 'bg-red-50 border-red-200'
    default: return 'bg-yellow-50 border-yellow-200'
  }
}
