import './imm.css'
import { useAuth } from '../contexts/AuthContext'
import * as A from './api'
import { ageFromSeconds, fx, pct, sgnUsd, tone, usd } from './format'
import { ImmProvider, TABS, useImm } from './store'
import { I, Modal, Toasts } from './ui'
import type { Audience } from './types'
import { useTheme } from '../contexts/ThemeContext'
import Dashboard from './pages/Dashboard'
import Opportunities from './pages/Opportunities'
import Trade from './pages/Trade'
import Nodes from './pages/Nodes'
import Pricing from './pages/Pricing'
import Ledger from './pages/Ledger'

const LABEL: Record<(typeof TABS)[number], string> = {
  dashboard: 'Dashboard', opportunities: 'Opportunities', trade: 'Run', nodes: 'Nodes', pricing: 'Pricing', ledger: 'Ledger',
}

function Header() {
  const { baseRate, book, views, liveRun, runs, killSwitch, lastKill, setLastKill, viewMode, setViewMode, audience, canOperate, openModal, toast, refreshAll, tab, go } = useImm()
  const best = views.find((v) => v.opp && v.eligible && v.decision !== 'BLOCK')
  const rate = baseRate.data?.rate ?? null
  const stale = !!baseRate.data?.stale || (baseRate.loaded && rate == null)
  const halted = killSwitch.data?.active ?? lastKill
  const realised = (runs.data?.runs || []).filter((r) => r.status === 'COMPLETED').reduce((a, r) => a + (r.profit || 0), 0)
  const stable = book.total && book.groups.stable ? book.groups.stable / book.total : null

  const toggleKill = () => {
    const arm = halted === true
    openModal({
      title: arm ? 'Re-arm autonomous trading' : 'Halt autonomous trading',
      danger: arm,
      confirm: arm ? 'Re-arm engine' : 'Halt engine',
      body: <p className="sm ink2">{arm
        ? 'The autonomous decision engine may start real corridor runs on its own after this. Only re-arm if the nodes, the base rate and the reserves have been checked.'
        : 'The autonomous decision engine stops starting new runs. Runs already in flight are not stopped by this switch.'}</p>,
      onConfirm: async () => {
        const r = await A.setKillSwitch(!arm)
        if (!r.ok) return r.error
        setLastKill(!arm)
        toast(arm ? 'Autonomous engine re-armed' : 'Autonomous engine halted')
        refreshAll()
      },
    })
  }

  return (
    <header className="top">
      <div className="wrap">
        <div className="top-1">
          <div className="brand"><span className="mark">J</span><div><b>Jasiri Capital</b><span>Internal Market Maker</span></div></div>
          <div className="ctrls">
            <span className={'fresh' + (stale ? ' stale' : '')} title="KES/USD base rate"><i />{rate == null ? 'No base rate' : `Base rate ${ageFromSeconds(baseRate.data?.ageSeconds ?? null)}`}</span>
            {canOperate ? (
              <button className="fresh" onClick={toggleKill} title="Autonomous decision engine">
                <i style={{ background: halted === true ? 'var(--pos)' : halted === false ? 'var(--warn)' : 'var(--muted)' }} />
                Autonomous engine: {halted === true ? 'halted' : halted === false ? 'armed' : 'unknown'}
              </button>
            ) : (
              <span className="fresh" title="Autonomous decision engine"><i style={{ background: halted === true ? 'var(--pos)' : halted === false ? 'var(--warn)' : 'var(--muted)' }} />Engine {halted === true ? 'halted' : halted === false ? 'armed' : 'state unknown'}</span>
            )}
            {audience === 'operator' ? (
              <div className="seg" role="group" aria-label="View">
                <button aria-pressed={viewMode === 'operator'} onClick={() => setViewMode('operator')}>Operator</button>
                <button aria-pressed={viewMode === 'investor'} onClick={() => setViewMode('investor')}><I.Eye size={14} />Investor</button>
              </div>
            ) : <span className="pill neutral"><I.Eye size={12} />Investor view</span>}
          </div>
        </div>
        <div className="stats" aria-label="Key figures">
          <div className="stat"><div className="l">Base rate · KES/USD</div><div className="v">{rate != null ? fx(rate, 2) : '—'}</div></div>
          <div className="stat"><div className="l">Book value</div><div className="v">{usd(book.total)}</div></div>
          <div className="stat"><div className="l">Stablecoins</div><div className="v">{stable != null ? pct(stable, 0) : '—'}</div></div>
          <div className="stat"><div className="l">Best, 5 cycles</div><div className={'v ' + (best ? 'pos' : 'muted')}>{best?.opp ? best.opp.profitPct : '—'}</div></div>
          <div className="stat"><div className="l">Run</div><div className="v">{liveRun ? `${liveRun.currentCycle}/${Number(liveRun.config?.cycles) || 5}` : '—'}{liveRun && <small className="muted">cycle</small>}</div></div>
          <div className="stat"><div className="l">Realised, completed runs</div><div className={'v ' + (canOperate ? tone(realised) : 'muted')}>{canOperate && runs.loaded ? sgnUsd(realised) : '—'}</div></div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((id) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>{LABEL[id]}</button>)}
        </nav>
      </div>
    </header>
  )
}

function Body({ theme }: { theme: 'light' | 'dark' }) {
  const { tab } = useImm()
  const Page = { dashboard: Dashboard, opportunities: Opportunities, trade: Trade, nodes: Nodes, pricing: Pricing, ledger: Ledger }[tab as (typeof TABS)[number]] || Dashboard
  return (
    <div className="imm" data-theme={theme}>
      <Header />
      <main className="wrap" style={{ paddingBlock: '28px 60px' }}><Page /></main>
      <Modal />
      <Toasts />
    </div>
  )
}

/** The IMM console. `operator` is the admin surface (/market-maker); `investor` is the
 *  institutional surface (/otc/imm). The server still enforces every permission. */
export default function ImmConsole({ audience }: { audience: Audience }) {
  const { viewAsAdmin } = useAuth()
  // Follows the app-wide sun/moon toggle in the top bar.
  const { theme } = useTheme()
  return (
    <ImmProvider audience={audience} isAdmin={!!viewAsAdmin}>
      <Body theme={theme} />
    </ImmProvider>
  )
}
