import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes/AppRoutes'
import { ToastStack } from './components/ui/ToastStack'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const hydrate = useAppStore((s) => s.hydrate)
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <BrowserRouter>
      <AppRoutes />
      <ToastStack />
    </BrowserRouter>
  )
}
