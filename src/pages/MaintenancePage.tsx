import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, Wrench } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'
import { useToastStore } from '../store/useToastStore'
import { formatDisplayDate } from '../utils/dates'
import { formatInr } from '../utils/money'
import { MaintenanceCompleteModal } from '../components/workflows/MaintenanceCompleteModal'
import { MaintenanceViewModal } from '../components/workflows/MaintenanceViewModal'
import type { MaintenanceRecord, Product } from '../types'
import { normalizeEntityId } from '../utils/scannerResolve'

export function MaintenancePage() {
  const maintenance = useAppStore((s) => s.maintenance)
  const products = useAppStore((s) => s.products)
  const pushToast = useToastStore((s) => s.push)

  const [completeTarget, setCompleteTarget] = useState<{ product: Product; record: MaintenanceRecord } | null>(null)
  const [viewRecord, setViewRecord] = useState<MaintenanceRecord | null>(null)

  const { open, closed } = useMemo(() => {
    const o = maintenance.filter((m) => m.status === 'open')
    const c = maintenance.filter((m) => m.status === 'closed')
    return { open: o, closed: c }
  }, [maintenance])

  const openComplete = (m: MaintenanceRecord) => {
    const product = products.find((p) => normalizeEntityId(p.id) === normalizeEntityId(m.productId))
    if (!product) {
      pushToast('Product not found for this ticket. Refresh data in Settings.', 'error')
      return
    }
    setCompleteTarget({ product, record: m })
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-sky-700">Service</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Maintenance</h1>
        <p className="mt-1 text-sm text-slate-600">
          Open and completed tickets in the same order as your Maintenance sheet.
        </p>
      </div>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900">Open tickets</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {open.length === 0 ? <div className="text-sm text-slate-600">No open maintenance.</div> : null}
          {open.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">{m.productName}</div>
                  <div className="mt-1 text-sm text-slate-700">{m.issue}</div>
                </div>
                <Badge className="bg-amber-100 text-amber-950 ring-amber-200">
                  Open
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-700">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-600">Given to</span>
                  <span className="font-semibold">{m.givenTo}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-600">ETA</span>
                  <span className="font-semibold">{formatDisplayDate(m.estimatedCompletion)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-600">Opened</span>
                  <span className="font-semibold">{formatDisplayDate(m.createdAt)}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => openComplete(m)}
                  leftIcon={<Wrench className="size-4" />}
                >
                  Complete maintenance
                </Button>
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setViewRecord(m)} leftIcon={<Eye className="size-4" />}>
                  View
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900">Completed</div>
        <div className="mt-4 space-y-3">
          {closed.length === 0 ? <div className="text-sm text-slate-600">No completed records.</div> : null}
          {closed.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-900">{m.productName}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-900 ring-emerald-200">
                    Closed
                  </Badge>
                  <Button type="button" variant="outline" className="!px-3 !py-2" onClick={() => setViewRecord(m)} leftIcon={<Eye className="size-4" />}>
                    View
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-sm text-slate-700">{m.issue}</div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
                <span>
                  Completed <span className="font-semibold text-slate-900">{formatDisplayDate(m.completedAt ?? '')}</span>
                </span>
                <span>
                  Cost <span className="font-semibold text-slate-900">{formatInr(m.repairCost)}</span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      <MaintenanceCompleteModal
        open={!!completeTarget}
        product={completeTarget?.product ?? null}
        record={completeTarget?.record ?? null}
        onClose={() => setCompleteTarget(null)}
      />
      <MaintenanceViewModal open={viewRecord !== null} record={viewRecord} onClose={() => setViewRecord(null)} />
    </div>
  )
}
