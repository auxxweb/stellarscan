import { useMemo } from 'react'
import type { Rental } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { formatDisplayDate } from '../../utils/dates'
import { formatInr } from '../../utils/money'
import { Badge } from '../ui/Badge'
import { cn } from '../../utils/cn'
import { useAppStore } from '../../store/useAppStore'
import {
  deriveGroupStatus,
  formatGroupedProductSummary,
  groupStatusLabel,
  isRentalLineOpen,
} from '../../utils/rentalGrouping'
import { resolveProductNameLabel } from '../../utils/scannerResolve'

export function RentalViewModal({
  open,
  rental,
  onClose,
}: {
  open: boolean
  rental: Rental | null
  onClose: () => void
}) {
  const rentals = useAppStore((s) => s.rentals)
  const products = useAppStore((s) => s.products)

  const contract = useMemo(() => {
    if (!rental) return null
    const gid = rental.groupId || rental.id
    const lines = rentals.filter((r) => (r.groupId || r.id) === gid).sort((a, b) => a.rentedAt.localeCompare(b.rentedAt))
    return { groupId: gid, lines, groupStatus: deriveGroupStatus(lines) }
  }, [rental, rentals])

  const openSummary =
    rental && contract
      ? formatGroupedProductSummary(
          contract.lines.filter((l) => isRentalLineOpen(l)),
          products,
        )
      : ''
  const fullSummary = rental && contract ? formatGroupedProductSummary(contract.lines, products) : ''

  return (
    <Modal
      open={open && !!rental}
      title="Rental details"
      description={
        rental ? resolveProductNameLabel(rental.productId, rental.productName, products) : undefined
      }
      onClose={onClose}
      size="md"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {rental && contract ? (
      <dl className="grid gap-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Contract</dt>
          <dd className="max-w-[60%] truncate text-right font-mono text-xs text-slate-800">{contract.groupId}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Contract status</dt>
          <dd>
            <Badge
              className={cn(
                contract.groupStatus === 'active' && 'bg-emerald-100 text-emerald-900 ring-emerald-200',
                contract.groupStatus === 'partial_returned' && 'bg-amber-100 text-amber-900 ring-amber-200',
                contract.groupStatus === 'completed' && 'bg-slate-100 text-slate-800 ring-slate-200',
              )}
            >
              {groupStatusLabel(contract.groupStatus)}
            </Badge>
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="text-xs font-semibold text-slate-600">Line items</div>
          <div className="mt-1 text-sm text-slate-800">{fullSummary}</div>
          {contract.lines.some((l) => !isRentalLineOpen(l)) ? (
            <div className="mt-2 text-xs text-slate-600">Still out: {openSummary || '—'}</div>
          ) : null}
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">This line</dt>
          <dd>
            <Badge
              className={cn(
                rental.lineStatus === 'open' && rental.status === 'active' && 'bg-sky-100 text-sky-900 ring-sky-200',
                (rental.lineStatus === 'returned' || rental.status === 'closed') &&
                  'bg-slate-100 text-slate-800 ring-slate-200',
              )}
            >
              {rental.lineStatus === 'open' && rental.status === 'active' ? 'Out' : 'Returned'}
            </Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Customer</dt>
          <dd className="font-semibold text-slate-900">{rental.customerName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Phone</dt>
          <dd className="text-slate-800">{rental.phone || '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Rented</dt>
          <dd className="text-slate-800">{formatDisplayDate(rental.rentedAt)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Due</dt>
          <dd className="text-slate-800">{formatDisplayDate(rental.expectedReturnDate)}</dd>
        </div>
        {rental.lineStatus === 'returned' || rental.status === 'closed' ? (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Returned</dt>
              <dd className="text-slate-800">{formatDisplayDate(rental.returnedAt ?? '')}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Return timing</dt>
              <dd className="capitalize text-slate-800">{(rental.returnKind ?? '—').replaceAll('_', ' ')}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Bill amount</dt>
              <dd className="font-semibold text-slate-900">{formatInr(rental.finalBill)}</dd>
            </div>
          </>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Advance (this row)</dt>
          <dd className="text-slate-800">{formatInr(rental.advanceAmount)}</dd>
        </div>
        {rental.notes ? (
          <div>
            <dt className="text-slate-600">Notes</dt>
            <dd className="mt-1 text-slate-800">{rental.notes}</dd>
          </div>
        ) : null}
      </dl>
      ) : null}
    </Modal>
  )
}
