import type { Rental } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { formatDisplayDate } from '../../utils/dates'
import { Badge } from '../ui/Badge'
import { cn } from '../../utils/cn'

export function RentalViewModal({
  open,
  rental,
  onClose,
}: {
  open: boolean
  rental: Rental | null
  onClose: () => void
}) {
  return (
    <Modal
      open={open && !!rental}
      title="Rental details"
      description={rental?.productName}
      onClose={onClose}
      size="md"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {rental ? (
      <dl className="grid gap-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600 dark:text-slate-400">Status</dt>
          <dd>
            <Badge
              className={cn(
                rental.status === 'active' &&
                  'bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200',
                rental.status === 'closed' &&
                  'bg-slate-100 text-slate-800 ring-slate-200 dark:bg-white/10 dark:text-slate-200',
              )}
            >
              {rental.status === 'active' ? 'Active' : 'Closed'}
            </Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600 dark:text-slate-400">Customer</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-50">{rental.customerName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600 dark:text-slate-400">Phone</dt>
          <dd className="text-slate-800 dark:text-slate-200">{rental.phone || '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600 dark:text-slate-400">Rented</dt>
          <dd className="text-slate-800 dark:text-slate-200">{formatDisplayDate(rental.rentedAt)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600 dark:text-slate-400">Due</dt>
          <dd className="text-slate-800 dark:text-slate-200">{formatDisplayDate(rental.expectedReturnDate)}</dd>
        </div>
        {rental.status === 'closed' ? (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600 dark:text-slate-400">Returned</dt>
              <dd className="text-slate-800 dark:text-slate-200">{formatDisplayDate(rental.returnedAt ?? '')}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600 dark:text-slate-400">Return timing</dt>
              <dd className="capitalize text-slate-800 dark:text-slate-200">
                {(rental.returnKind ?? '—').replaceAll('_', ' ')}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600 dark:text-slate-400">Final bill</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-50">${rental.finalBill ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600 dark:text-slate-400">Extra charges</dt>
              <dd className="text-slate-800 dark:text-slate-200">${rental.extraCharges ?? 0}</dd>
            </div>
          </>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600 dark:text-slate-400">Advance</dt>
          <dd className="text-slate-800 dark:text-slate-200">${rental.advanceAmount}</dd>
        </div>
        {rental.notes ? (
          <div>
            <dt className="text-slate-600 dark:text-slate-400">Notes</dt>
            <dd className="mt-1 text-slate-800 dark:text-slate-200">{rental.notes}</dd>
          </div>
        ) : null}
      </dl>
      ) : null}
    </Modal>
  )
}
