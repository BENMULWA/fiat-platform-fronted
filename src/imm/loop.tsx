import './loop.css'

type Chip = { text: string; tone?: 'live' | 'soon' }
interface Step { title: string; sub: string; chips: Chip[] }

/** The whole corridor as one loop: money in at the Kenyan paybill, airtime, IMC, the swap, and the rollover back to the
 *  start of the next cycle. Each stage says what is live today and what is still planned, so the picture never claims
 *  more than the engine does. */
export default function CorridorLoop({ cycles, discount, multiplier }: { cycles?: number; discount?: string; multiplier?: string }) {
  const steps: Step[] = [
    { title: 'Mobile money', sub: 'M-Pesa pays into the Kenyan paybill', chips: [{ text: 'live', tone: 'live' }] },
    { title: 'Buy airtime', sub: `ImpalaPay float${discount ? `, ${discount} reseller bonus` : ''}`, chips: [{ text: 'live', tone: 'live' }] },
    { title: 'Mint IMC', sub: 'Comet mints on Celo, $1 each, and sends it to your wallet', chips: [{ text: 'live', tone: 'live' }] },
    {
      title: 'Swap IMC to a stablecoin',
      sub: 'Through the Comet pools',
      chips: [{ text: 'USDC live', tone: 'live' }, { text: 'USDT pool', tone: 'live' }, { text: 'cUSD: no pool yet', tone: 'soon' }],
    },
    {
      title: cycles && cycles > 1 ? `Roll over to cycle 2 of ${cycles}` : 'Roll over to cycle 2',
      sub: multiplier ? `${multiplier} per cycle, compounding` : 'Compounding, one cycle after another',
      chips: [{ text: 'airtime entry live', tone: 'live' }, { text: 'USDT entry planned', tone: 'soon' }],
    },
  ]

  return (
    <div className="loop">
      <ol className="loop-row" aria-label="Corridor loop">
        {steps.map((s, i) => (
          <li key={s.title} className="loop-step">
            <span className="loop-n" aria-hidden="true">{i + 1}</span>
            <div className="loop-body">
              <b>{s.title}</b>
              <span className="sub">{s.sub}</span>
              <div className="loop-chips">{s.chips.map((c) => <span key={c.text} className={'loop-chip ' + (c.tone || '')}>{c.text}</span>)}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="loop-back" role="img" aria-label="Back to the start for the next cycle">
        <div><span>Next cycle: the state engine searches for the next opportunity</span></div>
      </div>
      <p className="loop-note">
        <b>Where the next cycle can start:</b> the airtime top-up again (live), a <b>USDT entry</b>, or another node (both planned). The engine holds in <i>awaiting opportunity</i> until one clears its checks.
      </p>
    </div>
  )
}
