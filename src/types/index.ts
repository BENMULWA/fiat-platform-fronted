export interface User {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'member'
  workspaceId: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAdmin: boolean
  viewAsAdmin: boolean
}

export interface Balance {
  asset: string
  label: string
  amount: number
  usdEquivalent: number
}

export interface RampEntry {
  id: string
  from: string
  to: string
  fromAmount: number
  toAmount: number
  channel: string
  status: 'completed' | 'pending' | 'failed'
  createdAt: string
}

export interface Quote {
  id: string
  pair: string
  isLive: boolean
  bankBuy: number
  bankSell: number
  bankSpread: number
  bankRef: string
  youBuy: number
  youSell: number
  yourSpread: number
}

export interface Order {
  id: string
  side: 'buy' | 'sell'
  price: number
  amount: number
  total: number
  status: 'open' | 'filled' | 'cancelled'
  createdAt: string
}

export interface LedgerEntry {
  id: string
  date: string
  flow: string
  description: string
  debitWallet: string
  creditWallet: string
  debitAmount?: number
  creditAmount?: number
  debitAsset?: string
  creditAsset?: string
  counterparty?: string
}

export interface AirtimeLedgerEntry {
  id: string
  type: 'mint' | 'redeem'
  amount: number
  network: string
  country: string
  usdaAmount: number
  createdAt: string
}

export interface DiscountRate {
  id: string
  network: string
  country: string
  product: string
  rate: number
}
