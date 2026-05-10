import type {
  ActivityLog,
  DashboardPayload,
  MaintenanceRecord,
  Product,
  Rental,
  SheetAction,
} from '../types'
import { buildSeedData } from '../data/seed'
import { createId } from '../utils/id'
import { nowIso } from '../utils/dates'

const STORAGE_KEY = 'stellar-camera-rentals-v1'

function loadRaw(): DashboardPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DashboardPayload
  } catch {
    return null
  }
}

function saveRaw(data: DashboardPayload): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadLocalDataset(): DashboardPayload {
  const existing = loadRaw()
  if (existing?.products?.length) return existing
  const seed = buildSeedData()
  saveRaw(seed)
  return seed
}

export function saveLocalDataset(data: DashboardPayload): void {
  saveRaw(data)
}

export function resetLocalDataset(): DashboardPayload {
  const seed = buildSeedData()
  saveRaw(seed)
  return seed
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
      saveRaw(action.payload)
      return action.payload
    }
    case 'addProduct': {
      const id = createId()
      const qrCode = `STELLAR-${id.replace(/-/g, '').slice(0, 10).toUpperCase()}`
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
      next.products.unshift(p)
      next.activityLogs.unshift(
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
      next.rentals.unshift(rental)
      next.activityLogs.unshift(
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
      next.activityLogs.unshift(
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
      next.maintenance.unshift(m)
      next.activityLogs.unshift(
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
      next.activityLogs.unshift(
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
