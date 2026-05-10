import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Wrench, ScanLine, Undo2, PackageCheck } from 'lucide-react'
import type { Product } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import { statusBadgeClass, statusLabel } from '../../utils/statusStyles'
import { formatDisplayDate } from '../../utils/dates'
import { cn } from '../../utils/cn'

export function ProductCard({
  product,
  index,
  onRent,
  onReturn,
  onMaintenance,
  onMaintenanceComplete,
  onScan,
}: {
  product: Product
  index: number
  onRent: (p: Product) => void
  onReturn: (p: Product) => void
  onMaintenance: (p: Product) => void
  onMaintenanceComplete: (p: Product) => void
  onScan: (p: Product) => void
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <GlassCard className="group relative overflow-hidden p-0">
        <div className="relative h-40 w-full overflow-hidden">
          <img src={product.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
          <div className="absolute left-3 top-3">
            <Badge className={cn('backdrop-blur', statusBadgeClass(product.status))}>{statusLabel(product.status)}</Badge>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">{product.productName}</div>
              <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                {product.brand} • {product.category}
              </div>
            </div>
            <div className="shrink-0 rounded-xl bg-white p-2 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-white/10">
              <QRCodeSVG value={product.qrCode} size={56} fgColor="#0f172a" bgColor="transparent" />
            </div>
          </div>

          {product.status === 'rented' ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-white/5">
              <div className="font-semibold text-slate-800 dark:text-slate-100">{product.currentCustomer}</div>
              <div className="mt-1 text-slate-600 dark:text-slate-400">{product.phone}</div>
              <div className="mt-2 text-slate-600 dark:text-slate-400">
                Return by <span className="font-semibold text-slate-900 dark:text-slate-100">{formatDisplayDate(product.expectedReturnDate)}</span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>${product.rentalPrice}/day</span>
            <span>Updated {formatDisplayDate(product.lastUpdated)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {product.status === 'available' ? (
              <>
                <Button type="button" className="w-full sm:w-auto" onClick={() => onRent(product)} leftIcon={<PackageCheck className="size-4" />}>
                  Rent out
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => onMaintenance(product)}
                  leftIcon={<Wrench className="size-4" />}
                >
                  Maintenance
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="col-span-2 w-full sm:col-span-1 sm:w-auto"
                  onClick={() => onScan(product)}
                  leftIcon={<ScanLine className="size-4" />}
                >
                  Scan QR
                </Button>
              </>
            ) : null}

            {product.status === 'rented' ? (
              <>
                <Button type="button" className="w-full sm:w-auto" onClick={() => onReturn(product)} leftIcon={<Undo2 className="size-4" />}>
                  Return
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => onScan(product)}
                  leftIcon={<ScanLine className="size-4" />}
                >
                  Scan QR
                </Button>
              </>
            ) : null}

            {product.status === 'maintenance' ? (
              <>
                <Button type="button" className="w-full sm:w-auto" onClick={() => onMaintenanceComplete(product)} leftIcon={<Wrench className="size-4" />}>
                  Mark completed
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => onScan(product)}
                  leftIcon={<ScanLine className="size-4" />}
                >
                  Scan QR
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}
