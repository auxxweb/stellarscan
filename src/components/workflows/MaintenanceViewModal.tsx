import type { MaintenanceRecord } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { formatDisplayDate } from '../../utils/dates'
import { formatInr } from '../../utils/money'
import { Badge } from '../ui/Badge'
import { cn } from '../../utils/cn'

export function MaintenanceViewModal({
  open,
  record,
  onClose,
}: {
  open: boolean
  record: MaintenanceRecord | null
  onClose: () => void
}) {
  return (
    <Modal
      open={open && !!record}
      title="Maintenance details"
      description={record?.productName}
      onClose={onClose}
      size="md"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {record ? (
      <dl className="grid gap-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Status</dt>
          <dd>
            <Badge
              className={cn(
                record.status === 'open' &&
                  'bg-amber-100 text-amber-950 ring-amber-200',
                record.status === 'closed' &&
                  'bg-emerald-100 text-emerald-900 ring-emerald-200',
              )}
            >
              {record.status === 'open' ? 'Open' : 'Closed'}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-slate-600">Issue</dt>
          <dd className="mt-1 font-medium text-slate-900">{record.issue}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Given to</dt>
          <dd className="text-slate-800">{record.givenTo}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">ETA</dt>
          <dd className="text-slate-800">{formatDisplayDate(record.estimatedCompletion)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Opened</dt>
          <dd className="text-slate-800">{formatDisplayDate(record.createdAt)}</dd>
        </div>
        {record.status === 'closed' ? (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Completed</dt>
              <dd className="text-slate-800">{formatDisplayDate(record.completedAt ?? '')}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Repair cost</dt>
              <dd className="font-semibold text-slate-900">{formatInr(record.repairCost)}</dd>
            </div>
          </>
        ) : null}
        {record.notes ? (
          <div>
            <dt className="text-slate-600">Notes</dt>
            <dd className="mt-1 text-slate-800">{record.notes}</dd>
          </div>
        ) : null}
      </dl>
      ) : null}
    </Modal>
  )
}
