import { useEffect, useState } from 'react'
import * as A from '../api'
import { isTerminal } from '../derive'
import { dt, fx, num, pct, sgnUsd, tone, usd } from '../format'
import { useImm, useResource } from '../store'
import { Card, ChecksView, Empty, Loading } from '../ui'
import { RunPanel, RunResult, RunTimeline, confirmCancel, statusPill } from '../run'
import FloatCard from '../float'
import ImcReceiptsCard from '../receipts'
import RebalanceCard from '../rebalance'
import MintCard from '../mint'

type Chk = { id: string; label: string; status: 'PASS' | 'WARN' | 'FAIL'; message: string }
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const STAGES = ['Amount', 'Check', 'Run', 'Result']

/** The investor's journey in four steps: pick an amount, see it is ready, watch it run, read the margin.
 *  Everything technical (cycles, airtime source, exit route, slippage) lives under "Advanced". */
export default function Trade() {
  const { views, canExecute, executeBlockedReason, pick, runs, liveRun, openModal, toast, refreshAll, canOperate, treasury, audience, viewMode, setViewMode } = useImm()
  const options = views.filter((v) => v.opp)
  const chosen = options.find((v) => v.id === pick) || options.find((v) => v.eligible && v.decision !== 'BLOCK') || options[0] || null
  const opp = chosen?.opp || null

  const [amount, setAmount] = useState('')
  const [adv, setAdv] = useState({ cycles: '1', source: 'auto' as 'auto' | 'float' | 'stk', exit: 'pool' as 'pool' | 'reserve', slip: '3' })
  const [trackedId, setTrackedId] = useState<string | null>(null)
  const [operOpen, setOperOpen] = useState(false)
  const floatState = useResource(A.getFloat, 15000, canOperate)

  // Pick up a run that is already open (for example after a reload).
  useEffect(() => { if (!trackedId && liveRun) setTrackedId(liveRun._id) }, [liveRun, trackedId])
  const run = useResource(() => A.getRun(trackedId as string), 2000, !!trackedId)
  const tracked = run.data

  // ---------------------------------------------------------------- the numbers
  const amt = num(amount)
  const baseline = opp ? num(opp.baseline) : null
  const discount = opp?.discountNum ?? 0
  const amtKes = opp && amt && amt > 0 ? (opp.currency === 'KES' ? amt : baseline ? amt * baseline : null) : null
  const principalUsd = amtKes != null && baseline ? amtKes / baseline : null
  const needKes = amtKes != null ? amtKes * (1 + discount) : null
  const imcOut = needKes != null && baseline ? needKes / baseline : null
  const nCycles = clamp(Math.floor(Number(adv.cycles) || 1), 1, 10)
  const slipFrac = clamp((Number(adv.slip) || 3) / 100, 0.001, 0.50)
  const usePool = adv.exit === 'pool'

  const floatKes = floatState.data?.balanceKes ?? null
  const floatEnough = needKes != null && floatKes != null && needKes <= floatKes
  const useFloat = adv.source === 'float' || (adv.source === 'auto' && floatEnough)   // auto: float when it covers the run, else a fresh M-Pesa prompt

  // Is the pool ready for this run? (read-only; the probe size is used until an amount is typed)
  const probeImc = imcOut ?? 0.01
  const pool = useResource(() => A.getPoolCheck(probeImc, slipFrac), 20000, usePool)
  useEffect(() => { if (usePool) void pool.refresh() }, [probeImc, slipFrac, usePool]) // eslint-disable-line react-hooks/exhaustive-deps
  const pc = pool.data
  const pcFresh = !!(pc && imcOut && Math.abs(pc.imc - imcOut) < 1e-9)

  // ---------------------------------------------------------------- how big a run is possible right now
  const paybillKes = treasury.data?.vaults?.N4_MPESA ?? null
  const caps: { by: string; kes: number }[] = []
  if (paybillKes != null) caps.push({ by: 'the paybill balance', kes: paybillKes / (1 + discount) })
  if (useFloat && floatKes != null) caps.push({ by: 'the airtime float', kes: floatKes / (1 + discount) })
  if (usePool && pc?.pool.seeded && baseline) {
    const rin = pc.pool.imcReserve, rout = pc.pool.outReserve
    const maxImc = Math.max(0, (0.997 * rout / (1 - slipFrac) - rin) / 0.997)
    caps.push({ by: 'the pool depth', kes: (maxImc * baseline) / (1 + discount) })
  }
  const limit = caps.length ? caps.reduce((a, b) => (b.kes < a.kes ? b : a)) : null
  const maxAmount = limit ? Math.floor(limit.kes * 100) / 100 : null

  // ---------------------------------------------------------------- readiness
  const checks: Chk[] = [...(chosen?.checks || [])]
  if (needKes != null && paybillKes != null && needKes > paybillKes)
    checks.push({ id: 'paybill', label: 'Paybill', status: 'FAIL', message: `The paybill holds ${fx(paybillKes, 2)} KES, not enough to back ${fx(needKes, 2)} KES of airtime. Try about ${fx(paybillKes / (1 + discount), 0)} KES or less.` })
  if (opp && useFloat && needKes != null && floatKes != null && needKes > floatKes)
    checks.push({ id: 'float', label: 'Airtime float', status: 'FAIL', message: `The float holds ${fx(floatKes, 2)} KES but this run needs ${fx(needKes, 2)} KES. Use a smaller amount or top up the float.` })
  if (opp && !useFloat && floatState.data && !floatState.data.defaultPhoneMasked)
    checks.push({ id: 'phone', label: 'Paying phone', status: 'FAIL', message: 'No M-Pesa paying phone is set on the server, and the float cannot cover this run.' })
  if (usePool && imcOut != null) {
    if (pool.error && !pc) checks.push({ id: 'poolerr', label: 'IMC pool', status: 'FAIL', message: `Could not check the pool: ${pool.error}` })
    if (pc && pcFresh) {
      if (pc.pool.seeded && pc.pool.price != null && Math.abs(1 - pc.pool.price) > slipFrac) checks.push({ id: 'skew', label: 'IMC pool', status: 'FAIL', message: `The pool is out of balance: 1 IMC is priced at ${fx(pc.pool.price, 4)} USDC, not $1 (${fx(pc.pool.imcReserve, 2)} IMC against ${fx(pc.pool.outReserve, 2)} USDC). A swap probably moved it. Rebalance the pool, or run a small test anyway with the button below.` })
      else if (!pc.pool.seeded) checks.push({ id: 'pool', label: 'IMC pool', status: 'FAIL', message: `The ${pc.pool.pair} pool is empty. Add liquidity in the Comet dashboard first.` })
      else if (!pc.quote.ok) checks.push({ id: 'quote', label: 'IMC pool', status: 'FAIL', message: `The pool gave no quote: ${pc.quote.error || 'unknown reason'}.` })
      else if (!pc.quote.withinGuard) checks.push({ id: 'slip', label: 'IMC pool', status: 'FAIL', message: `Selling ${fx(pc.imc, 4)} IMC would return ${fx((pc.quote.slippage ?? 0) * 100, 1)}% below $1, over your ${fx(slipFrac * 100, 1)}% limit. Use a smaller amount${maxAmount != null ? ` (up to about ${fx(maxAmount, 0)} KES)` : ''}.` })
      if (canOperate && pc.needsFunding && !pc.canFund) checks.push({ id: 'wallet', label: 'IMC for the swap', status: 'FAIL', message: `The swap needs ${fx(pc.shortfall, 4)} more IMC than the engine wallet holds, and the treasury has only ${fx(pc.masterFreeImc, 4)} free.` })
    }
  }
  const failing = checks.filter((c) => c.status === 'FAIL')
  // What a deliberate test run would have to accept: this run's own slippage in the live pool, plus a little room.
  const quoteSlip = pcFresh && pc?.quote.ok ? (pc.quote.slippage ?? 0) : pc?.pool.price != null ? 1 - pc.pool.price : 0.3
  const testSlip = Math.min(50, Math.max(5, Math.ceil(quoteSlip * 100) + 2))
  const warnings = checks.filter((c) => c.status === 'WARN')
  const checking = !!(amt && amt > 0 && usePool && !pcFresh && !pool.error)
  const ready = !!opp && !!chosen?.eligible && !!amt && amt > 0 && failing.length === 0 && !checking

  // ---------------------------------------------------------------- the expected result
  const outUsdc = usePool ? (pcFresh && pc?.quote.ok ? pc.quote.out : null) : imcOut
  const marginUsd = outUsdc != null && principalUsd != null ? outUsdc - principalUsd : null
  const marginPct = marginUsd != null && principalUsd ? marginUsd / principalUsd : null
  const testLossPct = marginPct != null && marginPct < 0 ? -marginPct * 100 : quoteSlip * 100

  const start = () => {
    if (!chosen || !opp || !amt) return
    openModal({
      title: 'Start this run',
      confirm: 'Start run',
      body: (
        <div className="stack" style={{ gap: 12 }}>
          <div className="sumrows">
            <div><span>You put in</span><b>{fx(amt, 2)} {opp.currency}</b></div>
            <div><span>IMC minted</span><b>{fx(imcOut, 4)} IMC</b></div>
            <div><span>You get back</span><b>{outUsdc != null ? `≈ ${fx(outUsdc, 4)} ${usePool ? 'USDC' : 'USDT'}` : '—'}</b></div>
            <div><span>Expected margin</span><b className={tone(marginUsd)}>{sgnUsd(marginUsd, 4)}{marginPct != null ? ` (${pct(marginPct, 2)})` : ''}</b></div>
          </div>
          {marginUsd != null && marginUsd < 0 && <div className="note warn"><b>This run is expected to lose {fx(-(marginPct ?? 0) * 100, 1)}%.</b> That is the pool's price, not the corridor. Use it only to test the flow with a small amount.</div>}
          <p className="sm" style={{ color: 'var(--neg)' }}>This moves real {useFloat ? 'value' : 'money'}{useFloat ? ' from your airtime float' : ' by M-Pesa'}. It keeps running on the server and cannot be undone from here.</p>
        </div>
      ),
      onConfirm: async () => {
        const r = await A.startRun(canOperate ? 'operator' : 'investor', {
          corridor_id: chosen.id, amount: amt, currency: opp.currency, cycles: nCycles,
          procure_mode: useFloat ? 'existing_float' : 'stk', swap_mode: usePool ? 'pool' : 'reserve', pool_max_slippage: slipFrac,
        })
        if (!r.ok) return r.error
        setTrackedId(r.data.run._id)
        toast('Run started')
        refreshAll()
      },
    })
  }

  const finished = !!tracked && isTerminal(tracked.status)
  const stage = !tracked ? (amt && amt > 0 ? 2 : 1) : finished ? 4 : 3
  const again = () => { setTrackedId(null); setAmount('') }
  const history = runs.data?.runs || []

  return (
    <div className="page wiz">
      <ol className="journey" aria-label="Progress">
        {STAGES.map((s, i) => (
          <li key={s} className={i + 1 < stage ? 'done' : i + 1 === stage ? 'now' : ''} aria-current={i + 1 === stage ? 'step' : undefined}><span>{i + 1}</span>{s}</li>
        ))}
      </ol>

      {!tracked ? (
        <>
          <Card title="How much do you want to put in?">
            {!opp ? <Loading what="the corridor" /> : (
              <div className="stack" style={{ gap: 12 }}>
                <label className="sr" htmlFor="imm-amt">Amount in {opp.currency}</label>
                <div className="amt big"><input id="imm-amt" inputMode="decimal" placeholder="0" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} /><span>{opp.currency}</span></div>
                {maxAmount != null && maxAmount > 0 && (
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="sm muted">Up to about <b className="num">{fx(maxAmount, 0)} {opp.currency}</b> right now{limit ? `, limited by ${limit.by}` : ''}.</span>
                    <button className="chip" onClick={() => setAmount(String(Math.max(1, Math.floor(maxAmount))))}>Use the maximum</button>
                  </div>
                )}
                <details className="how adv">
                  <summary>Advanced</summary>
                  <div className="form" style={{ marginTop: 10 }}>
                    <label className="field" htmlFor="adv-exit"><span>Exit</span>
                      <select id="adv-exit" value={adv.exit} onChange={(e) => setAdv({ ...adv, exit: e.target.value as 'pool' | 'reserve' })}>
                        <option value="pool">Sell IMC for USDC in the Comet pool</option>
                        <option value="reserve">Pay USDT from the treasury reserve</option>
                      </select></label>
                    <label className="field" htmlFor="adv-src"><span>Airtime comes from</span>
                      <select id="adv-src" value={adv.source} onChange={(e) => setAdv({ ...adv, source: e.target.value as 'auto' | 'float' | 'stk' })}>
                        <option value="auto">Automatic (your float if it covers the run)</option>
                        <option value="float">Your airtime float</option>
                        <option value="stk">A new M-Pesa prompt</option>
                      </select></label>
                    <label className="field" htmlFor="adv-slip"><span>Largest pool slippage to accept (%)</span>
                      <input id="adv-slip" className="num" inputMode="decimal" value={adv.slip} onChange={(e) => setAdv({ ...adv, slip: e.target.value.replace(/[^0-9.]/g, '').slice(0, 4) })} />
                      <small>The run stops before any swap if the pool pays more than this below $1 per IMC. Between 0.1 and 50. Above 5 you accept a loss; use that only for a small test.</small></label>
                    <label className="field" htmlFor="adv-cyc"><span>Cycles</span>
                      <input id="adv-cyc" className="num" inputMode="numeric" value={adv.cycles} onChange={(e) => setAdv({ ...adv, cycles: e.target.value.replace(/[^0-9]/g, '').slice(0, 2) })} /></label>
                  </div>
                </details>
              </div>
            )}
          </Card>

          {opp && amt && amt > 0 && (
            <Card title="What to expect">
              <div className="sumrows">
                <div><span>You put in</span><b>{fx(amt, 2)} {opp.currency}</b></div>
                <div><span>IMC minted</span><b>{fx(imcOut, 4)} IMC</b></div>
                <div><span>You get back</span><b>{outUsdc != null ? `≈ ${fx(outUsdc, 4)} ${usePool ? 'USDC' : 'USDT'}` : checking ? 'Checking the pool…' : '—'}</b></div>
                <div className="hl"><span>Expected margin</span><b className={tone(marginUsd)}>{marginUsd != null ? `${sgnUsd(marginUsd, 4)}${marginPct != null ? ` · ${pct(marginPct, 2)}` : ''}` : '—'}</b></div>
              </div>
              {marginUsd != null && marginUsd < 0 && <p className="sm warn" style={{ marginTop: 8 }}>At this size the pool's price impact is bigger than the 5% gain. A smaller amount keeps the margin positive.</p>}
            </Card>
          )}

          {opp && amt && amt > 0 && (
            <Card title={checking ? 'Checking…' : failing.length ? `${failing.length} thing${failing.length > 1 ? 's' : ''} to fix` : 'Ready to run'}>
              {failing.length === 0 && warnings.length === 0 && !checking && <p className="sm pos">Everything needed is in place.</p>}
              {(failing.length > 0 || warnings.length > 0) && <ChecksView checks={[...failing, ...warnings]} />}
              {canOperate && failing.some((c) => c.id === 'skew' || c.id === 'slip') && (
                <div className="stack" style={{ marginTop: 10, gap: 8 }}>
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <button className="btn sm" onClick={() => setAdv({ ...adv, slip: String(testSlip) })}>Run as a test: accept up to {testSlip}% slippage</button>
                    <button className="btn sm" onClick={() => { setOperOpen(true); setTimeout(() => document.querySelector('.imm .oper')?.scrollIntoView({ behavior: 'smooth' }), 50) }}>Open the pool rebalance tool</button>
                  </div>
                  <p className="xs muted" style={{ margin: 0 }}>A test run proves the whole flow with a small amount, and it will lose about {fx(testLossPct, 0)}% of that amount on the swap because the pool is below $1. Do not use it for real money.</p>
                </div>
              )}
            </Card>
          )}

          <div className="actionbar">
            {!canExecute ? (
              <div className="stack" style={{ gap: 10 }}>
                <p className="sm muted" style={{ margin: 0 }}>{executeBlockedReason}</p>
                {audience === 'operator' && viewMode === 'investor' && <button className="btn primary lg" onClick={() => setViewMode('operator')}>Switch back to Operator to run</button>}
              </div>
            )
              : <button className="btn primary lg" disabled={!ready} onClick={start}>{ready ? 'Review and start' : amt && amt > 0 ? 'Fix the items above to start' : 'Enter an amount to start'}</button>}
          </div>
        </>
      ) : (
        <Card title={finished ? (tracked.status === 'COMPLETED' ? 'Run complete' : 'Run stopped') : 'Your run is in progress'} actions={statusPill(tracked.status)}>
          {finished ? <RunResult run={tracked} onAgain={again} /> : (
            <div className="stack" style={{ gap: 14 }}>
              <RunTimeline run={tracked} operator={canOperate} />
              {canOperate && <div className="row"><button className="btn sm danger" onClick={() => confirmCancel(tracked, { openModal, toast, refreshAll })}>Cancel run</button></div>}
            </div>
          )}
          <details className="how" style={{ marginTop: 14 }}><summary>Technical details</summary><div style={{ marginTop: 10 }}><RunPanel run={tracked} operator={canOperate} /></div></details>
        </Card>
      )}
      {trackedId && !tracked && run.error && <div className="note neg">Cannot read this run: {run.error}</div>}

      {canOperate && (
        <details className="how oper" open={operOpen} onToggle={(e) => setOperOpen((e.target as HTMLDetailsElement).open)}>
          <summary>Operator tools: airtime float, received IMC, run history</summary>
          <div className="stack" style={{ marginTop: 14 }}>
            <FloatCard />
            <MintCard />
            <RebalanceCard />
            <ImcReceiptsCard />
            <Card title="Run history">
              {!runs.loaded ? <Loading what="runs" /> : history.length === 0 ? <Empty>No runs yet.</Empty> : (
                <div className="scroll-x"><table className="t"><thead><tr><th>Run</th><th>Status</th><th className="r">Started with</th><th className="r">Final</th><th className="r">Margin</th><th>Started</th></tr></thead>
                  <tbody>{history.map((r) => (
                    <tr key={r._id} className="click" onClick={() => setTrackedId(r._id)}>
                      <td className="mono xs">{r._id}</td><td>{statusPill(r.status)}</td><td className="r num">{usd(r.startingUsd, 4)}</td>
                      <td className="r num">{r.finalUsd == null ? '—' : usd(r.finalUsd, 4)}</td>
                      <td className={'r num ' + tone(r.profit)}>{r.profit == null ? '—' : sgnUsd(r.profit, 4)}</td><td className="xs muted nowrap">{dt(r.createdAt)}</td>
                    </tr>
                  ))}</tbody></table></div>
              )}
            </Card>
          </div>
        </details>
      )}
    </div>
  )
}
