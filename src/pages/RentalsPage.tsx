import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, RotateCcw } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'
import { useToastStore } from '../store/useToastStore'
import { formatDisplayDate } from '../utils/dates'
import { cn } from '../utils/cn'
import { ReturnProductModal } from '../components/workflows/ReturnProductModal'
import { RentalViewModal } from '../components/workflows/RentalViewModal'
import type { Product, Rental } from '../types'
import { normalizeEntityId } from '../utils/scannerResolve'

export function RentalsPage() {
  const rentals = useAppStore((s) => s.rentals)
  const products = useAppStore((s) => s.products)
  const pushToast = useToastStore((s) => s.push)

  const [returnTarget, setReturnTarget] = useState<{ product: Product; rental: Rental } | null>(null)
  const [viewRental, setViewRental] = useState<Rental | null>(null)

  const { active, closed } = useMemo(() => {
    const a = rentals.filter((r) => r.status === 'active')
    const c = rentals.filter((r) => r.status === 'closed')
    return { active: a, closed: c }
  }, [rentals])

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
        <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">Contracts</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Rentals</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Active and closed rows in the same order as your Rentals sheet.
        </p>
      </div>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Active rentals</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {active.length === 0 ? <div className="text-sm text-slate-600 dark:text-slate-400">No active rentals.</div> : null}
          {active.map((r, idx) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900 dark:text-slate-50">{r.productName}</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{r.customerName}</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{r.phone}</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30">
                  Active
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between gap-3">
                  <span>Rented</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatDisplayDate(r.rentedAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Due</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatDisplayDate(r.expectedReturnDate)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Advance</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">${r.advanceAmount}</span>
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

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Closed rentals</div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Returned</th>
                <th className="px-4 py-3">Timing</th>
                <th className="px-4 py-3 text-right">Bill</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {closed.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">{r.productName}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{r.customerName}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDisplayDate(r.returnedAt ?? '')}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        r.returnKind === 'delayed' && 'bg-rose-100 text-rose-900 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200',
                        r.returnKind === 'early' && 'bg-sky-100 text-sky-900 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200',
                        r.returnKind === 'on_time' &&
                          'bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200',
                      )}
                    >
                      {(r.returnKind ?? 'closed').replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-50">
                    ${r.finalBill ?? 0}
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
          {closed.length === 0 ? <div className="p-4 text-sm text-slate-600 dark:text-slate-400">No history yet.</div> : null}
        </div>
      </GlassCard>

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
