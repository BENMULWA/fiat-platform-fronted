import { useState } from 'react'
import * as A from './api'
import { useImm } from './store'
import { RUN_STEPS, RUN_STEP_NOTE, STATUS_LABEL, stepIndex } from './derive'
import { ago, fx, pct, sgnUsd, tone, usd } from './format'
import { Pill } from './ui'
import { Check, Circle, RefreshCw, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ModalSpec } from './store'
import type { CorridorRun } from './types'

export function statusPill(s: CorridorRun['status']) {
  if (s === 'COMPLETED') return <Pill tone="pos">Completed</Pill>
  if (s === 'HALTED') return <Pill tone="neg">Halted</Pill>
  if (s === 'AWAITING_MANUAL_TOPUP' || s === 'AWAITING_MANUAL_MINT') return <Pill tone="warn">{STATUS_LABEL[s]}</Pill>
  if (s === 'AWAITING_OPPORTUNITY') return <Pill tone="gold">{STATUS_LABEL[s]}</Pill>
  return <Pill tone="neutral">{STATUS_LABEL[s] || s}</Pill>
}

/** Asks for confirmation, then stops an unfinished run. Stopping only prevents further steps;
 *  anything the run already did is real and stays. */
export function confirmCancel(
  run: CorridorRun,
  d: { openModal: (m: ModalSpec) => void; toast: (m: string, k?: 'ok' | 'bad') => void; refreshAll: () => void },
) {
  const early = run.status === 'IDLE' || run.status === 'PROCURE' || run.status === 'AWAITING_MANUAL_TOPUP'
  d.openModal({
    title: 'Cancel this run',
    danger: true,
    confirm: 'Cancel run',
    body: (
      <>
        <p className="sm"><b className="mono">{run._id}</b> is {STATUS_LABEL[run.status] || run.status} (cycle {run.currentCycle}).</p>
        <p className="sm ink2">
          {early
            ? 'It has not confirmed any airtime top-up yet. Cancelling stops it from waiting and from picking up a later balance rise as its own. If you already approved an STK prompt for it, that float will still arrive.'
            : 'It has already moved money in earlier steps. Cancelling stops the remaining steps but does not reverse what was done.'}
        </p>
      </>
    ),
    onConfirm: async () => {
      const r = await A.cancelRun(run._id)
      if (!r.ok) return r.error
      d.toast(`${run._id} cancelled`)
      d.refreshAll()
    },
  })
}

/** The step text, adjusted for how this run was started (float or STK, reserve or pool). */
function stepNote(run: CorridorRun, i: number): string {
  if (i === 0 && run.config?.procure_mode === 'existing_float') return 'Uses airtime float already held. No STK push is sent'
  if (run.config?.swap_mode === 'pool') {
    if (i === 2) return 'Comet mints IMC on Celo (1 IMC = $1), then the IMC is sold for USDC in the Comet pool'
    if (i === 4) return 'Final step: the USDC from the pool swap is withdrawn to your own wallet'
  }
  return RUN_STEP_NOTE[i]
}

/** Lets an operator point a waiting run at a specific on-chain IMC transfer, for example a mint that
 *  landed before the run began. The backend verifies it on Celo and the run books it within seconds. */
export function AttachMint({ run }: { run: CorridorRun }) {
  const { openModal, toast } = useImm()
  const [hash, setHash] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const submit = async () => {
    setBusy(true); setMsg(null)
    const r = await A.attachMint(run._id, hash.trim())
    setBusy(false)
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.error })
    if (r.ok) setHash('')
  }
  return (
    <div className="field">
      <label htmlFor={'attach-' + run._id}><span>Already minted? Attach the transaction</span></label>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input id={'attach-' + run._id} className="mono" placeholder="0x… transaction hash" value={hash} onChange={(e) => setHash(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
        <button className="btn sm primary" disabled={busy || hash.trim().length < 10} onClick={submit}>{busy ? 'Checking…' : 'Attach'}</button>
      </div>
      <small>The transaction must send about {fx(run.pendingMintExpectedImc ?? null, 6)} IMC (within 1%) to the treasury, and not be used by another run.</small>
      {msg && <div className={'note ' + (msg.ok ? 'pos' : 'neg')}>{msg.text}</div>}
      <div style={{ marginTop: 6 }}>
        <button className="btn sm" onClick={() => openModal({
          title: 'Use IMC already held (skip the mint)',
          confirm: 'Use held IMC',
          body: (
            <>
              <p className="sm ink2">This run needs <b className="num">{fx(run.pendingMintExpectedImc ?? null, 6)} IMC</b>. Instead of a new mint, it will use IMC the treasury wallet already holds that no other run has used.</p>
              <p className="sm ink2">It books exactly that amount, never the whole balance, and only if enough is free. It is meant for testing the flow end to end. The run then carries on to the swap and the exit.</p>
            </>
          ),
          onConfirm: async () => {
            const r = await A.allocateHeld(run._id)
            if (!r.ok) return r.error
            toast(r.data.message)
          },
        })}>Use IMC already held (skip the mint)</button>
      </div>
    </div>
  )
}

/** One corridor run as the backend reports it (corridor_runs collection). */
export function RunPanel({ run, onCancel, operator }: { run: CorridorRun; onCancel?: () => void; operator?: boolean }) {
  const idx = stepIndex(run.status)
  const cycles = Number(run.config?.cycles) || 5
  const doneCycles = run.status === 'COMPLETED' ? cycles : Math.max(0, run.currentCycle - 1)

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="between">
        <div><b className="mono sm">{run._id}</b><div className="xs muted">{run.corridorId} · updated {ago(run.updatedAt)}</div></div>
        <div className="row">{statusPill(run.status)}{onCancel && run.status !== 'COMPLETED' && run.status !== 'HALTED' && <button className="btn sm danger" onClick={onCancel}>Cancel run</button>}</div>
      </div>

      <div className="rotations" aria-label={`Cycle ${run.currentCycle} of ${cycles}`}>
        {Array.from({ length: cycles }, (_, i) => <span key={i} className={i < doneCycles ? 'on' : ''}>{i + 1}</span>)}
        <span className={'exit' + (run.status === 'COMPLETED' ? ' ready' : '')}>Exit</span>
      </div>

      <div className="stepper">
        {RUN_STEPS.map((s, i) => {
          const cls = run.status === 'HALTED' ? '' : idx > i ? 'done' : idx === i ? 'now' : ''
          return <div key={s} className={'st ' + cls}><b>{s}</b><span>{stepNote(run, i)}</span></div>
        })}
      </div>

      {run.status === 'HALTED' && (
        <div className="note neg"><b>Halted at cycle {run.currentCycle}.</b> {run.haltReason || 'No reason was recorded.'}</div>
      )}
      {run.status === 'AWAITING_MANUAL_TOPUP' && (
        <div className="note warn">
          The automatic paybill top-up did not confirm. The run is watching the real payout balance for a rise of about{' '}
          <b className="num">{fx(run.pendingTopupExpectedKes ?? null, 2)} KES</b> and continues by itself once it lands. To top up by hand, pay Paybill 5600000 with your ImpalaPay merchant ID as the account (never a phone number).
        </div>
      )}
      {run.status === 'AWAITING_MANUAL_MINT' && (
        <div className="note warn">
          Comet does not let tenants mint IMC directly. Mint about <b className="num">{fx(run.pendingMintExpectedImc ?? null, 4)} IMC</b> from
          Comet's dashboard. The run watches Celo for that transfer and continues by itself as soon as it lands.
          {operator && <div style={{ marginTop: 10 }}><AttachMint run={run} /></div>}
        </div>
      )}
      {run.status === 'AWAITING_OPPORTUNITY' && (
        <div className="note">Holding <b className="num">{usd(run.currentUsdPrincipal, 4)}</b> until the next ranked opportunity opens. Compounding resumes from this amount.</div>
      )}

      <div className="metrics">
        <div className="metric"><div className="l">Principal now</div><div className="v">{usd(run.currentUsdPrincipal, 4)}</div></div>
        <div className="metric"><div className="l">Started with</div><div className="v">{usd(run.startingUsd, 4)}</div></div>
        <div className="metric"><div className="l">Last cycle</div><div className={'v ' + tone(run.cyclePnl)}>{sgnUsd(run.cyclePnl, 4)}</div></div>
        <div className="metric"><div className="l">Cumulative</div><div className={'v ' + tone(run.cumulativePnl)}>{sgnUsd(run.cumulativePnl, 4)}</div></div>
        {run.status === 'COMPLETED' && <div className="metric"><div className="l">Final profit</div><div className={'v ' + tone(run.profit)}>{sgnUsd(run.profit, 4)}</div></div>}
      </div>
    </div>
  )
}


// ---------------------------------------------------------------------------------------------
// The simple journey: a short progress list and a result card.

export interface TimelineStep { title: string; detail: string; extra?: ReactNode }

const SCAN = 'https://celoscan.io'
const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`
/** A hash or address that opens on Celoscan. */
export function Scan({ kind, id, label }: { kind: 'tx' | 'address'; id: string | null | undefined; label?: string }) {
  if (!id || !/^0x[0-9a-fA-F]{8,}$/.test(id)) return <span className="muted">{id ? short(id) : 'not recorded'}</span>
  return <a href={`${SCAN}/${kind}/${id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)' }}>{label ?? short(id)}</a>
}

export function journeySteps(run: CorridorRun): TimelineStep[] {
  const pool = run.config?.swap_mode === 'pool'
  const s = run.swap, x = run.exit
  return [
    { title: 'Buy airtime', detail: run.config?.procure_mode === 'existing_float' ? 'From your airtime float' : 'M-Pesa top-up' },
    { title: 'Book it', detail: 'Check the paybill holds the cash' },
    { title: 'Mint IMC', detail: 'IMC on Celo, worth $1 each' },
    { title: pool ? 'Sell IMC for USDC' : 'Pay out USDT', detail: pool ? 'Swap in the Comet pool' : 'From the treasury reserve',
      extra: s ? (
        <span className="tl-x">Sold <b className="num">{fx(s.inImc, 4)} IMC</b> for <b className="num">{fx(s.outAmount, 6)} {s.outSymbol}</b>
          {' · '}{s.confirmed ? <span className="pos">confirmed on Celo</span> : <span className="warn" title="Read from the pool's quote, not from the chain">estimate</span>}
          {s.txHash && <> · <Scan kind="tx" id={s.txHash} label="view swap" /></>}</span>) : undefined },
    { title: 'Send USDC to your wallet', detail: 'Final step on Celo',
      extra: x ? <span className="tl-x"><b className="num">{fx(x.amount, 6)} {x.symbol}</b> to <Scan kind="address" id={x.to} />{x.txHash && <> · <Scan kind="tx" id={x.txHash} label="view transfer" /></>}</span> : undefined },
  ]
}

/** Which step the run is on (0 to 4), or 5 when it is finished. A halted run is placed from its reason. */
export function journeyPosition(run: CorridorRun): { at: number; halted: boolean } {
  if (run.status === 'COMPLETED') return { at: 5, halted: false }
  if (run.status === 'HALTED') {
    const r = (run.haltReason || '').toLowerCase()
    const at = /withdraw|exit|celo_exit/.test(r) ? 4 : /pool|swap|slippage|quote|engine wallet|usdt/.test(r) ? 3
      : /mint|imc|comet/.test(r) ? 2 : /paybill|liquid|kes/.test(r) ? 1 : 0
    return { at, halted: true }
  }
  switch (run.status) {
    case 'LIQUIDATE': return { at: 1, halted: false }
    case 'MINT': case 'AWAITING_MANUAL_MINT': return { at: 2, halted: false }
    case 'ROLLOVER': case 'AWAITING_OPPORTUNITY': return { at: 4, halted: false }
    case 'CELO_EXIT': return { at: 4, halted: false }
    default: return { at: 0, halted: false }
  }
}

export function RunTimeline({ run, operator }: { run: CorridorRun; operator?: boolean }) {
  const steps = journeySteps(run)
  const { at, halted } = journeyPosition(run)
  return (
    <div className="stack" style={{ gap: 14 }}>
      <ol className="tl">
        {steps.map((s, i) => {
          const state = halted && i === at ? 'halt' : i < at ? 'done' : i === at && run.status !== 'COMPLETED' ? 'now' : run.status === 'COMPLETED' ? 'done' : 'pending'
          return (
            <li key={s.title} className={'tl-' + state}>
              <span className="tl-dot" aria-hidden="true">
                {state === 'done' ? <Check size={14} /> : state === 'halt' ? <XCircle size={14} /> : state === 'now' ? <RefreshCw size={13} className="animate-spin" /> : <Circle size={10} />}
              </span>
              <div><b>{s.title}</b><span>{s.detail}</span>{s.extra}</div>
            </li>
          )
        })}
      </ol>
      {run.status === 'AWAITING_MANUAL_TOPUP' && (
        <div className="note warn"><b>Action needed.</b> Approve the M-Pesa prompt on the paying phone. This run continues by itself once the payment lands.</div>
      )}
      {run.status === 'AWAITING_MANUAL_MINT' && (
        <div className="note warn">
          <b>Action needed.</b> {fx(run.pendingMintExpectedImc ?? null, 4)} IMC has to be minted for this run. It continues by itself when that arrives.
          {operator && <div className="xs" style={{ marginTop: 4 }}>Mint it yourself: open <b>Operator tools → Mint IMC from a top-up</b> and book the top-up's receipt. Or use IMC you already hold, below.</div>}
          {operator && <div style={{ marginTop: 10 }}><AttachMint run={run} /></div>}
        </div>
      )}
      {run.status === 'AWAITING_OPPORTUNITY' && <div className="note">Waiting for the next opportunity.</div>}
    </div>
  )
}

/** Where to check the money on Celo: the swap, the wallet that received the USDC, and the withdrawal. */
function Proof({ run }: { run: CorridorRun }) {
  const s = run.swap, x = run.exit
  if (!s && !x) return null
  return (
    <div className="proof">
      <div className="eyebrow">Check it on Celo</div>
      {s && (
        <div className="sumrows">
          <div><span>Sold</span><b>{fx(s.inImc, 6)} IMC</b></div>
          <div><span>Pool paid</span><b>{fx(s.outAmount, 6)} {s.outSymbol}</b></div>
          <div><span>Amount is</span><b className={s.confirmed ? 'pos' : 'warn'}>{s.confirmed ? 'confirmed on Celo' : 'an estimate (quote)'}</b></div>
          {!s.confirmed && <div><span>Quoted</span><b>{fx(s.quotedOut, 6)} {s.outSymbol}</b></div>}
          <div><span>Swap transaction</span><b><Scan kind="tx" id={s.txHash} /></b></div>
          {s.pair && <div><span>Pool</span><b><Scan kind="address" id={s.pair} /></b></div>}
          {s.engineWallet && <div><span>USDC lands in</span><b><Scan kind="address" id={s.engineWallet} /></b></div>}
        </div>
      )}
      {x && (
        <div className="sumrows">
          <div><span>Withdrawn</span><b>{fx(x.amount, 6)} {x.symbol}</b></div>
          <div><span>To your wallet</span><b><Scan kind="address" id={x.to} /></b></div>
          <div><span>Transfer</span><b><Scan kind="tx" id={x.txHash} /></b></div>
        </div>
      )}
    </div>
  )
}

/** The end of a run: what went in, what came out, and the margin. */
export function RunResult({ run, onAgain }: { run: CorridorRun; onAgain: () => void }) {
  const { openModal, toast, refreshAll, canOperate } = useImm()
  if (run.status === 'HALTED') {
    // The swap is done and only the withdrawal is left: it can be retried without selling anything again.
    const canRetry = canOperate && run.config?.swap_mode === 'pool' && !!run.swap && !run.exit
    const retry = () => openModal({
      title: 'Retry the withdrawal',
      confirm: 'Send the USDC',
      body: (
        <div className="stack" style={{ gap: 10 }}>
          <div className="sumrows">
            <div><span>Amount</span><b>{fx(run.swap!.outAmount, 6)} {run.swap!.outSymbol}</b></div>
            <div><span>From the engine wallet</span><b><Scan kind="address" id={run.swap!.engineWallet} /></b></div>
            <div><span>To your exit wallet</span><b className="muted">the CELO_EXIT_ADDRESS on the server</b></div>
          </div>
          <p className="sm">Nothing is sold again. This only repeats the last step. If the engine wallet no longer holds the USDC, it refuses.</p>
        </div>
      ),
      onConfirm: async () => {
        const r = await A.retryExit(run._id)
        if (!r.ok) return r.error
        toast('Withdrawal retry started')
        refreshAll()
      },
    })
    return (
      <div className="stack" style={{ gap: 14 }}>
        <div className="note neg"><b>The run stopped.</b> {run.haltReason || 'No reason was recorded.'}</div>
        {canRetry && <div className="row"><button className="btn primary" onClick={retry}>Retry the withdrawal</button><span className="xs muted">The swap is done. This repeats only the last step.</span></div>}
        <Proof run={run} />
        <p className="sm muted">Anything already done stays done. IMC the run holds is safe in the treasury or the engine wallet.</p>
        <div className="row"><button className="btn primary" onClick={onAgain}>Start a new run</button></div>
      </div>
    )
  }
  const start = run.startingUsd, end = run.finalUsd
  const margin = run.profit ?? (end != null ? end - start : null)
  const ratio = margin != null && start ? margin / start : null
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="res">
        <div><span className="l">You started with</span><b>{usd(start, 4)}</b></div>
        <div className="res-arrow" aria-hidden="true">→</div>
        <div><span className="l">You ended with</span><b>{usd(end, 4)} <small>USDC</small></b></div>
      </div>
      <Proof run={run} />
      <div className={'res-margin ' + tone(margin)}>
        <span className="l">Margin</span>
        <b>{sgnUsd(margin, 4)}</b>
        <span className="sm">{pct(ratio, 2)} on the amount you put in</span>
      </div>
      <div className="row"><button className="btn primary" onClick={onAgain}>Start a new run</button></div>
    </div>
  )
}
