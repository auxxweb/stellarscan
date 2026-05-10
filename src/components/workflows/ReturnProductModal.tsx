import { useMemo, useState } from 'react'
import type { Product, Rental } from '../../types'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { useToastStore } from '../../store/useToastStore'
import { computeReturnKind, nowIso } from '../../utils/dates'
import { Badge } from '../ui/Badge'
import { cn } from '../../utils/cn'

export function ReturnProductModal({
  open,
  product,
  rental,
  onClose,
}: {
  open: boolean
  product: Product | null
  rental: Rental | null
  onClose: () => void
}) {
  const runAction = useAppStore((s) => s.runAction)
  const loading = useAppStore((s) => s.loading)
  const pushToast = useToastStore((s) => s.push)

  const [billAmount, setBillAmount] = useState('')

  const preview = useMemo(() => {
    if (!rental) return null
    const returnedAt = nowIso()
    const kind = computeReturnKind(rental.expectedReturnDate, returnedAt)
    const label = kind === 'delayed' ? 'Delayed' : kind === 'early' ? 'Early return' : 'On time'
    return { returnedAt, kind, label }
  }, [rental])

  const reset = () => {
    setBillAmount('')
  }

  const submit = async () => {
    if (!product || !rental || !preview) return
    const bill = Number(billAmount || 0)
    if (Number.isNaN(bill)) {
      pushToast('Bill amount must be a number.', 'error')
      return
    }
    await runAction({
      action: 'returnProduct',
      payload: {
        productId: product.id,
        rentalId: rental.id,
        finalBill: bill,
        extraCharges: 0,
        notes: '',
        returnedAt: preview.returnedAt,
        returnKind: preview.kind,
      },
    })
    pushToast(`${product.productName} returned (${preview.label}).`, 'success')
    reset()
    onClose()
  }

  return (
    <Modal
      open={open && !!product && !!rental}
      title="Close rental"
      description={product ? `${product.productName} • ${rental?.customerName ?? ''}` : undefined}
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
            Close rental
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <span className="text-xs font-semibold text-slate-600">Return timing</span>
          <Badge
            className={cn(
              preview?.kind === 'delayed' && 'bg-rose-100 text-rose-800 ring-rose-200',
              preview?.kind === 'early' && 'bg-sky-100 text-sky-900 ring-sky-200',
              preview?.kind === 'on_time' &&
                'bg-emerald-100 text-emerald-900 ring-emerald-200',
            )}
          >
            {preview?.label ?? '—'}
          </Badge>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Bill amount
          </label>
          <Input inputMode="decimal" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
