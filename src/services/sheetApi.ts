/**
 * Orchestrates Google Apps Script + local fallback.
 * All remote I/O uses fetch + URLSearchParams (see googleScriptApi.ts).
 */
import type { DashboardPayload, SheetAction } from '../types'
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

export async function executeAction(action: SheetAction): Promise<DashboardPayload> {
  if (action.action === 'resetDemo') {
    const next = applySheetAction(loadLocalDataset(), action)
    saveLocalDataset(next)
    return next
  }

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
    console.error('[StellarScan/sheetApi] executeAction remote failed, applying local fallback', {
      action: action.action,
      endpoint,
      error: err,
    })
    const current = loadLocalDataset()
    return applySheetAction(current, action)
  }
}

/** Resets the bundled demo dataset locally only (deployed script may not expose `resetDemo`). */
export function resetDemoData(): DashboardPayload {
  return resetLocalDataset()
}
