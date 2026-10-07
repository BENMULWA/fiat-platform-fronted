import { useEffect, useState } from 'react'
import * as A from '../api'
import { ageFromSeconds, ago, fx, num, pct } from '../format'
import { useImm, useResource } from '../store'
import { Card, Empty, I, Loading, Toggle, Unavailable } from '../ui'

type Tab = 'rates' | 'corridors' | 'limits' | 'integration'

export default function Pricing() {
  const { canOperate } = useImm()
  const [tab, setTab] = useState<Tab>('rates')
  const tabs: [Tab, string][] = [['rates', 'Rates and venues'], ['corridors', 'Corridors'], ['limits', 'Node limits'], ...(canOperate ? [['integration', 'Integration'] as [Tab, string]] : [])]
  return (
    <div className="page">
      <div className="page-h"><div>
        <h1>Pricing engine</h1>
        <p>The base rate anchors every KES value. IMC is pegged at one dollar. Comet quotes KES to IMC, and the corridor engine takes its discount and FX edge from each corridor's settings. Everything on this page is read from the backend.</p>
      </div></div>
      <div className="seg" role="tablist" style={{ justifySelf: 'start', flexWrap: 'wrap' }}>
        {tabs.map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)}>{l}</button>)}
      </div>
      {tab === 'rates' && <Rates />}
      {tab === 'corridors' && <Corridors />}
      {tab === 'limits' && <Limits />}
      {tab === 'integration' && canOperate && <Integration />}
    </div>
  )
}

function Rates() {
  const { baseRate, comet, spread, canOperate, openModal, toast, refreshAll } = useImm()
  const n9 = useResource(A.getN9Reference, 30000)
  const exposure = useResource(A.getCometExposure, 30000)
  const rate = baseRate.data?.rate ?? null
  const cometRate = typeof comet.data?.rate === 'number' ? comet.data.rate : null
  const implied = cometRate && cometRate > 0 ? 1 / cometRate : null

  const editRate = () => openModal({
    title: 'Fix the KES/USD base rate',
    body: <p className="sm ink2">One rate feeds the Comet KES/IMC peg refresh, the live-discount floor and the KES exit valuation. Use today's CBK mean or your agreed rate.</p>,
    fields: [
      { id: 'rate', label: 'KES per US dollar', type: 'number', value: rate != null ? String(rate) : '', required: true },
      { id: 'source', label: 'Source', value: 'CBK mean', hint: 'For example: CBK mean 6 Oct 2026', required: true },
    ],
    confirm: 'Fix rate',
    onConfirm: async (v) => {
      const r = num(v.rate)
      if (r == null || r <= 0) return 'Enter a rate above zero.'
      const res = await A.fixBaseRate(r, v.source)
      if (!res.ok) return res.error
      toast(`Base rate fixed at ${fx(r, 2)}`)
      refreshAll()
    },
  })

  const editSpread = () => {
    const s = spread.data
    openModal({
      title: 'Retail spread (USDA / KES)',
      body: <p className="sm ink2">The bid is what retail users receive when they sell. The ask is what they pay. It applies to every retail quote straight away.</p>,
      fields: [
        { id: 'bid', label: 'Bid (KES)', type: 'number', value: s ? String(s.bid) : '', required: true },
        { id: 'ask', label: 'Ask (KES)', type: 'number', value: s ? String(s.ask) : '', required: true },
        { id: 'active', label: 'Quoting', type: 'select', value: String(s?.active ?? true), options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Paused' }] },
        { id: 'autoPeg', label: 'Auto-peg to reference', type: 'select', value: String(s?.autoPeg ?? true), options: [{ value: 'true', label: 'On' }, { value: 'false', label: 'Off' }] },
      ],
      onConfirm: async (v) => {
        const bid = num(v.bid), ask = num(v.ask)
        if (bid == null || ask == null || bid <= 0 || ask <= 0) return 'Enter a bid and an ask above zero.'
        if (bid > ask) return 'The bid cannot be above the ask.'
        const res = await A.saveSpread({ active: v.active === 'true', autoPeg: v.autoPeg === 'true', bid, ask })
        if (!res.ok) return res.error
        toast('Spread saved')
        refreshAll()
      },
    })
  }

  const exp = exposure.data ? Object.entries(exposure.data).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v)) : []

  return (
    <div className="grid g-2b">
      <div className="stack">
        <Card cls="lift">
          <div className="eyebrow">Base rate</div>
          <div className="row" style={{ alignItems: 'baseline', gap: 10, marginTop: 6 }}><span className="hero-n">{rate != null ? fx(rate, 2) : '—'}</span><span className="muted">KES per USD</span></div>
          <p className="sm muted" style={{ margin: '6px 0 0' }}>
            {baseRate.data?.source || 'No source recorded'} · fixed {ageFromSeconds(baseRate.data?.ageSeconds ?? null)}
            {baseRate.data?.stale ? <> · <span className="warn">stale</span></> : null}
            {canOperate && <> · <button className="linkbtn" onClick={editRate}>Fix the rate</button></>}
          </p>
          {baseRate.error && !baseRate.data && <p className="sm neg" style={{ marginTop: 8 }}>{baseRate.error}</p>}
        </Card>

        <Card title="Comet KES to IMC" sub="Live quote from Comet's internal market maker. It refuses quotes older than 60 minutes.">
          {!comet.loaded ? <Loading what="the Comet quote" /> : comet.data ? (
            <dl className="kv">
              <div><dt>KES to IMC</dt><dd>{cometRate != null ? cometRate.toFixed(6) : '—'}</dd></div>
              <div><dt>Implied KES per IMC</dt><dd>{implied != null ? fx(implied, 2) : '—'}</dd></div>
              <div><dt>Against base rate</dt><dd className={implied && rate ? (implied > rate ? 'pos' : 'neg') : ''}>{implied && rate ? pct(implied / rate - 1, 2) : '—'}</dd></div>
              <div><dt>Rate age</dt><dd className="sm" style={{ fontFamily: 'var(--sans)' }}>{String(comet.data.rateAge ?? '—')}</dd></div>
            </dl>
          ) : <div className="note warn">Comet is not quoting: {comet.error}</div>}
        </Card>

        <Card title="Celo exit reference (N9)" sub="Your real Celo USDC balance priced through Comet's live pools. Nothing is executed.">
          {!n9.loaded ? <Loading what="the Celo balance" /> : n9.data ? (
            <dl className="kv">
              <div><dt>USDC balance</dt><dd>{fx(n9.data.realUsdcBalance, 4)}</dd></div>
              <div><dt>Quoted out ({n9.data.quoteTo})</dt><dd>{fx(n9.data.quotedOut, 4)}</dd></div>
              <div><dt>Pool slippage</dt><dd className={n9.data.realUsdcBalance > 0 && n9.data.quotedOut / n9.data.realUsdcBalance < 0.99 ? 'neg' : ''}>{n9.data.realUsdcBalance > 0 ? pct(n9.data.quotedOut / n9.data.realUsdcBalance - 1, 2) : '—'}</dd></div>
            </dl>
          ) : <div className="note warn">{n9.error}</div>}
        </Card>
      </div>

      <div className="stack">
        <Card title="Retail spread" sub="What retail users are quoted for USDA against KES." actions={canOperate && <button className="btn sm" onClick={editSpread}>Edit</button>}>
          {!spread.loaded ? <Loading what="the spread" /> : spread.data ? (
            <dl className="kv">
              <div><dt>Bid</dt><dd>{fx(spread.data.bid, 2)}</dd></div>
              <div><dt>Ask</dt><dd>{fx(spread.data.ask, 2)}</dd></div>
              <div><dt>Reference</dt><dd>{fx(spread.data.reference, 2)}</dd></div>
              <div><dt>Quoting</dt><dd>{spread.data.active ? 'Active' : 'Paused'}</dd></div>
              <div><dt>Auto-peg</dt><dd>{spread.data.autoPeg ? 'On' : 'Off'}</dd></div>
              <div><dt>Set</dt><dd className={'sm ' + (spread.data.stale ? 'warn' : '')} style={{ fontFamily: 'var(--sans)' }}>{spread.data.updatedAt ? ago(spread.data.updatedAt) : 'never'}{spread.data.stale ? ' · stale' : ''}</dd></div>
            </dl>
          ) : <div className="note warn">{spread.error}</div>}
        </Card>

        <Card title="Comet exposure" sub="How much of the IMC on Celo is backed by real reserves.">
          {!exposure.loaded ? <Loading what="exposure" /> : exp.length ? (
            <dl className="kv">{exp.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="sm">{String(v)}</dd></div>)}</dl>
          ) : <div className="note warn">{exposure.error || 'Comet returned no exposure figures.'}</div>}
        </Card>

        <Card title="Venue quotes" sub="Bid and ask at each venue (Binance P2P, Valora, Yellow Card).">
          <Unavailable title="Venue quotes are not served yet" endpoint="GET /api/imm/venues">Until the backend serves them, this page will not show invented prices.</Unavailable>
        </Card>
      </div>
    </div>
  )
}

function Corridors() {
  const { corridors, nodes, canOperate, toast, refreshAll, views } = useImm()
  const [busy, setBusy] = useState<string | null>(null)
  const flip = async (id: string, on: boolean) => {
    setBusy(id)
    const r = await A.setCorridorEnabled(id, on)
    setBusy(null)
    if (!r.ok) return toast(`Could not switch ${id}: ${r.error}`, 'bad')
    toast(`${id} switched ${on ? 'on' : 'off'}`)
    refreshAll()
  }
  const label = (id: string) => { const n = (nodes.data || []).find((x) => x.id === id); return n ? `${id} ${n.label}` : id }
  return (
    <Card title="Corridor settings" sub="The reseller discount and FX edge are set in the node registry on the server. An operator can switch a whole corridor off here.">
      {!corridors.loaded ? <Loading what="corridors" /> : !corridors.data?.length ? <Empty>No corridors were returned.</Empty> : (
        <div className="scroll-x"><table className="t"><thead><tr><th>Corridor</th><th>Procure</th><th>Liquidate</th><th className="r">Discount</th><th className="r">FX edge</th><th>Mint / exit</th><th>Status</th><th className="r">Switch</th></tr></thead>
          <tbody>{corridors.data.map((c) => {
            const v = views.find((x) => x.id === c.id)
            return (
              <tr key={c.id}>
                <td><b>{c.name}</b><div className="xs muted mono">{c.id}</div></td>
                <td className="sm">{label(c.node_procure)}</td><td className="sm">{label(c.node_liquidate)}</td>
                <td className="r num">{pct(c.discount, 1)}</td><td className="r num">{pct(c.fx_edge, 1)}</td>
                <td className="sm">{c.mint_provider || 'default'} / {c.exit_provider || 'native'}</td>
                <td>{c.eligible ? <span className="pill pos">Eligible</span> : <span className="pill warn" title={v?.reasons.join(' ')}>Held back</span>}{!c.eligible && v?.reasons[0] && <div className="xs muted">{v.reasons[0]}</div>}</td>
                <td className="r">{canOperate ? <Toggle on={c.corridorEnabled} onChange={(x) => flip(c.id, x)} disabled={busy === c.id} label={`Switch ${c.id}`} /> : <span className="xs muted">{c.corridorEnabled ? 'On' : 'Off'}</span>}</td>
              </tr>
            )
          })}</tbody></table></div>
      )}
    </Card>
  )
}

function Limits() {
  const { health } = useImm()
  return (
    <Card title="Node limits" sub="The floors and caps the run engine enforces before it moves money. Balances are read live from the ledger.">
      {!health.loaded ? <Loading what="node health" /> : !health.data ? <Empty>{health.error || 'No health report.'}</Empty> : (
        <div className="scroll-x"><table className="t"><thead><tr><th>Node</th><th>Asset</th><th className="r">Balance</th><th className="r">Minimum</th><th className="r">Exposure cap (USD)</th><th>Status</th></tr></thead>
          <tbody>{health.data.nodes.map((n) => (
            <tr key={n.id}><td><b className="mono">{n.id}</b> <span className="sm">{n.label}</span></td><td>{n.asset || '—'}</td>
              <td className="r num">{n.balance == null ? '—' : fx(n.balance, 2)}</td><td className="r num">{n.minBalance ? fx(n.minBalance, 2) : '—'}</td><td className="r num">{n.exposureCapUsd ? fx(n.exposureCapUsd, 2) : '—'}</td>
              <td>{n.belowFloor ? <span className="pill neg">Below floor</span> : n.overExposureCap ? <span className="pill neg">Over cap</span> : n.balance == null ? <span className="pill neutral">Not tracked</span> : <span className="pill pos">Within limits</span>}</td></tr>
          ))}</tbody></table></div>
      )}
      <p className="xs muted" style={{ marginTop: 10 }}>Daily procurement limits are enforced by the run engine but not yet reported by an endpoint.</p>
    </Card>
  )
}

function Integration() {
  const [res, setRes] = useState<Record<string, A.ProbeResult>>({})
  const [busy, setBusy] = useState(false)
  const check = async () => {
    setBusy(true)
    const out: Record<string, A.ProbeResult> = {}
    await Promise.all(A.CONTRACTS.map(async (c) => { out[c.id] = await A.probe(c) }))
    setRes(out)
    setBusy(false)
  }
  useEffect(() => { void check() }, [])
  const label: Record<A.ProbeResult, [string, string]> = {
    live: ['probe-ok', 'Responding'], missing: ['probe-miss', 'Not built'], protected: ['probe-ok', 'Responding (needs login)'],
    unreachable: ['probe-bad', 'Not reachable'], write: ['muted', 'Write: not probed'],
  }
  const planned = A.CONTRACTS.filter((c) => c.state === 'planned')
  const missing = planned.filter((c) => res[c.id] === 'missing').length
  return (
    <Card title="Backend integration" sub="Every endpoint this console uses. GET endpoints are checked against your running server; writes are never called."
      actions={<button className="btn sm" onClick={check} disabled={busy}><I.RefreshCw size={14} /> {busy ? 'Checking…' : 'Check again'}</button>}>
      <div className="note" style={{ marginBottom: 12 }}>{Object.keys(res).length ? `${missing} of ${planned.length} planned endpoints are still to build.` : 'Checking endpoints…'}</div>
      <div className="scroll-x"><table className="t"><thead><tr><th>Endpoint</th><th>Purpose</th><th>Feeds</th><th>Planned</th><th>Status</th></tr></thead>
        <tbody>{A.CONTRACTS.map((c) => {
          const r = res[c.id]
          return (
            <tr key={c.id}>
              <td><code className="ep">{c.method} {c.path}</code></td>
              <td className="sm">{c.title}<div className="xs muted">{c.purpose}</div></td>
              <td className="xs muted">{c.needs}</td>
              <td>{c.state === 'planned' ? <span className="pill gold">To build</span> : <span className="pill neutral">Exists</span>}</td>
              <td className={'sm ' + (r ? label[r][0] : 'muted')}>{r ? label[r][1] : '…'}</td>
            </tr>
          )
        })}</tbody></table></div>
    </Card>
  )
}
