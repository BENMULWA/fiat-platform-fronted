import { api } from '../api/client'
import type {
  BaseRateStatus, CometQuote, CorridorCfg, CorridorRun, FloatState, HealthReport, ImmNode,
  ImcReceipt, InvestorCaps, LedgerRow, Opportunity, Holdings, MintJob, MintState, PoolCheck, RebalanceJob, RebalancePreview, SpreadCfg, Topup, TreasuryDashboard,
} from './types'

export type Res<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number | null }

function messageOf(e: any): string {
  const d = e?.response?.data?.detail
  if (typeof d === 'string') return d
  if (d) { try { return JSON.stringify(d) } catch { /* fall through */ } }
  return e?.message || 'Request failed'
}

async function call<T>(method: 'get' | 'post', url: string, body?: unknown, params?: Record<string, unknown>): Promise<Res<T>> {
  try {
    const r = method === 'get' ? await api.get(url, { params }) : await api.post(url, body)
    return { ok: true, data: r.data as T, status: r.status }
  } catch (e: any) {
    return { ok: false, error: messageOf(e), status: e?.response?.status ?? null }
  }
}

// ---------------------------------------------------------------- reads (live today)
export const getNodes = () => call<ImmNode[]>('get', '/api/imm/nodes')
export const getCorridors = () => call<CorridorCfg[]>('get', '/api/imm/corridors')
export const getHealth = () => call<HealthReport>('get', '/api/imm/health')
export const getOpportunities = () => call<{ opportunities: Record<string, Opportunity> }>('get', '/api/market-maker/opportunities')
export const getBaseRate = () => call<BaseRateStatus>('get', '/api/base-rate')
export const getSpread = () => call<SpreadCfg>('get', '/api/market-maker/spread')
export const getCometQuote = () => call<CometQuote>('get', '/api/market-maker/spread/comet', undefined, { base: 'KES', quote: 'IMC', amount_in: 1 })
export const getN9Reference = () => call<{ realUsdcBalance: number; quotedOut: number; quoteTo: string }>('get', '/api/market-maker/n9-reference/comet', undefined, { to_symbol: 'USDT' })
export const getCometExposure = () => call<Record<string, unknown>>('get', '/api/market-maker/exposure/comet', undefined, { chain: 'celo', asset: 'IMC' })
export const getTreasury = () => call<TreasuryDashboard>('get', '/api/treasury/dashboard')
export const getLedgerFeed = (limit = 25, search?: string) =>
  call<{ feed: LedgerRow[] }>('get', '/api/ledger/feed', undefined, { limit, ...(search ? { search } : {}) })
export const getPoolCheck = (imc: number, maxSlippage: number) =>
  call<PoolCheck>('get', '/api/market-maker/pool-check', undefined, { imc, to_symbol: 'USDC', max_slippage: maxSlippage })
export const getRebalance = () => call<RebalancePreview & { status: string }>('get', '/api/market-maker/pool-rebalance')
export const doRebalance = () =>
  call<{ status: string; job: RebalanceJob }>('post', '/api/market-maker/pool-rebalance', { confirm: true })
export const getRebalanceJob = () => call<{ status: string; job: RebalanceJob | null }>('get', '/api/market-maker/pool-rebalance/job')
export const retryExit = (runId: string) => call<{ status: string; run: CorridorRun }>('post', `/api/treasury/corridor/${encodeURIComponent(runId)}/retry-exit`)
export const getMint = () => call<MintState & { status: string }>('get', '/api/imm/mint')
export const getMintJob = () => call<{ status: string; job: MintJob | null }>('get', '/api/imm/mint/job')
export const bookMint = (p: { receipt: string; cash_kes?: number; deliver_to?: string }) =>
  call<{ status: string; job: MintJob }>('post', '/api/imm/mint/book', { ...p, confirm: true })
export const getHoldings = () => call<Holdings & { status: string }>('get', '/api/imm/holdings')
export const getRuns = (limit = 25) => call<{ runs: CorridorRun[] }>('get', '/api/treasury/corridor/runs', undefined, { limit })
export const cancelRun = (id: string) => call<{ status: string; run: CorridorRun }>('post', `/api/treasury/corridor/${encodeURIComponent(id)}/cancel`)
export const getRun = (id: string) => call<CorridorRun>('get', `/api/treasury/corridor/${encodeURIComponent(id)}/status`)

// ---------------------------------------------------------------- IMC received at the treasury (operator only)
export const getImcReceipts = (limit = 15) => call<{ treasury: string; receipts: ImcReceipt[] }>('get', '/api/imm/imc/receipts', undefined, { limit })
export const allocateHeld = (runId: string) =>
  call<{ status: string; receipt: ImcReceipt; message: string }>('post', '/api/imm/imc/allocate-held', { run_id: runId })
export const attachMint = (runId: string, txHash: string) =>
  call<{ status: string; receipt: ImcReceipt; message: string }>('post', '/api/imm/imc/attach', { run_id: runId, tx_hash: txHash })

// ---------------------------------------------------------------- Impala airtime float (operator only)
export const getFloat = () => call<FloatState>('get', '/api/imm/float')
export const getTopups = (limit = 10) => call<{ topups: Topup[] }>('get', '/api/imm/float/topups', undefined, { limit })
export const getTopup = (id: string) => call<Topup>('get', `/api/imm/float/topups/${encodeURIComponent(id)}`)
export const cancelTopup = (id: string) => call<{ status: string; topup: Topup }>('post', `/api/imm/float/topups/${encodeURIComponent(id)}/cancel`)
export const startTopup = (amount: number, payingPhone?: string) =>
  call<{ status: string; topup: Topup }>('post', '/api/imm/float/topup', { amount, ...(payingPhone ? { paying_phone: payingPhone } : {}) })

// ---------------------------------------------------------------- reads (backend still to build)
export const getKillSwitch = () => call<{ active: boolean }>('get', '/api/imm/kill-switch')
export const getInvestorCaps = () => call<InvestorCaps>('get', '/api/imm/me/capabilities')
export const verifyLedger = () => call<{ ok: boolean; count?: number; brokenAt?: string | null }>('get', '/api/ledger/verify')

// ---------------------------------------------------------------- writes (live today)
export const setNodeEnabled = (id: string, enabled: boolean) => call('post', `/api/imm/nodes/${encodeURIComponent(id)}/enabled`, { enabled })
export const setCorridorEnabled = (id: string, enabled: boolean) => call('post', `/api/imm/corridors/${encodeURIComponent(id)}/enabled`, { enabled })
export const fixBaseRate = (rate: number, source: string) => call('post', '/api/base-rate/fix', { rate, source })
export const saveSpread = (s: { active: boolean; autoPeg: boolean; bid: number; ask: number }) => call('post', '/api/market-maker/spread', s)
export const setKillSwitch = (active: boolean) => call('post', '/api/treasury/kill-switch', { active })

/** Operators start a run through the treasury route; investors go through their own
 *  endpoint once the backend exposes it (the operator route is admin-only). */
export const startRun = (audience: 'operator' | 'investor', p: { corridor_id: string; amount: number; currency: string; cycles: number; procure_mode?: 'stk' | 'existing_float'; swap_mode?: 'reserve' | 'pool'; pool_max_slippage?: number }) =>
  audience === 'operator'
    ? call<{ status: string; run: CorridorRun }>('post', '/api/treasury/corridor/start', p)
    : call<{ status: string; run: CorridorRun }>('post', '/api/imm/executions', p)

// ---------------------------------------------------------------- integration probe
export interface Contract {
  id: string
  title: string
  method: 'GET' | 'POST' | 'PUT'
  path: string
  state: 'live' | 'planned'
  purpose: string
  needs: string
}

export const CONTRACTS: Contract[] = [
  { id: 'nodes', title: 'Nodes', method: 'GET', path: '/api/imm/nodes', state: 'live', purpose: 'Node registry and admin switches', needs: 'Node cards and switches' },
  { id: 'corridors', title: 'Corridors', method: 'GET', path: '/api/imm/corridors', state: 'live', purpose: 'Corridor settings and eligibility', needs: 'Corridors tab, Opportunities' },
  { id: 'health', title: 'Node health', method: 'GET', path: '/api/imm/health', state: 'live', purpose: 'Ledger balances against floors and exposure caps', needs: 'Nodes, pre-flight checks' },
  { id: 'opps', title: 'Opportunities', method: 'GET', path: '/api/market-maker/opportunities', state: 'live', purpose: 'Server-side corridor yield maths', needs: 'Dashboard, Opportunities, Trade' },
  { id: 'base', title: 'Base rate', method: 'GET', path: '/api/base-rate', state: 'live', purpose: 'Fixed KES/USD rate and its age', needs: 'Header, Pricing' },
  { id: 'comet', title: 'Comet KES/IMC', method: 'GET', path: '/api/market-maker/spread/comet', purpose: 'Live IMC quote from Comet', state: 'live', needs: 'Dashboard, Pricing' },
  { id: 'treasury', title: 'Treasury vaults', method: 'GET', path: '/api/treasury/dashboard', state: 'live', purpose: 'Real vault balances (Mam-laka, Cardano, Celo)', needs: 'Book value, Nodes' },
  { id: 'ledger', title: 'Ledger feed', method: 'GET', path: '/api/ledger/feed', state: 'live', purpose: 'Recent ledger entries with search', needs: 'Ledger, Dashboard' },
  { id: 'runs', title: 'Corridor runs', method: 'GET', path: '/api/treasury/corridor/runs', state: 'live', purpose: 'Run history and live state (admin only)', needs: 'Trade, Ledger' },
  { id: 'float', title: 'Impala float balance', method: 'GET', path: '/api/imm/float', state: 'live', purpose: 'Reseller float balance and paybill details (admin only)', needs: 'Top up airtime float' },
  { id: 'topups', title: 'Float top-ups', method: 'GET', path: '/api/imm/float/topups', state: 'live', purpose: 'STK top-up history, settled from the real balance', needs: 'Top up airtime float' },
  { id: 'topup', title: 'Send STK top-up', method: 'POST', path: '/api/imm/float/topup', state: 'live', purpose: 'Sends the M-Pesa STK push to the paying phone', needs: 'Top up airtime float' },
  { id: 'poolcheck', title: 'Pool check', method: 'GET', path: '/api/market-maker/pool-check', state: 'live', purpose: 'Read-only quote and readiness of the IMC/USDC pool for a planned run', needs: 'Trade pre-flight (pool mode)' },
  { id: 'mint', title: 'Mint IMC from a top-up', method: 'POST', path: '/api/imm/mint/book', state: 'live', purpose: 'Books an M-Pesa / ImpalaPay receipt with Comet, which mints the IMC into the treasury', needs: 'Operator tools (mints real IMC)' },
  { id: 'rebalance', title: 'Pool rebalance', method: 'POST', path: '/api/market-maker/pool-rebalance', state: 'live', purpose: 'Preview, then swap, to bring every IMC pool back to $1', needs: 'Operator tools (moves funds on POST)' },
  { id: 'imcrec', title: 'IMC receipts', method: 'GET', path: '/api/imm/imc/receipts', state: 'live', purpose: 'IMC transfers into the treasury wallet, from Celo Transfer events', needs: 'Received IMC list' },
  { id: 'imcatt', title: 'Attach mint', method: 'POST', path: '/api/imm/imc/attach', state: 'live', purpose: 'Reserve a verified on-chain IMC transfer for a run waiting on its mint', needs: 'Waiting-for-mint panel' },
  { id: 'kill', title: 'Kill switch state', method: 'GET', path: '/api/imm/kill-switch', state: 'planned', purpose: 'Read whether autonomous trading is halted (today only a write exists)', needs: 'Header safety indicator' },
  { id: 'caps', title: 'Investor capabilities', method: 'GET', path: '/api/imm/me/capabilities', state: 'planned', purpose: 'Whether this investor may execute, and their limit', needs: 'Investor Execute button' },
  { id: 'exec', title: 'Investor execution', method: 'POST', path: '/api/imm/executions', state: 'planned', purpose: 'Start a run on the investor\'s own allocation', needs: 'Investor Trade page' },
  { id: 'venues', title: 'Venue quotes', method: 'GET', path: '/api/imm/venues', state: 'planned', purpose: 'Live bid/ask per venue (Binance P2P, Valora, Yellow Card)', needs: 'Rates and venues' },
  { id: 'prices', title: 'Node prices', method: 'GET', path: '/api/imm/node-prices', state: 'planned', purpose: 'Buy/sell price per node with age', needs: 'Node prices tab, stale-price checks' },
  { id: 'conns', title: 'Connections', method: 'GET', path: '/api/imm/connections', state: 'planned', purpose: 'Editable routes between nodes with fees and capacity', needs: 'Path-search opportunities' },
  { id: 'audit', title: 'Audit log', method: 'GET', path: '/api/imm/audit', state: 'planned', purpose: 'Who changed what, with the reason', needs: 'Ledger, Audit tab' },
  { id: 'verify', title: 'Ledger verification', method: 'GET', path: '/api/ledger/verify', state: 'planned', purpose: 'Hash-chain check (the ledger is not hash-chained yet)', needs: 'Ledger, Verify chain' },
]

export type ProbeResult = 'live' | 'missing' | 'protected' | 'unreachable' | 'write'

/** GET endpoints are probed with a real request; writes are never called. */
export async function probe(c: Contract): Promise<ProbeResult> {
  if (c.method !== 'GET') return 'write'
  try {
    await api.get(c.path, { params: c.id === 'ledger' ? { limit: 1 } : c.id === 'runs' ? { limit: 1 } : undefined })
    return 'live'
  } catch (e: any) {
    const s = e?.response?.status
    if (s === 404) return 'missing'
    if (s === 401 || s === 403) return 'protected'
    if (s == null) return 'unreachable'
    return s === 405 ? 'live' : 'unreachable'
  }
}
