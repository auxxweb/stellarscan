import { useState } from 'react'
import type { MaintenanceRecord, Product } from '../../types'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { useToastStore } from '../../store/useToastStore'

export function MaintenanceCompleteModal({
  open,
  product,
  record,
  onClose,
}: {
  open: boolean
  product: Product | null
  record: MaintenanceRecord | null
  onClose: () => void
}) {
  const runAction = useAppStore((s) => s.runAction)
  const loading = useAppStore((s) => s.loading)
  const pushToast = useToastStore((s) => s.push)

  const [repairCost, setRepairCost] = useState('0')

  const reset = () => {
    setRepairCost('0')
  }

  const submit = async () => {
    if (!product || !record) return
    await runAction({
      action: 'completeMaintenance',
      payload: {
        productId: product.id,
        maintenanceId: record.id,
        repairCost: Number(repairCost || 0),
        notes: '',
      },
    })
    pushToast(`${product.productName} is available again.`, 'success')
    reset()
    onClose()
  }

  return (
    <Modal
      open={open && !!product && !!record}
      title="Complete maintenance"
      description={product ? `${product.productName} • ${record?.issue ?? ''}` : undefined}
      onClose={() => {
        reset()
        onClose()
      }}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} loading={loading}>
            Mark completed
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Repair cost
          </label>
          <Input inputMode="decimal" value={repairCost} onChange={(e) => setRepairCost(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
