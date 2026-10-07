import { useState } from 'react'
import * as A from './api'
import { dt, fx } from './format'
import { useImm, useResource } from './store'
import { Card, Empty, Loading, Pill } from './ui'
import type { ImcReceipt } from './types'

const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`

function Status({ r }: { r: ImcReceipt }) {
  if (r.source === 'held') return <Pill tone={r.consumed ? 'pos' : 'warn'}>{r.consumed ? 'Held IMC used by' : 'Held IMC reserved for'} {r.claimedByRun}</Pill>
  if (r.consumed) return <Pill tone="pos">Used by {r.claimedByRun}</Pill>
  if (r.claimedByRun) return <Pill tone="warn">Reserved for {r.claimedByRun}</Pill>
  return <Pill tone="neutral">Unclaimed</Pill>
}

/** IMC that has arrived at the treasury wallet, read from the chain. A run waiting for its manual mint
 *  claims one that matches its expected amount (within 1%). */
export default function ImcReceiptsCard() {
  const { liveRun, toast, refreshAll } = useImm()
  const list = useResource(() => A.getImcReceipts(12), 10000)
  const [busy, setBusy] = useState<string | null>(null)
  const waiting = liveRun?.status === 'AWAITING_MANUAL_MINT' ? liveRun : null

  const use = async (r: ImcReceipt) => {
    if (!waiting) return
    setBusy(r.id)
    const res = await A.attachMint(waiting._id, r.txHash)
    setBusy(null)
    if (!res.ok) return toast(res.error, 'bad')
    toast('Attached. The run will book this mint shortly.')
    void list.refresh(); refreshAll()
  }

  const rows = list.data?.receipts || []
  return (
    <Card title="IMC received" sub={list.data ? `Incoming IMC at the treasury wallet ${short(list.data.treasury)}, read from Celo Transfer events.` : 'Incoming IMC at the treasury wallet, read from Celo.'}>
      {!list.loaded ? <Loading what="IMC receipts" /> : list.error && !list.data ? <div className="note neg">{list.error}</div> : !rows.length ? <Empty>No IMC has arrived at the treasury recently.</Empty> : (
        <div className="scroll-x"><table className="t"><thead><tr><th>When</th><th className="r">IMC</th><th>From</th><th>Transaction</th><th>Status</th>{waiting && <th></th>}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td className="xs muted nowrap">{dt(r.blockTime)}</td><td className="r num">{fx(r.amountImc, 6)}</td>
              <td className="mono xs">{r.source === 'held' ? 'treasury' : short(r.from)}</td>
              <td className="mono xs">{r.source === 'held' ? <span className="muted">already held, no new transfer</span> : <a href={`https://celoscan.io/tx/${r.txHash}`} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)' }}>{r.txHash.slice(0, 10)}…</a>}</td>
              <td><Status r={r} /></td>
              {waiting && <td className="r">{!r.claimedByRun && <button className="btn sm" disabled={busy === r.id} onClick={() => use(r)}>Use for run</button>}</td>}
            </tr>
          ))}</tbody></table></div>
      )}
      {waiting && <p className="xs muted" style={{ marginTop: 8 }}>Run {waiting._id} expects {fx(waiting.pendingMintExpectedImc ?? null, 6)} IMC. Only a transfer within 1% of that can be used for it.</p>}
    </Card>
  )
}
