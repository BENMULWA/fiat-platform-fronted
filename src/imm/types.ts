// Shapes returned by the live backend (see backend/routes/imm_control.py,
// market_maker.py, treasury.py, base_rate.py, general_ledger.py). Nothing here
// is sample data; fields are optional where the backend may omit them.

export interface ImmNode {
  id: string
  label: string
  assetType: string
  category: string
  live: boolean
  enabled: boolean
}

export interface CorridorCfg {
  id: string
  name: string
  node_procure: string
  node_liquidate: string
  discount: number
  fx_edge: number
  mint_provider?: string
  exit_provider?: string
  corridorEnabled: boolean
  eligible: boolean
}

export interface OppNode {
  id: string
  name: string
  tag: string
  color: string
  type: string
}

export interface Opportunity {
  id: string
  title: string
  pathDesc: string
  profitPct: string
  discount: string
  discountNum: number
  fxEdge: string
  rolloverRate: string
  multiplier: string
  exitGate: string
  baseline: string
  currency: 'USD' | 'KES'
  mintAsset: string
  exitLabel: string
  mintProvider?: string
  exitProvider?: string
  nodes: OppNode[]
}

export interface NodeHealth {
  id: string
  label: string
  asset: string | null
  balance: number | null
  minBalance: number | null
  belowFloor: boolean
  exposureCapUsd: number | null
  overExposureCap: boolean
  live: boolean
  enabled: boolean
}

export interface HealthReport {
  checkedAt: string
  nodes: NodeHealth[]
  anyBelowFloor: boolean
  anyOverExposureCap: boolean
}

export interface BaseRateStatus {
  rate: number | null
  source: string | null
  fixedBy: string | null
  updatedAt: string | null
  ageSeconds: number | null
  stale: boolean
}

export interface CometQuote {
  rate?: number | null
  rateAge?: string | null
  [k: string]: unknown
}

export interface SpreadCfg {
  active: boolean
  autoPeg: boolean
  bid: number
  ask: number
  reference: number
  updatedAt: string | null
  ageSeconds: number | null
  stale: boolean
  staleAfterSeconds: number
}

export interface TreasuryDashboard {
  status: string
  vaults: Record<string, number>
  web2_total_kes?: number
}

export interface LedgerRow {
  time: string
  id: string
  from: string
  to: string
  amount: string
  intValue: string
  type: string
  typeColor: string
  externalRef?: string | null
}

export type RunStatus =
  | 'IDLE' | 'PROCURE' | 'LIQUIDATE' | 'AWAITING_MANUAL_TOPUP' | 'MINT'
  | 'AWAITING_MANUAL_MINT' | 'ROLLOVER' | 'AWAITING_OPPORTUNITY'
  | 'CELO_EXIT' | 'COMPLETED' | 'HALTED'

/** What the pool swap really did. `confirmed` means the amounts were read from the transaction on Celo;
 *  otherwise `outAmount` is the pool's quote, an estimate. */
export interface SwapReport {
  inImc: number
  outSymbol: string
  outAmount: number
  quotedOut: number
  confirmed: boolean
  txHash: string | null
  pair: string | null
  engineWallet: string | null
}
export interface ExitReport { txHash: string | null; to: string | null; amount: number; symbol: string }

export interface RebalanceAction {
  pair: string; price: number; spend: string; receive: string; spendAmount: number; receiveAmount: number; priceAfter: number
}
export interface RebalancePreview {
  plan: {
    pair: string; seeded: boolean; imcReserve: number; usdcReserve: number; price: number | null; balanced: boolean
    actions: RebalanceAction[]; blockers: string[]
    otherPools: { pair: string; imcReserve: number; otherReserve: number; price: number | null }[]
  }
  engineWallet: { address: string }
  needs: { symbol: string; amount: number; held: number; treasury: number; shortfall: number; missing: number }[]
  liveRun: string | null
  canExecute: boolean
  reasons: string[]
}
export interface RebalanceResult {
  ok: boolean
  swaps: { pair: string; txHash: string | null; spent: number; spentSymbol: string; received: number; receivedSymbol: string; confirmed: boolean; priceBefore: number }[]
  fundTxs: string[]; engineWallet: string; pricesAfter: Record<string, number | null> | null
}

export interface RebalanceJob {
  id: string
  status: 'running' | 'done' | 'failed'
  startedAt: string
  finishedAt?: string
  steps: { at: string; msg: string }[]
  result: RebalanceResult | null
  error: string | null
}

export interface MintBooking {
  receipt: string
  status: 'pending' | 'booked' | 'failed'
  txHash?: string | null
  sendTxHash?: string | null
  treasury?: string | null
  imc?: number | null
  airtimeKes?: number | null
  usdKes?: number | null
  arrivedImc?: number | null
  cashKes?: number | null
  deliverTo?: string | null
  recovered?: boolean
  warning?: string | null
  error?: string | null
  updatedAt?: string
}
export interface MintState { configured: boolean; chain: string; treasury: string; bookings: MintBooking[] }
export interface MintJob {
  id: string
  receipt: string
  status: 'running' | 'done' | 'failed'
  steps: { at: string; msg: string }[]
  result: { receipt: string; txHash: string | null; sendTxHash: string | null; imc: number | null; airtimeKes: number | null; usdKes: number | null
            arrivedImc: number | null; treasury: string | null; deliveredTo: string | null; recovered: boolean; warning: string | null } | null
  error: string | null
}

export interface CorridorRun {
  _id: string
  corridorId: string
  status: RunStatus
  currentCycle: number
  currentUsdPrincipal: number
  currentKesFloat: number
  startingUsd: number
  finalUsd: number | null
  profit: number | null
  haltReason: string | null
  exitPathChosen: string | null
  cyclePnl: number
  cumulativePnl: number
  createdAt?: string
  updatedAt?: string
  startedBy?: string | null
  config?: { cycles?: number; [k: string]: unknown }
  pendingTopupExpectedKes?: number | null
  pendingMintExpectedImc?: number | null
  swap?: SwapReport | null
  exit?: ExitReport | null
}

export type ViewMode = 'operator' | 'investor'
export type ThemePref = 'system' | 'light' | 'dark'
export type Audience = 'operator' | 'investor'

export interface InvestorCaps {
  canExecute: boolean
  maxAmountUsd?: number | null
}

export interface FloatState {
  configured: boolean
  paybill: string
  accountNumber: string | null
  commission: number
  maxTopupKes: number
  defaultPhoneMasked: string | null
  defaultPhoneLooksAirtel: boolean
  balanceKes: number | null
  commissionByNetwork?: Record<string, number> | null
}

export type TopupStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'FAILED' | 'CANCELLED'

export interface Topup {
  id: string
  amountKes: number
  payingPhoneMasked: string
  payingPhoneLooksAirtel: boolean
  commission: number
  expectedFloatKes: number
  balanceBefore: number
  balanceAfter: number | null
  creditedFloatKes: number | null
  commissionKes: number | null
  status: TopupStatus
  createdAt: string
  error: string | null
  note?: string | null
  anomaly?: string | null
}

export interface ImcReceipt {
  id: string
  txHash: string
  logIndex: number
  blockNumber: number
  from: string
  to: string
  amountImc: number
  blockTime: string | null
  claimedByRun: string | null
  consumed: boolean
  source: string | null
}

export interface PoolCheck {
  imc: number
  pool: { pair: string; seeded: boolean; imcReserve: number; outReserve: number; price: number | null }
  quote: { ok: boolean; out: number | null; ratio: number | null; slippage: number | null; withinGuard: boolean; guard: number; error: string | null }
  engineWallet: { address: string | null; imc: number | null; error: string | null }
  masterFreeImc: number | null
  shortfall: number
  needsFunding: boolean
  canFund: boolean
}
