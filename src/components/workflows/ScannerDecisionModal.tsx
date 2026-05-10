import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { Product } from '../../types'

export function ScannerDecisionModal({
  open,
  product,
  onClose,
  onRent,
  onMaintenance,
}: {
  open: boolean
  product: Product | null
  onClose: () => void
  onRent: (p: Product) => void
  onMaintenance: (p: Product) => void
}) {
  return (
    <Modal
      open={open && !!product}
      title="Choose an action"
      description={product ? `${product.productName} is available` : undefined}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!product) return
              onMaintenance(product)
              onClose()
            }}
          >
            Maintenance
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!product) return
              onRent(product)
              onClose()
            }}
          >
            Rent out
          </Button>
        </>
      }
    />
  )
}
