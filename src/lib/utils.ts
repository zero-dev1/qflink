export function truncateAddress(address: string, type: 'evm' | 'substrate' = 'substrate', chars?: number): string {
  if (!address) return ''
  
  // Default chars based on address type
  const defaultChars = type === 'evm' ? 4 : 6
  const actualChars = chars ?? defaultChars
  
  if (address.length <= actualChars * 2 + 2) return address
  return `${address.slice(0, actualChars)}...${address.slice(-actualChars)}`
}

export function formatBalance(balance: bigint, decimals = 18, displayDecimals = 4): string {
  const divisor = BigInt(10 ** decimals)
  const whole = balance / divisor
  const fraction = balance % divisor
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, displayDecimals)
  return `${whole.toString()}.${fractionStr}`
}

/**
 * Format balance with compact notation for large numbers:
 * 1,000+ → "1K+", 10,000+ → "10K+", 100,000+ → "100K+",
 * 1,000,000+ → "1M+", 1,000,000,000+ → "1B+"
 * Uses rounding: values >= 999,500 show as "1M+" instead of "1000K+"
 * 
 * NOTE: For entry fees and exact amounts, use formatBalance() instead to avoid
 * confusing users with rounded values (e.g., showing 497+ instead of 500).
 */
export function formatCompactBalance(balance: bigint, decimals = 18): string {
  const divisor = BigInt(10 ** decimals)
  const whole = balance / divisor
  
  // Billions (with rounding threshold at 999,500,000)
  if (whole >= 999_500_000n) {
    return `${(Number(whole) / 1_000_000_000).toFixed(0)}B+`
  }
  // Millions (with rounding threshold at 999,500)
  if (whole >= 999_500n) {
    return `${(Number(whole) / 1_000_000).toFixed(0)}M+`
  }
  // Thousands
  if (whole >= 1_000n) {
    return `${(Number(whole) / 1_000).toFixed(0)}K+`
  }
  return `${whole.toLocaleString()}+`
}

/**
 * Format balance for display - shows exact value without rounding/compact notation.
 * Use this for entry fees and exact amounts where precision matters.
 * Example: 500000000000000000000 → "500"
 */
export function formatExactAmount(balance: bigint, decimals = 18): string {
  const divisor = BigInt(10 ** decimals)
  const whole = balance / divisor
  return whole.toLocaleString()
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDateSeparator(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) return 'Today'

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function isValidAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address) || /^0x[a-fA-F0-9]{40,64}$/.test(address)
}

export function isSubstrateAddress(addr: string): boolean {
  return !addr.startsWith('0x') && addr.length >= 46 && addr.length <= 48
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
