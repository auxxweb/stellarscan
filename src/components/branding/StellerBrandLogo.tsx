import { cn } from '../../utils/cn'
import { STELLER_LOGO_PNG } from '../../branding/paths'

const variantClass = {
  /** Top app bar: scales with breakpoints, never overflows row */
  header: 'h-7 max-h-8 w-auto max-w-[min(100%,200px)] sm:h-9 sm:max-h-10 sm:max-w-[min(100%,240px)]',
  /** Desktop sidebar strip */
  sidebar: 'h-8 w-auto max-w-full sm:h-9',
  /** Login / marketing hero */
  auth: 'h-12 w-auto max-w-[min(92vw,280px)] sm:h-14 sm:max-w-[320px]',
  /** Settings footer, small chrome */
  footer: 'h-6 w-auto max-w-[140px] sm:h-7 sm:max-w-[160px]',
} as const

export type StellerBrandLogoVariant = keyof typeof variantClass

export function StellerBrandLogo({
  variant = 'header',
  className,
}: {
  variant?: StellerBrandLogoVariant
  className?: string
}) {
  return (
    <img
      src={STELLER_LOGO_PNG}
      alt="STELLER"
      decoding="async"
      loading="eager"
      className={cn('shrink-0 object-contain object-left', variantClass[variant], className)}
    />
  )
}
