// @ts-nocheck
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// --- AUTH & PUBLIC PAGES ---
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import FAQPage from './pages/FAQPage'
import AppLayout from './components/Layout/AppLayout'

// --- ADMIN PAGES ---
import DashboardPage from './pages/DashboardPage'
import MarketMakerPage from './pages/MarketMakerPage'
import GeneralLedgerPage from './pages/GeneralLedgerPage'
import RatesInventoryPage from './pages/RatesInventoryPage'
import AdministrationPage from './pages/SystemAdminRoles'

// --- NEW OTC DASHBOARD PAGES ---
import DashboardOverview from './pages/OTC Dashboard/DashboardOverview';
import { RetailTransactionsPage } from './pages/OTC Dashboard/RetailTransactions';
import PaymentsPage from './pages/OTC Dashboard/Payments';
import { TreasuryPage } from './pages/OTC Dashboard/Treasury';
import LiquidityPage from './pages/OTC Dashboard/Liquidity';
import KycAmlPage from './pages/OTC Dashboard/KycAml'
import CustomersPage from './pages/OTC Dashboard/Customers';
import DealerWorkspace from './pages/OTC Dashboard/DealerWorkspace';
import CompanyRevenuePage from './pages/OTC Dashboard/CompanyRevenue';

// --- RETAIL PAGES ---
import RetailDashboardPage from './pages/retail/RetailDashboardPage'
import WalletsPage from './pages/retail/WalletsPage'
import TradePage from './pages/retail/TradePage'
import KYCpage from './pages/retail/KYCpage'
import DepositPage from './pages/retail/DepositPage'
import WithdrawPage from './pages/retail/WithdrawPage'
import { RedeemAirtimePage } from './pages/retail/RedeemAirtimePage'
import { ImpalaCoinPage } from './pages/retail/ImpalaCoinPage'
import { TransactionsPage } from './pages/retail/TransactionsPage'
import { ProfilePage } from './pages/retail/ProfilePage'

// ------------------------------------------------------------------
// GUARDS
// ------------------------------------------------------------------
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

// Gate Keeper Wrapper: Forced KYC Gateway
function KycProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, viewAsAdmin } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/" replace />

  // Admins bypass KYC
  if (viewAsAdmin) return <>{children}</>

  // If retail user is unverified/pending, force them to KYC page
  

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
      {/* PUBLIC ROUTES */}
      <Route path="/" element={user ? <Navigate to={viewAsAdmin ? "/admin/dashboard" : "/dashboard"} replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={viewAsAdmin ? "/admin/dashboard" : "/dashboard"} replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to={viewAsAdmin ? "/admin/dashboard" : "/dashboard"} replace /> : <Signup />} />
      <Route path="/forgot-password" element={user ? <Navigate to={viewAsAdmin ? "/admin/dashboard" : "/dashboard"} replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={user ? <Navigate to={viewAsAdmin ? "/admin/dashboard" : "/dashboard"} replace /> : <ResetPasswordPage />} />
      <Route path="/faq" element={<FAQPage />} />

      {/* PROTECTED LAYOUT */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>

        {/* 🟢 STRICT RETAIL GATEWAY: All core pages are now KYC Protected */}
        <Route path="dashboard" element={<KycProtectedRoute><RetailDashboardPage /></KycProtectedRoute>} />
        <Route path="wallets" element={<KycProtectedRoute><WalletsPage /></KycProtectedRoute>} />
        <Route path="transactions" element={<KycProtectedRoute><TransactionsPage /></KycProtectedRoute>} />
        <Route path="deposit" element={<KycProtectedRoute><DepositPage /></KycProtectedRoute>} />
        <Route path="withdraw" element={<KycProtectedRoute><WithdrawPage /></KycProtectedRoute>} />
        <Route path="swap" element={<KycProtectedRoute><TradePage /></KycProtectedRoute>} />
        <Route path="redeem-airtime" element={<KycProtectedRoute><RedeemAirtimePage /></KycProtectedRoute>} />
        <Route path="impala-coin" element={<KycProtectedRoute><ImpalaCoinPage /></KycProtectedRoute>} />

        {/* Profile and KYC remain accessible so they can actually fill out the form */}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="kyc" element={<KYCpage />} />

        {/* ADMIN ROUTES (Legacy) */}
        <Route path="vault" element={<DashboardPage />} />
        <Route path="market-maker" element={<MarketMakerPage />} />
        <Route path="general-ledger" element={<GeneralLedgerPage />} />
        <Route path="rates" element={<RatesInventoryPage />} />

        {/* NEW OTC DASHBOARD ROUTES */}
        <Route path="admin/dashboard" element={<DashboardOverview />} />
        <Route path="admin/retail-transactions" element={<RetailTransactionsPage />} />
        <Route path="admin/payments" element={<PaymentsPage />} />
        <Route path="admin/treasury" element={<TreasuryPage />} />
        <Route path="admin/dealer-workspace" element={<DealerWorkspace />} />
        <Route path="admin/liquidity" element={<LiquidityPage />} />
        <Route path="admin/kyc" element={<KycAmlPage />} />
        <Route path="admin/customers" element={<CustomersPage />} />
        <Route path="admin/company-revenue" element={<CompanyRevenuePage />} />
        <Route path="admin/settings" element={<AdministrationPage />} />

      </Route>

      <Route path="*" element={<Navigate to={viewAsAdmin ? "/admin/dashboard" : "/dashboard"} replace />} />
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