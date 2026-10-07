import { useEffect, useRef, useState } from 'react'
import * as A from './api'
import { ago, fx, num } from './format'
import { useImm, useResource } from './store'
import { Scan } from './run'
import { Card, Loading, Pill } from './ui'

/** Mints IMC against a real top-up: paste the M-Pesa / ImpalaPay receipt and Comet verifies it, mints into the
 *  treasury wallet, and the card confirms the IMC arrived on Celo. The work runs on the server; this follows it. */
export default function MintCard() {
  const { openModal, toast, refreshAll } = useImm()
  const state = useResource(A.getMint, 15000)
  const jobRes = useResource(A.getMintJob, 2000)
  const topups = useResource(() => A.getTopups(6), 20000)
  const [receipt, setReceipt] = useState('')
  const [cash, setCash] = useState('')
  const [sendTo, setSendTo] = useState('')
  const job = jobRes.data?.job || null
  const running = job?.status === 'running'
  const s = state.data
  const credited = (topups.data?.topups || []).filter((t) => t.status === 'CONFIRMED').slice(0, 3)

  const seen = useRef('')
  useEffect(() => {
    if (!job || job.status === 'running') return
    const key = `${job.id}:${job.status}`
    if (key === seen.current) return
    seen.current = key
    void state.refresh()
    refreshAll()
    toast(job.status === 'done' ? 'IMC booked' : 'Booking stopped')
  }, [job?.id, job?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const cashNum = num(cash)
  const valid = receipt.trim().length >= 4 && (cash === '' || (cashNum != null && cashNum > 0))

  const start = () => openModal({
    title: 'Mint IMC for this top-up',
    danger: true,
    confirm: 'Book and mint',
    body: (
      <div className="stack" style={{ gap: 12 }}>
        <div className="sumrows">
          <div><span>Receipt</span><b className="mono">{receipt.trim()}</b></div>
          <div><span>Cash paid</span><b>{cashNum != null ? `${fx(cashNum, 2)} KES` : 'not given: Comet sizes it from the receipt'}</b></div>
          <div><span>IMC goes to</span><b>{sendTo.trim() ? <Scan kind="address" id={sendTo.trim()} /> : s?.treasury ? <Scan kind="address" id={s.treasury} /> : 'the treasury wallet'}</b></div>
        </div>
        <p className="sm" style={{ color: 'var(--neg)' }}>This mints real IMC. Comet books each receipt <b>once, ever</b>, so make sure the receipt is the one for the top-up you want to mint. If the amount is wrong, it cannot be re-booked.</p>
      </div>
    ),
    onConfirm: async () => {
      const r = await A.bookMint({ receipt: receipt.trim(), ...(cashNum != null ? { cash_kes: cashNum } : {}), ...(sendTo.trim() ? { deliver_to: sendTo.trim() } : {}) })
      if (!r.ok) return r.error
      seen.current = ''
      void jobRes.refresh()
      toast('Booking started')
    },
  })

  return (
    <Card title="Mint IMC from a top-up" sub="After a top-up, paste its M-Pesa or ImpalaPay receipt. Comet verifies it and mints the IMC into your treasury wallet, so no admin has to do it by hand.">
      {!state.loaded ? <Loading what="the mint service" /> : state.error && !s ? <div className="note neg">{state.error}</div> : s && (
        <div className="stack" style={{ gap: 12 }}>
          {!s.configured && <div className="note neg">COMET_API_KEY and COMET_API_SECRET are not set on the server, so nothing can be minted.</div>}
          <div className="sumrows">
            <div><span>Mints into</span><b><Scan kind="address" id={s.treasury} /></b></div>
          </div>

          {credited.length > 0 && (
            <div className="xs muted">Recent credited top-ups: {credited.map((t) => `${fx(t.amountKes, 0)} KES (${ago(t.createdAt)})`).join(' · ')}. Use the receipt from the M-Pesa message of the one you want.</div>
          )}

          <div className="form">
            <label className="field" htmlFor="mint-receipt"><span>M-Pesa / ImpalaPay receipt</span>
              <input id="mint-receipt" className="mono" autoComplete="off" placeholder="e.g. UJ7ABC1234" value={receipt} onChange={(e) => setReceipt(e.target.value.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 128))} />
              <small>Exactly as in the message. It is the booking's one-time key.</small></label>
            <label className="field" htmlFor="mint-cash"><span>Cash paid for it (KES, optional)</span>
              <input id="mint-cash" className="num" inputMode="decimal" placeholder="e.g. 10" value={cash} onChange={(e) => setCash(e.target.value.replace(/[^0-9.]/g, ''))} />
              <small>The amount you paid, not the float you got. Leave blank to let Comet size it from the receipt.</small></label>
            <details className="how"><summary>Send the IMC to a different address</summary>
              <label className="field" htmlFor="mint-to" style={{ marginTop: 8 }}><span>Delivery address (optional)</span>
                <input id="mint-to" className="mono" autoComplete="off" placeholder="0x… (leave blank for the treasury wallet)" value={sendTo} onChange={(e) => setSendTo(e.target.value.replace(/[^0-9a-fA-Fx]/g, '').slice(0, 42))} /></label>
            </details>
          </div>
          <div className="row"><button className="btn primary" disabled={!valid || running || !s.configured} onClick={start}>{running ? 'Working…' : 'Book and mint…'}</button></div>

          {job && (
            <div className={'note ' + (running ? '' : job.status === 'done' ? (job.result?.warning ? 'warn' : 'pos') : 'neg')}>
              <b>{running ? `Working on ${job.receipt}…` : job.status === 'done' ? 'Booked' : 'Stopped'}</b>
              <ol className="tl" style={{ marginTop: 8 }}>
                {job.steps.map((st, i) => <li key={i} className={running && i === job.steps.length - 1 ? 'tl-now' : 'tl-done'}><span className="tl-dot" aria-hidden="true" /><div><b style={{ fontWeight: 500, fontSize: 13.5 }}>{st.msg}</b></div></li>)}
              </ol>
              {job.error && <p className="sm" style={{ marginTop: 8 }}>{job.error}</p>}
              {job.result && (
                <div className="stack" style={{ gap: 4, marginTop: 8 }}>
                  <div className="sm">Comet's figure: <b className="num">{fx(job.result.imc, 6)} IMC</b> for {fx(job.result.airtimeKes, 2)} KES of airtime at {fx(job.result.usdKes, 2)} KES per $1.</div>
                  <div className="sm">Seen on Celo: <b className="num">{job.result.arrivedImc != null ? `${fx(job.result.arrivedImc, 6)} IMC` : 'not yet'}</b>. <Scan kind="tx" id={job.result.txHash} label="View the mint" />{job.result.sendTxHash && <> · <Scan kind="tx" id={job.result.sendTxHash} label="View the delivery" /></>}</div>
                  {job.result.warning && <div className="sm">{job.result.warning}</div>}
                </div>
              )}
            </div>
          )}

          {s.bookings.length > 0 && (
            <div className="scroll-x"><table className="t"><thead><tr><th>Receipt</th><th>Status</th><th className="r">IMC</th><th>Mint</th><th>When</th></tr></thead>
              <tbody>{s.bookings.map((b) => (
                <tr key={b.receipt} title={b.error || b.warning || ''}>
                  <td className="mono xs">{b.receipt}</td>
                  <td>{b.status === 'booked' ? <Pill tone="pos">Booked</Pill> : b.status === 'pending' ? <Pill tone="gold">Pending</Pill> : <Pill tone="neg">Failed</Pill>}</td>
                  <td className="r num">{b.arrivedImc != null ? fx(b.arrivedImc, 6) : b.imc != null ? fx(b.imc, 6) : '—'}</td>
                  <td className="mono xs"><Scan kind="tx" id={b.txHash} /></td>
                  <td className="xs muted nowrap">{b.updatedAt ? ago(b.updatedAt) : ''}</td>
                </tr>
              ))}</tbody></table></div>
          )}
        </div>
      )}
    </Card>
  )
}
