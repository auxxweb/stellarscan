import { QRCodeSVG } from 'qrcode.react'
import { Undo2, Wrench, PackageCheck } from 'lucide-react'
import type { Product } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { statusBadgeClass, statusLabel } from '../../utils/statusStyles'
import { formatDisplayDate } from '../../utils/dates'
import { cn } from '../../utils/cn'
import { deriveStellarQrCodeFromProductId } from '../../utils/qrCode'
import { formatInr } from '../../utils/money'

export function ProductTable({
  products,
  onRent,
  onReturn,
  onMaintenance,
  onMaintenanceComplete,
}: {
  products: Product[]
  onRent: (p: Product) => void
  onReturn: (p: Product) => void
  onMaintenance: (p: Product) => void
  onMaintenanceComplete: (p: Product) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">QR</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Return</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt="" className="size-10 rounded-lg object-cover ring-1 ring-slate-200" />
                    <div>
                      <div className="font-semibold text-slate-900">{p.productName}</div>
                      <div className="text-xs text-slate-600">
                        {p.brand} • {p.category}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="inline-flex rounded-lg bg-white p-1 ring-1 ring-slate-200">
                    <QRCodeSVG value={deriveStellarQrCodeFromProductId(p.id)} size={44} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={cn(statusBadgeClass(p.status))}>{statusLabel(p.status)}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {p.status === 'rented' ? (
                    <div>
                      <div className="font-medium">{p.currentCustomer}</div>
                      <div className="text-xs text-slate-600">{p.phone}</div>
                    </div>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {p.status === 'rented' ? formatDisplayDate(p.expectedReturnDate) : '—'}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">{formatInr(p.rentalPrice)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {p.status === 'available' ? (
                      <>
                        <Button type="button" className="!px-3 !py-2" onClick={() => onRent(p)} leftIcon={<PackageCheck className="size-4" />}>
                          Mark rental
                        </Button>
                        <Button type="button" variant="secondary" className="!px-3 !py-2" onClick={() => onMaintenance(p)} leftIcon={<Wrench className="size-4" />}>
                          Mark maint.
                        </Button>
                      </>
                    ) : null}
                    {p.status === 'rented' ? (
                      <>
                        <Button type="button" className="!px-3 !py-2" onClick={() => onReturn(p)} leftIcon={<Undo2 className="size-4" />}>
                          Close rental
                        </Button>
                      </>
                    ) : null}
                    {p.status === 'maintenance' ? (
                      <>
                        <Button type="button" className="!px-3 !py-2" onClick={() => onMaintenanceComplete(p)} leftIcon={<Wrench className="size-4" />}>
                          Complete maint.
                        </Button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
