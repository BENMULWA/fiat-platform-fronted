import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import AppLayout from './components/Layout/AppLayout'

// --- ADMIN PAGES ---
import DashboardPage from './pages/DashboardPage' // The Master Vault
import MarketMakerPage from './pages/MarketMakerPage'
import GeneralLedgerPage from './pages/GeneralLedgerPage'
import RatesInventoryPage from './pages/RatesInventoryPage'

// --- RETAIL PAGES ---
import TraderWorkspace from './pages/TradeWorkspace' // The Retail Wallet
import TradePage from './pages/TradePage'
import OnOffRampPage from './pages/OnOffRampPage'
import AirtimeLedgerPage from './pages/AirtimeLedgerPage'

// --- SHARED PAGES ---


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
      {/* 1. Default Route (Logs you into the Retail Wallet by default) */}
      <Route path="/" element={user ? <Navigate to="/wallet" replace /> : <LoginPage />} />

      {/* 2. Protected App Layout containing our sidebar and content */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* --- RETAIL ROUTES --- */}
        <Route path="wallet" element={<TraderWorkspace />} />
        <Route path="trade" element={<TradePage />} />
        <Route path="ramp" element={<OnOffRampPage />} />

        {/* --- ADMIN ROUTES --- */}
        <Route path="vault" element={<DashboardPage />} />
        <Route path="market-maker" element={<MarketMakerPage />} />
        <Route path="general-ledger" element={<GeneralLedgerPage />} />
        <Route path="rates" element={<RatesInventoryPage />} />

        {/* --- SHARED ROUTES --- */}
        <Route path="airtime-ledger" element={<AirtimeLedgerPage />} />
      </Route>

      {/* 3. Catch-all: If user types a bad URL, send them back to their wallet */}
      <Route path="*" element={<Navigate to="/wallet" replace />} />
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