import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, X, AlertCircle } from 'lucide-react'
import { useToastStore } from '../../store/useToastStore'

export function ToastStack() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-[90] flex flex-col items-center gap-2 px-3 sm:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95"
          >
            <div className="mt-0.5">
              {t.kind === 'success' ? (
                <CheckCircle2 className="size-5 text-emerald-500" />
              ) : t.kind === 'error' ? (
                <AlertCircle className="size-5 text-rose-500" />
              ) : (
                <Info className="size-5 text-sky-500" />
              )}
            </div>
            <div className="flex-1 text-sm text-slate-800 dark:text-slate-100">{t.message}</div>
            <button
              type="button"
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
