export type ProductStatus = 'available' | 'rented' | 'maintenance'

export type RentalRecordStatus = 'active' | 'closed'

export type MaintenanceRecordStatus = 'open' | 'closed'

export type ReturnKind = 'early' | 'on_time' | 'delayed'

export type ActivityType =
  | 'product_added'
  | 'rental_started'
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

export interface Rental {
  id: string
  productId: string
  productName: string
  customerName: string
  phone: string
  advanceAmount: number
  expectedReturnDate: string
  finalBill: number | null
  extraCharges: number | null
  notes: string
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
  | { action: 'resetDemo'; payload: DashboardPayload }

export interface RentOutPayload {
  productId: string
  customerName: string
  phone: string
  expectedReturnDate: string
  advanceAmount: number
  notes: string
}

export interface ReturnProductPayload {
  productId: string
  rentalId: string
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
