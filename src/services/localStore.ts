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
import { normalizeEntityId } from '../utils/scannerResolve'

const STORAGE_KEY = 'stellar-camera-rentals-v2'
const LEGACY_STORAGE_KEY = 'stellar-camera-rentals-v1'

/** Match rental line for return: line id, composite `groupId::productId`, or legacy group + product. */
function findRentalLineForReturnLocal(rentals: Rental[], rentalLineId: string, productId: string): Rental | undefined {
  const lid = String(rentalLineId ?? '').trim()
  const pid = normalizeEntityId(productId)
  const byId = rentals.find((x) => normalizeEntityId(x.id) === normalizeEntityId(lid))
  if (byId) return byId
  const sep = lid.indexOf('::')
  if (sep > 0) {
    const grp = lid.slice(0, sep).trim()
    const encPid = lid.slice(sep + 2).trim()
    const byComposite = rentals.find(
      (x) =>
        normalizeEntityId(x.groupId) === normalizeEntityId(grp) &&
        normalizeEntityId(x.productId) === normalizeEntityId(encPid) &&
        x.lineStatus === 'open' &&
        x.status === 'active',
    )
    if (byComposite) return byComposite
  }
  return rentals.find(
    (x) =>
      normalizeEntityId(x.groupId) === normalizeEntityId(lid) &&
      normalizeEntityId(x.productId) === pid &&
      x.lineStatus === 'open' &&
      x.status === 'active',
  )
}

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
      const pl = action.payload
      const rawIds = Array.isArray(pl.productIds) ? pl.productIds.filter(Boolean) : []
      const ids: string[] = []
      const dedupe = new Set<string>()
      for (const id of rawIds) {
        if (dedupe.has(id)) continue
        dedupe.add(id)
        ids.push(id)
      }
      if (ids.length === 0) break

      const customerName = pl.customerName
      const phone = pl.phone
      const expectedReturnDate = pl.expectedReturnDate
      const advanceAmt = Number(pl.advanceAmount ?? 0)
      const notesVal = typeof pl.notes === 'string' ? pl.notes : ''
      const groupId = (typeof pl.groupId === 'string' && pl.groupId.trim()) ? pl.groupId.trim() : createId()
      const advanceTotal = Number.isFinite(advanceAmt) ? advanceAmt : 0

      for (const productId of ids) {
        const product = next.products.find((x) => normalizeEntityId(x.id) === normalizeEntityId(productId))
        if (!product || product.status !== 'available') return state
        const alreadyRented = next.rentals.some(
          (r) =>
            normalizeEntityId(r.productId) === normalizeEntityId(productId) &&
            r.lineStatus === 'open' &&
            r.status === 'active',
        )
        if (alreadyRented) return state
      }

      let idx = 0
      for (const productId of ids) {
        const product = next.products.find((x) => normalizeEntityId(x.id) === normalizeEntityId(productId))
        if (!product) continue
        product.status = 'rented'
        product.currentCustomer = customerName
        product.phone = phone
        product.expectedReturnDate = expectedReturnDate
        product.lastUpdated = nowIso()

        const lineId = createId()
        const adv = idx === 0 ? advanceTotal : 0
        idx += 1
        const rental: Rental = {
          id: lineId,
          groupId,
          productId,
          productName: product.productName,
          customerName,
          phone,
          advanceAmount: adv,
          expectedReturnDate,
          finalBill: null,
          extraCharges: null,
          notes: notesVal,
          lineStatus: 'open',
          status: 'active',
          rentedAt: nowIso(),
          returnedAt: null,
          returnKind: null,
        }
        next.rentals.push(rental)
      }

      const firstPid = ids[0]!
      const firstProduct = next.products.find((x) => x.id === firstPid)
      next.activityLogs.push(
        createActivity({
          type: 'rental_started',
          productId: firstPid,
          productName: firstProduct?.productName ?? '',
          message:
            idx > 1
              ? `Rented ${idx} items to ${customerName} (contract ${groupId})`
              : `Rented to ${customerName}`,
          meta: { rentalId: groupId, groupId, productIds: ids, lineCount: idx },
        }),
      )
      break
    }
    case 'returnProduct': {
      const { productId, rentalLineId, finalBill, extraCharges, notes, returnedAt, returnKind } = action.payload
      const product = next.products.find((x) => normalizeEntityId(x.id) === normalizeEntityId(productId))
      const rental = findRentalLineForReturnLocal(next.rentals, rentalLineId, productId)
      if (!product || !rental || rental.lineStatus !== 'open' || rental.status !== 'active') break
      product.status = 'available'
      product.currentCustomer = ''
      product.phone = ''
      product.expectedReturnDate = ''
      product.lastUpdated = nowIso()
      rental.status = 'closed'
      rental.lineStatus = 'returned'
      rental.finalBill = Number(finalBill)
      rental.extraCharges = Number(extraCharges)
      rental.notes = notes || rental.notes
      rental.returnedAt = returnedAt
      rental.returnKind = returnKind

      const groupLines = next.rentals.filter((x) => x.groupId === rental.groupId)
      const stillOut = groupLines.some((x) => x.lineStatus === 'open' && x.status === 'active')

      next.activityLogs.push(
        createActivity({
          type: stillOut ? 'rental_partial_return' : 'rental_closed',
          productId,
          productName: product.productName,
          message: stillOut
            ? `Partial return — ${returnKind.replace('_', ' ')} (${product.productName})`
            : `Return completed (${returnKind.replace('_', ' ')}) — contract settled`,
          meta: {
            rentalLineId: rental.id,
            groupId: rental.groupId,
            billAmount: Number(finalBill),
          },
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
