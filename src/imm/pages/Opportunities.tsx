import { useState } from 'react'
import { fx, pct } from '../format'
import { projectCycles, RUN_STEP_NOTE, RUN_STEPS } from '../derive'
import type { CorridorView } from '../derive'
import { useImm } from '../store'
import { Card, ChecksView, DecisionPill, Empty, Flow, Loading } from '../ui'

function Row({ v, rank, open, onToggle }: { v: CorridorView; rank: number | null; open: boolean; onToggle: () => void }) {
  const { go, setPick } = useImm()
  const [principal, setPrincipal] = useState('100')
  const o = v.opp
  const p = Number(principal)
  const rows = o && v.cycleMultiplier && p > 0 ? projectCycles(p, v.cycleMultiplier, 5) : []
  return (
    <div className={'opp' + (rank === 1 ? ' rec' : '')}>
      <button className="opp-m" aria-expanded={open} onClick={onToggle}>
        <span className="rk">{rank ?? '·'}</span>
        <div style={{ minWidth: 0 }}>
          {o ? <Flow nodes={o.nodes} /> : <div className="sm">{v.name}</div>}
          <div className="meta">
            {v.name}{o ? ` · ${o.discount} reseller discount · mints ${o.mintAsset} · exits via ${o.exitLabel}` : ''}
            {rank === 1 && <> · <span className="gold">Recommended</span></>}
          </div>
        </div>
        <div className="opp-r">
          <div><div className="p">{o ? `${o.multiplier} per cycle` : '—'}</div><div className="xs muted">{o ? o.pathDesc.replace(/ /g, ' ') : ''}</div></div>
          <div className={'roi ' + (v.decision === 'BLOCK' ? 'muted' : '')}>{o ? o.profitPct : '—'}</div>
          <DecisionPill d={v.decision} />
        </div>
      </button>
      {open && (
        <div className="opp-x">
          <ol className="steps">
            {RUN_STEPS.map((s, i) => {
              const node = o?.nodes.find((n) => (i === 0 && n.type === 'procure') || (i === 1 && n.type === 'liquidate') || (i === 2 && n.type === 'mint') || (i === 3 && n.type === 'rollover') || (i === 4 && n.type === 'exit'))
              return (
                <li key={s}><span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <div><div className="what">{s}{node ? ` · ${node.id} ${node.name}` : ''}</div><div className="how">{RUN_STEP_NOTE[i]}</div></div>
                  <div className="out">{node?.tag || ''}</div></li>
              )
            })}
          </ol>
          <ChecksView checks={v.checks} />
          {rows.length > 0 && (
            <div>
              <div className="between" style={{ marginBottom: 8 }}>
                <h3 className="eyebrow">Compounding projection</h3>
                <label className="row sm" htmlFor={'prin-' + v.id}>Principal ({o?.currency})
                  <input id={'prin-' + v.id} className="num" style={{ width: 110 }} inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value.replace(/[^0-9.]/g, ''))} /></label>
              </div>
              <div className="scroll-x"><table className="t cycles"><thead><tr><th>Cycle</th><th className="r">In</th><th className="r">Out</th><th className="r">Return</th><th className="r">Total</th></tr></thead>
                <tbody>{rows.map((r) => <tr key={r.cycle}><td>{r.cycle}</td><td className="r num">{fx(r.inAmt)}</td><td className="r num">{fx(r.outAmt)}</td><td className="r num">{pct(r.ret)}</td><td className="r num">{pct(r.total)}</td></tr>)}</tbody></table></div>
              <p className="xs muted" style={{ marginTop: 6 }}>A projection from the server's per-cycle multiplier. Real fills, fees and slippage will differ.</p>
            </div>
          )}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn primary" disabled={v.decision === 'BLOCK'} onClick={() => { setPick(v.id); go('trade') }}>Open in Trade</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Opportunities() {
  const { views, opps, corridors, baseRate } = useImm()
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState('ALL')
  const live = views.filter((v) => v.opp && v.eligible)
  const held = views.filter((v) => !(v.opp && v.eligible))
  const groups = [...new Set(live.map((v) => v.opp!.nodes[0]?.name || '').filter(Boolean))]
  const list = live.filter((v) => filter === 'ALL' || v.opp!.nodes[0]?.name === filter)

  return (
    <div className="page">
      <div className="page-h">
        <div>
          <h1>Opportunities</h1>
          <p>Each corridor is a procure, liquidate, mint and exit chain that the backend can run today. The server prices every corridor from its reseller discount and FX edge, and an operator can switch any of them on or off.</p>
        </div>
        <div className="xs muted" style={{ textAlign: 'right' }}>{live.length} eligible · {held.length} held back<br />Base rate {baseRate.data?.rate != null ? fx(baseRate.data.rate, 2) : 'not fixed'}</div>
      </div>

      {!opps.loaded || !corridors.loaded ? <Loading what="corridors" /> : (
        <>
          {groups.length > 1 && (
            <div className="chips" role="group" aria-label="Filter by starting node">
              <button className="chip" aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}>All starting points</button>
              {groups.map((g) => <button key={g} className="chip" aria-pressed={filter === g} onClick={() => setFilter(g)}>Start in {g}</button>)}
            </div>
          )}
          {list.length ? <div className="opps">{list.map((v, i) => <Row key={v.id} v={v} rank={i + 1} open={open === v.id} onToggle={() => setOpen(open === v.id ? null : v.id)} />)}</div>
            : <Empty>No corridor is eligible right now. {held[0]?.reasons[0] || ''}</Empty>}

          {held.length > 0 && (
            <Card title="Held back" sub="These corridors cannot run now: a switch is off, a node has no live integration, or a limit is breached.">
              <div className="opps">{held.map((v) => <Row key={v.id} v={v} rank={null} open={open === v.id} onToggle={() => setOpen(open === v.id ? null : v.id)} />)}</div>
            </Card>
          )}
        </>
      )}

      <details className="how"><summary>How the engine decides</summary>
        <p>The server reads each corridor's reseller discount and FX edge, and projects one cycle as (1 + discount) ÷ (1 − FX edge) and compounds it over five cycles. The reseller discount is a linear markup on the top-up (500 KES paid returned 525 KES of float), so a 5% discount is exactly 1.05 per cycle. Fees, slippage and gas still come off the real result. Before it moves any money, the run engine checks the daily procurement limit, each node's minimum balance and exposure cap, that the airtime backing exists in the real payout balance, the swap slippage, and the gas cost against the margin. A corridor is eligible only when it is switched on and every node it uses is live and enabled. Projected returns are estimates, not promises.</p>
      </details>
    </div>
  )
}
