import { create } from 'zustand'
import type { DashboardPayload } from '../types'
import { refreshAll, executeAction } from '../services/sheetApi'
import type { SheetAction } from '../types'

interface AppState extends DashboardPayload {
  hydrated: boolean
  loading: boolean
  error: string | null
  sidebarOpen: boolean
  theme: 'dark' | 'light'
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setTheme: (t: 'dark' | 'light') => void
  hydrate: () => Promise<void>
  runAction: (action: SheetAction) => Promise<void>
  replaceAll: (data: DashboardPayload) => void
}

const THEME_KEY = 'stellar-theme'

function readTheme(): 'dark' | 'light' {
  const v = localStorage.getItem(THEME_KEY)
  if (v === 'light' || v === 'dark') return v
  return 'dark'
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
  theme: readTheme(),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setTheme: (t) => {
    localStorage.setItem(THEME_KEY, t)
    document.documentElement.classList.toggle('dark', t === 'dark')
    set({ theme: t })
  },

  replaceAll: (data) =>
    set({
      products: data.products,
      rentals: data.rentals,
      maintenance: data.maintenance,
      activityLogs: data.activityLogs,
    }),

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
      })
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to load data',
        loading: false,
        hydrated: true,
      })
    }
  },

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
      })
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Action failed',
        loading: false,
      })
    }
  },
}))
