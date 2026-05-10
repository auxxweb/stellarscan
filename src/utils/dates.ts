export function nowIso(): string {
  return new Date().toISOString()
}

export function computeReturnKind(expectedReturnIso: string, returnedAtIso: string): 'early' | 'on_time' | 'delayed' {
  const expected = new Date(expectedReturnIso).getTime()
  const returned = new Date(returnedAtIso).getTime()
  const graceMs = 15 * 60 * 1000
  const earlyThresholdMs = 60 * 60 * 1000

  if (returned > expected + graceMs) return 'delayed'
  if (expected - returned > earlyThresholdMs) return 'early'
  return 'on_time'
}

export function formatDisplayDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

export function isReturnDelayed(expectedReturnIso: string): boolean {
  if (!expectedReturnIso) return false
  const expected = new Date(expectedReturnIso).getTime()
  return Date.now() > expected
}
