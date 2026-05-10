/**
 * Google Apps Script Web App client — fetch + application/x-www-form-urlencoded POST.
 * No custom Content-Type, no JSON body, no axios → avoids CORS preflight (OPTIONS).
 */
import type {
  ActivityLog,
  DashboardPayload,
  MaintenanceRecord,
  Product,
  Rental,
  SheetAction,
} from '../types'
import { normalizeDashboardPayload } from '../utils/productNormalize'

const REQUEST_TIMEOUT_MS = 45_000

const LOG = '[StellarScan/API]'

/** Apps Script often returns HTTP 200 with `{ success: false, message }` in the body. */
function assertAppsScriptSuccess(data: unknown): void {
  if (!data || typeof data !== 'object') return
  const o = data as Record<string, unknown>
  if (o.success === false) {
    const msg = String(o.message ?? 'Request failed')
    console.error(LOG, 'Apps Script returned success:false', { message: msg, raw: data })
    throw new Error(msg)
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET'
  const ctl = new AbortController()
  const tid = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS)
  try {
    let res: Response
    try {
      res = await fetch(url, {
        ...init,
        signal: ctl.signal,
      })
    } catch (err) {
      console.error(LOG, 'Network / fetch failed', { url, method, error: err })
      throw err instanceof Error ? err : new Error(String(err))
    }

    const text = await res.text()

    if (!res.ok) {
      console.error(LOG, 'HTTP error response', {
        url,
        method,
        status: res.status,
        bodyPreview: text.slice(0, 800),
      })
      throw new Error(text?.trim() || `HTTP ${res.status}`)
    }

    let data: T
    try {
      data = JSON.parse(text) as T
    } catch (parseErr) {
      console.error(LOG, 'Response is not valid JSON (wrong URL, login page, or deployment issue)', {
        url,
        method,
        bodyPreview: text.slice(0, 800),
        parseError: parseErr,
      })
      throw new Error('Apps Script did not return JSON. Open DevTools → Network and inspect the request.')
    }

    assertAppsScriptSuccess(data)
    return data
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(LOG, 'Request timed out', { url, method, timeoutMs: REQUEST_TIMEOUT_MS })
    }
    throw err
  } finally {
    clearTimeout(tid)
  }
}

/** POST form fields. Do not set Content-Type — browser sets application/x-www-form-urlencoded. */
export async function postFormUrlEncoded(
  apiUrl: string,
  fields: Record<string, string | number | undefined | null>,
): Promise<unknown> {
  const form = new URLSearchParams()
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue
    form.append(key, String(value))
  }
  return fetchJson<unknown>(apiUrl, {
    method: 'POST',
    body: form,
  })
}

function actionUrl(apiUrl: string, action: string): string {
  const u = new URL(apiUrl)
  u.searchParams.set('action', action)
  return u.toString()
}

/** Many GAS endpoints return JSON with stringified `data` / `result` or a single array under `rows` / `items`. */
function parseJsonIfString(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const s = value.trim()
  if (!s.startsWith('{') && !s.startsWith('[')) return value
  try {
    return JSON.parse(s) as unknown
  } catch {
    return value
  }
}

const META_KEYS = new Set(['success', 'message', 'error', 'status', 'code', 'ok', 'timestamp', 'title'])

/** Alternate property names seen in Apps Script / Sheets tutorials (per entity). */
const ARRAY_ALIASES: Record<string, string[]> = {
  products: ['rows', 'items', 'records', 'list', 'values', 'result', 'products'],
  rentals: ['rows', 'items', 'records', 'list', 'values', 'result', 'rentals'],
  maintenance: ['rows', 'items', 'records', 'list', 'values', 'result', 'maintenance'],
  activityLogs: ['rows', 'items', 'records', 'list', 'values', 'activities', 'logs', 'activity', 'activityLogs'],
}

function tryAliasesInContainer<T>(
  container: Record<string, unknown>,
  primaryKey: string,
  actionLabel: string,
  path: string,
): T[] | null {
  for (const alt of ARRAY_ALIASES[primaryKey] ?? []) {
    if (alt === primaryKey) continue
    const v = parseJsonIfString(container[alt])
    if (Array.isArray(v)) {
      console.info(LOG, `Resolved list from ${path}.${alt} → "${primaryKey}" (${actionLabel})`)
      return v as T[]
    }
  }
  return null
}

function soleNonMetaArray<T>(container: Record<string, unknown>, actionLabel: string, path: string): T[] | null {
  const arrays = Object.entries(container).filter(
    ([k, val]) => !META_KEYS.has(k) && Array.isArray(val),
  )
  if (arrays.length !== 1) return null
  console.info(LOG, `Resolved sole array "${arrays[0][0]}" (${path}) (${actionLabel})`)
  return arrays[0][1] as T[]
}

function unwrapArray<T>(raw: unknown, key: string, actionLabel: string): T[] {
  raw = parseJsonIfString(raw)
  if (Array.isArray(raw)) return raw as T[]
  if (!raw || typeof raw !== 'object') return []

  const o = raw as Record<string, unknown>

  let direct = parseJsonIfString(o[key])
  if (Array.isArray(direct)) return direct as T[]

  for (const wrap of ['data', 'result', 'payload', 'response', 'body'] as const) {
    if (!(wrap in o)) continue
    let inner = parseJsonIfString(o[wrap])
    if (Array.isArray(inner)) {
      console.info(LOG, `Resolved list from "${wrap}" array (${actionLabel})`)
      return inner as T[]
    }
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const io = inner as Record<string, unknown>
      const nested = parseJsonIfString(io[key])
      if (Array.isArray(nested)) {
        console.info(LOG, `Resolved list from ${wrap}.${key} (${actionLabel})`)
        return nested as T[]
      }
      const fromAliases = tryAliasesInContainer<T>(io, key, actionLabel, wrap)
      if (fromAliases) return fromAliases
      const sole = soleNonMetaArray<T>(io, actionLabel, wrap)
      if (sole) return sole
    }
  }

  const topAliases = tryAliasesInContainer<T>(o, key, actionLabel, 'root')
  if (topAliases) return topAliases

  const topSole = soleNonMetaArray<T>(o, actionLabel, 'root')
  if (topSole) return topSole

  console.warn(LOG, `Unexpected JSON shape for ${actionLabel}`, {
    topLevelKeys: Object.keys(o),
    preview: JSON.stringify(o).slice(0, 500),
    hint: `Expected "${key}" array (or stringified JSON), or a common alias (rows/items/records), or data.${key}.`,
  })
  return []
}

export async function getProducts(apiUrl: string): Promise<Product[]> {
  const data = await fetchJson<unknown>(actionUrl(apiUrl, 'getProducts'))
  return unwrapArray<Product>(data, 'products', 'getProducts')
}

export async function getRentals(apiUrl: string): Promise<Rental[]> {
  const data = await fetchJson<unknown>(actionUrl(apiUrl, 'getRentals'))
  return unwrapArray<Rental>(data, 'rentals', 'getRentals')
}

export async function getMaintenance(apiUrl: string): Promise<MaintenanceRecord[]> {
  const data = await fetchJson<unknown>(actionUrl(apiUrl, 'getMaintenance'))
  return unwrapArray<MaintenanceRecord>(data, 'maintenance', 'getMaintenance')
}

export async function getActivities(apiUrl: string): Promise<ActivityLog[]> {
  const data = await fetchJson<unknown>(actionUrl(apiUrl, 'getActivities'))
  return unwrapArray<ActivityLog>(data, 'activityLogs', 'getActivities')
}

export async function loadFullDashboard(apiUrl: string): Promise<DashboardPayload> {
  try {
    const [products, rentals, maintenance, activityLogs] = await Promise.all([
      getProducts(apiUrl),
      getRentals(apiUrl),
      getMaintenance(apiUrl),
      getActivities(apiUrl),
    ])
    const payload = normalizeDashboardPayload({ products, rentals, maintenance, activityLogs })
    console.info(LOG, 'Dashboard fetch OK', {
      endpoint: apiUrl,
      counts: {
        products: products.length,
        rentals: rentals.length,
        maintenance: maintenance.length,
        activityLogs: activityLogs.length,
      },
    })
    if (
      products.length === 0 &&
      rentals.length === 0 &&
      maintenance.length === 0 &&
      activityLogs.length === 0
    ) {
      console.warn(
        LOG,
        'All lists are empty after fetch. Either the sheet has no data rows yet, or the script returns a different JSON shape — see warnings above.',
      )
    }
    return payload
  } catch (err) {
    console.error(LOG, 'loadFullDashboard failed', { endpoint: apiUrl, error: err })
    throw err
  }
}

function extractDashboardFromPostResult(raw: unknown): DashboardPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (
    Array.isArray(o.products) &&
    Array.isArray(o.rentals) &&
    Array.isArray(o.maintenance) &&
    Array.isArray(o.activityLogs)
  ) {
    return o as unknown as DashboardPayload
  }
  if (o.data && typeof o.data === 'object') {
    const d = o.data as Record<string, unknown>
    if (
      Array.isArray(d.products) &&
      Array.isArray(d.rentals) &&
      Array.isArray(d.maintenance) &&
      Array.isArray(d.activityLogs)
    ) {
      return d as unknown as DashboardPayload
    }
  }
  return null
}

/** Run mutation POST; if response includes full snapshot, return it; caller may still refetch. */
export async function postSheetMutation(
  apiUrl: string,
  fields: Record<string, string | number | undefined | null>,
): Promise<DashboardPayload | null> {
  const raw = await postFormUrlEncoded(apiUrl, fields)
  const d = extractDashboardFromPostResult(raw)
  return d ? normalizeDashboardPayload(d) : null
}

export async function executeMutationFromSheetAction(
  apiUrl: string,
  action: SheetAction,
): Promise<DashboardPayload | null> {
  switch (action.action) {
    case 'fetchAll':
      return null
    case 'addProduct': {
      const p = action.payload
      return postSheetMutation(apiUrl, {
        action: 'addProduct',
        productName: p.productName,
        category: p.category,
        brand: p.brand,
        modelNumber: p.modelNumber,
        serialNumber: p.serialNumber,
        rentalPrice: p.rentalPrice,
        image: p.image,
        status: p.status ?? 'available',
      })
    }
    case 'rentOut': {
      const p = action.payload
      return postSheetMutation(apiUrl, {
        action: 'rentProduct',
        productId: p.productId,
        customerName: p.customerName,
        phone: p.phone,
        expectedReturnDate: p.expectedReturnDate,
        advanceAmount: p.advanceAmount,
        notes: p.notes,
      })
    }
    case 'returnProduct': {
      const p = action.payload
      return postSheetMutation(apiUrl, {
        action: 'returnProduct',
        productId: p.productId,
        rentalId: p.rentalId,
        finalBill: p.finalBill,
        extraCharges: p.extraCharges,
        notes: p.notes,
        returnedAt: p.returnedAt,
        returnKind: p.returnKind,
      })
    }
    case 'sendToMaintenance': {
      const p = action.payload
      return postSheetMutation(apiUrl, {
        action: 'markMaintenance',
        productId: p.productId,
        givenTo: p.givenTo,
        issue: p.issue,
        estimatedCompletion: p.estimatedCompletion,
        notes: p.notes,
      })
    }
    case 'completeMaintenance': {
      const p = action.payload
      return postSheetMutation(apiUrl, {
        action: 'completeMaintenance',
        productId: p.productId,
        maintenanceId: p.maintenanceId,
        repairCost: p.repairCost,
        notes: p.notes,
      })
    }
    case 'resetDemo':
      return null
  }
}
