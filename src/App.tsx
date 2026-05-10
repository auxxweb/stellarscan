import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes/AppRoutes'
import { ToastStack } from './components/ui/ToastStack'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const hydrate = useAppStore((s) => s.hydrate)

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
