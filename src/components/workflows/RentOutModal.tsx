import { useEffect, useState } from 'react'
import type { Product } from '../../types'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { useToastStore } from '../../store/useToastStore'
import { isoFromDateOnlyInput } from '../../utils/dates'

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

  useEffect(() => {
    if (!open) return
    const d = new Date(Date.now() + 48 * 60 * 60 * 1000)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed date input when modal opens
    setExpectedReturnDate(d.toISOString().slice(0, 10))
  }, [open])

  const reset = () => {
    setCustomerName('')
    setPhone('')
  }

  const submit = async () => {
    if (!product) return
    if (!customerName.trim() || !phone.trim()) {
      pushToast('Customer name and phone are required.', 'error')
      return
    }
    const dueIso = isoFromDateOnlyInput(expectedReturnDate)
    if (!dueIso) {
      pushToast('Please choose an expected return date.', 'error')
      return
    }
    await runAction({
      action: 'rentOut',
      payload: {
        productId: product.id,
        customerName: customerName.trim(),
        phone: phone.trim(),
        expectedReturnDate: dueIso,
        advanceAmount: 0,
        notes: '',
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
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Customer name
          </label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Phone
          </label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Expected return
          </label>
          <Input type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
