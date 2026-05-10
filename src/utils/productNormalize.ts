import type {
  DashboardPayload,
  MaintenanceRecord,
  MaintenanceRecordStatus,
  Product,
  ProductStatus,
  Rental,
  RentalRecordStatus,
  ReturnKind,
} from '../types'
import { deriveStellarQrCodeFromProductId } from './qrCode'

const LOG = '[StellarScan]'

function normalizeSheetKey(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

/** Trim scanned / sheet text (BOM, line breaks, spaces). */
export function normalizeQrPayload(text: string): string {
  return String(text).replace(/^\uFEFF/, '').trim().replace(/\r?\n/g, '').replace(/\s+/g, ' ')
}

/**
 * Maps sheet / API status strings to app enums. Sheets often use different casing or labels.
 */
export function normalizeProductStatus(raw: unknown): ProductStatus {
  const s = normalizeSheetKey(raw)

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
  // Single canonical payload: STELLAR- + first 10 chars of id without hyphens (matches Apps Script addProduct).
  // Sheet qr column may differ; scanner + generator always use this so stickers match the row id.
  return {
    ...p,
    qrCode: deriveStellarQrCodeFromProductId(p.id),
    status: normalizeProductStatus(p.status),
  }
}

/** Rentals tab often uses Active/Closed, Open, etc. */
export function normalizeRentalStatus(raw: unknown, row: Pick<Rental, 'returnedAt'>): RentalRecordStatus {
  const s = normalizeSheetKey(raw)
  const hasReturn = row.returnedAt != null && String(row.returnedAt).trim() !== ''

  const aliases: Record<string, RentalRecordStatus> = {
    active: 'active',
    open: 'active',
    current: 'active',
    ongoing: 'active',
    out: 'active',
    rented: 'active',
    live: 'active',
    closed: 'closed',
    close: 'closed',
    completed: 'closed',
    complete: 'closed',
    done: 'closed',
    returned: 'closed',
    ended: 'closed',
    settled: 'closed',
  }

  if (aliases[s]) return aliases[s]
  if (s === 'active' || s === 'closed') return s as RentalRecordStatus

  if (!s) return hasReturn ? 'closed' : 'active'

  console.warn(LOG, 'Unrecognized rental status from sheet; inferring from returnedAt. Value was:', raw)
  return hasReturn ? 'closed' : 'active'
}

export function normalizeReturnKind(raw: unknown): ReturnKind | null {
  const s = normalizeSheetKey(raw)
  if (!s) return null
  const aliases: Record<string, ReturnKind> = {
    early: 'early',
    on_time: 'on_time',
    ontime: 'on_time',
    timely: 'on_time',
    delayed: 'delayed',
    late: 'delayed',
  }
  if (aliases[s]) return aliases[s]
  if (s === 'early' || s === 'on_time' || s === 'delayed') return s as ReturnKind
  return null
}

export function normalizeRental(r: Rental): Rental {
  const rk = r.returnKind
  const returnKind =
    rk != null && String(rk).trim() !== '' ? normalizeReturnKind(rk) : null
  return {
    ...r,
    status: normalizeRentalStatus(r.status, r),
    returnKind,
  }
}

/** Maintenance tab often uses Open/Closed or Pending/Done. */
export function normalizeMaintenanceStatus(raw: unknown, row: Pick<MaintenanceRecord, 'completedAt'>): MaintenanceRecordStatus {
  const s = normalizeSheetKey(raw)
  const hasCompleted = row.completedAt != null && String(row.completedAt).trim() !== ''

  const aliases: Record<string, MaintenanceRecordStatus> = {
    open: 'open',
    pending: 'open',
    ongoing: 'open',
    active: 'open',
    progress: 'open',
    new: 'open',
    closed: 'closed',
    close: 'closed',
    completed: 'closed',
    complete: 'closed',
    done: 'closed',
    resolved: 'closed',
    finished: 'closed',
  }

  if (aliases[s]) return aliases[s]
  if (s === 'open' || s === 'closed') return s as MaintenanceRecordStatus

  if (!s) return hasCompleted ? 'closed' : 'open'

  console.warn(LOG, 'Unrecognized maintenance status from sheet; inferring from completedAt. Value was:', raw)
  return hasCompleted ? 'closed' : 'open'
}

export function normalizeMaintenanceRecord(m: MaintenanceRecord): MaintenanceRecord {
  return {
    ...m,
    status: normalizeMaintenanceStatus(m.status, m),
  }
}

/** Normalize all sheet-backed entities so list filters match. */
export function normalizeDashboardPayload(data: DashboardPayload): DashboardPayload {
  return {
    products: data.products.map(normalizeProduct),
    rentals: data.rentals.map(normalizeRental),
    maintenance: data.maintenance.map(normalizeMaintenanceRecord),
    activityLogs: data.activityLogs,
  }
}
