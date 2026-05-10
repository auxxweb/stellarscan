/**
 * Orchestrates Google Apps Script + local fallback.
 * All remote I/O uses fetch + URLSearchParams (see googleScriptApi.ts).
 */
import type { DashboardPayload, SheetAction } from '../types'
import { normalizeDashboardPayload } from '../utils/productNormalize'
import { applySheetAction, loadLocalDataset, resetLocalDataset, saveLocalDataset } from './localStore'
import {
  executeMutationFromSheetAction,
  getActivities,
  getMaintenance,
  getProducts,
  getRentals,
  loadFullDashboard,
  postFormUrlEncoded,
} from './googleScriptApi'

export { getActivities, getMaintenance, getProducts, getRentals, loadFullDashboard, postFormUrlEncoded }

const SETTINGS_KEY = 'stellar-sheet-endpoint'

/** Production Apps Script Web App — used when no custom URL is saved in Settings. */
export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxeNfAkg1gELsIB6q9XoMbF7c2NQVzfXhnDL1e6jDPhCSgZL3RlYKJTD3VZkpLHC5KEQA/exec'

export function getSheetEndpointOverride(): string {
  return localStorage.getItem(SETTINGS_KEY)?.trim() ?? ''
}

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

export async function refreshAll(): Promise<DashboardPayload> {
  const endpoint = getSheetEndpoint()
  try {
    const data = await loadFullDashboard(endpoint)
    saveLocalDataset(data)
    return data
  } catch (err) {
    console.error('[StellarScan/sheetApi] refreshAll failed', { endpoint, error: err })
    throw err
  }
}

/**
 * Apply mutation to local cache synchronously (instant UI). Caller updates Zustand immediately.
 */
export function applyOptimisticAction(action: SheetAction): DashboardPayload {
  const next = normalizeDashboardPayload(applySheetAction(loadLocalDataset(), action))
  saveLocalDataset(next)
  return next
}

/**
 * Push mutation to Google Sheets and return server snapshot. Slow — call in background after optimistic UI.
 */
export async function syncMutationToRemote(action: SheetAction): Promise<DashboardPayload> {
  const endpoint = getSheetEndpoint()

  try {
    if (action.action !== 'fetchAll') {
      const snapshot = await executeMutationFromSheetAction(endpoint, action)
      if (snapshot && Array.isArray(snapshot.products)) {
        saveLocalDataset(snapshot)
        return snapshot
      }
    }
    const data = await loadFullDashboard(endpoint)
    saveLocalDataset(data)
    return data
  } catch (err) {
    console.error('[StellarScan/sheetApi] syncMutationToRemote failed', {
      action: action.action,
      endpoint,
      error: err,
    })
    throw err
  }
}

/** Clears cached sheet snapshot in this browser (does not modify Google Sheets). */
export function clearLocalCache(): DashboardPayload {
  return resetLocalDataset()
}

/** @deprecated Use clearLocalCache */
export function resetDemoData(): DashboardPayload {
  return clearLocalCache()
}
