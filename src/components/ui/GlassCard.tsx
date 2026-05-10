import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export function GlassCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}
