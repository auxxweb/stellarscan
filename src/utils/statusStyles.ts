import type { ProductStatus } from '../types'

export function statusLabel(status: ProductStatus): string {
  switch (status) {
    case 'available':
      return 'Available'
    case 'rented':
      return 'Rented'
    case 'maintenance':
      return 'Maintenance'
    default:
      return status
  }
}

export function statusBadgeClass(status: ProductStatus): string {
  switch (status) {
    case 'available':
      return 'bg-emerald-100 text-emerald-800 ring-emerald-200'
    case 'rented':
      return 'bg-rose-100 text-rose-800 ring-rose-200'
    case 'maintenance':
      return 'bg-amber-100 text-amber-900 ring-amber-200'
    default:
      return 'bg-slate-100 text-slate-800 ring-slate-200'
  }
}
