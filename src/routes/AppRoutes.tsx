import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../components/auth/RequireAuth'
import { MainLayout } from '../layouts/MainLayout'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { ProductsPage } from '../pages/ProductsPage'
import { RentalsPage } from '../pages/RentalsPage'
import { MaintenancePage } from '../pages/MaintenancePage'
import { ActivityHistoryPage } from '../pages/ActivityHistoryPage'
import { ScannerPage } from '../pages/ScannerPage'
import { GeneratorPage } from '../pages/GeneratorPage'
import { SettingsPage } from '../pages/SettingsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="rentals" element={<RentalsPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="activity" element={<ActivityHistoryPage />} />
        <Route path="scanner" element={<ScannerPage />} />
        <Route path="generator" element={<GeneratorPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
