import { NavLink } from 'react-router-dom'
import {
  Activity as ActivityIcon,
  Camera,
  LayoutDashboard,
  QrCode,
  ScanLine,
  Settings,
  Wrench,
  ClipboardList,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/Button'

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Camera },
  { to: '/rentals', label: 'Rentals', icon: ClipboardList },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/activity', label: 'Activity History', icon: ActivityIcon },
  { to: '/scanner', label: 'QR Scanner', icon: ScanLine },
  { to: '/generator', label: 'QR Generator', icon: QrCode },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function Sidebar({ mobile }: { mobile?: boolean }) {
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-slate-200 bg-white/85 backdrop-blur-xl',
        mobile ? 'w-[min(88vw,320px)]' : 'w-72',
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900">Stellar Camera Rentals</div>
          <div className="truncate text-xs text-slate-600">Operations console</div>
        </div>
        {mobile ? (
          <Button type="button" variant="ghost" className="!p-2" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 px-2 pb-4">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                isActive
                  ? 'bg-gradient-to-r from-sky-500/15 to-indigo-500/15 text-slate-900 ring-1 ring-sky-500/25'
                  : 'text-slate-700 hover:bg-slate-900/5',
              )
            }
          >
            {({ isActive }) => (
              <>
                <motion.span
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  className={cn(
                    'grid size-9 place-items-center rounded-xl ring-1',
                    isActive
                      ? 'bg-white text-sky-700 ring-sky-200'
                      : 'bg-slate-900/5 ring-slate-200',
                  )}
                >
                  <it.icon className="size-4" />
                </motion.span>
                <span className="truncate">{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3 text-xs text-slate-600">
        Secure inventory tracking with QR workflows.
      </div>
    </aside>
  )
}
