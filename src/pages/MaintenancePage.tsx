import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, Filter, Wrench } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { PageFiltersBar } from '../components/ui/PageFiltersBar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'
import { useToastStore } from '../store/useToastStore'
import { formatDisplayDate } from '../utils/dates'
import { formatInr } from '../utils/money'
import { MaintenanceCompleteModal } from '../components/workflows/MaintenanceCompleteModal'
import { MaintenanceViewModal } from '../components/workflows/MaintenanceViewModal'
import type { MaintenanceRecord, Product } from '../types'
import { normalizeEntityId, resolveProductNameLabel } from '../utils/scannerResolve'

export function MaintenancePage() {
  const maintenance = useAppStore((s) => s.maintenance)
  const products = useAppStore((s) => s.products)
  const pushToast = useToastStore((s) => s.push)

  const [completeTarget, setCompleteTarget] = useState<{ product: Product; record: MaintenanceRecord } | null>(null)
  const [viewRecord, setViewRecord] = useState<MaintenanceRecord | null>(null)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'all' | 'open' | 'closed'>('all')

  const { open, closed } = useMemo(() => {
    const o = maintenance.filter((m) => m.status === 'open')
    const c = maintenance.filter((m) => m.status === 'closed')
    return { open: o, closed: c }
  }, [maintenance])

  const filteredOpen = useMemo(() => {
    const q = query.trim().toLowerCase()
    return open.filter((m) => {
      if (!q) return true
      const pname = resolveProductNameLabel(m.productId, m.productName, products)
      const hay = `${pname} ${m.issue} ${m.givenTo} ${m.productId} ${m.id}`.toLowerCase()
      return hay.includes(q)
    })
  }, [open, query, products])

  const filteredClosed = useMemo(() => {
    const q = query.trim().toLowerCase()
    return closed.filter((m) => {
      if (!q) return true
      const pname = resolveProductNameLabel(m.productId, m.productName, products)
      const hay = `${pname} ${m.issue} ${m.givenTo} ${m.productId} ${m.id}`.toLowerCase()
      return hay.includes(q)
    })
  }, [closed, query, products])

  const displayedOpen = useMemo(() => [...filteredOpen].reverse(), [filteredOpen])
  const displayedClosed = useMemo(() => [...filteredClosed].reverse(), [filteredClosed])

  const showOpenSection = scope !== 'closed'
  const showClosedSection = scope !== 'open'
  const hasTickets = maintenance.length > 0
  const noMatches =
    hasTickets &&
    query.trim() !== '' &&
    filteredOpen.length === 0 &&
    filteredClosed.length === 0 &&
    scope === 'all'

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
          Latest tickets first (reverse of sheet top-to-bottom order).
        </p>
      </div>

      <PageFiltersBar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search product, issue, vendor…"
        filters={
          <>
            <Filter className="size-4 shrink-0 text-slate-500 max-sm:hidden" aria-hidden />
            <select
              className="w-full min-w-[10rem] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 sm:w-auto"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
            >
              <option value="all">All tickets</option>
              <option value="open">Open only</option>
              <option value="closed">Completed only</option>
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
      {showOpenSection ? (
      <GlassCard>
        <div className="text-sm font-semibold text-slate-900">Open tickets</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {filteredOpen.length === 0 ? (
            <div className="text-sm text-slate-600">
              {!hasTickets ? 'No open maintenance.' : query.trim() ? 'No matching open tickets.' : 'No open maintenance.'}
            </div>
          ) : null}
          {displayedOpen.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">
                    {resolveProductNameLabel(m.productId, m.productName, products)}
                  </div>
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
      ) : null}

      {showClosedSection ? (
      <GlassCard>
        <div className="text-sm font-semibold text-slate-900">Completed</div>
        <div className="mt-4 space-y-3">
          {filteredClosed.length === 0 ? (
            <div className="text-sm text-slate-600">
              {!hasTickets ? 'No completed records.' : query.trim() ? 'No matching completed tickets.' : 'No completed records.'}
            </div>
          ) : null}
          {displayedClosed.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-900">
                  {resolveProductNameLabel(m.productId, m.productName, products)}
                </div>
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
      ) : null}
        </>
      )}

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
