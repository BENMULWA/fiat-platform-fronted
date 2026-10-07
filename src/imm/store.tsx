import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as A from './api'
import { buildCorridorViews, bookValue, activeRun } from './derive'
import type { CorridorView, BookValue } from './derive'
import type {
  Audience, BaseRateStatus, CometQuote, CorridorCfg, CorridorRun, HealthReport, ImmNode, InvestorCaps,
  Holdings, LedgerRow, Opportunity, SpreadCfg, TreasuryDashboard, ViewMode,
} from './types'

export interface Resource<T> {
  data: T | null
  error: string | null
  status: number | null
  loaded: boolean
  at: number | null
  refresh: () => Promise<void>
}

/** Polls a fetcher. A failed poll keeps the last good data and records the error,
 *  so the UI never shows stale numbers as if they were fresh without an error flag. */
export function useResource<T>(fetcher: () => Promise<A.Res<T>>, ms: number | null, enabled = true): Resource<T> {
  const [st, setSt] = useState<{ data: T | null; error: string | null; status: number | null; loaded: boolean; at: number | null }>(
    { data: null, error: null, status: null, loaded: false, at: null },
  )
  const fref = useRef(fetcher)
  fref.current = fetcher
  const alive = useRef(true)

  const run = useCallback(async () => {
    const r = await fref.current()
    if (!alive.current) return
    setSt((prev) => (r.ok
      ? { data: r.data, error: null, status: r.status, loaded: true, at: Date.now() }
      : { ...prev, error: r.error, status: r.status, loaded: true }))
  }, [])

  useEffect(() => {
    alive.current = true
    if (!enabled) return () => { alive.current = false }
    void run()
    const id = ms ? window.setInterval(() => { if (!document.hidden) void run() }, ms) : null
    return () => { alive.current = false; if (id) window.clearInterval(id) }
  }, [ms, run, enabled])

  return { ...st, refresh: run }
}

// ---------------------------------------------------------------------------
export interface Toast { id: number; msg: string; kind: 'ok' | 'bad' }
export interface ModalSpec {
  title: string
  body?: React.ReactNode
  fields?: { id: string; label: string; value?: string; hint?: string; type?: 'text' | 'number' | 'select' | 'checkbox'; options?: { value: string; label: string }[]; required?: boolean }[]
  confirm?: string
  danger?: boolean
  onConfirm?: (v: Record<string, string>) => Promise<string | void | false>
}

export interface ImmCtx {
  audience: Audience
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  canOperate: boolean
  canExecute: boolean
  executeBlockedReason: string | null

  nodes: Resource<ImmNode[]>
  corridors: Resource<CorridorCfg[]>
  health: Resource<HealthReport>
  opps: Resource<{ opportunities: Record<string, Opportunity> }>
  baseRate: Resource<BaseRateStatus>
  comet: Resource<CometQuote>
  spread: Resource<SpreadCfg>
  treasury: Resource<TreasuryDashboard>
  holdings: Resource<Holdings>
  ledger: Resource<{ feed: LedgerRow[] }>
  runs: Resource<{ runs: CorridorRun[] }>
  killSwitch: Resource<{ active: boolean }>
  caps: Resource<InvestorCaps>

  views: CorridorView[]
  book: BookValue
  liveRun: CorridorRun | null
  refreshAll: () => void

  go: (tab: string) => void
  tab: string
  toast: (msg: string, kind?: 'ok' | 'bad') => void
  toasts: Toast[]
  openModal: (m: ModalSpec) => void
  closeModal: () => void
  modal: ModalSpec | null
  lastKill: boolean | null
  setLastKill: (v: boolean) => void
  pick: string | null
  setPick: (id: string | null) => void
}

const Ctx = createContext<ImmCtx | null>(null)
export const useImm = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useImm must be used inside <ImmProvider>')
  return c
}

export const TABS = ['dashboard', 'opportunities', 'trade', 'nodes', 'pricing', 'ledger'] as const

export function ImmProvider({ audience, isAdmin, children }: { audience: Audience; isAdmin: boolean; children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>(audience === 'investor' ? 'investor' : 'operator')
  const operatorSurface = audience === 'operator' && isAdmin
  const canOperate = operatorSurface && viewMode === 'operator'

  const nodes = useResource(A.getNodes, 8000)
  const corridors = useResource(A.getCorridors, 8000)
  const health = useResource(A.getHealth, 10000)
  const opps = useResource(A.getOpportunities, 8000)
  const baseRate = useResource(A.getBaseRate, 15000)
  const comet = useResource(A.getCometQuote, 20000)
  const spread = useResource(A.getSpread, 15000)
  const treasury = useResource(A.getTreasury, 20000)
  const holdings = useResource(A.getHoldings, 30000)
  const ledger = useResource(() => A.getLedgerFeed(25), 8000)
  const runs = useResource(() => A.getRuns(25), 5000, operatorSurface)
  const killSwitch = useResource(A.getKillSwitch, 15000)
  const caps = useResource(A.getInvestorCaps, 60000, audience === 'investor')

  const [tab, setTab] = useState<string>(() => {
    const h = window.location.hash.replace('#', '')
    return (TABS as readonly string[]).includes(h) ? h : 'dashboard'
  })
  const go = useCallback((t: string) => {
    setTab(t)
    try { window.history.replaceState(null, '', '#' + t) } catch { /* ignore */ }
    window.scrollTo(0, 0)
  }, [])

  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = useCallback((msg: string, kind: 'ok' | 'bad' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, kind }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])
  const [modal, setModal] = useState<ModalSpec | null>(null)
  const [lastKill, setLastKill] = useState<boolean | null>(null)
  const [pick, setPick] = useState<string | null>(null)

  const views = useMemo(() => buildCorridorViews({
    corridors: corridors.data,
    opps: opps.data?.opportunities ?? null,
    nodes: nodes.data,
    health: health.data,
    baseRate: baseRate.data,
    comet: { data: comet.data, error: comet.error },
  }), [corridors.data, opps.data, nodes.data, health.data, baseRate.data, comet.data, comet.error])

  const book = useMemo(() => bookValue(treasury.data?.vaults, baseRate.data?.rate ?? null), [treasury.data, baseRate.data])
  const liveRun = useMemo(() => activeRun(runs.data?.runs), [runs.data])

  const investorCan = audience === 'investor' && viewMode === 'investor' && caps.data?.canExecute === true
  const canExecute = canOperate || investorCan
  let executeBlockedReason: string | null = null
  if (!canExecute) {
    if (audience === 'investor') executeBlockedReason = caps.data ? 'Self-execution is not enabled for your account yet.' : 'Self-execution is not available yet. Ask the operator to enable it for your account.'
    else if (!operatorSurface) executeBlockedReason = 'Operator access is required to execute.'
    else executeBlockedReason = 'You are previewing the investor view. Switch back to Operator to execute.'
  }

  const refreshAll = useCallback(() => {
    for (const r of [nodes, corridors, health, opps, baseRate, comet, spread, treasury, holdings, ledger, runs, killSwitch]) void r.refresh()
  }, [nodes, corridors, health, opps, baseRate, comet, spread, treasury, holdings, ledger, runs, killSwitch])

  const value: ImmCtx = {
    audience, viewMode, setViewMode, canOperate, canExecute, executeBlockedReason,
    nodes, corridors, health, opps, baseRate, comet, spread, treasury, holdings, ledger, runs, killSwitch, caps,
    views, book, liveRun, refreshAll,
    go, tab, toast, toasts, openModal: setModal, closeModal: () => setModal(null), modal, lastKill, setLastKill, pick, setPick,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
