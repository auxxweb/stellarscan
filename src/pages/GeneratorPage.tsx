import { useMemo, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, Download } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'

export function GeneratorPage() {
  const products = useAppStore((s) => s.products)
  const printRef = useRef<HTMLDivElement>(null)

  const sorted = useMemo(() => products.slice().sort((a, b) => a.productName.localeCompare(b.productName)), [products])

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
          <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">Print room</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">QR generator</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Sticker-ready codes with clear product labels.</p>
        </div>
        <Button
          type="button"
          onClick={() => window.print()}
          leftIcon={<Printer className="size-4" />}
          variant="secondary"
        >
          Print all
        </Button>
      </div>

      <div ref={printRef} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
        {sorted.map((p) => (
          <GlassCard key={p.id} className="flex flex-col items-center text-center">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-white/10">
              <QRCodeSVG id={`qr-${p.id}`} value={p.qrCode} size={200} />
            </div>
            <div className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-50">{p.productName}</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {p.brand} • {p.category}
            </div>
            <div className="mt-2 font-mono text-xs text-slate-700 dark:text-slate-300">{p.qrCode}</div>
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
        ))}
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
