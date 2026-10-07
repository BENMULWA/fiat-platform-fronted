import { useState } from 'react'
import * as A from '../api'
import { fx } from '../format'
import { useImm } from '../store'
import { Card, Empty, Loading, Meter, Toggle } from '../ui'
import type { ImmNode, NodeHealth } from '../types'

const KIND_VAR: Record<string, string> = {
  AIRTIME: '--k-air', MOBILE_MONEY: '--k-mob', STABLECOIN: '--k-stable', TREASURY: '--k-trea', CELO: '--k-exit', POOL: '--k-card',
}
const KIND_LABEL: Record<string, string> = {
  AIRTIME: 'Airtime', MOBILE_MONEY: 'Mobile money', STABLECOIN: 'Stablecoin', TREASURY: 'Treasury', CELO: 'Celo exit', POOL: 'Pool',
}
const kc = (k: string) => `var(${KIND_VAR[k] || '--muted'})`
const state = (n: ImmNode) => (n.live && n.enabled ? 'ONLINE' : n.live ? 'PAUSED' : 'OFFLINE')

function NodeCard({ n, h, selected, onSelect }: { n: ImmNode; h?: NodeHealth; selected: boolean; onSelect: () => void }) {
  const st = state(n)
  const bal = h?.balance
  return (
    <button className={'nc' + (st === 'ONLINE' ? '' : ' off')} aria-pressed={selected} onClick={onSelect}>
      <div className="h">
        <span className="id"><span className={'dot ' + st} title={st} /><span style={{ color: kc(n.assetType) }}>{n.id}</span></span>
        <span className="tag" style={{ color: kc(n.assetType), background: `color-mix(in srgb, ${kc(n.assetType)} 12%, transparent)` }}>{KIND_LABEL[n.assetType] || n.assetType}</span>
      </div>
      <div className="nm">{n.label}</div>
      <div className="bal">{bal == null ? <span className="muted">not tracked</span> : <>{fx(bal, 2)}<small>{h?.asset}</small></>}</div>
      <div className="sig" style={{ justifyContent: 'flex-start', gap: 10 }}>
        <span>{n.category}</span><span>{n.live ? 'LIVE INTEGRATION' : 'NO INTEGRATION'}</span>
      </div>
      {h?.minBalance ? <div className="bar"><span className={h.belowFloor ? 'neg' : 'pos'} style={{ width: Math.min(100, ((bal || 0) / h.minBalance) * 100) + '%' }} /></div> : null}
      <div className="liq"><span>{st}</span>{h?.belowFloor && <b className="neg">BELOW FLOOR</b>}{h?.overExposureCap && <b className="neg">OVER CAP</b>}</div>
    </button>
  )
}

export default function Nodes() {
  const { nodes, health, corridors, ledger, canOperate, toast, refreshAll } = useImm()
  const [sel, setSel] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const list = nodes.data || []
  const n = list.find((x) => x.id === sel) || list[0]
  const h = n ? (health.data?.nodes || []).find((x) => x.id === n.id) : undefined
  const using = n ? (corridors.data || []).filter((c) => c.node_procure === n.id || c.node_liquidate === n.id) : []
  const acts = n ? (ledger.data?.feed || []).filter((t) => t.from === n.id || t.to === n.id).slice(0, 8) : []
  const live = list.filter((x) => x.live && x.enabled).length

  const flip = async (v: boolean) => {
    if (!n) return
    setBusy(true)
    const r = await A.setNodeEnabled(n.id, v)
    setBusy(false)
    if (!r.ok) return toast(`Could not switch ${n.id}: ${r.error}`, 'bad')
    toast(`${n.id} ${v ? 'returned to service' : 'pulled from service'}`)
    refreshAll()
  }

  return (
    <div className="page">
      <div className="page-h"><div>
        <h1>Node network</h1>
        <p>{list.length} nodes, {live} in service. A node is in service when it has a live integration and an operator has not switched it off. Balances are read from the ledger and the real wallets, and the floors and caps are the limits the run engine enforces.</p>
      </div></div>

      {!nodes.loaded ? <Loading what="nodes" /> : !list.length ? <Empty>The backend returned no nodes{nodes.error ? `: ${nodes.error}` : '.'}</Empty> : (
        <>
          <div className="nodes">{list.map((x) => <NodeCard key={x.id} n={x} h={(health.data?.nodes || []).find((y) => y.id === x.id)} selected={x.id === n?.id} onSelect={() => setSel(x.id)} />)}</div>

          {n && (
            <Card cls="lift" title={`${n.id} · ${n.label}`} sub={`${KIND_LABEL[n.assetType] || n.assetType} · ${n.category}`}
              actions={canOperate && n.live ? (
                <label className="row sm" htmlFor="imm-node-switch">In service <Toggle on={n.enabled} onChange={flip} disabled={busy} label={`Switch ${n.id}`} /></label>
              ) : undefined}>
              <dl className="kv">
                <div><dt>Balance</dt><dd>{h?.balance == null ? 'not tracked' : `${fx(h.balance, 2)} ${h.asset || ''}`}</dd></div>
                <div><dt>Minimum balance</dt><dd>{h?.minBalance ? fx(h.minBalance, 2) : '—'}</dd></div>
                <div><dt>Exposure cap (USD)</dt><dd>{h?.exposureCapUsd ? fx(h.exposureCapUsd, 2) : '—'}</dd></div>
                <div><dt>Integration</dt><dd className={n.live ? 'pos' : 'warn'}>{n.live ? 'Live' : 'None yet'}</dd></div>
                <div><dt>Switch</dt><dd>{n.enabled ? 'On' : 'Off'}</dd></div>
                <div><dt>Checked</dt><dd className="sm" style={{ fontFamily: 'var(--sans)' }}>{health.data?.checkedAt ? new Date(health.data.checkedAt).toLocaleTimeString('en-GB', { hour12: false }) : '—'}</dd></div>
              </dl>
              {h?.minBalance ? <div style={{ marginTop: 16 }}><Meter label="Balance against minimum" value={Math.min(1, (h.balance || 0) / h.minBalance)} display={`${fx(h.balance, 2)} / ${fx(h.minBalance, 2)}`} good={!h.belowFloor} /></div> : null}
              <div className="grid g-2" style={{ marginTop: 20 }}>
                <div>
                  <h3 className="eyebrow" style={{ margin: '0 0 6px' }}>Used by corridors</h3>
                  {using.length ? <div className="scroll-x"><table className="t"><tbody>{using.map((c) => (
                    <tr key={c.id}><td className="sm">{c.name}</td><td className="xs muted">{c.node_procure === n.id ? 'procure' : 'liquidate'}</td><td className="r xs">{c.eligible ? <span className="pos">eligible</span> : <span className="warn">held back</span>}</td></tr>
                  ))}</tbody></table></div> : <p className="sm muted">No corridor uses this node.</p>}
                </div>
                <div>
                  <h3 className="eyebrow" style={{ margin: '0 0 6px' }}>Recent ledger entries</h3>
                  {acts.length ? <div className="scroll-x"><table className="t"><tbody>{acts.map((t) => (
                    <tr key={t.id}><td className="xs muted nowrap">{t.time}</td><td className="sm">{t.type}<div className="xs muted">{t.from} → {t.to}</div></td><td className="r num xs">{t.amount}</td></tr>
                  ))}</tbody></table></div> : <p className="sm muted">No recent entries for this node.</p>}
                </div>
              </div>
              <p className="xs muted" style={{ marginTop: 14 }}>Reloading, matching a statement and editing a node need backend endpoints that do not exist yet. They are listed under Pricing → Integration.</p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
