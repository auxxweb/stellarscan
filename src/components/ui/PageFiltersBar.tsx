import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { GlassCard } from './GlassCard'
import { Input } from './Input'

export function PageFiltersBar({
  query,
  onQueryChange,
  searchPlaceholder,
  filters,
}: {
  query: string
  onQueryChange: (value: string) => void
  searchPlaceholder: string
  filters?: ReactNode
}) {
  return (
    <GlassCard className="!p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            className="!pl-10"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
        {filters ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{filters}</div>
        ) : null}
      </div>
    </GlassCard>
  )
}
