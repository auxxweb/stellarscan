/** Format a numeric amount with the Indian rupee symbol (values stay plain numbers in state/sheets). */
export function formatInr(amount: number | null | undefined): string {
  const n = Number(amount ?? 0)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n}`
}
