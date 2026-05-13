import type {
  ActivityLog,
  ActivityType,
  DashboardPayload,
  MaintenanceRecord,
  MaintenanceRecordStatus,
  Product,
  ProductStatus,
  Rental,
  RentalLineStatus,
  RentalRecordStatus,
  ReturnKind,
} from '../types'
import { createId } from './id'
import { deriveStellarQrCodeFromProductId } from './qrCode'
import {
  coerceActivityFromSheet,
  coerceMaintenanceFromSheet,
  coerceProductFromSheet,
  coerceRentalFromSheet,
} from './sheetRecordMap'

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

/** Per-line rental row: active = item still out, closed = returned. */
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
    partial_returned: 'active',
    partialreturned: 'active',
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

function normalizeRentalLineStatus(
  raw: unknown,
  row: Pick<Rental, 'returnedAt' | 'status' | 'lineStatus'>,
): RentalLineStatus {
  const ls = normalizeSheetKey(raw)
  if (ls === 'returned' || ls === 'closed') return 'returned'
  if (ls === 'open' || ls === 'active') return 'open'
  const hasReturn = row.returnedAt != null && String(row.returnedAt).trim() !== ''
  if (hasReturn || row.status === 'closed') return 'returned'
  if (row.lineStatus === 'returned') return 'returned'
  return 'open'
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
  const rawAdv = (r as unknown as { advanceAmount?: unknown }).advanceAmount
  const advanceAmount =
    rawAdv === undefined || rawAdv === null ? 0 : Number(rawAdv)
  const status = normalizeRentalStatus(r.status, r)
  const lineStatus = normalizeRentalLineStatus(r.lineStatus, { ...r, status })
  const gid = String(r.groupId ?? '').trim()
  const groupId = gid || String(r.id ?? '').trim()
  return {
    ...r,
    groupId,
    advanceAmount: Number.isFinite(advanceAmount) ? advanceAmount : 0,
    status,
    lineStatus,
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

function normalizeActivityType(raw: unknown): ActivityType {
  const s = normalizeSheetKey(raw)
  const aliases: Record<string, ActivityType> = {
    product_added: 'product_added',
    rental_started: 'rental_started',
    rental_partial_return: 'rental_partial_return',
    rental_closed: 'rental_closed',
    maintenance_started: 'maintenance_started',
    maintenance_closed: 'maintenance_closed',
    status_changed: 'status_changed',
    added: 'product_added',
    rent: 'rental_started',
    rented: 'rental_started',
    return: 'rental_closed',
    returned: 'rental_closed',
    partial_return: 'rental_partial_return',
    partialreturn: 'rental_partial_return',
    maintenance: 'maintenance_started',
    maint: 'maintenance_started',
    service: 'maintenance_started',
    complete: 'maintenance_closed',
    completed: 'maintenance_closed',
  }
  if (aliases[s]) return aliases[s]
  if (
    s === 'product_added' ||
    s === 'rental_started' ||
    s === 'rental_partial_return' ||
    s === 'rental_closed' ||
    s === 'maintenance_started' ||
    s === 'maintenance_closed' ||
    s === 'status_changed'
  ) {
    return s
  }
  return 'status_changed'
}

function normalizeActivityMeta(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw) as unknown
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>
    } catch {
      /* ignore */
    }
  }
  return {}
}

/** Maps sheet/API rows to canonical keys when headers differ (e.g. "Product Name" vs productName). */
function looseActivityFieldIndex(raw: Record<string, unknown>): Map<string, unknown> {
  const m = new Map<string, unknown>()
  for (const [k, v] of Object.entries(raw)) {
    m.set(normalizeSheetKey(k), v)
  }
  return m
}

function pickLooseField(idx: Map<string, unknown>, candidates: string[]): string {
  for (const c of candidates) {
    const nk = normalizeSheetKey(c)
    const v = idx.get(nk)
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

export function normalizeActivityLog(row: ActivityLog): ActivityLog {
  const raw = row as unknown as Record<string, unknown>
  const idx = looseActivityFieldIndex(raw)

  const productName =
    String(row.productName ?? '').trim() ||
    pickLooseField(idx, ['productName', 'product name', 'name', 'title', 'product'])
  const message =
    String(row.message ?? '').trim() ||
    pickLooseField(idx, ['message', 'description', 'details', 'notes', 'note', 'comment', 'text'])
  const productId =
    String(row.productId ?? '').trim() ||
    pickLooseField(idx, ['productId', 'product id', 'sku', 'asset id'])

  const mergedType =
    String(row.type ?? '').trim() ||
    pickLooseField(idx, ['type', 'event', 'action', 'activity', 'activity type'])

  const createdCandidates = [
    (row as { createdAt?: unknown }).createdAt,
    idx.get(normalizeSheetKey('createdAt')),
    idx.get(normalizeSheetKey('created at')),
    idx.get(normalizeSheetKey('date')),
    idx.get(normalizeSheetKey('timestamp')),
    idx.get(normalizeSheetKey('time')),
  ].filter((x) => x != null && String(x).trim() !== '')

  let createdAt = ''
  const createdRaw = createdCandidates[0]
  if (createdRaw instanceof Date) createdAt = createdRaw.toISOString()
  else if (typeof createdRaw === 'number' && Number.isFinite(createdRaw)) {
    const d = new Date(createdRaw)
    createdAt = Number.isNaN(d.getTime()) ? '' : d.toISOString()
  } else createdAt = normalizeQrPayload(String(createdRaw ?? ''))

  const idStr =
    String(row.id ?? '').trim() ||
    pickLooseField(idx, ['id', 'log id', 'entry id']) ||
    createId()

  return {
    id: idStr,
    type: normalizeActivityType(mergedType),
    productId,
    productName,
    message,
    meta: normalizeActivityMeta(row.meta),
    createdAt,
  }
}

/** Normalize all sheet-backed entities so list filters match. */
export function normalizeDashboardPayload(data: DashboardPayload): DashboardPayload {
  const logs = Array.isArray(data.activityLogs) ? data.activityLogs : []
  return {
    products: data.products.map((p) => normalizeProduct(coerceProductFromSheet(p))),
    rentals: data.rentals.map((r) => normalizeRental(coerceRentalFromSheet(r))),
    maintenance: data.maintenance.map((m) => normalizeMaintenanceRecord(coerceMaintenanceFromSheet(m))),
    activityLogs: logs.map((r) => normalizeActivityLog(coerceActivityFromSheet(r) as ActivityLog)),
  }
}
