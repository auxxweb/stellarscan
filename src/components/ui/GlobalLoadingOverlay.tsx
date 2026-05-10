import { Loader2 } from 'lucide-react'

export function GlobalLoadingOverlay({ label = 'Syncing…' }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/25 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-xl">
        <Loader2 className="size-10 animate-spin text-sky-600" aria-hidden />
        <p className="text-sm font-semibold text-slate-800">{label}</p>
      </div>
    </div>
  )
}
