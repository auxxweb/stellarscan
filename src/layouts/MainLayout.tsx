import { useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { AlertTriangle, Menu, ScanLine, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from '../components/layout/Sidebar'
import { useAppStore } from '../store/useAppStore'
import { Button } from '../components/ui/Button'
import { GlobalLoadingOverlay } from '../components/ui/GlobalLoadingOverlay'

export function MainLayout() {
  const hydrate = useAppStore((s) => s.hydrate)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const loading = useAppStore((s) => s.loading)
  const apiError = useAppStore((s) => s.error)
  const clearError = useAppStore((s) => s.clearError)
  const location = useLocation()
  const hideFab = location.pathname.startsWith('/scanner')

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute -right-40 top-40 size-[520px] rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute bottom-[-200px] left-1/2 size-[680px] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="flex min-h-dvh">
        <div className="hidden lg:block">
          <div className="sticky top-0 h-dvh">
            <Sidebar />
          </div>
        </div>

        <AnimatePresence>
          {sidebarOpen ? (
            <motion.div
              className="fixed inset-0 z-[60] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                aria-label="Close menu"
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                onClick={() => toggleSidebar()}
              />
              <motion.div
                initial={{ x: -24, opacity: 0.98 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="absolute left-0 top-0 h-full shadow-2xl"
              >
                <Sidebar mobile />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Button type="button" variant="secondary" className="!p-2 lg:hidden" onClick={() => toggleSidebar()} aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
                <div className="hidden min-w-0 sm:block">
                  <div className="text-xs font-semibold text-slate-600">Stellar Camera Rentals</div>
                  <div className="text-sm font-bold text-slate-900">Command center</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <span className="truncate text-base font-bold tracking-tight text-sky-800 sm:hidden">Stellar</span>
                <Link
                  to="/scanner"
                  className="hidden rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 sm:inline-flex"
                >
                  Open scanner
                </Link>
              </div>
            </div>
          </header>

          {apiError ? (
            <div
              role="alert"
              className="mx-auto flex max-w-7xl items-start gap-3 border-b border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Connection issue</div>
                <p className="mt-0.5 text-amber-900/90">{apiError}</p>
                <p className="mt-1 text-xs text-amber-800/80">
                  You can keep working from cached data. Fix your Apps Script URL in Settings or try again later.
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg p-1 text-amber-800 hover:bg-amber-200/50"
                aria-label="Dismiss"
                onClick={() => clearError()}
              >
                <X className="size-5" />
              </button>
            </div>
          ) : null}

          <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 pb-36 sm:pb-10">
            <Outlet />
          </main>
        </div>
      </div>

      {!hideFab ? (
        <Link
          to="/scanner"
          className="fixed bottom-24 right-4 z-50 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-2xl shadow-sky-500/30 sm:bottom-28 sm:right-6 lg:hidden"
          aria-label="Scan QR"
        >
          <ScanLine className="size-6" />
        </Link>
      ) : null}

      {loading ? <GlobalLoadingOverlay /> : null}
    </div>
  )
}
