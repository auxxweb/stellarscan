import type { Rental } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { formatDisplayDate } from '../../utils/dates'
import { formatInr } from '../../utils/money'
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
          <dt className="text-slate-600">Status</dt>
          <dd>
            <Badge
              className={cn(
                rental.status === 'active' &&
                  'bg-emerald-100 text-emerald-900 ring-emerald-200',
                rental.status === 'closed' &&
                  'bg-slate-100 text-slate-800 ring-slate-200',
              )}
            >
              {rental.status === 'active' ? 'Active' : 'Closed'}
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
        {rental.status === 'closed' ? (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Returned</dt>
              <dd className="text-slate-800">{formatDisplayDate(rental.returnedAt ?? '')}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Return timing</dt>
              <dd className="capitalize text-slate-800">
                {(rental.returnKind ?? '—').replaceAll('_', ' ')}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Final bill</dt>
              <dd className="font-semibold text-slate-900">{formatInr(rental.finalBill)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Extra charges</dt>
              <dd className="text-slate-800">{formatInr(rental.extraCharges)}</dd>
            </div>
          </>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Advance</dt>
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
