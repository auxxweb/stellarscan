import type {
  ActivityLog,
  DashboardPayload,
  MaintenanceRecord,
  Product,
  Rental,
  SheetAction,
} from '../types'
import { createId } from '../utils/id'
import { nowIso } from '../utils/dates'
import { deriveStellarQrCodeFromProductId } from '../utils/qrCode'

const STORAGE_KEY = 'stellar-camera-rentals-v2'
const LEGACY_STORAGE_KEY = 'stellar-camera-rentals-v1'

/** Bundled demo used a known serial — skip migrating that dataset so the app stays sheet-only. */
function isLikelyBundledSeed(data: DashboardPayload): boolean {
  return data.products?.some((p) => p.serialNumber === 'SN-FX3-10492') ?? false
}

function loadRaw(): DashboardPayload | null {
  try {
    const current = localStorage.getItem(STORAGE_KEY)
    if (current) return JSON.parse(current) as DashboardPayload

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy) return null

    localStorage.removeItem(LEGACY_STORAGE_KEY)
    const parsed = JSON.parse(legacy) as DashboardPayload
    if (isLikelyBundledSeed(parsed)) return null

    localStorage.setItem(STORAGE_KEY, legacy)
    return parsed
  } catch {
    return null
  }
}

function saveRaw(data: DashboardPayload): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function emptyDashboard(): DashboardPayload {
  return {
    products: [],
    rentals: [],
    maintenance: [],
    activityLogs: [],
  }
}

export function loadLocalDataset(): DashboardPayload {
  const existing = loadRaw()
  if (existing) return existing
  return emptyDashboard()
}

export function saveLocalDataset(data: DashboardPayload): void {
  saveRaw(data)
}

export function resetLocalDataset(): DashboardPayload {
  const cleared = emptyDashboard()
  saveRaw(cleared)
  return cleared
}

function createActivity(
  entry: Omit<ActivityLog, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): ActivityLog {
  return {
    id: entry.id ?? createId(),
    type: entry.type,
    productId: entry.productId,
    productName: entry.productName,
    message: entry.message,
    meta: entry.meta,
    createdAt: entry.createdAt ?? nowIso(),
  }
}

export function applySheetAction(state: DashboardPayload, action: SheetAction): DashboardPayload {
  const next: DashboardPayload = structuredClone(state)

  switch (action.action) {
    case 'fetchAll':
      return next
    case 'resetDemo': {
      const cleared = emptyDashboard()
      saveRaw(cleared)
      return cleared
    }
    case 'addProduct': {
      const id = createId()
      const qrCode = deriveStellarQrCodeFromProductId(id)
      const p: Product = {
        id,
        qrCode,
        productName: action.payload.productName,
        category: action.payload.category,
        brand: action.payload.brand,
        modelNumber: action.payload.modelNumber,
        serialNumber: action.payload.serialNumber,
        rentalPrice: Number(action.payload.rentalPrice),
        image: action.payload.image,
        status: action.payload.status ?? 'available',
        currentCustomer: '',
        phone: '',
        expectedReturnDate: '',
        lastUpdated: nowIso(),
      }
      next.products.push(p)
      next.activityLogs.push(
        createActivity({
          type: 'product_added',
          productId: p.id,
          productName: p.productName,
          message: `New product added — ${p.productName}`,
          meta: { category: p.category },
        }),
      )
      break
    }
    case 'rentOut': {
      const { productId, customerName, phone, expectedReturnDate, advanceAmount, notes } = action.payload
      const product = next.products.find((x) => x.id === productId)
      if (!product || product.status !== 'available') break
      product.status = 'rented'
      product.currentCustomer = customerName
      product.phone = phone
      product.expectedReturnDate = expectedReturnDate
      product.lastUpdated = nowIso()
      const rental: Rental = {
        id: createId(),
        productId,
        productName: product.productName,
        customerName,
        phone,
        advanceAmount: Number(advanceAmount),
        expectedReturnDate,
        finalBill: null,
        extraCharges: null,
        notes,
        status: 'active',
        rentedAt: nowIso(),
        returnedAt: null,
        returnKind: null,
      }
      next.rentals.push(rental)
      next.activityLogs.push(
        createActivity({
          type: 'rental_started',
          productId,
          productName: product.productName,
          message: `Rented to ${customerName}`,
          meta: { rentalId: rental.id },
        }),
      )
      break
    }
    case 'returnProduct': {
      const { productId, rentalId, finalBill, extraCharges, notes, returnedAt, returnKind } = action.payload
      const product = next.products.find((x) => x.id === productId)
      const rental = next.rentals.find((x) => x.id === rentalId)
      if (!product || !rental || rental.status !== 'active') break
      product.status = 'available'
      product.currentCustomer = ''
      product.phone = ''
      product.expectedReturnDate = ''
      product.lastUpdated = nowIso()
      rental.status = 'closed'
      rental.finalBill = Number(finalBill)
      rental.extraCharges = Number(extraCharges)
      rental.notes = notes || rental.notes
      rental.returnedAt = returnedAt
      rental.returnKind = returnKind
      next.activityLogs.push(
        createActivity({
          type: 'rental_closed',
          productId,
          productName: product.productName,
          message: `Return completed (${returnKind.replace('_', ' ')})`,
          meta: { rentalId, finalBill, extraCharges },
        }),
      )
      break
    }
    case 'sendToMaintenance': {
      const { productId, givenTo, issue, estimatedCompletion, notes } = action.payload
      const product = next.products.find((x) => x.id === productId)
      if (!product || product.status !== 'available') break
      product.status = 'maintenance'
      product.lastUpdated = nowIso()
      const m: MaintenanceRecord = {
        id: createId(),
        productId,
        productName: product.productName,
        givenTo,
        issue,
        estimatedCompletion,
        repairCost: null,
        notes,
        status: 'open',
        createdAt: nowIso(),
        completedAt: null,
      }
      next.maintenance.push(m)
      next.activityLogs.push(
        createActivity({
          type: 'maintenance_started',
          productId,
          productName: product.productName,
          message: `Maintenance — ${issue}`,
          meta: { maintenanceId: m.id },
        }),
      )
      break
    }
    case 'completeMaintenance': {
      const { productId, maintenanceId, repairCost, notes } = action.payload
      const product = next.products.find((x) => x.id === productId)
      const m = next.maintenance.find((x) => x.id === maintenanceId)
      if (!product || !m || m.status !== 'open') break
      product.status = 'available'
      product.lastUpdated = nowIso()
      m.status = 'closed'
      m.repairCost = Number(repairCost)
      m.notes = notes || m.notes
      m.completedAt = nowIso()
      next.activityLogs.push(
        createActivity({
          type: 'maintenance_closed',
          productId,
          productName: product.productName,
          message: 'Maintenance completed',
          meta: { maintenanceId, repairCost },
        }),
      )
      break
    }
    default:
      break
  }

  saveRaw(next)
  return next
}
