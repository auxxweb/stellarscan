/**
 * Google Apps Script Web App contract (recommended implementation)
 * ------------------------------------------------------------------
 * Deploy as Web app: Execute as Me, Anyone can access.
 *
 * doGet(e):
 *   if (e.parameter.action === 'fetchAll') return ContentService
 *     .createTextOutput(JSON.stringify({ products, rentals, maintenance, activityLogs }))
 *     .setMimeType(ContentService.MimeType.JSON);
 *
 * doPost(e):
 *   const body = JSON.parse(e.postData.contents);
 *   const { action, payload } = body;
 *   // Mirror the SheetAction union handled in src/services/localStore.ts applySheetAction
 *   // After mutations, return JSON { ok: true, data: { ...snapshot } } for instant UI refresh
 *
 * CORS: Google Apps Script does not reliably answer OPTIONS preflight. This client therefore:
 * - POSTs with Content-Type: text/plain and a JSON string body (simple request, no preflight).
 * - In dev, routes the default deployment through Vite's /apps-script-proxy (same-origin).
 * doPost should use: JSON.parse(e.postData.contents)
 */
import axios from 'axios'
import type { DashboardPayload, SheetAction } from '../types'
import { applySheetAction, loadLocalDataset, resetLocalDataset, saveLocalDataset } from './localStore'

const SETTINGS_KEY = 'stellar-sheet-endpoint'

/** Production Apps Script Web App — used when no custom URL is saved in Settings. */
export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxfYRTBY0mORYkffCx3qPUdecy7qvpBz2fyQbbQi3hD_wbiwJbdY8fzgakVP5HBaunLpQ/exec'

/** Optional override from Settings; empty means use {@link DEFAULT_APPS_SCRIPT_URL}. */
export function getSheetEndpointOverride(): string {
  return localStorage.getItem(SETTINGS_KEY)?.trim() ?? ''
}

/** URL used for all GET/POST calls to Sheets. */
export function getSheetEndpoint(): string {
  return getSheetEndpointOverride() || DEFAULT_APPS_SCRIPT_URL
}

export function setSheetEndpoint(url: string): void {
  const v = url.trim()
  if (!v || v === DEFAULT_APPS_SCRIPT_URL) {
    localStorage.removeItem(SETTINGS_KEY)
    return
  }
  localStorage.setItem(SETTINGS_KEY, v)
}

function isDashboardPayload(x: unknown): x is DashboardPayload {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    Array.isArray(o.products) &&
    Array.isArray(o.rentals) &&
    Array.isArray(o.maintenance) &&
    Array.isArray(o.activityLogs)
  )
}

/** Unwrap { data: DashboardPayload } or { success, data } from Apps Script. */
function extractDashboard(raw: unknown): DashboardPayload | null {
  if (isDashboardPayload(raw)) return raw
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    if (isDashboardPayload(o.data)) return o.data
  }
  return null
}

function normalizeBase(url: string): string {
  return url.replace(/\/$/, '')
}

function isDefaultUrlUsingDevProxy(canonicalUrl: string): boolean {
  return import.meta.env.DEV && normalizeBase(canonicalUrl) === normalizeBase(DEFAULT_APPS_SCRIPT_URL)
}

/** Resolved origin + path for axios (dev proxy for default URL, else direct Apps Script URL). */
function apiRootUrl(canonicalUrl: string): URL {
  if (isDefaultUrlUsingDevProxy(canonicalUrl)) {
    return new URL('/apps-script-proxy', window.location.origin)
  }
  return new URL(canonicalUrl)
}

function urlWithQueryAction(canonicalUrl: string, action: string): string {
  const u = apiRootUrl(canonicalUrl)
  u.searchParams.set('action', action)
  return u.toString()
}

/** Avoid application/json POST (triggers CORS preflight on script.google.com). */
const POST_AS_TEXT: { 'Content-Type': string } = {
  'Content-Type': 'text/plain;charset=UTF-8',
}

export async function fetchAllRemote(baseUrl: string): Promise<DashboardPayload> {
  const tryGet = async (action: string) => {
    const { data } = await axios.get<unknown>(urlWithQueryAction(baseUrl, action), { timeout: 45000 })
    return extractDashboard(data)
  }

  const tryPost = async (action: string) => {
    const { data } = await axios.post<unknown>(
      apiRootUrl(baseUrl).toString(),
      JSON.stringify({ action }),
      { timeout: 45000, headers: POST_AS_TEXT },
    )
    return extractDashboard(data)
  }

  for (const action of ['fetchAll', 'getData', 'getAll'] as const) {
    try {
      const payload = await tryGet(action)
      if (payload) return payload
    } catch {
      /* try next */
    }
  }
  for (const action of ['fetchAll', 'getData', 'getAll'] as const) {
    try {
      const payload = await tryPost(action)
      if (payload) return payload
    } catch {
      /* try next */
    }
  }

  throw new Error('Apps Script did not return products/rentals/maintenance/activityLogs')
}

export async function postActionRemote(baseUrl: string, body: SheetAction): Promise<DashboardPayload | undefined> {
  const { data } = await axios.post<unknown>(apiRootUrl(baseUrl).toString(), JSON.stringify(body), {
    timeout: 45000,
    headers: POST_AS_TEXT,
  })
  const direct = extractDashboard(data)
  if (direct) return direct
  if (data && typeof data === 'object') {
    const o = data as { ok?: boolean; data?: unknown }
    if (isDashboardPayload(o.data)) return o.data
  }
  return undefined
}

export async function executeAction(action: SheetAction): Promise<DashboardPayload> {
  const endpoint = getSheetEndpoint()

  try {
    const snapshot = await postActionRemote(endpoint, action)
    if (snapshot && Array.isArray(snapshot.products)) {
      saveLocalDataset(snapshot)
      return snapshot
    }
    const refreshed = await fetchAllRemote(endpoint)
    saveLocalDataset(refreshed)
    return refreshed
  } catch {
    const current = loadLocalDataset()
    return applySheetAction(current, action)
  }
}

export async function refreshAll(): Promise<DashboardPayload> {
  const endpoint = getSheetEndpoint()
  try {
    const data = await fetchAllRemote(endpoint)
    saveLocalDataset(data)
    return data
  } catch {
    return loadLocalDataset()
  }
}

export function resetDemoData(): DashboardPayload {
  const endpoint = getSheetEndpoint()
  const seed = resetLocalDataset()
  void postActionRemote(endpoint, { action: 'resetDemo', payload: seed }).catch(() => null)
  return seed
}
