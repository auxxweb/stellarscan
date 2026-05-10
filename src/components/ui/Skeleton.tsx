import { cn } from '../../utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200',
        'dark:from-white/5 dark:via-white/10 dark:to-white/5',
        className,
      )}
    />
  )
}
