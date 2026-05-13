import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { RefreshCw, ScanLine, Trash2 } from 'lucide-react'
import type { Product } from '../../types'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useAppStore } from '../../store/useAppStore'
import { useToastStore } from '../../store/useToastStore'
import { isoFromDateOnlyInput } from '../../utils/dates'
import { pickPreferredQrCamera, sanitizeQrMountDomId } from '../../utils/html5QrMount'
import { playScanSuccessSound, vibrateSuccess } from '../../utils/sound'
import { findActiveRentalForProduct, findProductByScan, normalizeEntityId } from '../../utils/scannerResolve'

function cartGroupedSummary(cart: Product[]): { key: string; label: string; count: number; ids: string[] }[] {
  const m = new Map<string, { label: string; count: number; ids: string[] }>()
  for (const p of cart) {
    const key = `${normalizeEntityId(p.id)}|${p.productName.trim()}`
    const cur = m.get(key)
    if (cur) {
      cur.count += 1
      cur.ids.push(p.id)
    } else {
      m.set(key, { label: p.productName.trim() || '—', count: 1, ids: [p.id] })
    }
  }
  return Array.from(m.entries()).map(([key, v]) => ({ key, label: v.label, count: v.count, ids: v.ids }))
}

export function RentOutModal({
  open,
  initialProducts,
  onClose,
}: {
  open: boolean
  initialProducts: Product[]
  onClose: () => void
}) {
  const runAction = useAppStore((s) => s.runAction)
  const loading = useAppStore((s) => s.loading)
  const pushToast = useToastStore((s) => s.push)

  const readerDomId = sanitizeQrMountDomId(useId())
  const instanceRef = useRef<Html5Qrcode | null>(null)
  const startingRef = useRef(false)
  const startScannerRef = useRef<() => Promise<void>>(async () => {})

  const [cart, setCart] = useState<Product[]>([])
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [scanMode, setScanMode] = useState(false)
  const cartRef = useRef<Product[]>([])

  useEffect(() => {
    cartRef.current = cart
  }, [cart])

  useEffect(() => {
    if (!open) return
    const d = new Date(Date.now() + 48 * 60 * 60 * 1000)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed when modal opens
    setExpectedReturnDate(d.toISOString().slice(0, 10))
    const seed = initialProducts.filter(Boolean)
    setCart(seed)
    setScanMode(true)
  }, [open, initialProducts])

  const reset = () => {
    setCustomerName('')
    setPhone('')
    setCart([])
    setScanMode(false)
  }

  const stopScanner = useCallback(async () => {
    const instance = instanceRef.current
    if (!instance) return
    try {
      await instance.stop()
    } catch {
      /* not running */
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

  const processScanForCart = useCallback(
    (decodedText: string) => {
      const latestProducts = useAppStore.getState().products
      const latestRentals = useAppStore.getState().rentals
      const p = findProductByScan(latestProducts, decodedText)
      if (!p) {
        pushToast('No product matches this QR code.', 'error')
        return
      }

      const pid = normalizeEntityId(p.id)
      const cartNow = cartRef.current
      const idxInCart = cartNow.findIndex((c) => normalizeEntityId(c.id) === pid)

      if (idxInCart >= 0) {
        setCart((prev) => {
          const i = prev.findIndex((c) => normalizeEntityId(c.id) === pid)
          if (i < 0) return prev
          return [...prev.slice(0, i), ...prev.slice(i + 1)]
        })
        vibrateSuccess()
        playScanSuccessSound()
        pushToast(`${p.productName} removed from cart`, 'success')
        return
      }

      if (p.status !== 'available') {
        pushToast('That product is not available.', 'error')
        return
      }
      if (findActiveRentalForProduct(latestRentals, p.id)) {
        pushToast(`${p.productName} is already on rent.`, 'error')
        return
      }

      setCart((prev) => [...prev, p])
      vibrateSuccess()
      playScanSuccessSound()
      pushToast(`${p.productName} added to cart`, 'success')
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
      if (instanceRef.current === instance) {
        instanceRef.current = null
      }
      startingRef.current = false

      processScanForCart(decodedText)

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
        () => {
          /* no QR */
        },
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
          first instanceof Error ? `Camera error: ${first.message}` : 'Camera could not start. Tap Restart or allow permission.',
          'error',
        )
      }
    }
  }, [open, scanMode, readerDomId, processScanForCart, pushToast, stopScanner])

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

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((p) => normalizeEntityId(p.id) !== normalizeEntityId(productId)))
  }

  const submit = async () => {
    if (cart.length === 0) {
      pushToast('Add at least one product to the rental.', 'error')
      return
    }
    if (!customerName.trim() || !phone.trim()) {
      pushToast('Customer name and phone are required.', 'error')
      return
    }
    const dueIso = isoFromDateOnlyInput(expectedReturnDate)
    if (!dueIso) {
      pushToast('Please choose an expected return date.', 'error')
      return
    }
    const groupId = globalThis.crypto?.randomUUID?.() ?? `grp-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
    await runAction({
      action: 'rentOut',
      payload: {
        groupId,
        productIds: cart.map((c) => c.id),
        productNames: cart.map((c) => c.productName),
        customerName: customerName.trim(),
        phone: phone.trim(),
        expectedReturnDate: dueIso,
        advanceAmount: 0,
        notes: '',
      },
    })
    pushToast(
      cart.length > 1 ? `${cart.length} items rented on one contract.` : `${cart[0]!.productName} rented successfully.`,
      'success',
    )
    reset()
    onClose()
  }

  const grouped = useMemo(() => cartGroupedSummary(cart), [cart])

  return (
    <Modal
      open={open}
      title="Rent out"
      description="Scan each unit’s QR to build the cart — scan again to remove. One QR is one physical item."
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
          <Button type="button" onClick={() => void submit()} loading={loading} disabled={cart.length === 0}>
            Confirm rental{cart.length > 1 ? ` (${cart.length} items)` : ''}
          </Button>
        </>
      }
    >
      <div className="grid max-h-[min(70dvh,560px)] gap-4 overflow-y-auto pr-1">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Equipment cart</div>
            <Badge className="bg-sky-100 text-sky-900 ring-sky-200">{cart.length} unit{cart.length === 1 ? '' : 's'}</Badge>
          </div>
          {cart.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              Use the scanner below to add available units. Scan the same code again to remove a unit from the cart.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {grouped.map((g) => (
                <li
                  key={g.key}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white bg-white/90 px-3 py-2 text-sm shadow-sm"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900">{g.label}</span>
                    {g.count > 1 ? (
                      <span className="text-slate-600">
                        {' '}
                        × {g.count}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {g.ids.map((id) => (
                      <Button
                        key={id}
                        type="button"
                        variant="outline"
                        className="!h-8 !px-2"
                        aria-label="Remove from cart"
                        onClick={() => removeFromCart(id)}
                        leftIcon={<Trash2 className="size-3.5" />}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-3 border-t border-slate-200/80 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Scanner</div>

            <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ScanLine className="size-4 text-sky-600" aria-hidden />
                  <span className="text-sm font-semibold text-slate-900">Scan QR</span>
                </div>
                <Button
                  type="button"
                  variant={scanMode ? 'secondary' : 'outline'}
                  className="!shrink-0 !py-2 !text-xs"
                  onClick={() => setScanMode((v) => !v)}
                >
                  {scanMode ? 'Stop scanning' : 'Start scanning'}
                </Button>
              </div>
              {scanMode ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-600">
                    Scan a unit to add it to the cart. Scan the same code again to remove that unit. After each scan the
                    camera comes back for the next code.
                  </p>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                    <div
                      id={readerDomId}
                      className="min-h-[min(36dvh,260px)] w-full [&_video]:max-h-[min(36dvh,260px)] [&_video]:w-full [&_video]:object-cover"
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
                <p className="mt-2 text-xs text-slate-600">Turn scanning on to add or remove units by QR.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Customer name</label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Expected return</label>
            <Input type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
