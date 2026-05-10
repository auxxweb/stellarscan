import { useEffect, useState } from 'react'
import type { Product } from '../../types'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { useToastStore } from '../../store/useToastStore'

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
  const [issue, setIssue] = useState('')
  const [estimatedCompletion, setEstimatedCompletion] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    d.setHours(18, 0, 0, 0)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed datetime-local when modal opens
    setEstimatedCompletion(d.toISOString().slice(0, 16))
  }, [open])

  const reset = () => {
    setGivenTo('Stellar Service Desk')
    setIssue('')
    setNotes('')
  }

  const submit = async () => {
    if (!product) return
    if (!issue.trim()) {
      pushToast('Please describe the issue.', 'error')
      return
    }
    await runAction({
      action: 'sendToMaintenance',
      payload: {
        productId: product.id,
        givenTo: givenTo.trim(),
        issue: issue.trim(),
        estimatedCompletion: new Date(estimatedCompletion).toISOString(),
        notes: notes.trim(),
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
            Issue description
          </label>
          <Textarea value={issue} onChange={(e) => setIssue(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Estimated completion
          </label>
          <Input
            type="datetime-local"
            value={estimatedCompletion}
            onChange={(e) => setEstimatedCompletion(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
