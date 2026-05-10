import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Product } from '../types'
import { useAppStore } from '../store/useAppStore'
import { useToastStore } from '../store/useToastStore'

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
      const code = text.trim()
      const product =
        products.find((p) => p.qrCode === code) ?? products.find((p) => p.id === code)
      if (!product) {
        pushToast('No product matches this QR code.', 'error')
        navigate('/products')
        return
      }

      switch (product.status) {
        case 'available':
          handlers.onAvailable(product)
          break
        case 'rented':
          handlers.onReturn(product)
          break
        case 'maintenance':
          handlers.onMaintenanceComplete(product)
          break
        default:
          pushToast('Unknown product status.', 'error')
      }
    },
    [handlers, navigate, pushToast],
  )

  return { handleDecoded }
}
