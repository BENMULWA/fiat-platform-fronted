import { useEffect, useRef, useState } from 'react'
import * as A from './api'
import { ago, dt, fx, num, pct, sgnUsd } from './format'
import { useImm, useResource } from './store'
import { confirmCancel } from './run'
import { Card, Empty, Loading, Pill } from './ui'
import type { Topup, TopupStatus } from './types'

const AIRTEL_HINT = /^0?(73|78|75[0-6])|^254(73|78|75[0-6])/

function StatusPill({ s }: { s: TopupStatus }) {
  if (s === 'CONFIRMED') return <Pill tone="pos">Credited</Pill>
  if (s === 'PENDING') return <Pill tone="gold">Waiting for approval</Pill>
  if (s === 'EXPIRED') return <Pill tone="warn">No credit seen</Pill>
  if (s === 'CANCELLED') return <Pill tone="neutral">Cancelled</Pill>
  return <Pill tone="neg">Failed</Pill>
}

function Tracker({ t, onCancel }: { t: Topup; onCancel?: () => void }) {
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="between"><div><b className="mono sm">{t.id}</b><div className="xs muted">KES {fx(t.amountKes, 0)} to {t.payingPhoneMasked} · {ago(t.createdAt)}</div></div><StatusPill s={t.status} /></div>
      {t.status === 'PENDING' && (
        <div className="note">
          <b>Approve the M-Pesa prompt on {t.payingPhoneMasked}.</b> Enter your PIN to confirm. The float is credited within seconds of approval, and this card updates by itself.
          You should receive about <b className="num">{fx(t.expectedFloatKes, 2)} KES</b> of float.
          {onCancel && <div className="row" style={{ marginTop: 8 }}><span className="xs">No prompt on the phone?</span><button className="btn sm danger" onClick={onCancel}>Cancel this top-up</button></div>}
        </div>
      )}
      {t.status === 'CANCELLED' && <div className="note">{t.note || 'This top-up was cancelled.'}</div>}
      {t.status === 'CONFIRMED' && t.anomaly && <div className="note warn"><b>Check this credit.</b> {t.anomaly}</div>}
      {t.status === 'CONFIRMED' && (
        <div className={'note ' + (t.anomaly ? '' : 'pos')}>
          The float rose from <b className="num">{fx(t.balanceBefore, 2)}</b> to <b className="num">{fx(t.balanceAfter, 2)}</b> KES. You received{' '}
          <b className="num">{fx(t.creditedFloatKes, 2)} KES</b>, which is <b className="num">{sgnUsd(t.commissionKes, 2).replace('$', '')} KES</b> {!t.anomaly && <>({pct(t.commissionKes != null && t.amountKes ? t.commissionKes / t.amountKes : null, 2)})</>} on the {fx(t.amountKes, 0)} KES paid.
        </div>
      )}
      {t.status === 'EXPIRED' && t.note && <div className="note">{t.note}</div>}
      {t.status === 'EXPIRED' && !t.note && (
        <div className="note warn">
          No rise in the float was seen within 15 minutes. If you did approve it, check the ImpalaPay balance and your M-Pesa messages before sending another.
          If you did not, the prompt has lapsed and you can send a new one.
        </div>
      )}
      {t.status === 'FAILED' && <div className="note neg">ImpalaPay did not accept the top-up{t.error ? `: ${t.error}` : '.'} Nothing was charged.</div>}
    </div>
  )
}

/** Tops up the ImpalaPay reseller float by M-Pesa STK push, outside any corridor run. */
export default function FloatCard() {
  const { openModal, toast, refreshAll, liveRun } = useImm()
  const state = useResource(A.getFloat, 15000)
  const history = useResource(() => A.getTopups(8), 10000)
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [trackedId, setTrackedId] = useState<string | null>(null)
  const tracked = useResource(() => A.getTopup(trackedId as string), 3000, !!trackedId)
  const lastStatus = useRef<string>('')

  // Refresh the balance and history as soon as the tracked top-up settles.
  useEffect(() => {
    const s = tracked.data?.status
    if (!s || s === lastStatus.current) return
    lastStatus.current = s
    if (s !== 'PENDING') { void state.refresh(); void history.refresh(); refreshAll() }
    if (s === 'CONFIRMED') toast('Float topped up')
  }, [tracked.data?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const f = state.data
  const amt = num(amount)
  const whole = amt != null && Number.isInteger(amt) && amt >= 1
  const tooBig = whole && f ? amt! > f.maxTopupKes : false
  const commission = f?.commission ?? 0
  const expected = whole ? amt! * (1 + commission) : null
  const typedAirtel = phone.trim() ? AIRTEL_HINT.test(phone.replace(/[^0-9]/g, '')) : !!f?.defaultPhoneLooksAirtel
  const pending = tracked.data?.status === 'PENDING'
  const phoneLabel = phone.trim() || f?.defaultPhoneMasked || ''

  // Stops OUR tracking of a pending top-up. ImpalaPay cannot recall a prompt that was delivered.
  const cancel = (t: Topup) => openModal({
    title: 'Cancel this top-up',
    danger: true,
    confirm: 'Cancel top-up',
    body: (
      <>
        <p className="sm"><b className="mono">{t.id}</b> · KES {fx(t.amountKes, 0)} to {t.payingPhoneMasked}</p>
        <p className="sm ink2">Use this when no M-Pesa prompt reached the phone. It stops the console waiting for this top-up and lets you send a new one straight away.</p>
        <p className="sm ink2">ImpalaPay cannot recall a prompt that was delivered. If you approve it later, the float will still rise, but the console will not record it. If the float has already risen, this will show the top-up as credited instead.</p>
      </>
    ),
    onConfirm: async () => {
      const r = await A.cancelTopup(t.id)
      if (!r.ok) return r.error
      toast('Top-up cancelled')
      if (trackedId === t.id) { lastStatus.current = ''; void tracked.refresh() }
      void state.refresh(); void history.refresh()
    },
  })

  const send = () => {
    if (!whole || !f) return
    openModal({
      title: 'Send an STK push',
      confirm: 'Send STK push',
      body: (
        <>
          <div className="decide">
            <div><div className="l">You pay</div><div className="v">KES {fx(amt!, 0)}</div></div>
            <div><div className="l">You receive</div><div className="v pos">≈ KES {fx(expected, 2)}</div></div>
            <div><div className="l">Prompt goes to</div><div className="v" style={{ fontSize: 17 }}>{phoneLabel}</div></div>
          </div>
          <p className="sm ink2">An M-Pesa prompt will appear on that phone. The money leaves the phone's M-Pesa only when its owner enters the PIN. If nobody approves it, nothing is charged.</p>
          {typedAirtel && <div className="note warn">This number looks like an Airtel line. ImpalaPay's STK rail accepts Safaricom numbers only, so the prompt may be rejected.</div>}
        </>
      ),
      onConfirm: async () => {
        const r = await A.startTopup(amt!, phone.trim() || undefined)
        if (!r.ok) return r.error
        lastStatus.current = ''
        setTrackedId(r.data.topup.id)
        toast('STK push sent. Approve it on the phone.')
        void history.refresh()
      },
    })
  }

  const blockedByRun = !!liveRun
  return (
    <Card cls="lift" title="Top up airtime float" sub="Buy ImpalaPay reseller float by M-Pesa STK push. The commission arrives as extra float.">
      {!state.loaded ? <Loading what="the float" /> : state.error && !f ? <div className="note neg">{state.error}</div> : f && (
        <div className="grid g-2">
          <div className="stack" style={{ gap: 14 }}>
            <div>
              <div className="eyebrow">Float balance</div>
              <div className="row" style={{ alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                <span className="big-n">{f.balanceKes == null ? '—' : fx(f.balanceKes, 2)}</span><span className="muted sm">KES of airtime</span>
              </div>
              <p className="xs muted" style={{ marginTop: 4 }}>
                {f.commissionByNetwork ? `Provider commission: ${Object.entries(f.commissionByNetwork).map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)} ${pct(v, 1)}`).join(', ')}` : `Commission assumed ${pct(f.commission, 1)}`} · limit {fx(f.maxTopupKes, 0)} KES per top-up
              </p>
            </div>

            {!f.configured && <div className="note neg">The ImpalaPay reseller credentials are not configured on the server.</div>}
            {blockedByRun && (
              <div className="note warn">
                <div>Corridor run <b className="mono">{liveRun!._id}</b> is open ({liveRun!.status.replace(/_/g, ' ').toLowerCase()}). It measures this same float, so top-ups are paused until it finishes.</div>
                <div className="row" style={{ marginTop: 8 }}><button className="btn sm danger" onClick={() => confirmCancel(liveRun!, { openModal, toast, refreshAll })}>Cancel that run</button></div>
              </div>
            )}

            <div className="form">
              <label className="field" htmlFor="imm-topup-amt"><span>Amount to pay (KES)</span>
                <input id="imm-topup-amt" className="num" inputMode="numeric" placeholder="e.g. 500" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
                <small>{whole ? `You receive about ${fx(expected, 2)} KES of float.` : 'A whole number of shillings.'}{tooBig ? ` That is above the ${fx(f.maxTopupKes, 0)} KES limit.` : ''}</small>
              </label>
              <label className="field" htmlFor="imm-topup-phone"><span>Paying phone (Safaricom)</span>
                <input id="imm-topup-phone" inputMode="tel" placeholder={f.defaultPhoneMasked ? `Default: ${f.defaultPhoneMasked}` : '0712345678'} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+ ]/g, ''))} />
                <small>{f.defaultPhoneMasked ? 'Leave blank to use the configured procurement phone.' : 'No procurement phone is configured, so enter one.'}</small>
              </label>
              {typedAirtel && <div className="note warn">That looks like an Airtel number. The STK rail accepts Safaricom numbers only.</div>}
            </div>
            <div className="row">
              <button className="btn primary" disabled={!whole || tooBig || !f.configured || pending || blockedByRun || (!phone.trim() && !f.defaultPhoneMasked)} onClick={send}>Send STK push</button>
            </div>
            <p className="xs muted">Prefer to pay by hand? Use M-Pesa Paybill <b className="mono">{f.paybill}</b> with account <b className="mono">{f.accountNumber ?? 'your merchant ID'}</b>. The account must be the merchant ID, never a phone number.</p>
          </div>

          <div className="stack" style={{ gap: 14 }}>
            {tracked.data ? <Tracker t={tracked.data} onCancel={tracked.data.status === 'PENDING' ? () => cancel(tracked.data!) : undefined} /> : trackedId && tracked.error ? <div className="note neg">{tracked.error}</div> : <Empty>No top-up in progress.</Empty>}
            <div>
              <h3 className="eyebrow" style={{ margin: '0 0 6px' }}>Recent top-ups</h3>
              {!history.loaded ? <Loading what="history" /> : !history.data?.topups.length ? <p className="sm muted">No top-ups yet.</p> : (
                <div className="scroll-x"><table className="t"><thead><tr><th>When</th><th className="r">Paid</th><th className="r">Credited</th><th>Status</th><th></th></tr></thead>
                  <tbody>{history.data.topups.map((t) => (
                    <tr key={t.id} className="click" onClick={() => { lastStatus.current = ''; setTrackedId(t.id) }}>
                      <td className="xs muted nowrap">{dt(t.createdAt)}</td><td className="r num">{fx(t.amountKes, 0)}</td>
                      <td className="r num">{t.creditedFloatKes == null ? '—' : fx(t.creditedFloatKes, 2)}</td><td><StatusPill s={t.status} /></td>
                      <td className="r">{t.status === 'PENDING' && <button className="btn sm danger" onClick={(e) => { e.stopPropagation(); cancel(t) }}>Cancel</button>}</td>
                    </tr>
                  ))}</tbody></table></div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
