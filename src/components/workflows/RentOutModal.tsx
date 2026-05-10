import { useEffect, useState } from 'react'
import type { Product } from '../../types'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { useToastStore } from '../../store/useToastStore'

export function RentOutModal({
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

  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [advanceAmount, setAdvanceAmount] = useState('150')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    const d = new Date(Date.now() + 48 * 60 * 60 * 1000)
    d.setMinutes(0, 0, 0)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed datetime-local when modal opens
    setExpectedReturnDate(d.toISOString().slice(0, 16))
  }, [open])

  const reset = () => {
    setCustomerName('')
    setPhone('')
    setAdvanceAmount('150')
    setNotes('')
  }

  const submit = async () => {
    if (!product) return
    if (!customerName.trim() || !phone.trim()) {
      pushToast('Customer name and phone are required.', 'error')
      return
    }
    await runAction({
      action: 'rentOut',
      payload: {
        productId: product.id,
        customerName: customerName.trim(),
        phone: phone.trim(),
        expectedReturnDate: new Date(expectedReturnDate).toISOString(),
        advanceAmount: Number(advanceAmount || 0),
        notes: notes.trim(),
      },
    })
    pushToast(`${product.productName} rented successfully.`, 'success')
    reset()
    onClose()
  }

  return (
    <Modal
      open={open && !!product}
      title="Rent out"
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
            Confirm rental
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Customer name
          </label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Phone
          </label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Expected return
          </label>
          <Input
            type="datetime-local"
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Advance amount
          </label>
          <Input
            inputMode="decimal"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Notes
          </label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
