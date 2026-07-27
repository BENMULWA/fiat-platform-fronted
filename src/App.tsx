import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/Layout/AppLayout';
import AdminRoute from './components/Guards/AdminRoute';

// --- ADMIN PAGES ---
import DashboardPage from './pages/DashboardPage';
import MarketMakerPage from './pages/MarketMakerPage';
import GeneralLedgerPage from './pages/GeneralLedgerPage';
import RatesInventoryPage from './pages/RatesInventoryPage';
import SystemAdmin from './pages/SystemAdminRoles';

// --- NEW OTC DASHBOARD PAGES ---
import DashboardOverview from './pages/OTC Dashboard/DashboardOverview';
import { RetailTransactionsPage } from './pages/OTC Dashboard/RetailTransactions';
import PaymentsPage from './pages/OTC Dashboard/Payments';
import { TreasuryPage } from './pages/OTC Dashboard/Treasury';
import LiquidityPage from './pages/OTC Dashboard/Liquidity';
import KycAmlPage from './pages/OTC Dashboard/KycAml';
import CustomersPage from './pages/OTC Dashboard/Customers';

// --- RETAIL PAGES ---
import RetailDashboardPage from './pages/retail/RetailDashboardPage';
import WalletsPage from './pages/retail/WalletsPage';
import TradePage from './pages/retail/TradePage';
import KYCpage from './pages/retail/KYCpage';
import DepositPage from './pages/retail/DepositPage';
import { WithdrawPage } from './pages/retail/WithdrawPage';
import { RedeemAirtimePage } from './pages/retail/RedeemAirtimePage';
import { ImpalaCoinPage } from './pages/retail/ImpalaCoinPage';
import { TransactionsPage } from './pages/retail/TransactionsPage';
import { ProfilePage } from './pages/retail/ProfilePage';

// ------------------------------------------------------------------
// GUARDS
// ------------------------------------------------------------------

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/" replace />;
}

function KycProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (user.kycStatus !== 'verified') {
    return <Navigate to="/kyc" replace />;
  }

  return <>{children}</>;
}

// ------------------------------------------------------------------
// ROUTER CONFIGURATION
// ------------------------------------------------------------------

function AppRoutes() {
  const { user, isLoading, viewAsAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06090F] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={viewAsAdmin ? '/vault' : '/dashboard'} replace />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        {/* RETAIL ROUTES */}
        <Route path="dashboard" element={<RetailDashboardPage />} />
        <Route path="wallets" element={<WalletsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="kyc" element={<KYCpage />} />

        {/* KYC PROTECTED ROUTES */}
        <Route path="deposit" element={<KycProtectedRoute><DepositPage /></KycProtectedRoute>} />
        <Route path="withdraw" element={<KycProtectedRoute><WithdrawPage /></KycProtectedRoute>} />
        <Route path="swap" element={<KycProtectedRoute><TradePage /></KycProtectedRoute>} />
        <Route path="redeem-airtime" element={<KycProtectedRoute><RedeemAirtimePage /></KycProtectedRoute>} />
        <Route path="impala-coin" element={<KycProtectedRoute><ImpalaCoinPage /></KycProtectedRoute>} />

        {/* ADMIN ROUTES - PROTECTED BY ADMIN GUARD */}
        <Route path="vault" element={<AdminRoute><DashboardPage /></AdminRoute>} />
        <Route path="market-maker" element={<AdminRoute><MarketMakerPage /></AdminRoute>} />
        <Route path="general-ledger" element={<AdminRoute><GeneralLedgerPage /></AdminRoute>} />
        <Route path="rates" element={<AdminRoute><RatesInventoryPage /></AdminRoute>} />
        <Route path="admin/users" element={<AdminRoute requiredPermissions={['users']}><SystemAdmin /></AdminRoute>} />

        {/* NEW OTC DASHBOARD ROUTES */}
        <Route path="admin/dashboard" element={<AdminRoute><DashboardOverview /></AdminRoute>} />
        <Route path="admin/retail-transactions" element={<AdminRoute><RetailTransactionsPage /></AdminRoute>} />
        <Route path="admin/payments" element={<AdminRoute><PaymentsPage /></AdminRoute>} />
        <Route path="admin/treasury" element={<AdminRoute requiredPermissions={['treasury']}><TreasuryPage /></AdminRoute>} />
        <Route path="admin/liquidity" element={<AdminRoute><LiquidityPage /></AdminRoute>} />
        <Route path="admin/kyc" element={<AdminRoute requiredPermissions={['kyc']}><KycAmlPage /></AdminRoute>} />
        <Route path="admin/customers" element={<AdminRoute><CustomersPage /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to={viewAsAdmin ? '/vault' : '/dashboard'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}