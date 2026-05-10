import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, Filter, RotateCcw } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { PageFiltersBar } from '../components/ui/PageFiltersBar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'
import { useToastStore } from '../store/useToastStore'
import { formatDisplayDate } from '../utils/dates'
import { formatInr } from '../utils/money'
import { cn } from '../utils/cn'
import { ReturnProductModal } from '../components/workflows/ReturnProductModal'
import { RentalViewModal } from '../components/workflows/RentalViewModal'
import type { Product, Rental } from '../types'
import { normalizeEntityId, resolveProductNameLabel } from '../utils/scannerResolve'

export function RentalsPage() {
  const rentals = useAppStore((s) => s.rentals)
  const products = useAppStore((s) => s.products)
  const pushToast = useToastStore((s) => s.push)

  const [returnTarget, setReturnTarget] = useState<{ product: Product; rental: Rental } | null>(null)
  const [viewRental, setViewRental] = useState<Rental | null>(null)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'all' | 'active' | 'closed'>('all')

  const { active, closed } = useMemo(() => {
    const a = rentals.filter((r) => r.status === 'active')
    const c = rentals.filter((r) => r.status === 'closed')
    return { active: a, closed: c }
  }, [rentals])

  const filteredActive = useMemo(() => {
    const q = query.trim().toLowerCase()
    return active.filter((r) => {
      if (!q) return true
      const pname = resolveProductNameLabel(r.productId, r.productName, products)
      const hay = `${pname} ${r.customerName} ${r.phone} ${r.productId} ${r.id}`.toLowerCase()
      return hay.includes(q)
    })
  }, [active, query, products])

  const filteredClosed = useMemo(() => {
    const q = query.trim().toLowerCase()
    return closed.filter((r) => {
      if (!q) return true
      const pname = resolveProductNameLabel(r.productId, r.productName, products)
      const hay = `${pname} ${r.customerName} ${r.phone} ${r.productId} ${r.id}`.toLowerCase()
      return hay.includes(q)
    })
  }, [closed, query, products])

  /** Sheet order is typically oldest-first; show newest rows first. */
  const displayedActive = useMemo(() => [...filteredActive].reverse(), [filteredActive])
  const displayedClosed = useMemo(() => [...filteredClosed].reverse(), [filteredClosed])

  const showActiveSection = scope !== 'closed'
  const showClosedSection = scope !== 'active'
  const hasRentals = rentals.length > 0
  const noMatches =
    hasRentals &&
    query.trim() !== '' &&
    filteredActive.length === 0 &&
    filteredClosed.length === 0 &&
    scope === 'all'

  const openCloseRental = (r: Rental) => {
    const product = products.find((p) => normalizeEntityId(p.id) === normalizeEntityId(r.productId))
    if (!product) {
      pushToast('Product not found for this rental. Refresh data in Settings.', 'error')
      return
    }
    setReturnTarget({ product, rental: r })
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-sky-700">Contracts</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Rentals</h1>
        <p className="mt-1 text-sm text-slate-600">
          Latest rentals first (reverse of sheet top-to-bottom order).
        </p>
      </div>

      <PageFiltersBar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search product, customer, phone…"
        filters={
          <>
            <Filter className="size-4 shrink-0 text-slate-500 max-sm:hidden" aria-hidden />
            <select
              className="w-full min-w-[10rem] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 sm:w-auto"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
            >
              <option value="all">All rentals</option>
              <option value="active">Active only</option>
              <option value="closed">Closed only</option>
            </select>
          </>
        }
      />

      {noMatches ? (
        <GlassCard>
          <div className="text-sm font-semibold text-slate-900">No matches</div>
          <p className="mt-1 text-sm text-slate-600">Try a different search or clear the search box.</p>
        </GlassCard>
      ) : (
        <>
      {showActiveSection ? (
      <GlassCard>
        <div className="text-sm font-semibold text-slate-900">Active rentals</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filteredActive.length === 0 ? (
            <div className="text-sm text-slate-600">
              {!hasRentals ? 'No active rentals.' : query.trim() ? 'No matching active rentals.' : 'No active rentals.'}
            </div>
          ) : null}
          {displayedActive.map((r, idx) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">
                    {resolveProductNameLabel(r.productId, r.productName, products)}
                  </div>
                  <div className="mt-1 text-sm text-slate-700">{r.customerName}</div>
                  <div className="mt-1 text-xs text-slate-600">{r.phone}</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-900 ring-emerald-200">
                  Active
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-600">
                <div className="flex justify-between gap-3">
                  <span>Rented</span>
                  <span className="font-semibold text-slate-900">{formatDisplayDate(r.rentedAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Due</span>
                  <span className="font-semibold text-slate-900">{formatDisplayDate(r.expectedReturnDate)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Advance</span>
                  <span className="font-semibold text-slate-900">{formatInr(r.advanceAmount)}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => openCloseRental(r)}
                  leftIcon={<RotateCcw className="size-4" />}
                >
                  Close rental
                </Button>
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setViewRental(r)} leftIcon={<Eye className="size-4" />}>
                  View
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
      ) : null}

      {showClosedSection ? (
      <GlassCard>
        <div className="text-sm font-semibold text-slate-900">Closed rentals</div>
        <div className="mt-4 min-w-0 rounded-2xl border border-slate-200">
          <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Returned</th>
                <th className="px-4 py-3">Timing</th>
                <th className="px-4 py-3 text-right">Bill</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedClosed.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {resolveProductNameLabel(r.productId, r.productName, products)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.customerName}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDisplayDate(r.returnedAt ?? '')}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        r.returnKind === 'delayed' && 'bg-rose-100 text-rose-900 ring-rose-200',
                        r.returnKind === 'early' && 'bg-sky-100 text-sky-900 ring-sky-200',
                        r.returnKind === 'on_time' &&
                          'bg-emerald-100 text-emerald-900 ring-emerald-200',
                      )}
                    >
                      {(r.returnKind ?? 'closed').replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatInr(r.finalBill)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      className="!px-3 !py-2"
                      onClick={() => setViewRental(r)}
                      leftIcon={<Eye className="size-4" />}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {filteredClosed.length === 0 ? (
            <div className="p-4 text-sm text-slate-600">
              {!hasRentals ? 'No history yet.' : query.trim() ? 'No matching closed rentals.' : 'No closed rentals yet.'}
            </div>
          ) : null}
        </div>
      </GlassCard>
      ) : null}
        </>
      )}

      <ReturnProductModal
        open={!!returnTarget}
        product={returnTarget?.product ?? null}
        rental={returnTarget?.rental ?? null}
        onClose={() => setReturnTarget(null)}
      />
      <RentalViewModal open={viewRental !== null} rental={viewRental} onClose={() => setViewRental(null)} />
    </div>
  )
}
