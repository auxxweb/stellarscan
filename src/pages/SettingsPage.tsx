import { useMemo, useState } from 'react'
import { GlassCard } from '../components/ui/GlassCard'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  DEFAULT_APPS_SCRIPT_URL,
  getSheetEndpointOverride,
  setSheetEndpoint,
  clearLocalCache,
} from '../services/sheetApi'
import { useAppStore } from '../store/useAppStore'
import { useToastStore } from '../store/useToastStore'
import { isValidAppsScriptExecUrl } from '../utils/validation'
import { StellerBrandLogo } from '../components/branding/StellerBrandLogo'
import { APP_BRAND_NAME, APP_TAGLINE } from '../branding/paths'

export function SettingsPage() {
  const replaceAll = useAppStore((s) => s.replaceAll)
  const hydrate = useAppStore((s) => s.hydrate)
  const pushToast = useToastStore((s) => s.push)

  const [endpoint, setEndpoint] = useState(() => {
    const saved = getSheetEndpointOverride()
    return saved || DEFAULT_APPS_SCRIPT_URL
  })
  const [resetOpen, setResetOpen] = useState(false)

  const mode = useMemo(() => {
    const saved = getSheetEndpointOverride()
    return saved && saved !== DEFAULT_APPS_SCRIPT_URL ? 'Custom Apps Script URL' : 'Default Apps Script (built-in)'
  }, [endpoint])

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-sky-700">Control panel</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Connect your Apps Script endpoint. Data comes from your sheet only.</p>
      </div>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900">Google Apps Script API</div>
        <p className="mt-2 text-sm text-slate-600">
          The app talks to your Web App with <span className="font-semibold">GET query params</span> and{' '}
          <span className="font-semibold">POST application/x-www-form-urlencoded</span> bodies (no JSON preflight). Deploy the script in{' '}
          <span className="font-mono">google-apps-script/Code.gs</span> and set <span className="font-mono">SPREADSHEET_ID</span> in Script
          properties. URL ends with <span className="font-mono">/exec</span>.
        </p>
        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold text-slate-600">Endpoint</label>
          <Input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder={DEFAULT_APPS_SCRIPT_URL}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                const url = endpoint.trim()
                if (!isValidAppsScriptExecUrl(url)) {
                  pushToast('Enter a valid https Apps Script Web App URL (must include …/exec).', 'error')
                  return
                }
                setSheetEndpoint(url)
                pushToast('Endpoint saved. Refreshing…', 'success')
                void hydrate()
              }}
            >
              Save & refresh
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEndpoint(DEFAULT_APPS_SCRIPT_URL)
                setSheetEndpoint('')
                pushToast('Restored built-in production endpoint.', 'info')
                void hydrate()
              }}
            >
              Use default endpoint
            </Button>
          </div>
          <div className="text-xs text-slate-600">
            Mode: <span className="font-semibold text-slate-900">{mode}</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900">Local cache</div>
        <p className="mt-2 text-sm text-slate-600">
          Clear saved data in this browser (your Google Sheet is unchanged). Use this if the UI looks out of sync, then tap Save &amp; refresh.
        </p>
        <div className="mt-4">
          <Button type="button" variant="danger" onClick={() => setResetOpen(true)}>
            Clear local cache
          </Button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900">App info</div>
        <div className="mt-3 flex flex-col gap-3 text-sm text-slate-700 sm:flex-row sm:items-center">
          <StellerBrandLogo variant="footer" />
          <div>
            <div className="font-semibold text-slate-900">
              {APP_BRAND_NAME} — {APP_TAGLINE}
            </div>
            <div className="text-slate-600">v1.0.0 · Installable PWA · QR-first workflows · Sheet-ready architecture</div>
          </div>
        </div>
      </GlassCard>

      <ConfirmDialog
        open={resetOpen}
        title="Clear local cache?"
        message="This removes the saved copy of your sheet data from this browser only. Your Google Sheet is not modified. Reload from Settings afterward."
        confirmLabel="Clear"
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          const data = clearLocalCache()
          replaceAll(data)
          void hydrate()
          pushToast('Local cache cleared. Syncing…', 'success')
        }}
      />
    </div>
  )
}
