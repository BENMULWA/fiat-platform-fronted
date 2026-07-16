// @ts-nocheck


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
import AirtimeLedgerPage from './pages/AirtimeLedgerPage'

// --- RETAIL PAGES ---
// Default Exports (No curly braces)
import RetailDashboardPage from './pages/retail/RetailDashboardPage'
import WalletsPage from './pages/retail/WalletsPage'
import TradePage from './pages/retail/TradePage'

// Named Exports (Requires curly braces {})
import { DepositPage } from './pages/retail/DepositPage'
import { WithdrawPage } from './pages/retail/WithdrawPage'
import { RedeemAirtimePage } from './pages/retail/RedeemAirtimePage'
import { ImpalaCoinPage } from './pages/retail/ImpalaCoinPage'
import { TransactionsPage } from './pages/retail/TransactionsPage'
import { ProfilePage } from './pages/retail/ProfilePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return user ? <>{children}</> : <Navigate to="/" replace />
}

function AppRoutes() {
  const { user, isLoading, viewAsAdmin } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={viewAsAdmin ? "/vault" : "/dashboard"} replace /> : <LoginPage />} />

      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>

        {/* --- RETAIL ROUTES --- */}
        <Route path="dashboard" element={<RetailDashboardPage />} />
        <Route path="wallet" element={<WalletsPage />} />
        <Route path="deposits" element={<DepositPage />} />
        <Route path="withdrawals" element={<WithdrawPage />} />
        <Route path="trade" element={<TradePage />} />
        <Route path="redeem-airtime" element={<RedeemAirtimePage />} />
        <Route path="mint-imp" element={<ImpalaCoinPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="profile" element={<ProfilePage />} />

        {/* --- ADMIN ROUTES --- */}
        <Route path="vault" element={<DashboardPage />} />
        <Route path="market-maker" element={<MarketMakerPage />} />
        <Route path="general-ledger" element={<GeneralLedgerPage />} />
        <Route path="airtime-ledger" element={<AirtimeLedgerPage />} />
        <Route path="rates" element={<RatesInventoryPage />} />
      </Route>

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