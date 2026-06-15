import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import AppLayout from './components/Layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import MarketMakerPage from './pages/MarketMakerPage'
import TradePage from './pages/TradePage'
import OnOffRampPage from './pages/OnOffRampPage'
import AirtimeLedgerPage from './pages/AirtimeLedgerPage'
import GeneralLedgerPage from './pages/GeneralLedgerPage'
import RatesInventoryPage from './pages/RatesInventoryPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return user ? <>{children}</> : <Navigate to="/" replace />
}

function AppRoutes() {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="market-maker" element={<MarketMakerPage />} />
        <Route path="trade" element={<TradePage />} />
        <Route path="ramp" element={<OnOffRampPage />} />
        <Route path="airtime-ledger" element={<AirtimeLedgerPage />} />
        <Route path="general-ledger" element={<GeneralLedgerPage />} />
        <Route path="rates" element={<RatesInventoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
