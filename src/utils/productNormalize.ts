import type { DashboardPayload, Product, ProductStatus } from '../types'

const LOG = '[StellarScan]'

/** Trim scanned / sheet text (BOM, line breaks, spaces). */
export function normalizeQrPayload(text: string): string {
  return String(text).replace(/^\uFEFF/, '').trim().replace(/\r?\n/g, '').replace(/\s+/g, ' ')
}

/**
 * Maps sheet / API status strings to app enums. Sheets often use different casing or labels.
 */
export function normalizeProductStatus(raw: unknown): ProductStatus {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (!s) return 'available'

  const aliases: Record<string, ProductStatus> = {
    available: 'available',
    avail: 'available',
    free: 'available',
    instock: 'available',
    in_stock: 'available',
    ready: 'available',
    rented: 'rented',
    rent: 'rented',
    out: 'rented',
    checked_out: 'rented',
    checkedout: 'rented',
    on_rent: 'rented',
    onrent: 'rented',
    maintenance: 'maintenance',
    maint: 'maintenance',
    service: 'maintenance',
    repair: 'maintenance',
    servicing: 'maintenance',
    in_maintenance: 'maintenance',
    in_service: 'maintenance',
    workshop: 'maintenance',
  }

  if (aliases[s]) return aliases[s]
  if (s === 'available' || s === 'rented' || s === 'maintenance') return s as ProductStatus

  console.warn(LOG, 'Unrecognized product status from sheet; using "available". Value was:', raw)
  return 'available'
}

export function normalizeProduct(p: Product): Product {
  return {
    ...p,
    qrCode: normalizeQrPayload(p.qrCode),
    status: normalizeProductStatus(p.status),
  }
}

export function normalizeDashboardProducts(data: DashboardPayload): DashboardPayload {
  return {
    ...data,
    products: data.products.map(normalizeProduct),
  }
}
