/**
 * Maps Google Sheet row shapes (varying column names) to app types before normalization.
 */
import type { ActivityLog, MaintenanceRecord, Product, Rental } from '../types'
import { createId } from './id'

function str(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString()
  return String(v).trim()
}

function num(v: unknown): number {
  if (v === '' || v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function numOrNull(v: unknown): number | null {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function pick(raw: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in raw && raw[k] !== '' && raw[k] != null) return raw[k]
    const lower = k.toLowerCase()
    for (const rk of Object.keys(raw)) {
      if (rk.toLowerCase().replace(/\s+/g, '') === lower.replace(/\s+/g, '')) return raw[rk]
    }
  }
  return undefined
}

/** Rental rows: rentalId, billAmount, expectedReturn, etc. */
export function coerceRentalFromSheet(raw: unknown): Rental {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const id = str(pick(o, ['id', 'rentalId', 'rental_id']))
  const returnedAtRaw = pick(o, ['returnedAt', 'returned_at', 'returnDate'])
  const finalBillRaw = pick(o, ['finalBill', 'billAmount', 'bill_amount', 'final_bill'])
  const extraRaw = pick(o, ['extraCharges', 'extra_charges', 'extra'])
  const rk = pick(o, ['returnKind', 'return_kind', 'timing'])
  return {
    id,
    productId: str(pick(o, ['productId', 'product_id'])),
    productName: str(pick(o, ['productName', 'product_name', 'name'])),
    customerName: str(pick(o, ['customerName', 'customer_name', 'customer'])),
    phone: str(pick(o, ['phone', 'mobile', 'tel'])),
    advanceAmount: num(pick(o, ['advanceAmount', 'advance_amount', 'advance', 'deposit'])),
    expectedReturnDate: str(pick(o, ['expectedReturnDate', 'expectedReturn', 'expected_return', 'due', 'returnDue'])),
    finalBill: finalBillRaw === undefined || finalBillRaw === '' ? null : numOrNull(finalBillRaw),
    extraCharges: extraRaw === undefined || extraRaw === '' ? null : numOrNull(extraRaw),
    notes: str(pick(o, ['notes', 'note', 'comments'])),
    status: str(pick(o, ['status', 'state'])) as Rental['status'],
    rentedAt: str(pick(o, ['rentedAt', 'rented_at', 'startDate', 'startedAt'])),
    returnedAt: returnedAtRaw === undefined || returnedAtRaw === '' ? null : str(returnedAtRaw),
    returnKind: rk != null && String(rk).trim() !== '' ? (String(rk) as Rental['returnKind']) : null,
  }
}

/** Maintenance: maintenanceId, startedAt, cost, expectedCompletion */
export function coerceMaintenanceFromSheet(raw: unknown): MaintenanceRecord {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const id = str(pick(o, ['maintenanceId', 'maintenance_id', 'id', 'ticketId']))
  return {
    id,
    productId: str(pick(o, ['productId', 'product_id'])),
    productName: str(pick(o, ['productName', 'product_name'])),
    givenTo: str(pick(o, ['givenTo', 'given_to', 'vendor', 'serviceCenter'])),
    issue: str(pick(o, ['issue', 'problem', 'description'])),
    estimatedCompletion: str(pick(o, ['estimatedCompletion', 'expectedCompletion', 'expected_completion', 'eta', 'due'])),
    repairCost: numOrNull(pick(o, ['repairCost', 'cost', 'bill', 'amount'])),
    notes: str(pick(o, ['notes', 'note'])),
    status: str(pick(o, ['status', 'state'])) as MaintenanceRecord['status'],
    createdAt: str(pick(o, ['createdAt', 'startedAt', 'start_date', 'openedAt', 'opened'])),
    completedAt: (() => {
      const v = pick(o, ['completedAt', 'completed_at', 'closedAt', 'endDate'])
      return v === undefined || v === '' ? null : str(v)
    })(),
  }
}

export function coerceProductFromSheet(raw: unknown): Product {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    id: str(pick(o, ['id'])),
    qrCode: str(pick(o, ['qrCode', 'qr_code', 'QR'])),
    productName: str(pick(o, ['productName', 'product_name', 'name'])),
    category: str(pick(o, ['category'])),
    brand: str(pick(o, ['brand'])),
    modelNumber: str(pick(o, ['modelNumber', 'model_number', 'model'])),
    serialNumber: str(pick(o, ['serialNumber', 'serial_number', 'serial'])),
    rentalPrice: num(pick(o, ['rentalPrice', 'rental_price', 'price'])),
    image: str(pick(o, ['image', 'photo', 'url'])),
    status: str(pick(o, ['status'])) as Product['status'],
    currentCustomer: str(pick(o, ['currentCustomer', 'current_customer', 'customer'])),
    phone: str(pick(o, ['phone', 'mobile'])),
    expectedReturnDate: str(pick(o, ['expectedReturnDate', 'expected_return_date', 'due'])),
    lastUpdated: str(pick(o, ['lastUpdated', 'last_updated', 'updated'])),
  }
}

export function coerceActivityFromSheet(raw: unknown): ActivityLog {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const id = str(pick(o, ['id', 'logId', 'log_id', 'entryId']))
  const typeRaw = str(pick(o, ['type', 'action', 'event', 'kind']))
  const created = str(pick(o, ['createdAt', 'timestamp', 'time', 'date', 'loggedAt']))
  return {
    id: id || createId(),
    type: typeRaw as ActivityLog['type'],
    productId: str(pick(o, ['productId', 'product_id'])),
    productName: str(pick(o, ['productName', 'product_name'])),
    message: str(pick(o, ['message', 'description', 'details', 'text'])),
    meta: {},
    createdAt: created,
  }
}
