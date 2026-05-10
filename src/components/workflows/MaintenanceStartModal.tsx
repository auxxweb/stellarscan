import { useEffect, useState } from 'react'
import type { Product } from '../../types'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { useToastStore } from '../../store/useToastStore'
import { isoFromDateOnlyInput } from '../../utils/dates'

/** Sent to the API when the issue description field is hidden in the UI. */
const DEFAULT_MAINTENANCE_ISSUE = 'Maintenance service'

export function MaintenanceStartModal({
  open,
  product,
  onClose,
}: {
  open: boolean
  product: Product | null
  onClose: () => void
}) {
  const runAction = useAppStore((s) => s.runAction)
  const loading = useAppStore((s) => s.loading)
  const pushToast = useToastStore((s) => s.push)

  const [givenTo, setGivenTo] = useState('Stellar Service Desk')
  const [estimatedCompletion, setEstimatedCompletion] = useState('')

  useEffect(() => {
    if (!open) return
    const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed date input when modal opens
    setEstimatedCompletion(d.toISOString().slice(0, 10))
  }, [open])

  const reset = () => {
    setGivenTo('Stellar Service Desk')
  }

  const submit = async () => {
    if (!product) return
    const given = givenTo.trim()
    if (!given) {
      pushToast('Given to is required.', 'error')
      return
    }
    const etaIso = isoFromDateOnlyInput(estimatedCompletion)
    if (!etaIso) {
      pushToast('Please choose an estimated completion date.', 'error')
      return
    }
    await runAction({
      action: 'sendToMaintenance',
      payload: {
        productId: product.id,
        givenTo: given,
        issue: DEFAULT_MAINTENANCE_ISSUE,
        estimatedCompletion: etaIso,
        notes: '',
      },
    })
    pushToast(`${product.productName} moved to maintenance.`, 'success')
    reset()
    onClose()
  }

  return (
    <Modal
      open={open && !!product}
      title="Send to maintenance"
      description={product ? product.productName : undefined}
      onClose={() => {
        reset()
        onClose()
      }}
      size="lg"
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
            Open ticket
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Given to</label>
          <Input value={givenTo} onChange={(e) => setGivenTo(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Estimated completion
          </label>
          <Input type="date" value={estimatedCompletion} onChange={(e) => setEstimatedCompletion(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
