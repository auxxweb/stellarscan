import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useProductScannerFlow } from '../hooks/useProductScannerFlow'
import type { Product } from '../types'
import { ScannerDecisionModal } from '../components/workflows/ScannerDecisionModal'
import { RentOutModal } from '../components/workflows/RentOutModal'
import { ReturnContractModal } from '../components/workflows/ReturnContractModal'
import { MaintenanceStartModal } from '../components/workflows/MaintenanceStartModal'
import { MaintenanceCompleteModal } from '../components/workflows/MaintenanceCompleteModal'
import { useAppStore } from '../store/useAppStore'
import { useToastStore } from '../store/useToastStore'
import { pickPreferredQrCamera, sanitizeQrMountDomId } from '../utils/html5QrMount'
import { playScanSuccessSound, vibrateSuccess } from '../utils/sound'
import { contractGroupKey, findOpenContractLinesForProduct, getOpenContractLinesByGroupId } from '../utils/rentalGrouping'
import { findOpenMaintenanceForProduct } from '../utils/scannerResolve'

export function ScannerPage() {
  const rentals = useAppStore((s) => s.rentals)
  const maintenance = useAppStore((s) => s.maintenance)
  const hydrated = useAppStore((s) => s.hydrated)

  const readerDomId = sanitizeQrMountDomId(useId())

  const [last, setLast] = useState<string | null>(null)
  const instanceRef = useRef<Html5Qrcode | null>(null)
  const startingRef = useRef(false)
  const hadModalOpenRef = useRef(false)

  const [decisionProduct, setDecisionProduct] = useState<Product | null>(null)
  const [rentProduct, setRentProduct] = useState<Product | null>(null)
  const [returnGroupId, setReturnGroupId] = useState<string | null>(null)
  const [maintProduct, setMaintProduct] = useState<Product | null>(null)
  const [completeProduct, setCompleteProduct] = useState<Product | null>(null)

  const pushToast = useToastStore((s) => s.push)

  const openMaint = completeProduct ? findOpenMaintenanceForProduct(maintenance, completeProduct.id) : null

  useEffect(() => {
    if (!returnGroupId || !hydrated) return
    if (getOpenContractLinesByGroupId(rentals, returnGroupId).length === 0) {
      pushToast('No open items on this contract. Refresh if needed.', 'error')
      setReturnGroupId(null)
    }
  }, [returnGroupId, rentals, hydrated, pushToast])

  useEffect(() => {
    if (!completeProduct || !hydrated) return
    if (!findOpenMaintenanceForProduct(maintenance, completeProduct.id)) {
      pushToast('No open maintenance ticket for this product. Refresh in Settings, or check the Maintenance sheet.', 'error')
      setCompleteProduct(null)
    }
  }, [completeProduct, maintenance, hydrated, pushToast])

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
    }
  }, [])

  const flowHandlers = useMemo(
    () => ({
      onAvailable: (p: Product) => setDecisionProduct(p),
      onReturn: (p: Product) => {
        const lines = findOpenContractLinesForProduct(useAppStore.getState().rentals, p.id)
        if (lines.length === 0) {
          pushToast('No active rental for this product.', 'error')
          return
        }
        setReturnGroupId(contractGroupKey(lines[0]!))
      },
      onMaintenanceComplete: (p: Product) => setCompleteProduct(p),
    }),
    [pushToast],
  )

  const { handleDecoded } = useProductScannerFlow(flowHandlers)

  const startScanner = useCallback(async () => {
    if (instanceRef.current || startingRef.current) return
    startingRef.current = true
    setLast(null)

    /* No `qrbox` → html5-qrcode uses the full viewfinder and does NOT draw the dark shaded mask. */
    const scanConfig = { fps: 10 }

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

      setLast(decodedText)
      vibrateSuccess()
      playScanSuccessSound()
      pushToast('QR captured', 'success')
      handleDecoded(decodedText)
    }

    const tryRun = async (camera: string | MediaTrackConstraints) => {
      const instance = makeInstance()
      instanceRef.current = instance
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

    const primary = await pickPreferredQrCamera()
    try {
      await tryRun(primary)
    } catch (first) {
      await stopScanner()
      try {
        const fallback: MediaTrackConstraints = { facingMode: 'user' }
        await tryRun(fallback)
      } catch {
        startingRef.current = false
        pushToast(
          first instanceof Error ? `Camera error: ${first.message}` : 'Camera could not start. Allow permission or tap Restart.',
          'error',
        )
      }
    }
  }, [handleDecoded, pushToast, readerDomId, stopScanner])

  const anyModalOpen = !!(decisionProduct || rentProduct || returnGroupId || maintProduct || completeProduct)
  useEffect(() => {
    if (hadModalOpenRef.current && !anyModalOpen) {
      const t = window.setTimeout(() => void startScanner(), 400)
      hadModalOpenRef.current = false
      return () => window.clearTimeout(t)
    }
    hadModalOpenRef.current = anyModalOpen
  }, [anyModalOpen, startScanner])

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
        <div className="text-xs font-semibold text-sky-700">Field tool</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">QR scanner</h1>
        <p className="mt-1 text-sm text-slate-600">Full camera view — nothing dimmed over the QR.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-lg shadow-slate-900/5">
        <div className="relative w-full bg-slate-900">
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-200/80 backdrop-blur-sm sm:left-4 sm:top-4 sm:px-3 sm:text-xs">
            <ShieldCheck className="size-3.5 text-emerald-600 sm:size-4" aria-hidden />
            Live camera
          </div>

          <div
            id={readerDomId}
            className="stellar-scanner-mount min-h-[min(50dvh,400px)] w-full sm:min-h-[min(70dvh,560px)] md:min-h-[min(75dvh,720px)]"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            {last ? (
              <span>
                Last scan: <span className="font-semibold text-slate-900">{last}</span>
              </span>
            ) : (
              <span>Show the whole QR in frame. Tap Restart if the preview is blank.</span>
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
      </div>

      <ScannerDecisionModal
        open={!!decisionProduct}
        product={decisionProduct}
        onClose={() => setDecisionProduct(null)}
        onRent={(p) => setRentProduct(p)}
        onMaintenance={(p) => setMaintProduct(p)}
      />

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
        record={openMaint}
        onClose={() => setCompleteProduct(null)}
      />
    </div>
  )
}
