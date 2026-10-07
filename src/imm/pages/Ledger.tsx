import { useEffect, useState } from 'react'
import * as A from '../api'
import { downloadText, dt, toCSV, usd, sgnUsd, tone } from '../format'
import { useImm, useResource } from '../store'
import { Card, Empty, I, Loading, Unavailable } from '../ui'
import { statusPill } from '../run'

type Tab = 'tx' | 'runs' | 'audit'

export default function Ledger() {
  const { runs, canOperate, audience, toast } = useImm()
  const [tab, setTab] = useState<Tab>('tx')
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [limit, setLimit] = useState(50)
  const [type, setType] = useState('ALL')
  const [chain, setChain] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => { const t = window.setTimeout(() => setDebounced(q.trim()), 400); return () => window.clearTimeout(t) }, [q])
  const feed = useResource(() => A.getLedgerFeed(limit, debounced || undefined), 8000)
  useEffect(() => { void feed.refresh() }, [debounced, limit]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = feed.data?.feed || []
  const types = [...new Set(rows.map((r) => r.type))]
  const shown = rows.filter((r) => type === 'ALL' || r.type === type)

  const exportCsv = () => {
    downloadText(`imm-ledger-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(shown.map((r) => ({
      time: r.time, id: r.id, type: r.type, from: r.from, to: r.to, amount: r.amount, internal_value: r.intValue, external_ref: r.externalRef || '',
    }))))
  }
  const verify = async () => {
    const r = await A.verifyLedger()
    if (!r.ok) {
      setChain({ ok: false, msg: r.status === 404 ? 'The backend has no chain verification yet. The ledger is append-only but not hash-chained.' : r.error })
      return
    }
    setChain({ ok: r.data.ok, msg: r.data.ok ? `Chain intact: ${r.data.count ?? ''} entries verify.` : `Chain broken at ${r.data.brokenAt}.` })
    toast(r.data.ok ? 'Ledger chain verified' : 'Ledger chain is broken', r.data.ok ? 'ok' : 'bad')
  }

  return (
    <div className="page">
      <div className="page-h">
        <div><h1>Ledger</h1><p>Every movement between nodes is an append-only entry; balances are the sum of entries. This list reads the real ledger.</p></div>
        <div className="pageh-actions">
          <button className="btn sm" onClick={verify}>Verify chain</button>
          <button className="btn sm" onClick={exportCsv} disabled={!shown.length}><I.Download size={14} /> Export CSV</button>
        </div>
      </div>
      {chain && <div className={'note ' + (chain.ok ? 'pos' : 'warn')}>{chain.msg}</div>}

      <div className="seg" style={{ justifySelf: 'start' }}>
        <button aria-pressed={tab === 'tx'} onClick={() => setTab('tx')}>Transactions · {rows.length}</button>
        {audience === 'operator' && <button aria-pressed={tab === 'runs'} onClick={() => setTab('runs')}>Runs · {runs.data?.runs.length ?? 0}</button>}
        <button aria-pressed={tab === 'audit'} onClick={() => setTab('audit')}>Audit log</button>
      </div>

      {tab === 'tx' && (
        <Card>
          <div className="row" style={{ marginBottom: 12 }}>
            <label className="sr" htmlFor="imm-q">Search the ledger</label>
            <input id="imm-q" placeholder="Search id, node or type" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 240 }} />
            <div className="chips" role="group" aria-label="Filter by type">
              <button className="chip" aria-pressed={type === 'ALL'} onClick={() => setType('ALL')}>All</button>
              {types.map((t) => <button key={t} className="chip" aria-pressed={type === t} onClick={() => setType(t)}>{t}</button>)}
            </div>
          </div>
          {!feed.loaded ? <Loading what="the ledger" /> : shown.length === 0 ? <Empty>{feed.error ? feed.error : 'No ledger entries match.'}</Empty> : (
            <>
              <div className="scroll-x"><table className="t"><thead><tr><th>Time</th><th>Entry</th><th>Type</th><th>Route</th><th className="r">Amount</th><th className="r">Internal value</th><th>Reference</th></tr></thead>
                <tbody>{shown.map((r) => (
                  <tr key={r.id}><td className="nowrap xs muted">{r.time}</td><td className="mono xs">{r.id}</td><td className="sm">{r.type}</td>
                    <td className="num nowrap xs">{r.from} → {r.to}</td><td className="r num">{r.amount}</td><td className="r num">{r.intValue}</td>
                    <td className="mono xs" style={{ maxWidth: 220, overflowWrap: 'anywhere' }}>{r.externalRef || ''}</td></tr>
                ))}</tbody></table></div>
              {rows.length >= limit && <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}><button className="btn sm" onClick={() => setLimit(limit + 100)}>Show more</button></div>}
            </>
          )}
        </Card>
      )}

      {tab === 'runs' && (
        <Card>
          {!canOperate && !runs.data ? <Unavailable title="Runs are operator-only" endpoint="GET /api/treasury/corridor/runs" status={runs.status} /> :
            !runs.loaded ? <Loading what="runs" /> : !runs.data?.runs.length ? <Empty>No runs yet.</Empty> : (
              <div className="scroll-x"><table className="t"><thead><tr><th>Run</th><th>Corridor</th><th>Status</th><th className="r">Cycle</th><th className="r">Started with</th><th className="r">Final</th><th className="r">Profit</th><th>Started</th><th>Halt reason</th></tr></thead>
                <tbody>{runs.data.runs.map((r) => (
                  <tr key={r._id}><td className="mono xs">{r._id}</td><td>{r.corridorId}</td><td>{statusPill(r.status)}</td><td className="r num">{r.currentCycle}</td>
                    <td className="r num">{usd(r.startingUsd, 4)}</td><td className="r num">{r.finalUsd == null ? '—' : usd(r.finalUsd, 4)}</td>
                    <td className={'r num ' + tone(r.profit)}>{r.profit == null ? '—' : sgnUsd(r.profit, 4)}</td><td className="xs muted nowrap">{dt(r.createdAt)}</td><td className="sm">{r.haltReason || ''}</td></tr>
                ))}</tbody></table></div>
            )}
        </Card>
      )}

      {tab === 'audit' && (
        <Card><Unavailable title="The audit log is not recorded yet" endpoint="GET /api/imm/audit">Who changed a price, a switch or a limit, with the reason, is not stored by the backend today.</Unavailable></Card>
      )}
    </div>
  )
}
