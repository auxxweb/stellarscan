/** Money / amount fields: required, finite, strictly greater than zero. */
export function parsePositiveMoney(
  raw: string,
  fieldLabel: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const t = raw.trim()
  if (t === '') {
    return { ok: false, message: `${fieldLabel} is required.` }
  }
  const n = Number(t.replace(/,/g, ''))
  if (!Number.isFinite(n)) {
    return { ok: false, message: `${fieldLabel} must be a valid number.` }
  }
  if (n <= 0) {
    return { ok: false, message: `${fieldLabel} must be greater than zero.` }
  }
  return { ok: true, value: n }
}

/** Money fields: required, finite, zero or positive (e.g. total bill with waiver). */
export function parseNonNegativeMoney(
  raw: string,
  fieldLabel: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const t = raw.trim()
  if (t === '') {
    return { ok: false, message: `${fieldLabel} is required.` }
  }
  const n = Number(t.replace(/,/g, ''))
  if (!Number.isFinite(n)) {
    return { ok: false, message: `${fieldLabel} must be a valid number.` }
  }
  if (n < 0) {
    return { ok: false, message: `${fieldLabel} cannot be negative.` }
  }
  return { ok: true, value: n }
}

/** Apps Script web app URL shape (approximate). */
export function isValidAppsScriptExecUrl(url: string): boolean {
  const u = url.trim()
  if (!u) return false
  try {
    const parsed = new URL(u)
    return parsed.protocol === 'https:' && parsed.pathname.toLowerCase().includes('exec')
  } catch {
    return false
  }
}
