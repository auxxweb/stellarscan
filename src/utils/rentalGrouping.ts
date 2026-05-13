import type { Product, Rental, RentalGroupStatus } from '../types'
import { findActiveRentalForProduct, normalizeEntityId, resolveProductNameLabel } from './scannerResolve'

export function isRentalLineOpen(r: Rental): boolean {
  return r.lineStatus === 'open' && r.status === 'active'
}

/** Stable contract key shared by all lines on the same checkout. */
export function contractGroupKey(r: Rental): string {
  return String(r.groupId || r.id).trim()
}

/** All still-out lines on the same contract as this product's active line. */
export function findOpenContractLinesForProduct(rentals: Rental[], productId: string): Rental[] {
  const active = findActiveRentalForProduct(rentals, productId)
  if (!active) return []
  const g = contractGroupKey(active)
  return rentals.filter((r) => contractGroupKey(r) === g && isRentalLineOpen(r))
}

/** Open lines for a contract id (from Rentals / dashboard). */
export function getOpenContractLinesByGroupId(rentals: Rental[], groupId: string): Rental[] {
  const g = String(groupId).trim()
  if (!g) return []
  return rentals.filter((r) => contractGroupKey(r) === g && isRentalLineOpen(r))
}

export function deriveGroupStatus(lines: Rental[]): RentalGroupStatus {
  if (lines.length === 0) return 'completed'
  const open = lines.filter((l) => isRentalLineOpen(l)).length
  if (open === 0) return 'completed'
  if (open === lines.length) return 'active'
  return 'partial_returned'
}

export function groupRentalsByGroupId(rentals: Rental[]): Map<string, Rental[]> {
  const m = new Map<string, Rental[]>()
  for (const r of rentals) {
    const g = String(r.groupId || r.id).trim() || r.id
    const list = m.get(g) ?? []
    list.push(r)
    m.set(g, list)
  }
  return m
}

/** Group product names by model label for display (each physical id stays separate internally). */
export function formatGroupedProductSummary(lines: Rental[], products: Product[]): string {
  const counts = new Map<string, { label: string; n: number }>()
  for (const line of lines) {
    const label = resolveProductNameLabel(line.productId, line.productName, products)
    const key = `${normalizeEntityId(line.productId)}|${label}`
    const cur = counts.get(key)
    if (cur) cur.n += 1
    else counts.set(key, { label, n: 1 })
  }
  return Array.from(counts.values())
    .map(({ label, n }) => (n > 1 ? `${label} × ${n}` : `${label} × 1`))
    .join(', ')
}

export function groupStatusLabel(s: RentalGroupStatus): string {
  switch (s) {
    case 'active':
      return 'Active'
    case 'partial_returned':
      return 'Partial return'
    case 'completed':
      return 'Completed'
    default:
      return s
  }
}
