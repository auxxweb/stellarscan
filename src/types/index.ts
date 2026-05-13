export type ProductStatus = 'available' | 'rented' | 'maintenance'

/** One sheet row = one physical item; `active` = line still out, `closed` = line returned. */
export type RentalRecordStatus = 'active' | 'closed'

/** Derived from all lines sharing the same `groupId`. */
export type RentalGroupStatus = 'active' | 'partial_returned' | 'completed'

export type RentalLineStatus = 'open' | 'returned'

export type MaintenanceRecordStatus = 'open' | 'closed'

export type ReturnKind = 'early' | 'on_time' | 'delayed'

export type ActivityType =
  | 'product_added'
  | 'rental_started'
  | 'rental_partial_return'
  | 'rental_closed'
  | 'maintenance_started'
  | 'maintenance_closed'
  | 'status_changed'

export interface Product {
  id: string
  qrCode: string
  productName: string
  category: string
  brand: string
  modelNumber: string
  serialNumber: string
  rentalPrice: number
  image: string
  status: ProductStatus
  currentCustomer: string
  phone: string
  expectedReturnDate: string
  lastUpdated: string
}

/**
 * One row per physical item on a contract.
 * - `id` — unique line id (return + APIs); maps from sheet `lineId` when present, else legacy `rentalId`.
 * - `groupId` — contract id shared by all lines in the same checkout (sheet `rentalId` in multi-item mode).
 */
export interface Rental {
  id: string
  groupId: string
  productId: string
  productName: string
  customerName: string
  phone: string
  advanceAmount: number
  expectedReturnDate: string
  finalBill: number | null
  extraCharges: number | null
  notes: string
  /** Row-level: item still out vs returned (mirrors `status` for sheet compat). */
  lineStatus: RentalLineStatus
  /** Sheet-facing line status (`active` / `closed`). Kept for filters + backend. */
  status: RentalRecordStatus
  rentedAt: string
  returnedAt: string | null
  returnKind: ReturnKind | null
}

export interface MaintenanceRecord {
  id: string
  productId: string
  productName: string
  givenTo: string
  issue: string
  estimatedCompletion: string
  repairCost: number | null
  notes: string
  status: MaintenanceRecordStatus
  createdAt: string
  completedAt: string | null
}

export interface ActivityLog {
  id: string
  type: ActivityType
  productId: string
  productName: string
  message: string
  meta: Record<string, unknown>
  createdAt: string
}

export interface DashboardPayload {
  products: Product[]
  rentals: Rental[]
  maintenance: MaintenanceRecord[]
  activityLogs: ActivityLog[]
}

export type SheetAction =
  | { action: 'fetchAll' }
  | {
      action: 'addProduct'
      payload: Pick<
        Product,
        'productName' | 'category' | 'brand' | 'modelNumber' | 'serialNumber' | 'rentalPrice' | 'image'
      > & { status?: ProductStatus }
    }
  | { action: 'rentOut'; payload: RentOutPayload }
  | { action: 'returnProduct'; payload: ReturnProductPayload }
  | { action: 'sendToMaintenance'; payload: MaintenanceStartPayload }
  | { action: 'completeMaintenance'; payload: MaintenanceCompletePayload }
  | { action: 'resetDemo' }

export interface RentOutPayload {
  /** When omitted, a new group id is generated client- and server-side. */
  groupId?: string
  productIds: string[]
  /** Display names aligned with `productIds` (sent to Apps Script for legacy `productNames.split` backends). */
  productNames?: string[]
  customerName: string
  phone: string
  expectedReturnDate: string
  advanceAmount: number
  notes: string
}

export interface ReturnProductPayload {
  /** Unique rental line id (sheet `lineId`, or legacy row `rentalId`). */
  rentalLineId: string
  productId: string
  finalBill: number
  extraCharges: number
  notes: string
  returnedAt: string
  returnKind: ReturnKind
}

export interface MaintenanceStartPayload {
  productId: string
  givenTo: string
  issue: string
  estimatedCompletion: string
  notes: string
}

export interface MaintenanceCompletePayload {
  productId: string
  maintenanceId: string
  repairCost: number
  notes: string
}
