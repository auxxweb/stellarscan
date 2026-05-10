import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { useAppStore } from '../store/useAppStore'
import { formatDisplayDate } from '../utils/dates'

export function MaintenancePage() {
  const maintenance = useAppStore((s) => s.maintenance)

  const { open, closed } = useMemo(() => {
    const o = maintenance.filter((m) => m.status === 'open').sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    const c = maintenance
      .filter((m) => m.status === 'closed')
      .sort((a, b) => +new Date(b.completedAt ?? 0) - +new Date(a.completedAt ?? 0))
    return { open: o, closed: c }
  }, [maintenance])

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">Service</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Maintenance</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Open repairs and completed work orders.</p>
      </div>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Open tickets</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {open.length === 0 ? <div className="text-sm text-slate-600 dark:text-slate-400">No open maintenance.</div> : null}
          {open.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 dark:border-amber-400/20 dark:bg-amber-400/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900 dark:text-slate-50">{m.productName}</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{m.issue}</div>
                </div>
                <Badge className="bg-amber-100 text-amber-950 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-100 dark:ring-amber-400/30">
                  Open
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-400">Given to</span>
                  <span className="font-semibold">{m.givenTo}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-400">ETA</span>
                  <span className="font-semibold">{formatDisplayDate(m.estimatedCompletion)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-400">Opened</span>
                  <span className="font-semibold">{formatDisplayDate(m.createdAt)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Completed</div>
        <div className="mt-4 space-y-3">
          {closed.length === 0 ? <div className="text-sm text-slate-600 dark:text-slate-400">No completed records.</div> : null}
          {closed.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-900 dark:text-slate-50">{m.productName}</div>
                <Badge className="bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30">
                  Closed
                </Badge>
              </div>
              <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">{m.issue}</div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
                <span>
                  Completed <span className="font-semibold text-slate-900 dark:text-slate-100">{formatDisplayDate(m.completedAt ?? '')}</span>
                </span>
                <span>
                  Cost <span className="font-semibold text-slate-900 dark:text-slate-100">${m.repairCost ?? 0}</span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
