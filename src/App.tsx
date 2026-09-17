// @ts-nocheck
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import NotificationToastHost from './components/NotificationToastHost'

// --- AUTH & PUBLIC PAGES ---
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import FAQPage from './pages/FAQPage'
import AppLayout from './components/Layout/AppLayout'
import AdminRoute from './components/Guards/AdminRoute'
import InstitutionalRoute from './components/Guards/InstitutionalRoute'

// --- OTC MERCHANT PORTAL PAGES ---
import OtcSignup from './pages/OTC Merchant/Signup'
import OtcOnboarding from './pages/OTC Merchant/Onboarding'
import OtcOverview from './pages/OTC Merchant/Overview'
import OtcRequestSettlement from './pages/OTC Merchant/RequestSettlement'
import OtcRfqDetail from './pages/OTC Merchant/RfqDetail'

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
import { TreasurySettlementsPage } from './pages/OTC Dashboard/TreasurySettlements';
import LiquidityPage from './pages/OTC Dashboard/Liquidity';
import KycAmlPage from './pages/OTC Dashboard/KycAml'
import CustomersPage from './pages/OTC Dashboard/Customers';
import DealerWorkspaceWizard from './pages/OTC Dashboard/DealerWorkspaceWizard';
import DealerWorkspaceLive from './pages/OTC Dashboard/DealerWorkspaceLive';
import DealerQuotesPage from './pages/OTC Dashboard/DealerQuotesPage';
import ComingSoon from './pages/OTC Dashboard/ComingSoon';
import CompanyRevenuePage from './pages/OTC Dashboard/CompanyRevenue';

// --- RETAIL PAGES ---
import RetailDashboardPage from './pages/retail/RetailDashboardPage'
import WalletsPage from './pages/retail/WalletsPage'
import TradePage from './pages/retail/TradePage'
import KYCpage from './pages/retail/KYCpage'
import DepositPage from './pages/retail/DepositPage'
import WithdrawPage from './pages/retail/WithdrawPage'
import TransferPage from './pages/retail/TransferPage'
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

  // KYC is also enforced by backend dependencies on every value-moving API.
  // This guard makes the requirement visible before a user starts a flow.
  if (!['verified', 'approved'].includes((user.kycStatus || '').toLowerCase())) {
    return <Navigate to="/kyc" replace />
  }

  return <>{children}</>
}

function RoleAwareLayout() {
  const location = useLocation()
  const adminOnlyPaths = ['/admin', '/vault', '/market-maker', '/general-ledger', '/rates']
  const isAdminPath = adminOnlyPaths.some((path) =>
    path === '/admin' ? location.pathname.startsWith('/admin') : location.pathname === path
  )

  return isAdminPath ? (
    <AdminRoute><AppLayout /></AdminRoute>
  ) : <AppLayout />
}

// ------------------------------------------------------------------
// ROUTER CONFIGURATION
// ------------------------------------------------------------------
// Where a logged-in user lands by default. Institutional accounts get their
// own portal root, not the retail /dashboard or /admin/dashboard -- adding
// this role here is why AuthContext.tsx's viewAsAdmin fix alone wasn't
// enough; without this a merchant would still land on the retail dashboard.
function defaultRouteFor(user: any, viewAsAdmin: boolean): string {
  if (viewAsAdmin) return "/admin/dashboard"
  if (user?.role === 'institutional' || user?.role === 'merchant') return "/otc/overview"
  return "/dashboard"
}

function AppRoutes() {
  const { user, isLoading, viewAsAdmin } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const defaultRoute = defaultRouteFor(user, viewAsAdmin)

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={user ? <Navigate to={defaultRoute} replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={defaultRoute} replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to={defaultRoute} replace /> : <Signup />} />
      <Route path="/forgot-password" element={user ? <Navigate to={defaultRoute} replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={user ? <Navigate to={defaultRoute} replace /> : <ResetPasswordPage />} />
      <Route path="/faq" element={<FAQPage />} />

      {/* OTC MERCHANT PORTAL -- own layout (no admin/retail Sidebar+AppLayout
          shell), each page below handles its own auth via InstitutionalRoute
          (or is public, for signup). See routes/otc_merchant.py for the
          backend these call. */}
      <Route path="/otc/signup" element={user ? <Navigate to={defaultRoute} replace /> : <OtcSignup />} />
      <Route path="/otc/onboarding" element={<InstitutionalRoute requireApproved={false}><OtcOnboarding /></InstitutionalRoute>} />
      <Route path="/otc/overview" element={<InstitutionalRoute><OtcOverview /></InstitutionalRoute>} />
      <Route path="/otc/request" element={<InstitutionalRoute><OtcRequestSettlement /></InstitutionalRoute>} />
      <Route path="/otc/rfqs/:rfqId" element={<InstitutionalRoute><OtcRfqDetail /></InstitutionalRoute>} />

      {/* PROTECTED LAYOUT */}
      <Route path="/" element={<ProtectedRoute><RoleAwareLayout /></ProtectedRoute>}>

        {/* 🟢 STRICT RETAIL GATEWAY: All core pages are now KYC Protected */}
        <Route path="dashboard" element={<KycProtectedRoute><RetailDashboardPage /></KycProtectedRoute>} />
        <Route path="wallets" element={<KycProtectedRoute><WalletsPage /></KycProtectedRoute>} />
        <Route path="transactions" element={<KycProtectedRoute><TransactionsPage /></KycProtectedRoute>} />
        <Route path="deposit" element={<KycProtectedRoute><DepositPage /></KycProtectedRoute>} />
        <Route path="withdraw" element={<KycProtectedRoute><WithdrawPage /></KycProtectedRoute>} />
        <Route path="transfer" element={<KycProtectedRoute><TransferPage /></KycProtectedRoute>} />
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
        <Route path="admin/retail-orders" element={<RetailTransactionsPage />} />
        <Route path="admin/payments" element={<PaymentsPage />} />
        <Route path="admin/treasury" element={<TreasuryPage />} />
        <Route path="admin/positions" element={<TreasuryPage />} />
        <Route path="admin/settlements" element={<TreasurySettlementsPage />} />
        <Route path="admin/exposure" element={<TreasuryPage />} />
        <Route path="admin/pnl" element={<CompanyRevenuePage />} />
        <Route path="admin/dealer-workspace" element={<DealerWorkspaceWizard />} />
        {/*
          These sidebar entries used to all open the same generic
          DealerWorkspaceWizard (RFQ creation modal) with a `mode` prop the
          component doesn't accept and silently ignored -- 6 different menu
          items all opening an identical "New RFQ" form regardless of label.
          Routed each to whichever real page its label actually describes:
          settlement-related labels -> the Treasury Settlement Queue
          (TreasurySettlementsPage, same as admin/settlements); trade/queue
          labels -> the live RFQ queue (DealerWorkspaceLive). Only the two
          entries that are genuinely about starting a new RFQ still open the
          wizard.
        */}
        <Route path="admin/institutional-settlements" element={<TreasurySettlementsPage />} />
        <Route path="admin/institutional-rfqs" element={<DealerWorkspaceLive />} />
        <Route path="admin/institutional-rfqs/new" element={<DealerWorkspaceWizard initialOpen />} />
        <Route path="admin/otc-crypto" element={<ComingSoon title="OTC Crypto" />} />
        <Route path="admin/quotes" element={<DealerQuotesPage />} />
        <Route path="admin/trades" element={<ComingSoon title="Trades" />} />
        <Route path="admin/bank-transfers" element={<PaymentsPage />} />
        <Route path="admin/wallet-transfers" element={<TreasurySettlementsPage />} />
        <Route path="admin/blockchain" element={<TreasurySettlementsPage />} />
        <Route path="admin/settlement-exceptions" element={<PaymentsPage />} />
        <Route path="admin/markets/fx" element={<RatesInventoryPage />} />
        <Route path="admin/markets/crypto" element={<RatesInventoryPage />} />
        <Route path="admin/markets/stablecoins" element={<RatesInventoryPage />} />
        <Route path="admin/markets/liquidity" element={<LiquidityPage />} />
        <Route path="admin/liquidity" element={<LiquidityPage />} />
        <Route path="admin/kyc" element={<KycAmlPage />} />
        <Route path="admin/compliance" element={<KycAmlPage />} />
        <Route path="admin/customers" element={<CustomersPage />} />
        <Route path="admin/customers/individuals" element={<CustomersPage />} />
        <Route path="admin/customers/corporates" element={<CustomersPage />} />
        <Route path="admin/customers/institutional" element={<CustomersPage />} />
        <Route path="admin/compliance/screening" element={<KycAmlPage />} />
        <Route path="admin/compliance/risks" element={<KycAmlPage />} />
        <Route path="admin/reports/treasury" element={<CompanyRevenuePage />} />
        <Route path="admin/reports/trading" element={<DealerWorkspaceLive />} />
        <Route path="admin/reports/operations" element={<PaymentsPage />} />
        <Route path="admin/reports/compliance" element={<KycAmlPage />} />
        <Route path="admin/reports/management" element={<DashboardOverview />} />
        <Route path="admin/company-revenue" element={<CompanyRevenuePage />} />
        <Route path="admin/settings" element={<AdministrationPage />} />

      </Route>

      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <NotificationToastHost />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
