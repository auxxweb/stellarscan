import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes/AppRoutes'
import { ToastStack } from './components/ui/ToastStack'

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <ToastStack />
    </BrowserRouter>
  )
}
