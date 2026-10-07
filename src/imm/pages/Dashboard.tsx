import { ageFromSeconds, ago, fx, pct, usd } from '../format'
import { GROUP_COLOR, GROUP_LABEL, type VaultGroup } from '../derive'
import { useImm } from '../store'
import { Card, DecisionPill, Empty, Flow, Loading, Meter, Pill, Unavailable } from '../ui'
import { RunPanel } from '../run'

const GROUPS: VaultGroup[] = ['airtime', 'mobile', 'stable', 'imc', 'card']

export default function Dashboard() {
  const { book, baseRate, comet, health, views, liveRun, ledger, treasury, go, runs, canOperate, audience } = useImm()
  const best = views.find((v) => v.opp && v.eligible && v.decision !== 'BLOCK') || null
  const rate = baseRate.data?.rate ?? null
  const cometRate = typeof comet.data?.rate === 'number' ? comet.data.rate : null
  const impliedKes = cometRate && cometRate > 0 ? 1 / cometRate : null
  const gap = impliedKes && rate ? impliedKes / rate - 1 : null
  const stable = book.total && book.groups.stable ? book.groups.stable / book.total : null
  const recent = (ledger.data?.feed || []).slice(0, 6)
  const limits = (health.data?.nodes || []).filter((n) => (n.minBalance || n.exposureCapUsd) && n.balance != null)
  const unreachable = !baseRate.data && !!baseRate.error

  return (
    <div className="page">
      {unreachable && <div className="note neg"><b>The backend is not reachable.</b> {baseRate.error}. Nothing below is current until it responds.</div>}
      {baseRate.data && rate == null && (
        <div className="note warn"><b>No base rate has been fixed.</b> KES values cannot be converted to dollars until an operator fixes today's rate. {canOperate && <button className="linkbtn" onClick={() => go('pricing')}>Fix the rate</button>}</div>
      )}
      {baseRate.data?.stale && rate != null && (
        <div className="note warn"><b>The base rate is stale.</b> Last fixed {ageFromSeconds(baseRate.data.ageSeconds)}. {canOperate && <button className="linkbtn" onClick={() => go('pricing')}>Update it</button>}</div>
      )}

      <div className="grid g-3">
        <Card cls="lift">
          <div className="eyebrow">IMM value</div>
          {!treasury.loaded ? <Loading what="vault balances" /> : !treasury.data || !Object.keys(treasury.data.vaults || {}).length ? (
            <Empty>The treasury returned no vault balances{treasury.error ? `: ${treasury.error}` : '.'}</Empty>
          ) : (
            <>
              <div className="row" style={{ alignItems: 'baseline', gap: 18, marginTop: 6 }}>
                <div><span className="hero-n">{usd(book.total)}</span><div className="xs muted">Book value at the base rate</div></div>
                <div><span className="big-n">{usd(book.groups.stable ?? 0)}</span><div className="xs muted">In stablecoins{stable != null ? ` · ${pct(stable, 0)} of the IMM` : ''}</div></div>
              </div>
              <p className="muted sm" style={{ margin: '10px 0 14px' }}>
                Real balances from the Mam-laka paybill, the Cardano USDA vault, the Celo wallets and the ledger. Shilling vaults are converted at the base rate; dollar assets count at face. XLM and gold are not valued.
              </p>
              {book.total ? (
                <>
                  <div className="alloc" role="img" aria-label="Book value by type">
                    {GROUPS.filter((g) => (book.groups[g] || 0) > 0).map((g) => <span key={g} style={{ flex: book.groups[g], background: GROUP_COLOR[g] }} title={`${GROUP_LABEL[g]}: ${usd(book.groups[g])}`} />)}
                  </div>
                  <div className="alegend">
                    {GROUPS.filter((g) => (book.groups[g] || 0) > 0).map((g) => <div key={g}><i style={{ background: GROUP_COLOR[g] }} /><span>{GROUP_LABEL[g]}</span><b>{usd(book.groups[g], 0)}</b></div>)}
                  </div>
                </>
              ) : book.needsRate ? <div className="note warn">Fix the base rate to value the shilling vaults.</div> : null}
              <div className="scroll-x" style={{ marginTop: 16 }}>
                <table className="t"><thead><tr><th>Vault</th><th className="r">Balance</th><th className="r">Value</th></tr></thead>
                  <tbody>{book.lines.map((l) => (
                    <tr key={l.key}><td>{l.label}</td><td className="r num">{fx(l.balance, 2)} <span className="muted xs">{l.unit}</span></td><td className="r num">{l.usd == null ? <span className="muted">not valued</span> : usd(l.usd)}</td></tr>
                  ))}</tbody></table>
              </div>
            </>
          )}
        </Card>

        <Card cls="lift">
          <div className="between"><div className="eyebrow">Rates</div>{canOperate && <button className="linkbtn sm" onClick={() => go('pricing')}>Rates and venues</button>}</div>
          <div className="row" style={{ alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <span className="big-n">{rate != null ? fx(rate, 2) : '—'}</span><span className="muted sm">Base rate · KES per USD</span>
          </div>
          <p className="xs muted" style={{ margin: '2px 0 12px' }}>
            {baseRate.data?.source ? `${baseRate.data.source} · ` : ''}fixed {ageFromSeconds(baseRate.data?.ageSeconds ?? null)}
          </p>
          <div className="imcrow">
            <span>IMC peg <b className="num">$1.00</b></span>
            <span>Comet KES→IMC <b className="num">{cometRate != null ? cometRate.toFixed(6) : '—'}</b></span>
            <span>Implied KES per IMC <b className="num">{impliedKes != null ? fx(impliedKes, 2) : '—'}</b></span>
          </div>
          {comet.error && !comet.data && <p className="sm warn" style={{ marginTop: 10 }}>Comet is not quoting: {comet.error}</p>}
          {gap != null && <p className="sm ink2" style={{ marginTop: 10 }}>Comet's implied rate is <b className={gap > 0 ? 'pos' : 'neg'}>{pct(gap, 2)}</b> {gap > 0 ? 'above' : 'below'} the base rate.</p>}
          <div className="note" style={{ marginTop: 14 }}>Venue quotes (Binance P2P, Valora) and an exit-value figure appear here once the backend serves them.</div>
        </Card>
      </div>

      {best && best.opp ? (
        <Card cls="lift" title="Best corridor right now"
          sub={`Ranked by projected return over 5 compounding cycles, from ${views.length} corridor${views.length === 1 ? '' : 's'}. The maths is calculated on the server.`}
          actions={<><DecisionPill d={best.decision} /><button className="btn primary" onClick={() => go('trade')}>Open in Trade</button></>}>
          <Flow nodes={best.opp.nodes} big />
          <div className="decide" style={{ marginTop: 16 }}>
            <div><div className="l">Per cycle</div><div className="v">{best.opp.multiplier}</div></div>
            <div><div className="l">Over 5 cycles</div><div className="v pos">{best.opp.profitPct}</div></div>
            <div><div className="l">Reseller discount</div><div className="v">{best.opp.discount}</div></div>
            <div><div className="l">Mint</div><div className="v">{best.opp.mintAsset}</div></div>
            <div><div className="l">Exit</div><div className="v">{best.opp.exitLabel}</div></div>
          </div>
        </Card>
      ) : (
        <Card title="Best corridor right now">
          {views.length ? <Empty>No corridor is eligible right now. Open Opportunities to see why each one is held back.</Empty> : <Loading what="corridors" />}
        </Card>
      )}

      <div className="grid g-3b">
        <Card title="Run" sub={liveRun ? undefined : 'A run is five compounding cycles, then the exit.'} actions={<button className="btn sm ghost" onClick={() => go('trade')}>Trade</button>}>
          {audience === 'investor' && !runs.data ? <Unavailable title="Runs are operator-only today" endpoint="GET /api/imm/executions" status={runs.status}>Your own executions will appear here once the backend exposes them.</Unavailable>
            : liveRun ? <RunPanel run={liveRun} /> : <Empty>No run is open.</Empty>}
        </Card>

        <Card title="Node limits" actions={<button className="btn sm ghost" onClick={() => go('nodes')}>Nodes</button>}>
          {!health.loaded ? <Loading what="node health" /> : limits.length === 0 ? <Empty>No node reports a floor or exposure cap yet.</Empty> : (
            <div className="stack" style={{ gap: 14 }}>
              {limits.map((n) => n.minBalance
                ? <Meter key={n.id} label={`${n.id} ${n.label} floor`} value={Math.min(1, (n.balance || 0) / n.minBalance)} display={`${fx(n.balance, 2)} / ${fx(n.minBalance, 2)}`} good={!n.belowFloor} markLabel="Balance against its minimum" mark={1} />
                : <Meter key={n.id} label={`${n.id} ${n.label} exposure`} value={Math.min(1, (n.balance || 0) / (n.exposureCapUsd || 1))} display={`${fx(n.balance, 2)} / ${fx(n.exposureCapUsd, 2)}`} good={!n.overExposureCap} markLabel="Balance against its cap" mark={1} />)}
            </div>
          )}
        </Card>

        <Card title="Recent activity" actions={<button className="btn sm ghost" onClick={() => go('ledger')}>Ledger</button>}>
          {!ledger.loaded ? <Loading what="the ledger" /> : recent.length ? (
            <div className="scroll-x"><table className="t"><tbody>{recent.map((t) => (
              <tr key={t.id}><td className="nowrap xs muted">{t.time}</td><td className="sm">{t.type}<div className="xs muted">{t.from} → {t.to}</div></td><td className="r num xs">{t.amount}</td></tr>
            ))}</tbody></table></div>
          ) : <Empty>No ledger entries yet.</Empty>}
          {ledger.at && <p className="xs muted" style={{ marginTop: 8 }}>Updated {ago(ledger.at)}</p>}
        </Card>
      </div>
      <p className="xs muted"><Pill tone="neutral">Live</Pill> All figures on this page come from the running backend; none are placeholders.</p>
    </div>
  )
}
