// Original Jasiri OTC artwork: stablecoins flow through the Jasiri desk and settle into African currencies.
// Pure SVG (no stock image, no licence), resolution independent, animated with CSS only.

const SOURCES: [string, number][] = [['USDT', 230], ['USDC', 450], ['cUSD', 670]];
const TARGETS: [string, number][] = [['KES', 150], ['UGX', 300], ['NGN', 450], ['TZS', 600], ['GHS', 750]];
const HUB = { x: 800, y: 450 };

function Node({ code, x, y, tone, delay }: { code: string; x: number; y: number; tone: 'teal' | 'gold'; delay: number }) {
  const stroke = tone === 'gold' ? 'url(#gold)' : 'url(#teal)';
  return (
    <g>
      <circle cx={x} cy={y} r={52} fill="none" stroke={stroke} strokeWidth={1.2} className="otc-pulse" style={{ animationDelay: `${delay}s` }} />
      <circle cx={x} cy={y} r={36} fill="#06263a" fillOpacity={0.92} stroke={stroke} strokeWidth={2.5} />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill="#ffffff" fontFamily="Inter, system-ui, sans-serif">{code}</text>
    </g>
  );
}

export default function OtcArtwork({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" role="presentation">
      <defs>
        <linearGradient id="teal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5eead4" /><stop offset="1" stopColor="#0ea5a4" /></linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor="#f59e0b" /></linearGradient>
        <linearGradient id="flowIn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2dd4bf" stopOpacity="0.15" /><stop offset="1" stopColor="#5eead4" stopOpacity="0.9" /></linearGradient>
        <linearGradient id="flowOut" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fcd34d" stopOpacity="0.9" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0.25" /></linearGradient>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbbf24" stopOpacity="0.22" /><stop offset="1" stopColor="#fbbf24" stopOpacity="0" /></linearGradient>
        <radialGradient id="hubGlow"><stop offset="0" stopColor="#5eead4" stopOpacity="0.55" /><stop offset="0.55" stopColor="#0ea5a4" stopOpacity="0.18" /><stop offset="1" stopColor="#0ea5a4" stopOpacity="0" /></radialGradient>
        <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#ffffff" fillOpacity="0.14" /></pattern>
        <filter id="soft"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>
      <style>{`
        @keyframes otcFlow { to { stroke-dashoffset: -96; } }
        @keyframes otcSpin { to { transform: rotate(360deg); } }
        @keyframes otcSpinRev { to { transform: rotate(-360deg); } }
        @keyframes otcPulse { 0%,100% { stroke-opacity: .15; } 50% { stroke-opacity: .75; } }
        .otc-flow { stroke-dasharray: 8 16; animation: otcFlow 3.2s linear infinite; }
        .otc-flow-slow { stroke-dasharray: 3 13; animation: otcFlow 5s linear infinite; }
        .otc-orbit { transform-origin: ${HUB.x}px ${HUB.y}px; animation: otcSpin 70s linear infinite; }
        .otc-orbit-rev { transform-origin: ${HUB.x}px ${HUB.y}px; animation: otcSpinRev 110s linear infinite; }
        .otc-pulse { animation: otcPulse 4.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .otc-flow, .otc-flow-slow, .otc-orbit, .otc-orbit-rev, .otc-pulse { animation: none; } }
      `}</style>

      <rect width="1600" height="900" fill="url(#dots)" />

      {/* rate line across the bottom */}
      <path d="M0 790 C150 770 250 815 400 752 S650 712 800 742 S1100 662 1250 700 S1500 622 1600 650 L1600 900 L0 900 Z" fill="url(#chartFill)" />
      <path d="M0 790 C150 770 250 815 400 752 S650 712 800 742 S1100 662 1250 700 S1500 622 1600 650" fill="none" stroke="url(#gold)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M0 790 C150 770 250 815 400 752 S650 712 800 742 S1100 662 1250 700 S1500 622 1600 650" fill="none" stroke="#fbbf24" strokeWidth="9" strokeLinecap="round" opacity="0.18" filter="url(#soft)" />

      {/* hub glow and orbits */}
      <circle cx={HUB.x} cy={HUB.y} r="300" fill="url(#hubGlow)" />
      <circle cx={HUB.x} cy={HUB.y} r="150" fill="none" stroke="#5eead4" strokeOpacity="0.22" strokeWidth="1.2" strokeDasharray="4 10" className="otc-orbit" />
      <circle cx={HUB.x} cy={HUB.y} r="215" fill="none" stroke="#fcd34d" strokeOpacity="0.18" strokeWidth="1.2" strokeDasharray="2 14" className="otc-orbit-rev" />
      <circle cx={HUB.x} cy={HUB.y} r="285" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" />

      {/* inbound flows: stablecoins into the desk */}
      {SOURCES.map(([code, y], i) => {
        const d = `M ${290} ${y} C ${520} ${y}, ${560} ${HUB.y}, ${HUB.x - 30} ${HUB.y}`;
        return (
          <g key={`in-${code}`}>
            <path d={d} fill="none" stroke="#5eead4" strokeOpacity="0.16" strokeWidth="2" />
            <path d={d} fill="none" stroke="url(#flowIn)" strokeWidth="2.6" strokeLinecap="round" className="otc-flow" style={{ animationDelay: `${i * -0.9}s` }} />
          </g>
        );
      })}

      {/* outbound flows: the desk settles into local currencies */}
      {TARGETS.map(([code, y], i) => {
        const d = `M ${HUB.x + 30} ${HUB.y} C ${1080} ${HUB.y}, ${1090} ${y}, ${1312} ${y}`;
        return (
          <g key={`out-${code}`}>
            <path d={d} fill="none" stroke="#fcd34d" strokeOpacity="0.14" strokeWidth="2" />
            <path d={d} fill="none" stroke="url(#flowOut)" strokeWidth="2.6" strokeLinecap="round" className={i % 2 ? 'otc-flow-slow' : 'otc-flow'} style={{ animationDelay: `${i * -0.7}s` }} />
          </g>
        );
      })}

      {/* glowing core where the flows meet. The named "J / DESK" emblem lives on the benefits panel (see DeskEmblem), where it can't be covered. */}
      <g>
        <circle cx={HUB.x} cy={HUB.y} r="46" fill="none" stroke="url(#teal)" strokeWidth="2" className="otc-pulse" />
        <circle cx={HUB.x} cy={HUB.y} r="26" fill="#06263a" fillOpacity="0.9" stroke="url(#gold)" strokeWidth="2.5" />
        <circle cx={HUB.x} cy={HUB.y} r="9" fill="url(#gold)" />
      </g>

      {/* currency nodes */}
      {SOURCES.map(([code, y], i) => <Node key={code} code={code} x={230} y={y} tone="teal" delay={i * 0.8} />)}
      {TARGETS.map(([code, y], i) => <Node key={code} code={code} x={1360} y={y} tone="gold" delay={i * 0.6} />)}

      {/* flow captions */}
      <text x="470" y="150" fontSize="13" letterSpacing="4" fill="#99f6e4" fillOpacity="0.55" fontFamily="Inter, system-ui, sans-serif">QUOTE</text>
      <text x="1090" y="110" fontSize="13" letterSpacing="4" fill="#fde68a" fillOpacity="0.55" fontFamily="Inter, system-ui, sans-serif">SETTLE</text>
      <text x="1160" y="842" fontSize="13" letterSpacing="4" fill="#fde68a" fillOpacity="0.5" fontFamily="Inter, system-ui, sans-serif">PAY OUT</text>
    </svg>
  );
}

// The Jasiri desk emblem on its own, so it can sit on top of panels where the background artwork is covered.
export function DeskEmblem({ className = 'h-14 w-14', label = 'DESK' }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Jasiri OTC desk">
      <defs>
        <linearGradient id="emTeal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5eead4" /><stop offset="1" stopColor="#0ea5a4" /></linearGradient>
        <linearGradient id="emGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor="#f59e0b" /></linearGradient>
        <radialGradient id="emGlow"><stop offset="0" stopColor="#5eead4" stopOpacity="0.45" /><stop offset="1" stopColor="#5eead4" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#emGlow)" />
      <polygon points="60,10 103,35 103,85 60,110 17,85 17,35" fill="#06263a" fillOpacity="0.95" stroke="url(#emTeal)" strokeWidth="4" />
      <polygon points="60,24 91,42 91,78 60,96 29,78 29,42" fill="none" stroke="url(#emGold)" strokeWidth="2.4" />
      <text x="60" y={label ? 64 : 72} textAnchor="middle" fontSize="38" fontWeight="800" fill="#ffffff" fontFamily="Inter, system-ui, sans-serif">J</text>
      {label && <text x="60" y="84" textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="3" fill="#fcd34d" fontFamily="Inter, system-ui, sans-serif">{label}</text>}
    </svg>
  );
}
