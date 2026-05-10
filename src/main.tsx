import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

try {
  localStorage.removeItem('stellar-theme')
} catch {
  /* ignore */
}
document.documentElement.classList.remove('dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker + Workbox break Vite dev navigations (/products, /generator refresh). Register only in production.
if (import.meta.env.PROD) {
  registerSW({ immediate: true })
}
