import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// ==========================================
// INTERCEPTORS
// ==========================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('meshex_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('meshex_token');
      localStorage.removeItem('meshex_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ==========================================
// DASHBOARD
// ==========================================

export const getDashboard = () => api.get('/api/dashboard');

// ==========================================
// MARKET MAKER
// ==========================================

export const getQuotes = () => api.get('/api/market-maker/quotes');
export const createQuote = (data: any) => api.post('/api/market-maker/quotes', data);
export const deleteQuote = (id: string) => api.delete(`/api/market-maker/quotes/${id}`);
export const toggleQuote = (id: string) => api.patch(`/api/market-maker/quotes/${id}/toggle`);
export const bookDeal = (id: string) => api.post(`/api/market-maker/quotes/${id}/book`);

// ==========================================
// TRADE
// ==========================================

export const getOrderBook = () => api.get('/api/trade/orderbook');
export const getTradeHistory = () => api.get('/api/trade/history');
export const placeOrder = (data: any) => api.post('/api/trade/orders', data);

// ==========================================
// ON/OFF RAMP & MULTI-CHAIN GATEWAYS
// ==========================================

export const executeRamp = (data: any) => api.post('/api/ramp/execute', data);
export const executeInternalSwap = (data: any) => api.post('/api/ramp/swap', data);
export const getRampHistory = () => api.get('/api/ramp/history');

// Convenience wrapper for withdrawals (off-ramps)
export const executeWithdrawal = (data: any) => api.post('/api/ramp/execute', data);

// Fetch the latest STK dispatch matching phone or reference
export const getLatestStkDispatch = (params: { phone?: string; reference?: string } = {}) =>
  api.get('/api/ramp/stk/latest', { params });

// 🟢 ALREADY EXISTS: Treasury fetcher
export const getDepositDetails = (asset: string, network: string) =>
  api.get('/api/treasury/deposit-info', { params: { asset, network } });

// 🟢 NEW: ADD THESE TWO LINES FOR CELO AUTO-DETECTION
export const initiateValoraDeposit = (data: { asset: string, amount: number }) =>
  api.post('/api/valora/deposit/initiate', data);

export const checkValoraDepositStatus = (depositId: string) =>
  api.get(`/api/valora/deposit/${depositId}/status`);

// ==========================================
// RETAIL ROUTES
// ==========================================

export const getRetailWallet = () => api.get('/api/retail/wallet');
export const updateProfile = (data: any) => api.put('/api/retail/profile', data);

// ==========================================
// 🟢 NEW: STELLAR & AUTO-LISTENER ENDPOINTS
// ==========================================

export const initiateCryptoDeposit = (data: { asset: string, amount: number }) =>
  api.post('/api/stellar/deposit/initiate', data);

export const checkDepositStatus = (depositId: string) =>
  api.get(`/api/stellar/deposit/${depositId}/status`);

// ==========================================
// KYC ENDPOINTS
// ==========================================

export const getKycStatus = () => api.get('/api/retail/kyc/status');
export const submitKyc = (data: any) => api.post('/api/retail/kyc/submit', data);

// ==========================================
// AIRTIME LEDGER
// ==========================================

export const getAirtimeSummary = () => api.get('/api/airtime/summary');
export const getAirtimeHistory = () => api.get('/api/airtime/history');
export const mintAirt = (data: any) => api.post('/api/airtime/mint', data);
export const redeemAirt = (data: any) => api.post('/api/airtime/redeem', data);

// ==========================================
// GENERAL LEDGER
// ==========================================

export const getLedgerSummary = () => api.get('/api/ledger/summary');
export const getLedgerEntries = (flow?: string, search?: string) =>
  api.get('/api/ledger/entries', { params: { flow, search } });

export const getLiveLedgerFeed = (limit: number = 50) =>
  api.get('/api/ledger/feed', { params: { limit } });

// ==========================================
// RATES & INVENTORY
// ==========================================

export const getDiscountRates = () => api.get('/api/rates/discount');
export const addDiscountRate = (data: any) => api.post('/api/rates/discount', data);
export const getInventory = () => api.get('/api/rates/inventory');

// ==========================================
// TOKENS
// ==========================================

export const getTokenBalance = (asAdmin: boolean) =>
  api.get('/api/tokens/balance', { params: { as_admin: asAdmin } });

// ==========================================
// CARDANO / USDA
// ==========================================

export const getCardanoWallet = () => api.get('/api/cardano/wallet');
export const getCardanoTxHistory = (limit: number = 20) => api.get('/api/cardano/transactions', { params: { limit } });
export const verifyCardanoDeposit = (data: any) => api.post('/api/cardano/on-ramp/verify', data);
export const withdrawUsda = (data: any) => api.post('/api/cardano/withdraw', data);
export const estimateCardanoFee = (data: any) => api.post('/api/cardano/estimate-fee', data);
export const platformTopUp = (data: any) => api.post('/api/cardano/topup', data);
export const getMasterWalletBalance = () => api.get('/api/cardano/master-wallet/balance');

// ==========================================
// TREASURY & MARKET MAKER
// ==========================================

export const getTreasuryDashboard = () => api.get('/api/treasury/dashboard');
export const simulateTreasurySwap = (data: any) => api.post('/api/treasury/simulate-swap', data);
export const resetTreasurySandbox = () => api.post('/api/treasury/reset-sandbox');
export const getTreasuryRateBook = () => api.get('/api/treasury/rate-book');
export const updateTreasuryRateBook = (data: any) => api.post('/api/treasury/rate-book', data);
export const getTreasurySwapQuote = (params: { from_asset: string; to_asset: string; amount?: number }) =>
  api.get('/api/treasury/swap-quote', { params });
export const getMarketMakerOpportunities = () => api.get('/api/market-maker/opportunities');
export const getSpreadConfig = () => api.get('/api/market-maker/spread');
export const updateSpreadConfig = (data: any) => api.post('/api/market-maker/spread', data);

// ==========================================
// HFT CORRIDOR APIS
// ==========================================

export const toggleTreasuryKillSwitch = (active: boolean) =>
  api.post('/api/treasury/kill-switch', { active });
export const executeHftCorridor = (data: { amount: number; corridor_id: string }) =>
  api.post('/api/treasury/corridor/execute-hft', data);

// ==========================================
// VALORA APIS
// ==========================================

export const verifyValoraDeposit = (data: { amount: number; tx_hash: string; asset: string; counterparty?: string }) => api.post('/api/valora/on-ramp/verify', data);

export const executeValoraWithdraw = (data: { amount: number; identifier: string; asset: string }) =>
  api.post('/api/valora/withdraw', data);

export const registerValoraPhone = (data: { phone: string; celo_address: string }) =>
  api.post('/api/valora/register-phone', data);

// ==========================================
// OTC ADMIN APIS
// ==========================================

export const getOtcDashboard = () => api.get('/api/admin/operations-overview');

export const getChartAnalytics = (days: number = 7) => api.get('/api/admin/analytics/chart-data', { params: { days } });

export const getOtcRetailTransactions = (params: {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
}) => api.get('/api/admin/retail-transactions', { params });

export const getOtcRetailTransactionDetails = (transactionId: string) =>
  api.get(`/api/admin/retail-transactions/${transactionId}`);

export const updateOtcRetailTransactionStatus = (transactionId: string, status: string) =>
  api.patch(`/api/admin/retail-transactions/${transactionId}/status`, { status });


// ==========================================
// ADMIN FINANCE & COMPLIANCE APIS
// ==========================================

export const getAdminPayments = () => api.get('/api/admin/finance/payments');
export const matchAdminPayment = (id: string) =>
  api.post(`/api/admin/finance/payments/${id}/match`);

export const getAdminTreasury = () => api.get('/api/admin/finance/treasury');
export const getAdminLiquidity = () => api.get('/api/admin/finance/liquidity');

// Company revenue endpoints
export const getCompanyRevenue = () => api.get('/api/admin/company-revenue');
export const postCompanyWithdraw = (data: { asset: string; amount: number; method: string; destination?: any }) =>
  api.post('/api/admin/company-withdraw', data);

export const getCompanyWithdrawals = (params: { page?: number; limit?: number; status?: string } = {}) =>
  api.get('/api/admin/company-withdrawals', { params });

export const getAdminKycQueue = () => api.get('/api/admin/compliance/kyc');
export const getAdminKycDetail = (id: string) => api.get(`/api/admin/compliance/kyc/${id}`);
export const getAdminComplianceMonitoring = () => api.get('/api/admin/compliance/monitoring');
export const getAdminNotifications = () => api.get('/api/admin/compliance/notifications');
export const markAllAdminNotificationsRead = () => api.post('/api/admin/compliance/notifications/mark-all-read');
export const updateAdminRiskAlertStatus = (alertId: string, status: string) => api.post(`/api/admin/compliance/risk-alerts/${alertId}/status`, { status });
export const getRetailNotifications = () => api.get('/api/retail/notifications');
export const markAllRetailNotificationsRead = () => api.post('/api/retail/notifications/mark-all-read');
export const approveAdminKyc = (id: string) =>
  api.post(`/api/admin/compliance/kyc/${id}/approve`);
export const rejectAdminKyc = (id: string) =>
  api.post(`/api/admin/compliance/kyc/${id}/reject`);

export const getAdminCustomers = () => api.get('/api/admin/finance/customers');
export const freezeAdminCustomer = (id: string) =>
  api.post(`/api/admin/compliance/customers/${id}/freeze`);
export const unfreezeAdminCustomer = (id: string) =>
  api.post(`/api/admin/compliance/customers/${id}/unfreeze`);

// ==========================================
// ADMINISTRATION & TEAM MANAGEMENT (RBAC)
// ==========================================

export const getAdminTeam = () => api.get('/administration/users');

export const createAdminUser = (data: {
  name: string;
  email: string;
  role: string;
  password: string;
  permissions: string[];
}) => api.post('/administration/users', data);

export const toggleAdminUserStatus = (userId: string) =>
  api.post(`/administration/users/${userId}/toggle`);

export const deleteAdminUser = (userId: string) =>
  api.delete(`/administration/users/${userId}`);

export const updateAdminUserPermissions = (userId: string, permissions: string[]) =>
  api.patch(`/administration/users/${userId}/permissions`, { permissions });

export const resetAdminUserPassword = (userId: string, newPassword: string) =>
  api.post(`/administration/users/${userId}/reset-password`, { password: newPassword });

export const getAdminAuditLogs = (params?: {
  page?: number;
  limit?: number;
  userId?: string;
}) => api.get('/administration/audit-logs', { params });

export const getAdminSettings = () => api.get('/administration/settings');
export const updateAdminSettings = (data: any) =>
  api.patch('/administration/settings', data);

// ==========================================
// AUTH ENDPOINTS
// ==========================================

export const loginUser = (data: { email: string; password: string }) => api.post('/api/auth/login', data);
export const signupUser = (data: any) => api.post('/api/auth/signup', data);
export const getMe = () => api.get('/api/auth/me');
export const logoutUser = () => api.post('/api/auth/logout');

export default api;