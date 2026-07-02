import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('meshex_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // ⚠️ DEV MODE: We have commented out the auto-logout tripwire!
      console.warn("⚠️ 401 Unauthorized - Ignoring auto-logout for development");
      // localStorage.removeItem('meshex_token')
      // localStorage.removeItem('meshex_user')
      // window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

// Dashboard
export const getDashboard = () => api.get('/api/dashboard')

// Market Maker
export const getQuotes = () => api.get('/api/market-maker/quotes')
export const createQuote = (data: object) => api.post('/api/market-maker/quotes', data)
export const deleteQuote = (id: string) => api.delete(`/api/market-maker/quotes/${id}`)
export const toggleQuote = (id: string) => api.patch(`/api/market-maker/quotes/${id}/toggle`)
export const bookDeal = (id: string) => api.post(`/api/market-maker/quotes/${id}/book`)

// Trade
export const getOrderBook = () => api.get('/api/trade/orderbook')
export const getTradeHistory = () => api.get('/api/trade/history')
export const placeOrder = (data: object) => api.post('/api/trade/orders', data)

// On/Off Ramp
export const executeRamp = (data: object) => api.post('/api/ramp/execute', data)
export const executeInternalSwap = (data: object) => api.post('/api/ramp/swap', data)
export const getRampHistory = () => api.get('/api/ramp/history')

// Airtime Ledger
export const getAirtimeSummary = () => api.get('/api/airtime/summary')
export const getAirtimeHistory = () => api.get('/api/airtime/history')
export const mintAirt = (data: object) => api.post('/api/airtime/mint', data)
export const redeemAirt = (data: object) => api.post('/api/airtime/redeem', data)

// General Ledger
export const getLedgerSummary = () => api.get('/api/ledger/summary')
export const getLedgerEntries = (flow?: string, search?: string) =>
  api.get('/api/ledger/entries', { params: { flow, search } })

// The Live Tape HFT Feed!
export const getLiveLedgerFeed = (limit: number = 50) =>
  api.get('/api/ledger/feed', { params: { limit } })

// Rates & Inventory
export const getDiscountRates = () => api.get('/api/rates/discount')
export const addDiscountRate = (data: object) => api.post('/api/rates/discount', data)
export const getInventory = () => api.get('/api/rates/inventory')

// Tokens
export const getTokenBalance = (asAdmin: boolean) =>
  api.get('/api/tokens/balance', { params: { as_admin: asAdmin } })

// Cardano / USDA
export const getCardanoWallet = () => api.get('/api/cardano/wallet')
export const getCardanoTxHistory = (limit = 20) => api.get('/api/cardano/transactions', { params: { limit } })
export const verifyCardanoDeposit = (data: object) => api.post('/api/cardano/on-ramp/verify', data)
export const withdrawUsda = (data: object) => api.post('/api/cardano/withdraw', data)
export const estimateCardanoFee = (data: object) => api.post('/api/cardano/estimate-fee', data)
export const platformTopUp = (data: object) => api.post('/api/cardano/topup', data)

// Fetch the master wallet balance for the dashboard
export const getMasterWalletBalance = () => api.get('/api/cardano/master-wallet/balance')

// --- TREASURY & MARKET MAKER ---
export const getTreasuryDashboard = () => api.get('/api/treasury/dashboard')
export const simulateTreasurySwap = (data: any) => api.post('/api/treasury/simulate-swap', data)
export const resetTreasurySandbox = () => api.post('/api/treasury/reset-sandbox')