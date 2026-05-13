import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Grid3x3, List, Plus, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { ProductCard } from '../components/products/ProductCard'
import { ProductTable } from '../components/products/ProductTable'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { GlassCard } from '../components/ui/GlassCard'
import { AddProductModal } from '../components/workflows/AddProductModal'
import { RentOutModal } from '../components/workflows/RentOutModal'
import { ReturnContractModal } from '../components/workflows/ReturnContractModal'
import { MaintenanceStartModal } from '../components/workflows/MaintenanceStartModal'
import { MaintenanceCompleteModal } from '../components/workflows/MaintenanceCompleteModal'
import { useAppStore } from '../store/useAppStore'
import { useToastStore } from '../store/useToastStore'
import { contractGroupKey, findOpenContractLinesForProduct } from '../utils/rentalGrouping'
import { findOpenMaintenanceForProduct } from '../utils/scannerResolve'
import type { Product } from '../types'
import type { ProductStatus } from '../types'
import { deriveStellarQrCodeFromProductId } from '../utils/qrCode'
import { productRowReactKey } from '../utils/listKeys'

export function ProductsPage() {
  const products = useAppStore((s) => s.products)
  const rentals = useAppStore((s) => s.rentals)
  const maintenance = useAppStore((s) => s.maintenance)
  const navigate = useNavigate()
  const pushToast = useToastStore((s) => s.push)

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ProductStatus | 'all'>('all')
  const [category, setCategory] = useState<string>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const [addOpen, setAddOpen] = useState(false)
  const [rentProduct, setRentProduct] = useState<Product | null>(null)
  const [returnGroupId, setReturnGroupId] = useState<string | null>(null)
  const [maintProduct, setMaintProduct] = useState<Product | null>(null)
  const [completeProduct, setCompleteProduct] = useState<Product | null>(null)

  const openMaint = useMemo(() => {
    if (!completeProduct) return null
    return findOpenMaintenanceForProduct(maintenance, completeProduct.id)
  }, [maintenance, completeProduct])

  const requestReturn = (p: Product) => {
    const lines = findOpenContractLinesForProduct(rentals, p.id)
    if (lines.length === 0) {
      pushToast('No active rental found for this product. Check the Rentals sheet (product id).', 'error')
      return
    }
    setReturnGroupId(contractGroupKey(lines[0]!))
  }

  const requestMaintenanceComplete = (p: Product) => {
    if (!findOpenMaintenanceForProduct(maintenance, p.id)) {
      pushToast('No open maintenance ticket for this product. Check the Maintenance sheet.', 'error')
      return
    }
    setCompleteProduct(p)
  }

  const categories = useMemo(() => {
    const s = new Set(products.map((p) => p.category).filter(Boolean))
    return ['all', ...Array.from(s).sort()]
  }, [products])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (status !== 'all' && p.status !== status) return false
      if (category !== 'all' && p.category !== category) return false
      if (!q) return true
      const hay = `${p.productName} ${p.brand} ${p.modelNumber} ${p.serialNumber} ${p.qrCode} ${deriveStellarQrCodeFromProductId(p.id)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [products, query, status, category])

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-sky-700">Inventory</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Products</h1>
          <p className="mt-1 break-words text-sm text-slate-600">
            Search, filter, and run rentals. List order matches your Products sheet (top to bottom).
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" onClick={() => setAddOpen(true)} leftIcon={<Plus className="size-4" />}>
            Add product
          </Button>
        </div>
      </div>

      <GlassCard className="!p-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 w-full lg:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              className="!pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, brand, model, serial, QR…"
            />
          </div>

          <div className="flex min-w-0 w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:w-auto">
              <Filter className="hidden size-4 shrink-0 text-slate-500 sm:block" aria-hidden />
              <select
                className="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 sm:max-w-[11rem] sm:flex-1"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus | 'all')}
              >
                <option value="all">All statuses</option>
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <select
                className="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 sm:max-w-[14rem] sm:flex-1"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All categories' : c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button
                type="button"
                variant={view === 'grid' ? 'primary' : 'secondary'}
                className="!px-3"
                onClick={() => setView('grid')}
                aria-label="Grid view"
              >
                <Grid3x3 className="size-4" />
              </Button>
              <Button
                type="button"
                variant={view === 'list' ? 'primary' : 'secondary'}
                className="!px-3"
                onClick={() => setView('list')}
                aria-label="List view"
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      {filtered.length === 0 ? (
        <GlassCard>
          <div className="text-sm font-semibold text-slate-900">
            {products.length === 0 ? 'No products loaded' : 'No matches'}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {products.length === 0
              ? 'Data comes from your Google Sheet. Confirm the Apps Script URL in Settings, then Save & refresh. If you were offline, reconnect and reload.'
              : 'Try clearing filters or adding a new product.'}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setAddOpen(true)} leftIcon={<Plus className="size-4" />}>
              Add product
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/settings')}>
              Settings
            </Button>
          </div>
        </GlassCard>
      ) : view === 'grid' ? (
        <motion.div layout className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, idx) => (
            <ProductCard
              key={productRowReactKey(p, idx)}
              product={p}
              index={idx}
              onRent={(x) => setRentProduct(x)}
              onReturn={(x) => requestReturn(x)}
              onMaintenance={(x) => setMaintProduct(x)}
              onMaintenanceComplete={(x) => requestMaintenanceComplete(x)}
            />
          ))}
        </motion.div>
      ) : (
        <ProductTable
          products={filtered}
          onRent={(x) => setRentProduct(x)}
          onReturn={(x) => requestReturn(x)}
          onMaintenance={(x) => setMaintProduct(x)}
          onMaintenanceComplete={(x) => requestMaintenanceComplete(x)}
        />
      )}

      <AddProductModal open={addOpen} onClose={() => setAddOpen(false)} />
      <RentOutModal open={!!rentProduct} initialProducts={rentProduct ? [rentProduct] : []} onClose={() => setRentProduct(null)} />
      <ReturnContractModal
        open={returnGroupId !== null}
        groupId={returnGroupId ?? ''}
        onClose={() => setReturnGroupId(null)}
      />
      <MaintenanceStartModal open={!!maintProduct} product={maintProduct} onClose={() => setMaintProduct(null)} />
      <MaintenanceCompleteModal
        open={!!completeProduct}
        product={completeProduct}
        record={openMaint ?? null}
        onClose={() => setCompleteProduct(null)}
      />
    </div>
  )
}
