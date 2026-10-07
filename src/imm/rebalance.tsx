import { useEffect, useRef } from 'react'
import * as A from './api'
import { fx } from './format'
import { useImm, useResource } from './store'
import { Scan } from './run'
import { Card, Loading } from './ui'

/** Brings every IMC pool back to $1 per IMC, one swap per pool, after showing exactly what it will do.
 *  The work runs on the server in the background; this card follows its progress step by step. */
export default function RebalanceCard() {
  const { openModal, toast, refreshAll } = useImm()
  const pv = useResource(A.getRebalance, 20000)
  const jobRes = useResource(A.getRebalanceJob, 2000)         // cheap, in memory on the server; shows a running job after a reload too
  const job = jobRes.data?.job || null
  const running = job?.status === 'running'
  const d = pv.data
  const actions = d?.plan.actions || []

  // When a job finishes, refresh the pool numbers and the rest of the console once.
  const seen = useRef<string>('')
  useEffect(() => {
    if (!job || job.status === 'running') return
    const key = `${job.id}:${job.status}`
    if (key === seen.current) return
    seen.current = key
    void pv.refresh()
    refreshAll()
    toast(job.status === 'done' ? 'Pools rebalanced' : 'Rebalance stopped')
  }, [job?.id, job?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    if (!d || !actions.length) return
    openModal({
      title: 'Rebalance the IMC pools',
      danger: true,
      confirm: `Run ${actions.length} swap${actions.length > 1 ? 's' : ''}`,
      body: (
        <div className="stack" style={{ gap: 12 }}>
          <div className="sumrows">
            {actions.map((a) => (
              <div key={a.pair}><span>{a.pair}: swap {fx(a.spendAmount, 6)} {a.spend}</span><b>≈ {fx(a.receiveAmount, 4)} {a.receive} · {fx(a.price, 3)} → {fx(a.priceAfter, 3)}</b></div>
            ))}
            {d.needs.filter((n) => n.shortfall > 0).map((n) => <div key={n.symbol}><span>Sent from the treasury first</span><b>{fx(n.shortfall, 6)} {n.symbol}</b></div>)}
          </div>
          <p className="sm" style={{ color: 'var(--neg)' }}>This moves real funds on Celo and cannot be undone from here. It runs on the server and takes a minute or two; you can follow it on this card. The IMC you receive stays in the engine wallet and the next pool run reuses it.</p>
        </div>
      ),
      onConfirm: async () => {
        const r = await A.doRebalance()
        if (!r.ok) return r.error
        seen.current = ''
        void jobRes.refresh()
        toast('Rebalance started')
      },
    })
  }

  return (
    <Card title="Rebalance the IMC pools" sub="Use this when a swap or an arbitrage has moved a pool away from $1 per IMC. It swaps the opposite way, once per pool.">
      {!pv.loaded ? <Loading what="the pools" /> : pv.error && !d ? <div className="note neg">{pv.error}</div> : d && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="sumrows">
            <div><span>Pool {d.plan.pair}</span><b>{fx(d.plan.imcReserve, 2)} IMC / {fx(d.plan.usdcReserve, 2)} USDC · {fx(d.plan.price, 4)}</b></div>
            {d.plan.otherPools.map((o) => <div key={o.pair}><span>Pool {o.pair}</span><b>{fx(o.imcReserve, 2)} IMC / {fx(o.otherReserve, 2)} · {fx(o.price, 4)}</b></div>)}
            {actions.map((a) => <div key={a.pair}><span>Fix {a.pair}</span><b>{fx(a.spendAmount, 6)} {a.spend} → ≈ {fx(a.receiveAmount, 4)} {a.receive}</b></div>)}
            {d.needs.map((n) => <div key={n.symbol}><span>Treasury {n.symbol} (needs {fx(n.shortfall, 6)})</span><b>{fx(n.treasury, 4)}</b></div>)}
          </div>
          {!running && d.reasons.map((r) => <div key={r} className="note warn">{r}</div>)}

          {job && (
            <div className={'note ' + (running ? '' : job.status === 'done' ? 'pos' : 'neg')}>
              <b>{running ? 'Working…' : job.status === 'done' ? 'Finished' : 'Stopped'}</b>
              <ol className="tl" style={{ marginTop: 8 }}>
                {job.steps.map((s, i) => {
                  const last = i === job.steps.length - 1
                  return <li key={i} className={running && last ? 'tl-now' : 'tl-done'}><span className="tl-dot" aria-hidden="true" /><div><b style={{ fontWeight: 500, fontSize: 13.5 }}>{s.msg}</b></div></li>
                })}
              </ol>
              {job.error && <p className="sm" style={{ marginTop: 8 }}>{job.error}</p>}
              {job.result && (
                <div className="stack" style={{ gap: 4, marginTop: 8 }}>
                  {job.result.swaps.map((s) => (
                    <div key={s.pair} className="sm">{s.pair}: swapped {fx(s.spent, 6)} {s.spentSymbol} for {fx(s.received, 4)} {s.receivedSymbol} ({s.confirmed ? 'confirmed on Celo' : 'estimate'}). <Scan kind="tx" id={s.txHash} label="View the swap" /></div>
                  ))}
                  {job.result.pricesAfter && <div className="sm">Prices now: {Object.entries(job.result.pricesAfter).map(([k, v]) => `${k} ${fx(v, 4)}`).join(' · ')}</div>}
                </div>
              )}
            </div>
          )}
          <div className="row"><button className="btn primary" disabled={!d.canExecute || running} onClick={start}>{running ? 'Working…' : 'Rebalance pools…'}</button></div>
        </div>
      )}
    </Card>
  )
}
