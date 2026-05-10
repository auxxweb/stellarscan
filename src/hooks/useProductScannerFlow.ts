import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Product } from '../types'
import { useAppStore } from '../store/useAppStore'
import { useToastStore } from '../store/useToastStore'
import { normalizeProductStatus, normalizeQrPayload } from '../utils/productNormalize'

export type ScannerFlowHandlers = {
  onAvailable: (p: Product) => void
  onReturn: (p: Product) => void
  onMaintenanceComplete: (p: Product) => void
}

export function useProductScannerFlow(handlers: ScannerFlowHandlers) {
  const navigate = useNavigate()
  const pushToast = useToastStore((s) => s.push)

  const handleDecoded = useCallback(
    (text: string) => {
      const products = useAppStore.getState().products
      const code = normalizeQrPayload(text)
      const product =
        products.find((p) => normalizeQrPayload(p.qrCode) === code) ??
        products.find((p) => p.id === code) ??
        products.find((p) => normalizeQrPayload(p.qrCode).toLowerCase() === code.toLowerCase())
      if (!product) {
        pushToast('No product matches this QR code.', 'error')
        navigate('/products')
        return
      }

      const status = normalizeProductStatus(product.status)
      const resolved: Product = { ...product, status }

      switch (status) {
        case 'available':
          handlers.onAvailable(resolved)
          break
        case 'rented':
          handlers.onReturn(resolved)
          break
        case 'maintenance':
          handlers.onMaintenanceComplete(resolved)
          break
      }
    },
    [handlers, navigate, pushToast],
  )

  return { handleDecoded }
}
