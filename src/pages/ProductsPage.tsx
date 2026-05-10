import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Grid3x3, List, Plus, ScanLine, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { ProductCard } from '../components/products/ProductCard'
import { ProductTable } from '../components/products/ProductTable'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { GlassCard } from '../components/ui/GlassCard'
import { AddProductModal } from '../components/workflows/AddProductModal'
import { RentOutModal } from '../components/workflows/RentOutModal'
import { ReturnProductModal } from '../components/workflows/ReturnProductModal'
import { MaintenanceStartModal } from '../components/workflows/MaintenanceStartModal'
import { MaintenanceCompleteModal } from '../components/workflows/MaintenanceCompleteModal'
import { useAppStore } from '../store/useAppStore'
import { useToastStore } from '../store/useToastStore'
import type { Product } from '../types'
import type { ProductStatus } from '../types'

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
  const [returnProduct, setReturnProduct] = useState<Product | null>(null)
  const [maintProduct, setMaintProduct] = useState<Product | null>(null)
  const [completeProduct, setCompleteProduct] = useState<Product | null>(null)

  const activeRental = useMemo(() => {
    if (!returnProduct) return null
    return rentals.find((r) => r.productId === returnProduct.id && r.status === 'active') ?? null
  }, [rentals, returnProduct])

  const openMaint = useMemo(() => {
    if (!completeProduct) return null
    return maintenance.find((m) => m.productId === completeProduct.id && m.status === 'open') ?? null
  }, [maintenance, completeProduct])

  const requestReturn = (p: Product) => {
    const r = rentals.find((x) => x.productId === p.id && x.status === 'active')
    if (!r) {
      pushToast('No active rental found for this product.', 'error')
      return
    }
    setReturnProduct(p)
  }

  const requestMaintenanceComplete = (p: Product) => {
    const m = maintenance.find((x) => x.productId === p.id && x.status === 'open')
    if (!m) {
      pushToast('No open maintenance ticket found for this product.', 'error')
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
      const hay = `${p.productName} ${p.brand} ${p.modelNumber} ${p.serialNumber} ${p.qrCode}`.toLowerCase()
      return hay.includes(q)
    })
  }, [products, query, status, category])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">Inventory</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Products</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Search, filter, and run rentals without friction.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/scanner')} leftIcon={<ScanLine className="size-4" />}>
            Open scanner
          </Button>
          <Button type="button" onClick={() => setAddOpen(true)} leftIcon={<Plus className="size-4" />}>
            Add product
          </Button>
        </div>
      </div>

      <GlassCard className="!p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input className="!pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, brand, model, serial, QR…" />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-slate-500" />
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus | 'all')}
              >
                <option value="all">All statuses</option>
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
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

            <div className="flex items-center justify-end gap-2">
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
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">No matches</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Try clearing filters or adding a new product.</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setAddOpen(true)} leftIcon={<Plus className="size-4" />}>
              Add product
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/scanner')} leftIcon={<ScanLine className="size-4" />}>
              Scan QR
            </Button>
          </div>
        </GlassCard>
      ) : view === 'grid' ? (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, idx) => (
            <ProductCard
              key={p.id}
              product={p}
              index={idx}
              onRent={(x) => setRentProduct(x)}
              onReturn={(x) => requestReturn(x)}
              onMaintenance={(x) => setMaintProduct(x)}
              onMaintenanceComplete={(x) => requestMaintenanceComplete(x)}
              onScan={() => navigate('/scanner')}
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
          onScan={() => navigate('/scanner')}
        />
      )}

      <AddProductModal open={addOpen} onClose={() => setAddOpen(false)} />
      <RentOutModal open={!!rentProduct} product={rentProduct} onClose={() => setRentProduct(null)} />
      <ReturnProductModal
        open={!!returnProduct}
        product={returnProduct}
        rental={activeRental ?? null}
        onClose={() => setReturnProduct(null)}
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
