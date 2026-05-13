/** Format a numeric amount with the Indian rupee symbol (values stay plain numbers in state/sheets). */
export function formatInr(amount: number | null | undefined): string {
  const n = Number(amount ?? 0)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n}`
}

/** Split a total amount (₹) across `count` lines in whole paise; earlier lines absorb remainder. */
export function splitMoneyTotalAcrossCount(total: number, count: number): number[] {
  const n = Math.max(0, Math.floor(count))
  if (n === 0) return []
  const t = Number(total)
  if (!Number.isFinite(t) || t < 0) return Array.from({ length: n }, () => 0)
  const paise = Math.round(t * 100)
  const base = Math.floor(paise / n)
  const rem = paise - base * n
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    out.push((base + (i < rem ? 1 : 0)) / 100)
  }
  return out
}
