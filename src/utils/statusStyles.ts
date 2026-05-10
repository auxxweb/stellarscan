import type { ProductStatus } from '../types'
import { cn } from './cn'

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
      return cn(
        'bg-emerald-100 text-emerald-800 ring-emerald-200',
        'dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
      )
    case 'rented':
      return cn(
        'bg-rose-100 text-rose-800 ring-rose-200',
        'dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
      )
    case 'maintenance':
      return cn(
        'bg-amber-100 text-amber-900 ring-amber-200',
        'dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-400/35',
      )
    default:
      return cn(
        'bg-slate-100 text-slate-800 ring-slate-200',
        'dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/30',
      )
  }
}
