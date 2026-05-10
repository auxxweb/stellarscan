import { create } from 'zustand'
import type { DashboardPayload } from '../types'
import { refreshAll, executeAction } from '../services/sheetApi'
import { loadLocalDataset } from '../services/localStore'
import type { SheetAction } from '../types'
import { normalizeDashboardPayload } from '../utils/productNormalize'
import { useToastStore } from './useToastStore'

interface AppState extends DashboardPayload {
  hydrated: boolean
  loading: boolean
  error: string | null
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  hydrate: () => Promise<void>
  runAction: (action: SheetAction) => Promise<void>
  replaceAll: (data: DashboardPayload) => void
  clearError: () => void
}

export const useAppStore = create<AppState>((set) => ({
  products: [],
  rentals: [],
  maintenance: [],
  activityLogs: [],
  hydrated: false,
  loading: false,
  error: null,
  sidebarOpen: false,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  replaceAll: (data) => {
    const n = normalizeDashboardPayload(data)
    set({
      products: n.products,
      rentals: n.rentals,
      maintenance: n.maintenance,
      activityLogs: n.activityLogs,
    })
  },

  hydrate: async () => {
    set({ loading: true, error: null })
    try {
      const data = await refreshAll()
      set({
        products: data.products,
        rentals: data.rentals,
        maintenance: data.maintenance,
        activityLogs: data.activityLogs,
        hydrated: true,
        loading: false,
        error: null,
      })
    } catch (e) {
      console.error('[StellarScan] hydrate failed — using cached local data if available', e)
      const msg = e instanceof Error ? e.message : 'Failed to load data'
      const fallback = normalizeDashboardPayload(loadLocalDataset())
      useToastStore.getState().push(`${msg} Showing cached data.`, 'error')
      set({
        products: fallback.products,
        rentals: fallback.rentals,
        maintenance: fallback.maintenance,
        activityLogs: fallback.activityLogs,
        error: msg,
        loading: false,
        hydrated: true,
      })
    }
  },

  clearError: () => set({ error: null }),

  runAction: async (action) => {
    set({ loading: true, error: null })
    try {
      const data = await executeAction(action)
      set({
        products: data.products,
        rentals: data.rentals,
        maintenance: data.maintenance,
        activityLogs: data.activityLogs,
        loading: false,
        error: null,
      })
    } catch (e) {
      console.error('[StellarScan] runAction failed', e)
      const msg = e instanceof Error ? e.message : 'Action failed'
      useToastStore.getState().push(msg, 'error')
      set({
        error: msg,
        loading: false,
      })
    }
  },
}))
