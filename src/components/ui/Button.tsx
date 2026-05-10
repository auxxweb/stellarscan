import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

const variants = {
  primary:
    'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/25 hover:brightness-110',
  secondary:
    'bg-slate-900/5 text-slate-900 ring-1 ring-slate-200 hover:bg-slate-900/10',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-900/5',
  danger: 'bg-rose-600/90 text-white hover:bg-rose-600',
  outline:
    'bg-transparent text-slate-800 ring-1 ring-slate-300 hover:bg-slate-900/5',
} as const

export function Button({
  className,
  variant = 'primary',
  children,
  leftIcon,
  loading,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  leftIcon?: ReactNode
  loading?: boolean
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        leftIcon
      )}
      {children}
    </button>
  )
}
