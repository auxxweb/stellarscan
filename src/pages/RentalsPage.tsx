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
import { ReturnContractModal } from '../components/workflows/ReturnContractModal'
import { RentalViewModal } from '../components/workflows/RentalViewModal'
import type { Product, Rental } from '../types'
import { resolveProductNameLabel } from '../utils/scannerResolve'
import {
  deriveGroupStatus,
  formatGroupedProductSummary,
  groupStatusLabel,
  isRentalLineOpen,
  contractGroupKey,
} from '../utils/rentalGrouping'

function lineMatchesQuery(r: Rental, q: string, products: Product[]): boolean {
  if (!q) return true
  const pname = resolveProductNameLabel(r.productId, r.productName, products)
  const hay = `${pname} ${r.customerName} ${r.phone} ${r.productId} ${r.id} ${r.groupId}`.toLowerCase()
  return hay.includes(q)
}

export function RentalsPage() {
  const rentals = useAppStore((s) => s.rentals)
  const products = useAppStore((s) => s.products)
  const pushToast = useToastStore((s) => s.push)

  const [returnGroupId, setReturnGroupId] = useState<string | null>(null)
  const [viewRental, setViewRental] = useState<Rental | null>(null)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'all' | 'active' | 'closed'>('all')

  const q = query.trim().toLowerCase()

  const openLines = useMemo(() => rentals.filter((r) => isRentalLineOpen(r)), [rentals])
  const returnedLines = useMemo(
    () => rentals.filter((r) => r.lineStatus === 'returned' || r.status === 'closed'),
    [rentals],
  )

  const activeGroupEntries = useMemo(() => {
    const filtered = openLines.filter((r) => lineMatchesQuery(r, q, products))
    const byGroup = new Map<string, Rental[]>()
    for (const line of filtered) {
      const gid = contractGroupKey(line)
      const arr = byGroup.get(gid) ?? []
      arr.push(line)
      byGroup.set(gid, arr)
    }
    return [...byGroup.entries()].map(([groupId, lines]) => ({
      groupId,
      openLines: lines,
      allLines: rentals.filter((r) => contractGroupKey(r) === groupId),
    }))
  }, [openLines, rentals, q, products])

  const filteredReturned = useMemo(
    () => returnedLines.filter((r) => lineMatchesQuery(r, q, products)),
    [returnedLines, q, products],
  )

  const displayedActiveGroups = useMemo(() => [...activeGroupEntries].reverse(), [activeGroupEntries])
  const displayedClosed = useMemo(() => [...filteredReturned].reverse(), [filteredReturned])

  const showActiveSection = scope !== 'closed'
  const showClosedSection = scope !== 'active'
  const hasRentals = rentals.length > 0
  const noMatches =
    hasRentals &&
    query.trim() !== '' &&
    activeGroupEntries.length === 0 &&
    filteredReturned.length === 0 &&
    scope === 'all'

  const openReturnContract = (groupId: string) => {
    const lines = rentals.filter((r) => contractGroupKey(r) === groupId && isRentalLineOpen(r))
    if (lines.length === 0) {
      pushToast('No open items on this contract.', 'error')
      return
    }
    setReturnGroupId(groupId)
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-sky-700">Contracts</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Rentals</h1>
        <p className="mt-1 text-sm text-slate-600">
          One contract can include many physical units. Latest activity first. Partial returns update contract status.
        </p>
      </div>

      <PageFiltersBar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search product, customer, phone, contract…"
        filters={
          <>
            <Filter className="size-4 shrink-0 text-slate-500 max-sm:hidden" aria-hidden />
            <select
              className="w-full min-w-[10rem] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 sm:w-auto"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
            >
              <option value="all">All rentals</option>
              <option value="active">Active & partial</option>
              <option value="closed">Returned lines</option>
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
              <div className="text-sm font-semibold text-slate-900">Active contracts</div>
              <p className="mt-1 text-xs text-slate-600">
                Scan each unit on the contract to confirm return, then enter one total bill to close.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {activeGroupEntries.length === 0 ? (
                  <div className="text-sm text-slate-600">
                    {!hasRentals
                      ? 'No rentals yet.'
                      : query.trim()
                        ? 'No matching active contracts.'
                        : 'No active contracts.'}
                  </div>
                ) : null}
                {displayedActiveGroups.map(({ groupId, openLines: lines, allLines }, idx) => {
                  const gstat = deriveGroupStatus(allLines)
                  const summary = formatGroupedProductSummary(lines, products)
                  const totalAdvance = allLines.reduce((s, l) => s + (Number(l.advanceAmount) || 0), 0)
                  const first = lines[0]!
                  return (
                    <motion.div
                      key={groupId}
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-500">Contract</div>
                          <div className="truncate font-mono text-xs text-slate-700">{groupId}</div>
                          <div className="mt-2 text-sm font-semibold leading-snug text-slate-900">{summary}</div>
                          <div className="mt-1 text-sm text-slate-700">{first.customerName}</div>
                          <div className="mt-0.5 text-xs text-slate-600">{first.phone}</div>
                        </div>
                        <Badge
                          className={cn(
                            gstat === 'active' && 'bg-emerald-100 text-emerald-900 ring-emerald-200',
                            gstat === 'partial_returned' && 'bg-amber-100 text-amber-900 ring-amber-200',
                            gstat === 'completed' && 'bg-slate-100 text-slate-800 ring-slate-200',
                          )}
                        >
                          {groupStatusLabel(gstat)}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-600">
                        <div className="flex justify-between gap-3">
                          <span>Due</span>
                          <span className="font-semibold text-slate-900">{formatDisplayDate(first.expectedReturnDate)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Advance (contract)</span>
                          <span className="font-semibold text-slate-900">{formatInr(totalAdvance)}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/80 pt-3">
                        <Button
                          type="button"
                          className="w-full sm:w-auto"
                          onClick={() => openReturnContract(groupId)}
                          leftIcon={<RotateCcw className="size-4" />}
                        >
                          Return units (scan all)
                        </Button>
                      </div>
                      <ul className="mt-3 space-y-2 border-t border-slate-200/80 pt-3">
                        {lines.map((line) => (
                          <li
                            key={line.id}
                            className="flex flex-col gap-2 rounded-xl border border-white bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {resolveProductNameLabel(line.productId, line.productName, products)}
                              </div>
                              <div className="font-mono text-[11px] text-slate-500">{line.productId}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => setViewRental(line)}
                                leftIcon={<Eye className="size-4" />}
                              >
                                View
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )
                })}
              </div>
            </GlassCard>
          ) : null}

          {showClosedSection ? (
            <GlassCard>
              <div className="text-sm font-semibold text-slate-900">Returned line items</div>
              <p className="mt-1 text-xs text-slate-600">One row per physical unit return (matches your sheet).</p>
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
                            <div className="font-mono text-[11px] text-slate-500">{r.groupId}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{r.customerName}</td>
                          <td className="px-4 py-3 text-slate-700">{formatDisplayDate(r.returnedAt ?? '')}</td>
                          <td className="px-4 py-3">
                            <Badge
                              className={cn(
                                r.returnKind === 'delayed' && 'bg-rose-100 text-rose-900 ring-rose-200',
                                r.returnKind === 'early' && 'bg-sky-100 text-sky-900 ring-sky-200',
                                r.returnKind === 'on_time' && 'bg-emerald-100 text-emerald-900 ring-emerald-200',
                              )}
                            >
                              {(r.returnKind ?? 'closed').replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatInr(r.finalBill)}</td>
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
                {filteredReturned.length === 0 ? (
                  <div className="p-4 text-sm text-slate-600">
                    {!hasRentals ? 'No history yet.' : query.trim() ? 'No matching returned lines.' : 'No returned lines yet.'}
                  </div>
                ) : null}
              </div>
            </GlassCard>
          ) : null}
        </>
      )}

      <ReturnContractModal
        open={returnGroupId !== null}
        groupId={returnGroupId ?? ''}
        onClose={() => setReturnGroupId(null)}
      />
      <RentalViewModal open={viewRental !== null} rental={viewRental} onClose={() => setViewRental(null)} />
    </div>
  )
}
