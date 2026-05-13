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
/** Multi-row rents do several sheet writes; slow spreadsheets can exceed the default fetch timeout. */
const MUTATION_TIMEOUT_MS = 120_000

const LOG = '[StellarScan/API]'

/** UTF-8 → base64 for `productIdsB64` (Apps Script `Utilities.base64Decode`). */
function stringToBase64Utf8(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

/** Apps Script often returns HTTP 200 with `{ success: false, message }` in the body. */
function appsScriptFailureMessage(o: Record<string, unknown>): string {
  const candidates = [o.message, o.error, o.detail, (o as { description?: unknown }).description]
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c).trim()
  }
  const errs = (o as { errors?: unknown }).errors
  if (Array.isArray(errs) && errs.length) return errs.map((x) => String(x)).join('; ')
  try {
    const { success: _s, ok: _o, ...rest } = o
    const keys = Object.keys(rest)
    if (keys.length) return `Apps Script error: ${JSON.stringify(rest)}`
  } catch {
    /* ignore */
  }
  return 'Apps Script returned success: false (no message). Redeploy Code.gs and check Executions in Apps Script.'
}

function assertAppsScriptSuccess(data: unknown): void {
  if (!data || typeof data !== 'object') return
  const o = data as Record<string, unknown>
  const failed =
    o.success === false || o.success === 'false' || o.ok === false || o.ok === 'false'
  if (failed) {
    const msg = appsScriptFailureMessage(o)
    console.error(LOG, 'Apps Script returned success:false', { message: msg, raw: data })
    throw new Error(msg)
  }
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  options?: { timeoutMs?: number },
): Promise<T> {
  const method = init?.method ?? 'GET'
  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS
  const ctl = new AbortController()
  const tid = setTimeout(() => ctl.abort(), timeoutMs)
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
      console.error(LOG, 'Request timed out', { url, method, timeoutMs })
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
  options?: { timeoutMs?: number },
): Promise<unknown> {
  const form = new URLSearchParams()
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue
    form.append(key, String(value))
  }
  return fetchJson<unknown>(
    apiUrl,
    {
      method: 'POST',
      body: form,
    },
    { timeoutMs: options?.timeoutMs },
  )
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
  activityLogs: [
    'rows',
    'items',
    'records',
    'list',
    'values',
    'activities',
    'activity',
    'activityLog',
    'activity_logs',
    'logs',
    'activityLogs',
  ],
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
    /** Single round-trip when Apps Script supports `getDashboard` (faster, less Apps Script execution quota). */
    try {
      const bundle = await fetchJson<unknown>(actionUrl(apiUrl, 'getDashboard'))
      const o = bundle as Record<string, unknown>
      if (
        Array.isArray(o.products) &&
        Array.isArray(o.rentals) &&
        Array.isArray(o.maintenance) &&
        Array.isArray(o.activityLogs)
      ) {
        const payload = normalizeDashboardPayload(o as unknown as DashboardPayload)
        console.info(LOG, 'Dashboard fetch OK (single getDashboard)', {
          endpoint: apiUrl,
          counts: {
            products: payload.products.length,
            rentals: payload.rentals.length,
            maintenance: payload.maintenance.length,
            activityLogs: payload.activityLogs.length,
          },
        })
        return payload
      }
    } catch {
      /* Deployed script may be older — fall back to parallel GETs */
    }

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

/**
 * Run mutation POST. Puts `action` in the query string so Apps Script always receives it even if
 * form-body parsing is flaky; body still carries payload fields.
 */
export async function postSheetMutation(
  apiUrl: string,
  actionName: string,
  fields: Record<string, string | number | undefined | null>,
): Promise<DashboardPayload | null> {
  const url = new URL(apiUrl)
  url.searchParams.set('action', actionName)
  const raw = await postFormUrlEncoded(
    url.toString(),
    { ...fields, action: actionName },
    { timeoutMs: MUTATION_TIMEOUT_MS },
  )
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
      return postSheetMutation(apiUrl, 'addProduct', {
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
      const dueIso = p.expectedReturnDate
      const ids = Array.isArray(p.productIds) ? p.productIds.filter(Boolean) : []
      const productIdsJson = JSON.stringify(ids)
      let productIdsB64 = ''
      try {
        productIdsB64 = stringToBase64Utf8(productIdsJson)
      } catch {
        /* fall back to productIds / productIdsJson only */
      }
      const productIdsField = ids.join(',')
      const namesArr = Array.isArray(p.productNames) ? p.productNames.map((n) => String(n ?? '').trim()) : []
      const productNamesCsv =
        namesArr.length === ids.length
          ? namesArr.map((n) => n.replace(/,/g, ' ')).join(',')
          : ''
      const productNamesJson = namesArr.length === ids.length ? JSON.stringify(namesArr) : ''
      return postSheetMutation(apiUrl, 'rentProduct', {
        productIdsB64,
        productIds: productIdsField,
        productIdsJson,
        productNames: productNamesCsv,
        productNamesJson,
        rentalGroupId: p.groupId ?? '',
        groupId: p.groupId ?? '',
        productId: ids[0] ?? '',
        customerName: p.customerName,
        phone: p.phone,
        /** Rentals sheet column `expectedReturn` */
        expectedReturn: dueIso,
        expectedReturnDate: dueIso,
        advanceAmount: p.advanceAmount ?? 0,
        notes: p.notes ?? '',
      })
    }
    case 'returnProduct': {
      const p = action.payload
      return postSheetMutation(apiUrl, 'returnProduct', {
        productId: p.productId,
        rentalLineId: p.rentalLineId,
        lineId: p.rentalLineId,
        rentalId: p.rentalLineId,
        /** Rentals sheet column `billAmount` */
        billAmount: p.finalBill,
        finalBill: p.finalBill,
        extraCharges: p.extraCharges ?? 0,
        notes: p.notes,
        returnedAt: p.returnedAt,
        returnKind: p.returnKind,
      })
    }
    case 'sendToMaintenance': {
      const p = action.payload
      const eta = p.estimatedCompletion
      return postSheetMutation(apiUrl, 'markMaintenance', {
        productId: p.productId,
        givenTo: p.givenTo,
        issue: p.issue,
        /** Sheet column is `expectedCompletion`; send both param names for Apps Script. */
        estimatedCompletion: eta,
        expectedCompletion: eta,
        notes: p.notes ?? '',
      })
    }
    case 'completeMaintenance': {
      const p = action.payload
      const cost = p.repairCost
      return postSheetMutation(apiUrl, 'completeMaintenance', {
        productId: p.productId,
        maintenanceId: p.maintenanceId,
        repairCost: cost,
        cost,
        notes: p.notes ?? '',
      })
    }
    case 'resetDemo':
      return postSheetMutation(apiUrl, 'resetDemo', {})
  }
}
