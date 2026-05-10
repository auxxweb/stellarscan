/** Matches Apps Script `addProduct`: STELLAR- + first 10 chars of id with hyphens removed. */
export function deriveStellarQrCodeFromProductId(id: string): string {
  return `STELLAR-${id.replace(/-/g, '').slice(0, 10).toUpperCase()}`
}
