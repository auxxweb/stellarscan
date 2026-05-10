import { useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, Download } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'
import { deriveStellarQrCodeFromProductId } from '../utils/qrCode'

export function GeneratorPage() {
  const navigate = useNavigate()
  const products = useAppStore((s) => s.products)
  const printRef = useRef<HTMLDivElement>(null)

  /** Same order as the Products sheet (top row → first in list). */
  const inSheetOrder = useMemo(() => products.slice(), [products])
  const empty = inSheetOrder.length === 0

  const downloadSvg = (productName: string, svg: SVGSVGElement | null) => {
    if (!svg) return
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${productName.replace(/[^\w-]+/g, '_')}-qr.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-sky-700">Print room</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">QR generator</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sticker-ready codes with clear labels. Same order as your Products sheet.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => window.print()}
          leftIcon={<Printer className="size-4" />}
          variant="secondary"
          disabled={empty}
        >
          Print all
        </Button>
      </div>

      {empty ? (
        <GlassCard>
          <div className="text-sm font-semibold text-slate-900">No products to print</div>
          <p className="mt-2 text-sm text-slate-600">
            QR codes are built from your inventory. Load data from your Google Sheet (Settings → Save &amp; refresh), or add products on the{' '}
            <Link to="/products" className="font-semibold text-sky-600 underline-offset-2 hover:underline">
              Products
            </Link>{' '}
            page.
          </p>
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={() => navigate('/settings')}>
              Open Settings
            </Button>
          </div>
        </GlassCard>
      ) : null}

      <div ref={printRef} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
        {inSheetOrder.map((p) => {
          const scanPayload = deriveStellarQrCodeFromProductId(p.id)
          return (
          <GlassCard key={p.id} className="flex flex-col items-center text-center">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <QRCodeSVG
                id={`qr-${p.id}`}
                value={scanPayload}
                size={200}
                level="M"
                fgColor="#0f172a"
                bgColor="#ffffff"
                title={`QR for ${p.productName}`}
              />
            </div>
            <div className="mt-3 text-sm font-bold text-slate-900">{p.productName}</div>
            <div className="mt-1 text-xs text-slate-600">
              {p.brand} • {p.category}
            </div>
            <div className="mt-2 font-mono text-xs text-slate-700">{scanPayload}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-2 print:hidden">
              <Button
                type="button"
                variant="outline"
                className="!px-3 !py-2"
                onClick={() => downloadSvg(p.productName, document.querySelector(`#qr-${p.id}`))}
                leftIcon={<Download className="size-4" />}
              >
                Download
              </Button>
            </div>
          </GlassCard>
          )
        })}
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          header, nav, aside, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}
