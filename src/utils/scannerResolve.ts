import type { MaintenanceRecord, Product, Rental } from '../types'
import { normalizeQrPayload } from './productNormalize'

/** Compare sheet ids (trim + lowercase; UUIDs and Google ids are case-insensitive). */
export function normalizeEntityId(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase()
}

/**
 * Many QR tools wrap payloads in URLs or add prefixes. Extract the code the app stores in `product.qrCode`.
 */
export function extractQrProductCode(text: string): string {
  const raw = normalizeQrPayload(text)
  if (!raw) return ''

  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw)
      const fromQuery =
        u.searchParams.get('code') ??
        u.searchParams.get('id') ??
        u.searchParams.get('qr') ??
        u.searchParams.get('q')
      if (fromQuery) return normalizeQrPayload(fromQuery)
      const parts = u.pathname.split('/').filter(Boolean)
      const last = parts[parts.length - 1]
      if (last) return normalizeQrPayload(decodeURIComponent(last))
    }
  } catch {
    /* invalid URL — use raw */
  }

  const stellar = raw.match(/\b(STELLAR-[A-Z0-9]+)\b/i)
  if (stellar) return stellar[1]!.toUpperCase()

  return raw
}

export function findProductByScan(products: Product[], scannedText: string): Product | undefined {
  const primary = extractQrProductCode(scannedText)
  const variants = Array.from(
    new Set([primary, normalizeQrPayload(scannedText)].filter((v) => v.length > 0)),
  )

  for (const code of variants) {
    const c = normalizeQrPayload(code)
    const byQr =
      products.find((p) => normalizeQrPayload(p.qrCode) === c) ??
      products.find((p) => normalizeQrPayload(p.qrCode).toLowerCase() === c.toLowerCase())
    if (byQr) return byQr
    const byId = products.find((p) => normalizeEntityId(p.id) === normalizeEntityId(c))
    if (byId) return byId
  }
  return undefined
}

/** Active rental for close flow; tolerates productId casing and imperfect sheet status. */
export function findActiveRentalForProduct(rentals: Rental[], productId: string): Rental | null {
  const pid = normalizeEntityId(productId)
  const forProduct = rentals.filter((r) => normalizeEntityId(r.productId) === pid)

  return (
    forProduct.find((r) => r.status === 'active') ??
    forProduct.find((r) => r.status !== 'closed' && (!r.returnedAt || String(r.returnedAt).trim() === '')) ??
    null
  )
}

/** Open maintenance ticket for complete flow. */
export function findOpenMaintenanceForProduct(
  maintenance: MaintenanceRecord[],
  productId: string,
): MaintenanceRecord | null {
  const pid = normalizeEntityId(productId)
  const forProduct = maintenance.filter((m) => normalizeEntityId(m.productId) === pid)

  return (
    forProduct.find((m) => m.status === 'open') ??
    forProduct.find((m) => m.status !== 'closed' && (!m.completedAt || String(m.completedAt).trim() === '')) ??
    null
  )
}
