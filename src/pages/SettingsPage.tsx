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

export function SettingsPage() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
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
        <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">Control panel</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Settings</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Connect your Apps Script endpoint and tune the UI. Data comes from your sheet only.</p>
      </div>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Google Apps Script API</div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          The app talks to your Web App with <span className="font-semibold">GET query params</span> and{' '}
          <span className="font-semibold">POST application/x-www-form-urlencoded</span> bodies (no JSON preflight). Deploy the script in{' '}
          <span className="font-mono">google-apps-script/Code.gs</span> and set <span className="font-mono">SPREADSHEET_ID</span> in Script
          properties. URL ends with <span className="font-mono">/exec</span>.
        </p>
        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Endpoint</label>
          <Input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder={DEFAULT_APPS_SCRIPT_URL}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                setSheetEndpoint(endpoint)
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
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Mode: <span className="font-semibold text-slate-900 dark:text-slate-100">{mode}</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Appearance</div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Switch between a bright desk mode and a cinematic dark console.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={() => setTheme('dark')}>
            Dark
          </Button>
          <Button type="button" variant={theme === 'light' ? 'primary' : 'secondary'} onClick={() => setTheme('light')}>
            Light
          </Button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Local cache</div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Clear saved data in this browser (your Google Sheet is unchanged). Use this if the UI looks out of sync, then tap Save &amp; refresh.
        </p>
        <div className="mt-4">
          <Button type="button" variant="danger" onClick={() => setResetOpen(true)}>
            Clear local cache
          </Button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">App info</div>
        <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <div>
            <span className="font-semibold">Stellar Camera Rentals</span> — v1.0.0
          </div>
          <div className="text-slate-600 dark:text-slate-400">Installable PWA • QR-first workflows • Sheet-ready architecture</div>
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
