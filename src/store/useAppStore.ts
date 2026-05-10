import { create } from 'zustand'
import type { DashboardPayload } from '../types'
import { applyOptimisticAction, refreshAll, syncMutationToRemote } from '../services/sheetApi'
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
    const cached = normalizeDashboardPayload(loadLocalDataset())
    const hasAnyRows =
      cached.products.length +
        cached.rentals.length +
        cached.maintenance.length +
        cached.activityLogs.length >
      0

    set({
      products: cached.products,
      rentals: cached.rentals,
      maintenance: cached.maintenance,
      activityLogs: cached.activityLogs,
      hydrated: true,
      loading: !hasAnyRows,
      error: null,
    })

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
      useToastStore.getState().push(`${msg} Showing cached data.`, 'error')
      set({
        error: msg,
        loading: false,
        hydrated: true,
      })
    }
  },

  clearError: () => set({ error: null }),

  runAction: async (action) => {
    set({ error: null })
    try {
      const optimistic = applyOptimisticAction(action)
      set({
        products: optimistic.products,
        rentals: optimistic.rentals,
        maintenance: optimistic.maintenance,
        activityLogs: optimistic.activityLogs,
        loading: false,
        error: null,
      })

      void (async () => {
        try {
          const synced = await syncMutationToRemote(action)
          set({
            products: synced.products,
            rentals: synced.rentals,
            maintenance: synced.maintenance,
            activityLogs: synced.activityLogs,
            loading: false,
            error: null,
          })
        } catch (syncErr) {
          console.error('[StellarScan] sheet sync failed after local save', syncErr)
          useToastStore.getState().push(
            'Saved on this device. Google Sheet sync failed — check connection or use Settings → Save & refresh.',
            'info',
          )
          set({
            error: syncErr instanceof Error ? syncErr.message : 'Sheet sync failed',
            loading: false,
          })
        }
      })()
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
