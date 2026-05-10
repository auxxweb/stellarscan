import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { useToastStore } from '../../store/useToastStore'

export function AddProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const runAction = useAppStore((s) => s.runAction)
  const loading = useAppStore((s) => s.loading)
  const pushToast = useToastStore((s) => s.push)

  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('Camera')
  const [brand, setBrand] = useState('')
  const [modelNumber, setModelNumber] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [rentalPrice, setRentalPrice] = useState('75')
  const [image, setImage] = useState('')

  const reset = () => {
    setProductName('')
    setCategory('Camera')
    setBrand('')
    setModelNumber('')
    setSerialNumber('')
    setRentalPrice('75')
    setImage('')
  }

  const onFile = async (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!productName.trim() || !brand.trim()) {
      pushToast('Product name and brand are required.', 'error')
      return
    }
    const price = Number(rentalPrice)
    if (Number.isNaN(price)) {
      pushToast('Rental price must be a number.', 'error')
      return
    }
    await runAction({
      action: 'addProduct',
      payload: {
        productName: productName.trim(),
        category: category.trim(),
        brand: brand.trim(),
        modelNumber: modelNumber.trim(),
        serialNumber: serialNumber.trim(),
        rentalPrice: price,
        image:
          image ||
          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
        status: 'available',
      },
    })
    pushToast('Product added and QR generated.', 'success')
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Add product"
      description="Creates inventory, generates a QR code, and logs the activity."
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
            Save product
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Product name
          </label>
          <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Category</label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Brand</label>
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Model number
          </label>
          <Input value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Serial number
          </label>
          <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Rental price / day
          </label>
          <Input inputMode="decimal" value={rentalPrice} onChange={(e) => setRentalPrice(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Image upload
          </label>
          <Input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
          {image ? (
            <img src={image} alt="" className="mt-2 h-28 w-full rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10" />
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
