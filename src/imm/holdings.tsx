import { ago, fx, pct, usd } from './format'
import { useImm } from './store'
import { Empty, Loading } from './ui'
import type { HoldingsGroup, HoldingsLine } from './types'

const COUNTED: HoldingsGroup[] = ['airtime', 'mobile', 'stable', 'imc', 'pool']
const LABEL: Record<string, string> = { airtime: 'Airtime', mobile: 'Mobile money', stable: 'Stablecoins', imc: 'IMC', pool: 'In pools', other: 'Not valued', sandbox: 'Sandbox' }
const COLOR: Record<string, string> = { airtime: 'var(--k-air)', mobile: 'var(--k-mob)', stable: 'var(--k-stable)', imc: 'var(--k-trea)', pool: 'var(--k-card)' }

/** The dollar value of one line: dollar assets and IMC at face, shilling amounts at the base rate, gas and XLM not valued. */
function worth(l: HoldingsLine, rate: number | null): number | null {
  if (l.group === 'other' || l.group === 'sandbox') return null
  if (l.kes) return rate && rate > 0 ? l.balance / rate : null
  return l.usd
}

function Row({ l, rate }: { l: HoldingsLine; rate: number | null }) {
  const v = worth(l, rate)
  const d = l.detail
  return (
    <tr>
      <td>
        <span className="dotlive" title="Read live" aria-hidden="true" /> {l.label}
        {d && (
          <div className="xs muted">
            your share {pct(d.share, 2)} · {Object.entries(d.amounts).map(([k, a]) => `${fx(a, 4)} ${k}`).join(' + ')}{d.price != null ? ` · 1 IMC = ${fx(d.price, 4)}` : ''}
          </div>
        )}
      </td>
      <td className="r num">{d ? '' : <>{fx(l.balance, l.unit === 'CELO' || l.unit === 'XLM' ? 4 : 2)} <span className="muted xs">{l.unit}</span></>}</td>
      <td className="r num">{v == null ? <span className="muted">{l.kes ? 'needs rate' : 'not valued'}</span> : usd(v)}</td>
    </tr>
  )
}

/** What the IMM really holds, read live: the airtime float, every Celo wallet, our pool liquidity and the other vaults.
 *  The Mam-laka gateway is listed apart, and left out of the total, while it is a sandbox. */
export default function HoldingsPanel() {
  const { holdings, baseRate } = useImm()
  const rate = baseRate.data?.rate ?? null
  const h = holdings.data

  if (!holdings.loaded) return <Loading what="live balances" />
  if (!h) return <Empty>Could not read the holdings{holdings.error ? `: ${holdings.error}` : '.'}</Empty>

  const live = h.lines.filter((l) => l.source === 'live')
  const groups: Partial<Record<HoldingsGroup, number>> = {}
  let total = 0
  let needsRate = false
  for (const l of live) {
    if (!COUNTED.includes(l.group)) continue
    const v = worth(l, rate)
    if (v == null) { if (l.kes) needsRate = true; continue }
    total += v
    groups[l.group] = (groups[l.group] || 0) + v
  }
  const sandbox = h.lines.filter((l) => l.source === 'sandbox')
  const sect = (title: string, rows: HoldingsLine[]) => rows.length > 0 && (
    <>
      <tr className="sect"><th colSpan={3}>{title}</th></tr>
      {rows.map((l) => <Row key={l.key} l={l} rate={rate} />)}
    </>
  )
  const wallets = live.filter((l) => ['stable', 'imc', 'other'].includes(l.group) && l.key.includes(':') && !l.key.startsWith('POOL'))
  const otherVaults = live.filter((l) => ['N7_USDA', 'N9_XLM'].includes(l.key))
  const gateLive = live.filter((l) => l.key.startsWith('GATEWAY:'))

  return (
    <>
      <div className="row" style={{ alignItems: 'baseline', gap: 18, marginTop: 6, flexWrap: 'wrap' }}>
        <div><span className="hero-n">{needsRate && total === 0 ? '—' : usd(total)}</span><div className="xs muted">Real value, read live</div></div>
        <div><span className="big-n">{usd(groups.pool ?? 0)}</span><div className="xs muted">In pools{total ? ` · ${pct((groups.pool ?? 0) / total, 0)} of the total` : ''}</div></div>
        <div><span className="big-n">{usd(groups.stable ?? 0)}</span><div className="xs muted">In stablecoins</div></div>
      </div>
      <p className="muted sm" style={{ margin: '10px 0 14px' }}>
        Every line is read from its own source when you open this page: the ImpalaPay float, the Celo wallets, the pool LP tokens on-chain, and the Cardano and Stellar vaults. Dollar assets and IMC count at $1, shillings at the base rate. Gas and XLM are shown but not valued.
      </p>
      {needsRate && <div className="note warn" style={{ marginBottom: 10 }}>Fix the base rate to value the airtime float.</div>}
      {total > 0 && (
        <>
          <div className="alloc" role="img" aria-label="Value by type">
            {COUNTED.filter((g) => (groups[g] || 0) > 0).map((g) => <span key={g} style={{ flex: groups[g], background: COLOR[g] }} title={`${LABEL[g]}: ${usd(groups[g])}`} />)}
          </div>
          <div className="alegend">
            {COUNTED.filter((g) => (groups[g] || 0) > 0).map((g) => <div key={g}><i style={{ background: COLOR[g] }} /><span>{LABEL[g]}</span><b>{usd(groups[g], 0)}</b></div>)}
          </div>
        </>
      )}

      <div className="scroll-x" style={{ marginTop: 16 }}>
        <table className="t holdings"><thead><tr><th>Where</th><th className="r">Balance</th><th className="r">Value</th></tr></thead>
          <tbody>
            {sect('Airtime bought (ImpalaPay float)', live.filter((l) => l.group === 'airtime' && !l.key.startsWith('GATEWAY:')))}
            {sect('Celo wallets', wallets)}
            {sect('Your liquidity in the pools', live.filter((l) => l.group === 'pool'))}
            {sect('Other vaults', otherVaults)}
            {sect('Mam-laka gateway (live)', gateLive)}
          </tbody></table>
      </div>

      {sandbox.length > 0 && (
        <div className="note warn" style={{ marginTop: 14 }}>
          <b>Not counted: the Mam-laka gateway is a sandbox.</b> Its balances are test figures, not real money: {sandbox.map((l) => `${fx(l.balance, 2)} ${l.unit}`).join(', ')}. They were included in the old total, which is why it read about $332.
          <div className="xs" style={{ marginTop: 4 }}>Point <span className="mono">AIRTEL_API_BASE_URL</span> at the live gateway to count them.</div>
        </div>
      )}
      {h.errors.length > 0 && (
        <div className="note neg" style={{ marginTop: 10 }}>
          <b>Could not read:</b> {h.errors.map((e) => `${e.source} (${e.message})`).join(' · ')}. Those lines are missing from the total, not zero.
        </div>
      )}
      {h.asOf && <p className="xs muted" style={{ marginTop: 8 }}>Read {ago(h.asOf)}.</p>}
    </>
  )
}
