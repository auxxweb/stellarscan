import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { RefreshCw, ScanLine } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useAppStore } from '../../store/useAppStore'
import { useToastStore } from '../../store/useToastStore'
import { computeReturnKind, nowIso } from '../../utils/dates'
import { computeContractReturnLineBills, type LineReturnBillDetail } from '../../utils/rentalBilling'
import { pickPreferredQrCamera, sanitizeQrMountDomId } from '../../utils/html5QrMount'
import { playScanSuccessSound, vibrateSuccess } from '../../utils/sound'
import { findProductByScan, normalizeEntityId, resolveProductNameLabel } from '../../utils/scannerResolve'
import { getOpenContractLinesByGroupId } from '../../utils/rentalGrouping'
import { formatInr, splitMoneyTotalAcrossCount } from '../../utils/money'
import { parseNonNegativeMoney } from '../../utils/validation'
import { cn } from '../../utils/cn'

export function ReturnContractModal({
  open,
  groupId,
  onClose,
}: {
  open: boolean
  groupId: string
  onClose: () => void
}) {
  const rentals = useAppStore((s) => s.rentals)
  const products = useAppStore((s) => s.products)
  const hydrated = useAppStore((s) => s.hydrated)
  const runAction = useAppStore((s) => s.runAction)
  const loading = useAppStore((s) => s.loading)
  const pushToast = useToastStore((s) => s.push)

  const readerDomId = sanitizeQrMountDomId(useId())
  const instanceRef = useRef<Html5Qrcode | null>(null)
  const startingRef = useRef(false)
  const startScannerRef = useRef<() => Promise<void>>(async () => {})
  const groupIdRef = useRef('')
  const billEditedRef = useRef(false)

  const [scannedLineIds, setScannedLineIds] = useState<string[]>([])
  const [billPreviewReturnedAtIso, setBillPreviewReturnedAtIso] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [scanMode, setScanMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const contractLines = useMemo(() => {
    if (!open || !groupId.trim()) return []
    return getOpenContractLinesByGroupId(rentals, groupId).sort((a, b) => {
      const na = resolveProductNameLabel(a.productId, a.productName, products)
      const nb = resolveProductNameLabel(b.productId, b.productName, products)
      const c = na.localeCompare(nb)
      return c !== 0 ? c : a.productId.localeCompare(b.productId)
    })
  }, [open, groupId, rentals, products])

  useEffect(() => {
    groupIdRef.current = groupId
  }, [groupId])

  const stopScanner = useCallback(async () => {
    const instance = instanceRef.current
    if (!instance) return
    try {
      await instance.stop()
    } catch {
      /* ignore */
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

  const reset = useCallback(() => {
    billEditedRef.current = false
    setScannedLineIds([])
    setBillPreviewReturnedAtIso('')
    setBillAmount('')
    setScanMode(false)
    setSubmitting(false)
  }, [])

  useEffect(() => {
    if (!open) return
    reset()
    setBillPreviewReturnedAtIso(nowIso())
  }, [open, groupId, reset])

  useEffect(() => {
    if (!open || !groupId || !hydrated) return
    if (contractLines.length === 0) {
      void stopScanner()
      onClose()
    }
  }, [open, groupId, hydrated, contractLines.length, onClose, stopScanner])

  const scannedSet = useMemo(() => new Set(scannedLineIds), [scannedLineIds])
  const allScanned = contractLines.length > 0 && scannedLineIds.length === contractLines.length

  const billingPreview = useMemo(() => {
    if (!billPreviewReturnedAtIso || contractLines.length === 0) {
      return { details: [] as LineReturnBillDetail[], total: 0 }
    }
    return computeContractReturnLineBills(contractLines, products, billPreviewReturnedAtIso)
  }, [billPreviewReturnedAtIso, contractLines, products])

  const billDetailByLineId = useMemo(() => {
    const m = new Map<string, LineReturnBillDetail>()
    for (const d of billingPreview.details) m.set(d.lineId, d)
    return m
  }, [billingPreview.details])

  const billPreviewParsed = useMemo(() => {
    const n = Number(billAmount.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [billAmount])

  useEffect(() => {
    if (!open || billEditedRef.current) return
    const t = billingPreview.total
    if (!Number.isFinite(t)) return
    setBillAmount(String(Math.round(t * 100) / 100))
  }, [open, billingPreview.total])

  const applyCalculatedTotal = useCallback(() => {
    billEditedRef.current = false
    const t = billingPreview.total
    setBillAmount(Number.isFinite(t) ? String(Math.round(t * 100) / 100) : '')
  }, [billingPreview.total])

  const processScan = useCallback(
    (decodedText: string) => {
      const latestProducts = useAppStore.getState().products
      const latestRentals = useAppStore.getState().rentals
      const gid = groupIdRef.current
      const lines = getOpenContractLinesByGroupId(latestRentals, gid)
      const p = findProductByScan(latestProducts, decodedText)
      if (!p) {
        pushToast('No product matches this QR code.', 'error')
        return
      }
      const line = lines.find((l) => normalizeEntityId(l.productId) === normalizeEntityId(p.id))
      if (!line) {
        pushToast('This unit is not on this contract (or already returned).', 'error')
        return
      }
      setScannedLineIds((prev) => {
        if (prev.includes(line.id)) {
          window.setTimeout(() => pushToast(`${p.productName} is already scanned — no need to scan again.`, 'info'), 0)
          return prev
        }
        window.setTimeout(() => {
          vibrateSuccess()
          playScanSuccessSound()
          pushToast(`${p.productName} scanned for return.`, 'success')
        }, 0)
        return [...prev, line.id]
      })
    },
    [pushToast],
  )

  const startScanner = useCallback(async () => {
    if (!open || !scanMode) return
    if (instanceRef.current || startingRef.current) return
    startingRef.current = true
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
      if (instanceRef.current === instance) instanceRef.current = null
      startingRef.current = false
      processScan(decodedText)
      window.setTimeout(() => {
        void startScannerRef.current()
      }, 280)
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
        () => {},
      )
    }

    const primary = await pickPreferredQrCamera()
    try {
      await tryRun(primary)
    } catch (first) {
      await stopScanner()
      try {
        await tryRun({ facingMode: 'user' })
      } catch {
        startingRef.current = false
        pushToast(
          first instanceof Error ? `Camera error: ${first.message}` : 'Camera could not start.',
          'error',
        )
      }
    }
  }, [open, scanMode, readerDomId, processScan, pushToast, stopScanner])

  useEffect(() => {
    startScannerRef.current = startScanner
  }, [startScanner])

  useEffect(() => {
    if (!open || !scanMode) {
      void stopScanner()
      return
    }
    const t = window.setTimeout(() => {
      void startScanner()
    }, 200)
    return () => {
      window.clearTimeout(t)
      void stopScanner()
    }
  }, [open, scanMode, startScanner, stopScanner])

  const submit = async () => {
    if (contractLines.length === 0) return
    if (!allScanned) {
      pushToast(`Scan every unit on this contract (${scannedLineIds.length}/${contractLines.length} scanned).`, 'error')
      return
    }
    const returnedAt = nowIso()
    const billCheck = parseNonNegativeMoney(billAmount, 'Total bill amount')
    if (!billCheck.ok) {
      pushToast(billCheck.message, 'error')
      return
    }
    const totalBill = billCheck.value
    const parts = splitMoneyTotalAcrossCount(totalBill, contractLines.length)
    setSubmitting(true)
    try {
      for (let i = 0; i < contractLines.length; i++) {
        const line = contractLines[i]!
        const kind = computeReturnKind(line.expectedReturnDate, returnedAt)
        await runAction({
          action: 'returnProduct',
          payload: {
            productId: line.productId,
            rentalLineId: line.id,
            finalBill: parts[i] ?? 0,
            extraCharges: 0,
            notes: '',
            returnedAt,
            returnKind: kind,
          },
        })
        await new Promise((r) => window.setTimeout(r, 150))
      }
      pushToast(`Contract closed — ${contractLines.length} item(s) returned. Total ${formatInr(totalBill)}.`, 'success')
      reset()
      void stopScanner()
      onClose()
    } catch (e) {
      console.error(e)
      pushToast(e instanceof Error ? e.message : 'Return failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const first = contractLines[0]

  return (
    <Modal
      open={open && !!groupId && contractLines.length > 0}
      title="Return contract"
      description={
        first
          ? `${first.customerName} · ${contractLines.length} unit${contractLines.length === 1 ? '' : 's'} still out`
          : undefined
      }
      onClose={() => {
        void stopScanner()
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
              void stopScanner()
              reset()
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            loading={loading || submitting}
            disabled={!allScanned || contractLines.length === 0}
          >
            Complete return and bill
          </Button>
        </>
      }
    >
      <div className="grid max-h-[min(72dvh,580px)] gap-4 overflow-y-auto pr-1">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Units on this contract</div>
            <Badge className="bg-sky-100 text-sky-900 ring-sky-200">
              {scannedLineIds.length}/{contractLines.length} scanned
            </Badge>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Scan each physical QR once to confirm return (duplicate scans are ignored). The bill is calculated from each
            product&apos;s daily rate and calendar days out (checkout through return).
          </p>
          <ul className="mt-3 space-y-2">
            {contractLines.map((line) => {
              const ok = scannedSet.has(line.id)
              const label = resolveProductNameLabel(line.productId, line.productName, products)
              const bd = billDetailByLineId.get(line.id)
              return (
                <li
                  key={line.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm',
                    ok ? 'border-emerald-200 bg-emerald-50/90' : 'border-white bg-white/90 shadow-sm',
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{label}</div>
                    <div className="font-mono text-[11px] text-slate-500">{line.productId}</div>
                    {bd ? (
                      <div className="mt-1 text-[11px] text-slate-600">
                        {bd.days} day{bd.days === 1 ? '' : 's'} × {formatInr(bd.ratePerDay)}/day → {formatInr(bd.subtotal)}
                        {bd.ratePerDay === 0 ? (
                          <span className="ml-1 font-semibold text-amber-800"> (no price on file)</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <Badge className={ok ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}>
                    {ok ? 'Scanned' : 'Awaiting scan'}
                  </Badge>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white/90 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ScanLine className="size-4 text-sky-600" aria-hidden />
                <span className="text-sm font-semibold text-slate-900">Scan to confirm</span>
              </div>
              <Button
                type="button"
                variant={scanMode ? 'secondary' : 'outline'}
                className="!shrink-0 !py-2 !text-xs"
                onClick={() => setScanMode((v) => !v)}
              >
                {scanMode ? 'Stop camera' : 'Start camera'}
              </Button>
            </div>
            {scanMode ? (
              <div className="mt-3 space-y-2">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                  <div
                    id={readerDomId}
                    className="min-h-[min(32dvh,240px)] w-full [&_video]:max-h-[min(32dvh,240px)] [&_video]:w-full [&_video]:object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    void stopScanner().then(() => {
                      window.setTimeout(() => void startScanner(), 200)
                    })
                  }}
                  leftIcon={<RefreshCw className="size-4" />}
                >
                  Restart camera
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-600">Turn on the camera and scan each sticker on this contract.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total bill amount</div>
              <p className="mt-1 text-xs text-slate-500">
                Prefilled from daily rates × days (see each line). Edit if needed; the amount is split across line items
                when you complete.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
              onClick={applyCalculatedTotal}
            >
              Reset to auto
            </button>
          </div>
          <label className="mt-3 mb-1 block text-xs font-semibold text-slate-600" htmlFor="return-total-bill">
            Total (₹)
          </label>
          <Input
            id="return-total-bill"
            inputMode="decimal"
            className="w-full font-semibold sm:max-w-xs"
            value={billAmount}
            onChange={(e) => {
              billEditedRef.current = true
              setBillAmount(e.target.value)
            }}
          />
          <p className="mt-1 text-xs text-slate-500">
            Auto total (estimate): <span className="font-semibold text-slate-800">{formatInr(billingPreview.total)}</span>
            {' · '}
            {formatInr(splitMoneyTotalAcrossCount(billPreviewParsed, contractLines.length)[0] ?? 0)} per line (approx.)
            when posted
          </p>
          {!allScanned ? (
            <p className="mt-2 text-xs text-amber-800">Confirm every unit with a scan before completing.</p>
          ) : (
            <p className="mt-2 text-xs text-slate-600">All units scanned — ready to post.</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
