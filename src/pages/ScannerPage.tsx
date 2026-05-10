import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { motion } from 'framer-motion'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { useProductScannerFlow } from '../hooks/useProductScannerFlow'
import type { Product } from '../types'
import { ScannerDecisionModal } from '../components/workflows/ScannerDecisionModal'
import { RentOutModal } from '../components/workflows/RentOutModal'
import { ReturnProductModal } from '../components/workflows/ReturnProductModal'
import { MaintenanceStartModal } from '../components/workflows/MaintenanceStartModal'
import { MaintenanceCompleteModal } from '../components/workflows/MaintenanceCompleteModal'
import { useAppStore } from '../store/useAppStore'
import { useToastStore } from '../store/useToastStore'
import { playScanSuccessSound, vibrateSuccess } from '../utils/sound'

function sanitizeDomId(raw: string): string {
  return `stellar-qr-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

async function pickPreferredCamera(): Promise<string | MediaTrackConstraints> {
  try {
    const cameras = await Html5Qrcode.getCameras()
    if (cameras.length === 0) {
      return { facingMode: 'environment' }
    }
    const back = cameras.find((c) => /back|rear|environment|wide/i.test(c.label))
    return back?.id ?? cameras[0]!.id
  } catch {
    return { facingMode: 'environment' }
  }
}

export function ScannerPage() {
  const rentals = useAppStore((s) => s.rentals)
  const maintenance = useAppStore((s) => s.maintenance)

  const readerDomId = sanitizeDomId(useId())

  const [running, setRunning] = useState(false)
  const [last, setLast] = useState<string | null>(null)
  const instanceRef = useRef<Html5Qrcode | null>(null)
  const startingRef = useRef(false)

  const [decisionProduct, setDecisionProduct] = useState<Product | null>(null)
  const [rentProduct, setRentProduct] = useState<Product | null>(null)
  const [returnProduct, setReturnProduct] = useState<Product | null>(null)
  const [maintProduct, setMaintProduct] = useState<Product | null>(null)
  const [completeProduct, setCompleteProduct] = useState<Product | null>(null)

  const pushToast = useToastStore((s) => s.push)

  const activeRental =
    returnProduct ? (rentals.find((r) => r.productId === returnProduct.id && r.status === 'active') ?? null) : null
  const openMaint =
    completeProduct ? (maintenance.find((m) => m.productId === completeProduct.id && m.status === 'open') ?? null) : null

  const stopScanner = useCallback(async () => {
    const instance = instanceRef.current
    if (!instance) return
    try {
      await instance.stop()
    } catch {
      /* not running or already stopped */
    }
    try {
      instance.clear()
    } catch {
      /* ignore */
    } finally {
      instanceRef.current = null
      startingRef.current = false
      setRunning(false)
    }
  }, [])

  const flowHandlers = useMemo(
    () => ({
      onAvailable: (p: Product) => setDecisionProduct(p),
      onReturn: (p: Product) => setReturnProduct(p),
      onMaintenanceComplete: (p: Product) => setCompleteProduct(p),
    }),
    [],
  )

  const { handleDecoded } = useProductScannerFlow(flowHandlers)

  const startScanner = useCallback(async () => {
    if (instanceRef.current || startingRef.current) return
    startingRef.current = true
    setLast(null)

    const scanConfig = {
      fps: 10,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
        const size = Math.max(200, Math.floor(minEdge * 0.72))
        return { width: size, height: size }
      },
    }

    const makeInstance = () =>
      new Html5Qrcode(readerDomId, {
        verbose: false,
        useBarCodeDetectorIfSupported: true,
      })

    const onSuccess = async (decodedText: string, instance: Html5Qrcode) => {
      try {
        await instance.stop()
      } catch {
        /* ignore */
      }
      try {
        instance.clear()
      } catch {
        /* ignore */
      }
      if (instanceRef.current === instance) {
        instanceRef.current = null
      }
      startingRef.current = false
      setRunning(false)

      setLast(decodedText)
      vibrateSuccess()
      playScanSuccessSound()
      pushToast('QR captured', 'success')
      handleDecoded(decodedText)
    }

    const tryRun = async (camera: string | MediaTrackConstraints) => {
      const instance = makeInstance()
      instanceRef.current = instance
      setRunning(true)
      await instance.start(
        camera,
        scanConfig,
        (text) => {
          void onSuccess(text, instance)
        },
        () => {
          /* no QR in this frame */
        },
      )
    }

    const primary = await pickPreferredCamera()
    try {
      await tryRun(primary)
    } catch (first) {
      await stopScanner()
      try {
        const fallback: MediaTrackConstraints =
          typeof primary === 'string' ? { facingMode: 'user' } : { facingMode: 'user' }
        await tryRun(fallback)
      } catch {
        startingRef.current = false
        setRunning(false)
        pushToast(
          first instanceof Error ? `Camera error: ${first.message}` : 'Camera could not start. Allow permission or tap Restart.',
          'error',
        )
      }
    }
  }, [handleDecoded, pushToast, readerDomId, stopScanner])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void startScanner()
    }, 120)
    return () => {
      window.clearTimeout(t)
      void stopScanner()
    }
  }, [startScanner, stopScanner])

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">Field tool</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">QR scanner</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Optimized for one-hand operation and instant routing.</p>
      </div>

      <GlassCard className="relative overflow-hidden !p-0">
        <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full bg-slate-950/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          <ShieldCheck className="size-4 text-emerald-300" />
          Live camera
        </div>

        <div className="relative z-0 min-h-[min(70vh,560px)] w-full bg-slate-950">
          <div id={readerDomId} className="h-[min(70vh,560px)] w-full" />

          <motion.div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: running ? [0.25, 0.55, 0.25] : 0.15 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="size-[min(72vw,280px)] rounded-3xl ring-2 ring-sky-400/50" />
          </motion.div>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-700 dark:text-slate-200">
            {last ? (
              <span>
                Last scan: <span className="font-semibold text-slate-900 dark:text-slate-50">{last}</span>
              </span>
            ) : (
              <span>Hold the QR steady in the box. If the preview is black, tap Restart and allow camera access.</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void stopScanner().then(() => void startScanner())}
              leftIcon={<RefreshCw className="size-4" />}
            >
              Restart camera
            </Button>
          </div>
        </div>
      </GlassCard>

      <ScannerDecisionModal
        open={!!decisionProduct}
        product={decisionProduct}
        onClose={() => setDecisionProduct(null)}
        onRent={(p) => setRentProduct(p)}
        onMaintenance={(p) => setMaintProduct(p)}
      />

      <RentOutModal open={!!rentProduct} product={rentProduct} onClose={() => setRentProduct(null)} />
      <ReturnProductModal
        open={!!returnProduct}
        product={returnProduct}
        rental={activeRental}
        onClose={() => setReturnProduct(null)}
      />
      <MaintenanceStartModal open={!!maintProduct} product={maintProduct} onClose={() => setMaintProduct(null)} />
      <MaintenanceCompleteModal
        open={!!completeProduct}
        product={completeProduct}
        record={openMaint}
        onClose={() => setCompleteProduct(null)}
      />
    </div>
  )
}
