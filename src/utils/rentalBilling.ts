import type { Product, Rental } from '../types'
import { inclusiveBillableDays } from './dates'
import { normalizeEntityId } from './scannerResolve'

export type LineReturnBillDetail = {
  lineId: string
  productId: string
  days: number
  ratePerDay: number
  subtotal: number
}

/** Per-line final bill from catalog rentalPrice/day × inclusive calendar days (rentedAt → return). */
export function computeContractReturnLineBills(
  lines: Rental[],
  products: Product[],
  returnedAtIso: string,
): { details: LineReturnBillDetail[]; total: number } {
  const details: LineReturnBillDetail[] = []
  let total = 0

  for (const line of lines) {
    const days = inclusiveBillableDays(line.rentedAt, returnedAtIso)
    const prod = products.find((p) => normalizeEntityId(p.id) === normalizeEntityId(line.productId))
    const ratePerDay = prod && Number.isFinite(prod.rentalPrice) ? Math.max(0, Number(prod.rentalPrice)) : 0
    const subtotal = Math.round(days * ratePerDay * 100) / 100
    details.push({ lineId: line.id, productId: line.productId, days, ratePerDay, subtotal })
    total += subtotal
  }

  return { details, total: Math.round(total * 100) / 100 }
}
