import type { Product } from '../types'

/**
 * React list key for products. Sheet / import mistakes can duplicate `id`; index keeps keys unique
 * without changing persisted ids used for rentals and scans.
 */
export function productRowReactKey(p: Product, index: number): string {
  return `${index}__${p.id}`
}
