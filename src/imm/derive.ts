import { num } from './format'
import type {
  BaseRateStatus, CometQuote, CorridorCfg, CorridorRun, HealthReport, ImmNode, Opportunity, RunStatus,
} from './types'

// ------------------------------------------------------------------ vault valuation
export type VaultGroup = 'airtime' | 'mobile' | 'stable' | 'imc' | 'card' | 'other'

/** How each key of GET /api/treasury/dashboard's `vaults` is read. KES-denominated
 *  vaults are converted at the fixed base rate; dollar assets count at face. */
export const VAULT_META: Record<string, { label: string; group: VaultGroup; unit: string; kes?: boolean }> = {
  N1_TELKOM: { label: 'N1 Telkom airtime', group: 'airtime', unit: 'KES face', kes: true },
  N2_AIRTEL: { label: 'N2 Airtel airtime float', group: 'airtime', unit: 'KES face', kes: true },
  N3_SAFARICOM: { label: 'N3 Safaricom airtime', group: 'airtime', unit: 'KES face', kes: true },
  N4_MPESA: { label: 'N4 M-Pesa float', group: 'mobile', unit: 'KES', kes: true },
  N7_USDA: { label: 'N7 USDA vault', group: 'stable', unit: 'USDA' },
  CELO_USDC: { label: 'Celo USDC (exit)', group: 'stable', unit: 'USDC' },
  N8_IMP: { label: 'N8 IMP token', group: 'imc', unit: 'IMC' },
  CELO_IMC: { label: 'Celo IMC treasury', group: 'imc', unit: 'IMC' },
  N10_USD: { label: 'N10 virtual cards', group: 'card', unit: 'USD' },
  N9_XLM: { label: 'N9 Stellar XLM', group: 'other', unit: 'XLM' },
  N11_GOLD: { label: 'N11 gold', group: 'other', unit: 'units' },
}

export const GROUP_LABEL: Record<VaultGroup, string> = {
  airtime: 'Airtime', mobile: 'Mobile money', stable: 'Stablecoin', imc: 'IMC', card: 'Cards', other: 'Other (not valued)',
}
export const GROUP_COLOR: Record<VaultGroup, string> = {
  airtime: 'var(--k-air)', mobile: 'var(--k-mob)', stable: 'var(--k-stable)', imc: 'var(--k-trea)', card: 'var(--k-card)', other: 'var(--k-res)',
}

export interface BookValue {
  total: number | null
  groups: Partial<Record<VaultGroup, number>>
  lines: { key: string; label: string; group: VaultGroup; unit: string; balance: number; usd: number | null }[]
  needsRate: boolean
}

export function bookValue(vaults: Record<string, number> | undefined, baseRate: number | null): BookValue {
  const groups: Partial<Record<VaultGroup, number>> = {}
  const lines: BookValue['lines'] = []
  let total = 0
  let needsRate = false
  for (const [key, raw] of Object.entries(vaults || {})) {
    const meta = VAULT_META[key] || { label: key, group: 'other' as VaultGroup, unit: '' }
    const balance = num(raw) ?? 0
    let usd: number | null = null
    if (meta.group !== 'other') {
      if (meta.kes) {
        if (baseRate && baseRate > 0) usd = balance / baseRate
        else needsRate = true
      } else usd = balance
    }
    if (usd != null) {
      total += usd
      groups[meta.group] = (groups[meta.group] || 0) + usd
    }
    lines.push({ key, label: meta.label, group: meta.group, unit: meta.unit, balance, usd })
  }
  return { total: needsRate && total === 0 ? null : total, groups, lines, needsRate }
}

// ------------------------------------------------------------------ corridor view
export type CheckStatus = 'PASS' | 'WARN' | 'FAIL'
export interface Check { id: string; label: string; status: CheckStatus; message: string }
export type Decision = 'EXECUTE' | 'REVIEW' | 'BLOCK'

export interface CorridorView {
  id: string
  cfg: CorridorCfg | null
  opp: Opportunity | null
  name: string
  eligible: boolean
  checks: Check[]
  decision: Decision
  reasons: string[]
  profit5: number | null     // projected total return over the corridor's cycles, in %
  cycleMultiplier: number | null
}

interface Inputs {
  corridors: CorridorCfg[] | null
  opps: Record<string, Opportunity> | null
  nodes: ImmNode[] | null
  health: HealthReport | null
  baseRate: BaseRateStatus | null
  comet: { data: CometQuote | null; error: string | null }
}

export function buildCorridorViews(i: Inputs): CorridorView[] {
  const ids = new Set<string>([...(i.corridors || []).map((c) => c.id), ...Object.keys(i.opps || {})])
  const nodeOf = (id: string) => (i.nodes || []).find((n) => n.id === id)
  const healthOf = (id: string) => (i.health?.nodes || []).find((n) => n.id === id)

  return [...ids].map((id) => {
    const cfg = (i.corridors || []).find((c) => c.id === id) || null
    const opp = i.opps?.[id] || null
    const checks: Check[] = []

    if (cfg) {
      checks.push(cfg.corridorEnabled
        ? { id: 'switch', label: 'Corridor switch', status: 'PASS', message: 'Corridor is switched on.' }
        : { id: 'switch', label: 'Corridor switch', status: 'FAIL', message: 'An operator has switched this corridor off.' })

      for (const nid of [cfg.node_procure, cfg.node_liquidate]) {
        const n = nodeOf(nid)
        const name = n ? `${n.id} ${n.label}` : nid
        if (!n) checks.push({ id: 'node-' + nid, label: name, status: 'FAIL', message: `${nid} is not in the node registry.` })
        else if (!n.live) checks.push({ id: 'node-' + nid, label: name, status: 'FAIL', message: `${name} has no live integration yet.` })
        else if (!n.enabled) checks.push({ id: 'node-' + nid, label: name, status: 'FAIL', message: `${name} is switched off.` })
        else checks.push({ id: 'node-' + nid, label: name, status: 'PASS', message: `${name} is live and enabled.` })

        const h = healthOf(nid)
        if (h?.belowFloor) checks.push({ id: 'floor-' + nid, label: `${nid} floor`, status: 'FAIL', message: `${name} is below its minimum balance.` })
        if (h?.overExposureCap) checks.push({ id: 'cap-' + nid, label: `${nid} exposure`, status: 'FAIL', message: `${name} is over its exposure cap.` })
      }
    } else {
      checks.push({ id: 'cfg', label: 'Corridor settings', status: 'WARN', message: 'No settings were returned for this corridor.' })
    }

    if (!i.baseRate || i.baseRate.rate == null) {
      checks.push({ id: 'rate', label: 'Base rate', status: 'WARN', message: 'No KES/USD base rate has been fixed yet.' })
    } else if (i.baseRate.stale) {
      checks.push({ id: 'rate', label: 'Base rate', status: 'WARN', message: 'The base rate is older than the one-hour limit.' })
    } else {
      checks.push({ id: 'rate', label: 'Base rate', status: 'PASS', message: `Base rate ${i.baseRate.rate} is current.` })
    }

    const usesComet = cfg?.mint_provider === 'comet' || cfg?.exit_provider === 'comet' || opp?.mintProvider === 'comet'
    if (usesComet) {
      if (i.comet.error) checks.push({ id: 'comet', label: 'Comet IMM', status: 'WARN', message: `Comet is not quoting: ${i.comet.error}` })
      else if (i.comet.data) checks.push({ id: 'comet', label: 'Comet IMM', status: 'PASS', message: 'Comet is quoting KES/IMC.' })
    }

    const decision: Decision = checks.some((c) => c.status === 'FAIL') ? 'BLOCK' : checks.some((c) => c.status === 'WARN') ? 'REVIEW' : 'EXECUTE'
    return {
      id,
      cfg,
      opp,
      name: opp?.title || cfg?.name || id,
      eligible: !!cfg?.eligible && !!opp,
      checks,
      decision,
      reasons: checks.filter((c) => c.status === 'FAIL').map((c) => c.message),
      profit5: opp ? num(opp.profitPct) : null,
      cycleMultiplier: opp ? num(opp.multiplier) : null,
    }
  }).sort((a, b) => (b.profit5 ?? -1) - (a.profit5 ?? -1))
}

// ------------------------------------------------------------------ projections
export interface CycleRow { cycle: number; inAmt: number; outAmt: number; ret: number; total: number }
/** Compounds a principal through the server's single-cycle multiplier. */
export function projectCycles(principal: number, multiplier: number, cycles = 5): CycleRow[] {
  const rows: CycleRow[] = []
  let cur = principal
  for (let c = 1; c <= cycles; c++) {
    const out = cur * multiplier
    rows.push({ cycle: c, inAmt: cur, outAmt: out, ret: out / cur - 1, total: out / principal - 1 })
    cur = out
  }
  return rows
}

// ------------------------------------------------------------------ run state
export const RUN_STEPS = ['Procure', 'Liquidate', 'Mint', 'Rollover', 'Exit'] as const
export const RUN_STEP_NOTE = [
  'An M-Pesa STK push goes to the paying phone. Approving it tops up the Impala reseller float by about 5%',
  'Internal booking only, after checking the paybill really holds that much KES',
  'Comet mints IMC on Celo (1 IMC = $1), then it is paid out as USDT from the treasury reserve',
  'Only if cycles remain: hold for the next opportunity, then procure again. A one-cycle run skips this',
  'Final step: USDT to USDC on Comet\'s Celo pool, withdrawn to your own wallet',
]

export function stepIndex(s: RunStatus): number {
  switch (s) {
    case 'IDLE': case 'PROCURE': case 'AWAITING_MANUAL_TOPUP': return 0
    case 'LIQUIDATE': return 1
    case 'MINT': case 'AWAITING_MANUAL_MINT': return 2
    case 'ROLLOVER': case 'AWAITING_OPPORTUNITY': return 3
    case 'CELO_EXIT': return 4
    case 'COMPLETED': return 5
    default: return -1
  }
}

export const isTerminal = (s: RunStatus) => s === 'COMPLETED' || s === 'HALTED'
export const activeRun = (runs: CorridorRun[] | null | undefined) => (runs || []).find((r) => !isTerminal(r.status)) || null

export const STATUS_LABEL: Record<RunStatus, string> = {
  IDLE: 'Starting', PROCURE: 'Procuring airtime', LIQUIDATE: 'Liquidating', AWAITING_MANUAL_TOPUP: 'Waiting for top-up',
  MINT: 'Minting IMC', AWAITING_MANUAL_MINT: 'Waiting for manual mint', ROLLOVER: 'Rollover gate', AWAITING_OPPORTUNITY: 'Holding for next opportunity',
  CELO_EXIT: 'Exiting on Celo', COMPLETED: 'Completed', HALTED: 'Halted',
}
