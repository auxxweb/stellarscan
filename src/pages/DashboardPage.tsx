import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock3, Package, Sparkles, Wrench } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { useAppStore } from '../store/useAppStore'
import { formatDisplayDate, isReturnDelayed } from '../utils/dates'
import { statusBadgeClass, statusLabel } from '../utils/statusStyles'
import type { ProductStatus } from '../types'
import { cn } from '../utils/cn'

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  delay,
  tone,
}: {
  title: string
  value: number
  hint: string
  icon: typeof Package
  delay: number
  tone: 'sky' | 'emerald' | 'rose' | 'amber' | 'fuchsia'
}) {
  const toneRing =
    tone === 'sky'
      ? 'from-sky-500/20 to-indigo-500/20'
      : tone === 'emerald'
        ? 'from-emerald-500/20 to-teal-500/20'
        : tone === 'rose'
          ? 'from-rose-500/20 to-orange-500/20'
          : tone === 'amber'
            ? 'from-amber-400/20 to-yellow-500/20'
            : 'from-fuchsia-500/20 to-purple-500/20'

  return (
    <GlassCard delay={delay} className="relative overflow-hidden">
      <div className={cn('pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-gradient-to-br blur-2xl', toneRing)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-600">{title}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
          <div className="mt-2 text-xs text-slate-600">{hint}</div>
        </div>
        <div className="grid size-11 place-items-center rounded-2xl bg-slate-900/5 ring-1 ring-slate-200">
          <Icon className="size-5 text-slate-900" />
        </div>
      </div>
    </GlassCard>
  )
}

export function DashboardPage() {
  const products = useAppStore((s) => s.products)
  const rentals = useAppStore((s) => s.rentals)
  const activityLogs = useAppStore((s) => s.activityLogs)
  const loading = useAppStore((s) => s.loading)
  const hydrated = useAppStore((s) => s.hydrated)

  const stats = useMemo(() => {
    const total = products.length
    const available = products.filter((p) => p.status === 'available').length
    const rented = products.filter((p) => p.status === 'rented').length
    const maintenance = products.filter((p) => p.status === 'maintenance').length
    const delayedReturns = products.filter(
      (p) => p.status === 'rented' && isReturnDelayed(p.expectedReturnDate),
    ).length

    const dist: Record<ProductStatus, number> = {
      available,
      rented,
      maintenance,
    }

    const activeRentals = rentals.filter((r) => r.status === 'active')

    return { total, available, rented, maintenance, delayedReturns, dist, activeRentals }
  }, [products, rentals])

  const maxDist = Math.max(1, stats.dist.available + stats.dist.rented + stats.dist.maintenance)

  if (!hydrated || loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-sky-700">Overview</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Fleet health</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Live inventory, rental momentum, and operational signals — tuned for fast counter workflows.
          </p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15"
        >
          Manage products
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total products" value={stats.total} hint="All tracked assets" icon={Package} delay={0} tone="sky" />
        <StatCard title="Available" value={stats.available} hint="Ready to rent" icon={Sparkles} delay={0.05} tone="emerald" />
        <StatCard title="Rented" value={stats.rented} hint="Out in the field" icon={Clock3} delay={0.1} tone="rose" />
        <StatCard title="Maintenance" value={stats.maintenance} hint="Service pipeline" icon={Wrench} delay={0.15} tone="amber" />
        <StatCard
          title="Delayed returns"
          value={stats.delayedReturns}
          hint="Needs a friendly follow-up"
          icon={Clock3}
          delay={0.2}
          tone="fuchsia"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Status distribution</div>
              <div className="mt-1 text-xs text-slate-600">Single source of truth per asset</div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {(
              [
                ['available', 'Available', 'bg-emerald-500'],
                ['rented', 'Rented', 'bg-rose-500'],
                ['maintenance', 'Maintenance', 'bg-amber-400'],
              ] as const
            ).map(([key, label, bar]) => {
              const v = stats.dist[key]
              const pct = Math.round((v / maxDist) * 100)
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>{label}</span>
                    <span>
                      {v} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                    <motion.div
                      className={cn('h-full rounded-full', bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="text-sm font-semibold text-slate-900">Activity log</div>
          <div className="mt-1 text-xs text-slate-600">Same order as your sheet (first rows first)</div>
          <div className="mt-4 space-y-3">
            {activityLogs.slice(0, 6).map((log, idx) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
              >
                <div className="text-xs font-semibold text-slate-900">{log.productName}</div>
                <div className="mt-1 text-xs text-slate-600">{log.message}</div>
                <div className="mt-2 text-[11px] text-slate-500">{formatDisplayDate(log.createdAt)}</div>
              </motion.div>
            ))}
            {activityLogs.length === 0 ? <div className="text-sm text-slate-600">No activity yet.</div> : null}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Active rentals</div>
            <div className="mt-1 text-xs text-slate-600">Same order as your Rentals sheet</div>
          </div>
          <Link to="/rentals" className="text-sm font-semibold text-sky-700 hover:underline">
            View all
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {stats.activeRentals.length === 0 ? (
            <div className="text-sm text-slate-600">No active rentals.</div>
          ) : null}
          {stats.activeRentals.map((r, idx) => {
            const p = products.find((x) => x.id === r.productId)
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3"
              >
                <img
                  src={p?.image}
                  alt=""
                  className="size-14 rounded-xl object-cover ring-1 ring-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate font-semibold text-slate-900">{r.productName}</div>
                    {p ? <Badge className={cn(statusBadgeClass(p.status))}>{statusLabel(p.status)}</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{r.customerName}</div>
                  <div className="mt-2 text-xs text-slate-600">
                    Due {formatDisplayDate(r.expectedReturnDate)}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}
