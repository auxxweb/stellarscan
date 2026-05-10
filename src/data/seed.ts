import type { ActivityLog, DashboardPayload, MaintenanceRecord, Product, Rental } from '../types'
import { createId } from '../utils/id'
import { nowIso } from '../utils/dates'

const stockImage = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=800&q=80`

function product(p: Omit<Product, 'id' | 'qrCode' | 'lastUpdated'> & { id?: string; qrCode?: string }): Product {
  const id = p.id ?? createId()
  return {
    id,
    qrCode: p.qrCode ?? `STELLAR-${id.slice(0, 8).toUpperCase()}`,
    productName: p.productName,
    category: p.category,
    brand: p.brand,
    modelNumber: p.modelNumber,
    serialNumber: p.serialNumber,
    rentalPrice: p.rentalPrice,
    image: p.image,
    status: p.status,
    currentCustomer: p.currentCustomer,
    phone: p.phone,
    expectedReturnDate: p.expectedReturnDate,
    lastUpdated: nowIso(),
  }
}

export function buildSeedData(): DashboardPayload {
  const products: Product[] = [
    product({
      productName: 'Sony FX3',
      category: 'Cinema Camera',
      brand: 'Sony',
      modelNumber: 'ILME-FX3',
      serialNumber: 'SN-FX3-10492',
      rentalPrice: 185,
      image: stockImage('1598550476434-7832e39d5b91'),
      status: 'available',
      currentCustomer: '',
      phone: '',
      expectedReturnDate: '',
    }),
    product({
      productName: 'Sony A7S III',
      category: 'Mirrorless',
      brand: 'Sony',
      modelNumber: 'ILCE-7SM3',
      serialNumber: 'SN-A7S3-88321',
      rentalPrice: 145,
      image: stockImage('1516035069371-29a1b244cc32'),
      status: 'rented',
      currentCustomer: 'Jordan Lee',
      phone: '+1 (415) 555-0192',
      expectedReturnDate: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    }),
    product({
      productName: 'Canon EOS R5',
      category: 'Mirrorless',
      brand: 'Canon',
      modelNumber: 'EOS R5',
      serialNumber: 'SN-R5-22019',
      rentalPrice: 165,
      image: stockImage('1502920917128-1aa500764cb9'),
      status: 'available',
      currentCustomer: '',
      phone: '',
      expectedReturnDate: '',
    }),
    product({
      productName: 'DJI RS 3 Pro',
      category: 'Gimbal',
      brand: 'DJI',
      modelNumber: 'RS3 Pro',
      serialNumber: 'SN-DJI-RS3-7712',
      rentalPrice: 55,
      image: stockImage('1526170375885-4d8ecf77b99f'),
      status: 'maintenance',
      currentCustomer: '',
      phone: '',
      expectedReturnDate: '',
    }),
    product({
      productName: 'Sigma 24-70mm f/2.8',
      category: 'Lens',
      brand: 'Sigma',
      modelNumber: '24-70mm F2.8 DG DN',
      serialNumber: 'SN-SIG-2470-00931',
      rentalPrice: 42,
      image: stockImage('1606983340126-1170900b9d8d'),
      status: 'available',
      currentCustomer: '',
      phone: '',
      expectedReturnDate: '',
    }),
    product({
      productName: 'Godox SL-60W',
      category: 'Lighting',
      brand: 'Godox',
      modelNumber: 'SL-60W',
      serialNumber: 'SN-GDX-SL60-4410',
      rentalPrice: 28,
      image: stockImage('1507003211169-0a1dd7228f2d'),
      status: 'available',
      currentCustomer: '',
      phone: '',
      expectedReturnDate: '',
    }),
    product({
      productName: 'Peak Design Travel Tripod',
      category: 'Support',
      brand: 'Peak Design',
      modelNumber: 'Carbon',
      serialNumber: 'SN-PD-TRP-1188',
      rentalPrice: 22,
      image: stockImage('1477414349877-9476393b680b'),
      status: 'rented',
      currentCustomer: 'Maya Chen',
      phone: '+1 (646) 555-0144',
      expectedReturnDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    }),
    product({
      productName: 'SanDisk CFexpress 512GB',
      category: 'Memory',
      brand: 'SanDisk',
      modelNumber: 'CFexpress Type B',
      serialNumber: 'SN-SD-CFX-8821',
      rentalPrice: 12,
      image: stockImage('1587825140708-dfb536889e3d'),
      status: 'available',
      currentCustomer: '',
      phone: '',
      expectedReturnDate: '',
    }),
  ]

  const a7s = products.find((x) => x.productName.includes('A7S'))!
  const tripod = products.find((x) => x.productName.includes('Tripod'))!

  const rentals: Rental[] = [
    {
      id: createId(),
      productId: a7s.id,
      productName: a7s.productName,
      customerName: 'Jordan Lee',
      phone: '+1 (415) 555-0192',
      advanceAmount: 200,
      expectedReturnDate: a7s.expectedReturnDate,
      finalBill: null,
      extraCharges: null,
      notes: 'Wedding weekend kit.',
      status: 'active',
      rentedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      returnedAt: null,
      returnKind: null,
    },
    {
      id: createId(),
      productId: tripod.id,
      productName: tripod.productName,
      customerName: 'Maya Chen',
      phone: '+1 (646) 555-0144',
      advanceAmount: 50,
      expectedReturnDate: tripod.expectedReturnDate,
      finalBill: null,
      extraCharges: null,
      notes: 'Documentary shoot.',
      status: 'active',
      rentedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      returnedAt: null,
      returnKind: null,
    },
  ]

  const gimbal = products.find((x) => x.productName.includes('RS 3'))!

  const maintenance: MaintenanceRecord[] = [
    {
      id: createId(),
      productId: gimbal.id,
      productName: gimbal.productName,
      givenTo: 'Stellar Service Desk',
      issue: 'Motor calibration drift on tilt axis.',
      estimatedCompletion: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      repairCost: null,
      notes: 'Firmware updated, awaiting parts.',
      status: 'open',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
    },
  ]

  const activityLogs: ActivityLog[] = [
    {
      id: createId(),
      type: 'rental_started',
      productId: a7s.id,
      productName: a7s.productName,
      message: 'Rental started for Jordan Lee',
      meta: { rentalId: rentals[0]?.id },
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: createId(),
      type: 'maintenance_started',
      productId: gimbal.id,
      productName: gimbal.productName,
      message: 'Maintenance opened — motor calibration',
      meta: { maintenanceId: maintenance[0]?.id },
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: createId(),
      type: 'product_added',
      productId: products[7]!.id,
      productName: products[7]!.productName,
      message: 'Inventory updated — memory cards restocked',
      meta: {},
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
  ]

  return { products, rentals, maintenance, activityLogs }
}
