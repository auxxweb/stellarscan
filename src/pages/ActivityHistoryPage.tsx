import { useMemo, useState } from 'react'
import { Activity as ActivityIcon, Filter, PackagePlus, RotateCcw, Wrench } from 'lucide-react'
import { Skeleton } from '../components/ui/Skeleton'
import { PageFiltersBar } from '../components/ui/PageFiltersBar'
import { useAppStore } from '../store/useAppStore'
import { formatDisplayDate } from '../utils/dates'
import type { ActivityType } from '../types'
import { cn } from '../utils/cn'

function iconFor(type: ActivityType) {
  switch (type) {
    case 'product_added':
      return PackagePlus
    case 'rental_started':
      return ActivityIcon
    case 'rental_partial_return':
    case 'rental_closed':
      return RotateCcw
    case 'maintenance_started':
    case 'maintenance_closed':
      return Wrench
    default:
      return ActivityIcon
  }
}

function typeLabel(type: ActivityType): string {
  return String(type ?? '').replaceAll('_', ' ') || 'activity'
}

const ACTIVITY_TYPES: { value: ActivityType | 'all'; label: string }[] = [
  { value: 'all', label: 'All events' },
  { value: 'product_added', label: 'Product added' },
  { value: 'rental_started', label: 'Rental started' },
  { value: 'rental_partial_return', label: 'Partial return' },
  { value: 'rental_closed', label: 'Rental closed' },
  { value: 'maintenance_started', label: 'Maintenance started' },
  { value: 'maintenance_closed', label: 'Maintenance closed' },
  { value: 'status_changed', label: 'Status changed' },
]

export function ActivityHistoryPage() {
  const logs = useAppStore((s) => s.activityLogs)
  const hydrated = useAppStore((s) => s.hydrated)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')

  const filteredLogs = useMemo(() => {
    const filtered = logs.filter((log) => {
      if (typeFilter !== 'all' && log.type !== typeFilter) return false
      const q = query.trim().toLowerCase()
      if (!q) return true
      const hay = `${log.productName} ${log.productId} ${log.message} ${String(log.type)}`.toLowerCase()
      return hay.includes(q)
    })
    return [...filtered].reverse()
  }, [logs, query, typeFilter])

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-sky-700">Audit trail</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Activity history</h1>
        <p className="mt-1 text-sm text-slate-600">
          Latest events first (reverse of sheet top-to-bottom order).
        </p>
      </div>

      <PageFiltersBar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search product, message, type…"
        filters={
          <>
            <Filter className="size-4 shrink-0 text-slate-500 max-sm:hidden" aria-hidden />
            <select
              className="w-full min-w-[12rem] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 sm:w-auto"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ActivityType | 'all')}
            >
              {ACTIVITY_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </>
        }
      />

      {/* Avoid backdrop-blur + motion here — some GPUs hide nested text; keep solid bg + explicit colors */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5">
        {!hydrated ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="relative text-slate-900">
            <div className="pointer-events-none absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-sky-500/0 via-sky-500/40 to-indigo-500/0" />
            <div className="space-y-4">
              {filteredLogs.map((log) => {
                const Icon = iconFor(log.type)
                const title = log.productName.trim() || log.productId.trim() || 'Activity'
                const body =
                  log.message.trim() ||
                  (log.productId && !log.productName.trim()
                    ? `Product ID: ${log.productId}`
                    : 'No message in sheet row — check the Message column or refresh data.')
                return (
                  <div key={log.id} className="relative flex gap-4 pl-2">
                    <div
                      className={cn(
                        'relative z-[1] grid size-9 shrink-0 place-items-center rounded-2xl ring-1',
                        'bg-white text-slate-900 ring-slate-200',
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-slate-800" aria-hidden />
                    </div>
                    <div className="relative z-[1] min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900">{title}</div>
                        <time
                          className="text-[11px] font-semibold tabular-nums text-slate-600"
                          dateTime={log.createdAt || undefined}
                        >
                          {formatDisplayDate(log.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-800">{body}</p>
                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {typeLabel(log.type)}
                      </div>
                    </div>
                  </div>
                )
              })}
              {filteredLogs.length === 0 ? (
                <p className="text-sm text-slate-600">
                  {logs.length === 0
                    ? 'No activity yet. Events appear here when you add products, rentals, or maintenance from the app (or when rows exist on the ActivityLogs sheet).'
                    : 'No matching events. Try a different search or event type.'}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
