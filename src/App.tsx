import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import AppLayout from './components/Layout/AppLayout'

// --- ADMIN PAGES ---
import DashboardPage from './pages/DashboardPage'
import MarketMakerPage from './pages/MarketMakerPage'
import GeneralLedgerPage from './pages/GeneralLedgerPage'
import RatesInventoryPage from './pages/RatesInventoryPage'

// --- RETAIL PAGES (Sourced perfectly from /pages/retail/) ---
import RetailDashboardPage from './pages/retail/RetailDashboardPage'
import WalletsPage from './pages/retail/WalletsPage'
import TradePage from './pages/retail/TradePage'
import KYCpage from './pages/retail/KYCpage'

// Named Exports (Require Curly Braces based on how they were written)
import  DepositPage  from './pages/retail/DepositPage'
import { WithdrawPage } from './pages/retail/WithdrawPage'
import { RedeemAirtimePage } from './pages/retail/RedeemAirtimePage'
import { ImpalaCoinPage } from './pages/retail/ImpalaCoinPage'
import { TransactionsPage } from './pages/retail/TransactionsPage'
import { ProfilePage } from './pages/retail/ProfilePage'

// ------------------------------------------------------------------
// GUARDS
// ------------------------------------------------------------------

// Normal Guard (Must be logged in to view basic pages like Dashboard/Profile)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return user ? <>{children}</> : <Navigate to="/" replace />
}

// Strict Guard (Must be logged in AND KYC Verified to view financial pages)
function KycProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace />

  // STRICT CHECK: Absolutely no admin bypass. You MUST be verified.
  if (user.kycStatus !== 'verified') {
    return <Navigate to="/kyc" replace />
  }

  return <>{children}</>
}

// ------------------------------------------------------------------
// ROUTER CONFIGURATION
// ------------------------------------------------------------------

function AppRoutes() {
  const { user, isLoading, viewAsAdmin } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Default Landing Page */}
      <Route path="/" element={user ? <Navigate to={viewAsAdmin ? "/vault" : "/dashboard"} replace /> : <LoginPage />} />

      {/* Authenticated App Layout */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>

        {/* ==========================================
            RETAIL ROUTES
        ========================================== */}

        {/* SAFE ROUTES: Can be viewed by unverified users */}
        <Route path="dashboard" element={<RetailDashboardPage />} />
        <Route path="wallets" element={<WalletsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="kyc" element={<KYCpage />} />

        {/* DANGER ROUTES: Protected by STRICT KYC Wall */}
        <Route path="deposit" element={<KycProtectedRoute><DepositPage /></KycProtectedRoute>} />
        <Route path="withdraw" element={<KycProtectedRoute><WithdrawPage /></KycProtectedRoute>} />
        <Route path="swap" element={<KycProtectedRoute><TradePage /></KycProtectedRoute>} />
        <Route path="redeem-airtime" element={<KycProtectedRoute><RedeemAirtimePage /></KycProtectedRoute>} />
        <Route path="impala-coin" element={<KycProtectedRoute><ImpalaCoinPage /></KycProtectedRoute>} />

        {/* ==========================================
            ADMIN ROUTES
        ========================================== */}
        <Route path="vault" element={<DashboardPage />} />
        <Route path="market-maker" element={<MarketMakerPage />} />
        <Route path="general-ledger" element={<GeneralLedgerPage />} />
        <Route path="rates" element={<RatesInventoryPage />} />

      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<Navigate to={viewAsAdmin ? "/vault" : "/dashboard"} replace />} />
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