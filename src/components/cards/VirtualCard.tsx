import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Loader2, RotateCcw, Snowflake } from 'lucide-react';
import jasiriLogo from '../../pages/assets/jasiri-icon.png';

export interface CardSecrets {
  cardNumber?: string;
  expireDate?: string;
  cvv?: string;
}

interface Props {
  holderName: string;
  status: string;            // label already mapped for display: ACTIVE, PENDING, FROZEN ...
  frozen: boolean;
  balance: string | null;    // "10.00" or null while unknown
  secrets: CardSecrets | null;
  secretsExpireAt: number | null;
  revealing: boolean;
  onReveal: () => void;      // opens the step-up; the parent sets `secrets` when it passes
  onHide: () => void;
}

const groups = (n?: string) => (n || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
const last4 = (n?: string) => (n || '').replace(/\s+/g, '').slice(-4);

/** Wavy guilloche lines, the security-print look of a bank card. */
function Waves({ opacity }: { opacity: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 252" preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} fill="none" stroke="white" strokeOpacity={opacity} strokeWidth="1.2"
          d={`M -20 ${30 + i * 18} C 80 ${i * 18 - 10}, 160 ${70 + i * 18}, 260 ${20 + i * 18} S 380 ${60 + i * 18}, 440 ${10 + i * 18}`} />
      ))}
    </svg>
  );
}

/** Watermark drawn as vector art: an image watermark shows its own background as a box. */
function Watermark({ className }: { className: string }) {
  return (
    <svg className={`absolute pointer-events-none ${className}`} viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="none" stroke="white" strokeWidth="6" />
      <circle cx="100" cy="100" r="74" fill="none" stroke="white" strokeWidth="2" />
      <text x="100" y="128" textAnchor="middle" fontSize="96" fontWeight="800" fill="white" fontFamily="Arial, sans-serif">J</text>
      <text x="100" y="160" textAnchor="middle" fontSize="15" fontWeight="700" letterSpacing="5" fill="white" fontFamily="Arial, sans-serif">JASIRI</text>
    </svg>
  );
}

function MastercardMark() {
  return (
    <div className="flex flex-col items-end" aria-label="Mastercard">
      <div className="flex">
        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#eb001b]" />
        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f79e1b] -ml-3 mix-blend-normal opacity-90" />
      </div>
      <span className="text-[8px] sm:text-[9px] font-semibold tracking-wide lowercase opacity-90 mt-0.5">mastercard</span>
    </div>
  );
}

function Chip() {
  return (
    <svg width="38" height="28" viewBox="0 0 38 28" aria-hidden="true" className="drop-shadow-sm">
      <rect x="0.5" y="0.5" width="37" height="27" rx="5" fill="#e8c96a" stroke="#b8963a" />
      <path d="M0 9h12M0 19h12M26 9h12M26 19h12M12 0v28M26 0v28M12 14h14" stroke="#b8963a" strokeWidth="1" fill="none" />
    </svg>
  );
}

function JasiriMark() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] sm:text-xs font-extrabold tracking-[0.18em]">JASIRI</span>
      <img src={jasiriLogo} alt="Jasiri" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white p-0.5 object-contain" />
    </div>
  );
}

export default function VirtualCard({ holderName, status, frozen, balance, secrets, secretsExpireAt, revealing, onReveal, onHide }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);

  // A live date on the face (updated every few seconds) shows the card is being viewed now, not a screenshot.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), secrets ? 1000 : 30000);
    return () => window.clearInterval(t);
  }, [secrets]);

  // Revealed details live on the back: turn the card over when they arrive.
  useEffect(() => { if (secrets) setFlipped(true); }, [secrets]);

  const today = new Date(now).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const secondsLeft = secretsExpireAt ? Math.max(0, Math.ceil((secretsExpireAt - now) / 1000)) : 0;
  const name = (holderName || 'Card holder').toUpperCase();

  const copy = (label: string, value?: string) => {
    if (!value) return;
    void navigator.clipboard?.writeText(value.replace(/\s+/g, label === 'Card number' ? '' : ' '));
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1500);
  };

  // Swipe sideways (touch or mouse) or tap to turn the card over in place.
  const onPointerDown = (e: React.PointerEvent) => { swipe.current = { x: e.clientX, moved: false }; };
  const onPointerMove = (e: React.PointerEvent) => {
    if (swipe.current && Math.abs(e.clientX - swipe.current.x) > 8) swipe.current.moved = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    if (Math.abs(e.clientX - start.x) > 40 || !start.moved) setFlipped((f) => !f);
  };
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const face = 'absolute inset-0 rounded-2xl overflow-hidden text-white shadow-xl [backface-visibility:hidden] [-webkit-backface-visibility:hidden]';
  const tint = frozen
    ? 'linear-gradient(135deg, #64748b 0%, #475569 55%, #1e293b 100%)'
    : 'linear-gradient(135deg, #34d399 0%, #0d9488 42%, #1e3a8a 100%)';

  const Secret = ({ label, value, masked, className = '' }: { label: string; value?: string; masked: string; className?: string }) => (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-70">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-sm sm:text-base tracking-wider truncate">{value ? (label === 'Card number' ? groups(value) : value) : masked}</span>
        {value && (
          <button type="button" onPointerDown={stop} onPointerUp={stop} onClick={(e) => { stop(e); copy(label, value); }}
            aria-label={`Copy ${label}`} className="shrink-0 p-1 rounded-md bg-white/15 hover:bg-white/25">
            {copied === label ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[380px] mx-auto select-none">
      <div className="relative w-full aspect-[1.586/1] [perspective:1200px] cursor-pointer touch-pan-y"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        role="button" tabIndex={0} aria-label={flipped ? 'Card back. Press to turn to the front' : 'Card front. Press to turn to the back'}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); } }}>
        <div className={`relative w-full h-full transition-transform duration-700 motion-reduce:transition-none [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>

          {/* ------------------------------------------------ front */}
          <div className={face} style={{ background: tint }}>
            <Waves opacity={0.13} />
            <Watermark className="-right-8 -bottom-10 w-48 h-48 sm:w-56 sm:h-56 opacity-[0.09]" />
            <div className="relative h-full flex flex-col justify-between p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] opacity-90">VIRTUAL</p>
                  <span className={`inline-flex items-center gap-1 mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${frozen ? 'bg-white/25' : 'bg-black/20'}`}>
                    {frozen && <Snowflake className="w-2.5 h-2.5" />}{status}
                  </span>
                </div>
                <JasiriMark />
              </div>

              <div className="flex items-center justify-between">
                <Chip />
                <div className="text-right">
                  <p className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-75">Balance</p>
                  <p className="text-lg sm:text-xl font-bold leading-tight">{balance != null ? `$${balance}` : '—'}</p>
                </div>
              </div>

              <p className="font-mono text-base sm:text-lg tracking-[0.18em] opacity-95">
                {secrets?.cardNumber ? `•••• •••• •••• ${last4(secrets.cardNumber)}` : '•••• •••• •••• ••••'}
              </p>

              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-70">Card holder</p>
                  <p className="text-xs sm:text-sm font-semibold tracking-wide truncate">{name}</p>
                </div>
                <div className="shrink-0">
                  <p className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-70">Date</p>
                  <p className="text-xs sm:text-sm font-semibold font-mono">{today}</p>
                </div>
                <MastercardMark />
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ back */}
          <div className={`${face} [transform:rotateY(180deg)]`} style={{ background: tint }}>
            <Waves opacity={0.07} />
            <Watermark className="left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-36 h-36 opacity-[0.07]" />
            <div className="absolute left-0 right-0 top-3 sm:top-4 h-8 sm:h-10 bg-black/85" />
            <div className="relative h-full flex flex-col p-4 sm:p-5 pt-14 sm:pt-[4.25rem] gap-2.5">
              <div className="flex items-stretch gap-2">
                <div className="flex-1 rounded-md bg-[repeating-linear-gradient(135deg,rgba(255,255,255,.85)_0_6px,rgba(255,255,255,.7)_6px_12px)] text-slate-700 px-2 flex items-center text-[10px] font-semibold italic truncate">
                  {name}
                </div>
                <div className="rounded-md bg-white text-slate-900 px-2 py-1 min-w-[70px]">
                  <p className="text-[8px] uppercase tracking-widest text-slate-500">CVV</p>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-sm font-bold">{secrets?.cvv || '•••'}</span>
                    {secrets?.cvv && (
                      <button type="button" onPointerDown={stop} onPointerUp={stop} onClick={(e) => { stop(e); copy('CVV', secrets.cvv); }}
                        aria-label="Copy CVV" className="p-0.5 rounded bg-slate-200 hover:bg-slate-300">
                        {copied === 'CVV' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <Secret label="Card number" value={secrets?.cardNumber} masked="•••• •••• •••• ••••" className="flex-1" />
                <Secret label="Expires" value={secrets?.expireDate} masked="••/••" />
              </div>

              <div className="mt-auto flex items-center justify-between">
                {secrets ? (
                  <button type="button" onPointerDown={stop} onPointerUp={stop} onClick={(e) => { stop(e); onHide(); }}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-black/25 hover:bg-black/35">
                    <EyeOff className="w-3.5 h-3.5" /> Hide · {secondsLeft}s
                  </button>
                ) : (
                  <button type="button" onPointerDown={stop} onPointerUp={stop} onClick={(e) => { stop(e); onReveal(); }}
                    disabled={revealing || frozen}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-60">
                    {revealing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    {frozen ? 'Card frozen' : 'Show details'}
                  </button>
                )}
                <JasiriMark />
              </div>
            </div>
            {copied && (
              <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-1 rounded-md bg-black/60">{copied} copied</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <RotateCcw className="w-3 h-3" />
        <span>{flipped ? 'Tap or swipe to see the front' : 'Tap or swipe to turn the card over'}</span>
      </div>
    </div>
  );
}
