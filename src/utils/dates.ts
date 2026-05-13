export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Converts `<input type="date">` value (`YYYY-MM-DD`) to a stable UTC ISO string.
 * Avoids `datetime-local` parsing quirks and `Invalid Date` when the field is empty.
 */
export function isoFromDateOnlyInput(ymd: string): string | null {
  const s = ymd.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return `${s}T12:00:00.000Z`
}

/** Seed `<input type="date">` from an ISO timestamp or existing `YYYY-MM-DD`. */
export function dateOnlyInputFromIso(isoOrYmd: string): string {
  if (!isoOrYmd) return ''
  const head = isoOrYmd.trim().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head
  const parsed = new Date(isoOrYmd)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
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

/**
 * Whole calendar days from checkout through return, inclusive (uses date parts only).
 * Minimum 1 day. Aligns with per-day rentalPrice on products.
 */
export function inclusiveBillableDays(startIso: string, endIso: string): number {
  const startHead = startIso.trim().slice(0, 10)
  const endHead = endIso.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startHead) || !/^\d{4}-\d{2}-\d{2}$/.test(endHead)) return 1
  const startMs = Date.parse(`${startHead}T12:00:00.000Z`)
  const endMs = Date.parse(`${endHead}T12:00:00.000Z`)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 1
  const diffDays = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000))
  return Math.max(1, diffDays + 1)
}
