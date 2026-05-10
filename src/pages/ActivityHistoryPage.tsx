import { Activity, PackagePlus, RotateCcw, Wrench } from 'lucide-react'
import { motion } from 'framer-motion'
import { GlassCard } from '../components/ui/GlassCard'
import { useAppStore } from '../store/useAppStore'
import { formatDisplayDate } from '../utils/dates'
import type { ActivityType } from '../types'
import { cn } from '../utils/cn'

function iconFor(type: ActivityType) {
  switch (type) {
    case 'product_added':
      return PackagePlus
    case 'rental_started':
      return Activity
    case 'rental_closed':
      return RotateCcw
    case 'maintenance_started':
    case 'maintenance_closed':
      return Wrench
    default:
      return Activity
  }
}

export function ActivityHistoryPage() {
  const logs = useAppStore((s) => s.activityLogs)

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-sky-700">Audit trail</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Activity history</h1>
        <p className="mt-1 text-sm text-slate-600">
          Same row order as your ActivityLogs sheet (top to bottom).
        </p>
      </div>

      <GlassCard>
        <div className="relative">
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-sky-500/0 via-sky-500/40 to-indigo-500/0" />
          <div className="space-y-4">
            {logs.map((log, idx) => {
              const Icon = iconFor(log.type)
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.35) }}
                  className="relative flex gap-4 pl-2"
                >
                  <div
                    className={cn(
                      'relative z-[1] grid size-9 shrink-0 place-items-center rounded-2xl ring-1',
                      'bg-white text-slate-900 ring-slate-200',
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900">{log.productName}</div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        {formatDisplayDate(log.createdAt)}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-slate-700">{log.message}</div>
                    <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {log.type.replaceAll('_', ' ')}
                    </div>
                  </div>
                </motion.div>
              )
            })}
            {logs.length === 0 ? <div className="text-sm text-slate-600">No activity yet.</div> : null}
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
