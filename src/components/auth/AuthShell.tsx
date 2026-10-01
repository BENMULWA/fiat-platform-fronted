import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import logo from '../../pages/assets/jasiri-icon.png';
import hero from '../../pages/assets/otc-hero.webp';

export type AuthVariant = 'retail' | 'otc' | 'staff';

const FLOAT_CSS = `
@keyframes jasiriFloat { 0%,100% { transform: translate3d(0,0,0) scale(1.03); } 50% { transform: translate3d(0,-16px,0) scale(1.06); } }
@keyframes jasiriDrift { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(18px,-22px,0); } }
.jasiri-float { animation: jasiriFloat 16s ease-in-out infinite; will-change: transform; }
.jasiri-drift { animation: jasiriDrift 22s ease-in-out infinite; will-change: transform; }
@media (prefers-reduced-motion: reduce) { .jasiri-float, .jasiri-drift { animation: none; } }
`;

const DOTS = '[background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:26px_26px]';

export function AuthBackdrop({ variant }: { variant: AuthVariant }) {
  if (variant === 'otc') {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <style>{FLOAT_CSS}</style>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#04101c_0%,#06263a_46%,#0a4a5a_100%)]" />
        {/* Floating OTC artwork: duotone-tinted to Jasiri teal and dissolved into the page at every edge */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-[88%]"
          style={{ WebkitMaskImage: 'radial-gradient(ellipse 62% 58% at 58% 44%, #000 28%, transparent 78%)', maskImage: 'radial-gradient(ellipse 62% 58% at 58% 44%, #000 28%, transparent 78%)' }}>
          <div className="jasiri-float absolute inset-0 bg-gradient-to-br from-[#0b5d6e] via-[#0a3f55] to-[#06263a]">
            <img src={hero} alt="" draggable={false} className="h-full w-full select-none object-cover opacity-45 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#04101c]/85 via-[#04101c]/45 to-[#04101c]/65" />
          </div>
        </div>
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-teal-500/25 blur-[120px]" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[560px] w-[560px] rounded-full bg-amber-400/20 blur-[130px]" />
        <div className="absolute -left-24 top-[250px] h-12 w-[62%] -rotate-[8deg] bg-gradient-to-r from-amber-400 via-amber-300/80 to-transparent" />
        <div className="absolute -right-32 bottom-[18%] h-16 w-[70%] -rotate-[8deg] bg-gradient-to-l from-amber-400/70 via-amber-300/40 to-transparent" />
        <div className={`absolute inset-0 opacity-70 ${DOTS}`} />
      </div>
    );
  }

  if (variant === 'retail') {
    const bars = [34, 52, 41, 66, 48, 72, 58, 86, 64, 92, 74, 100];
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <style>{FLOAT_CSS}</style>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#03120e_0%,#04281f_46%,#05503b_100%)]" />
        <div className="jasiri-drift absolute -top-44 -left-32 h-[540px] w-[540px] rounded-full bg-emerald-500/25 blur-[120px]" />
        <div className="jasiri-drift absolute bottom-[-200px] right-[-120px] h-[560px] w-[560px] rounded-full bg-amber-400/20 blur-[130px] [animation-delay:-8s]" />
        <div className="absolute -left-24 top-[250px] h-12 w-[62%] -rotate-[8deg] bg-gradient-to-r from-amber-400 via-amber-300/80 to-transparent" />
        <div className="absolute -right-32 bottom-[18%] h-16 w-[70%] -rotate-[8deg] bg-gradient-to-l from-amber-400/70 via-amber-300/40 to-transparent" />
        {/* market-bar motif: low, floating, faded out to the top */}
        <div className="jasiri-float absolute bottom-0 right-0 flex h-[46%] w-[58%] items-end gap-3 px-6 opacity-[0.16]"
          style={{ WebkitMaskImage: 'linear-gradient(to top, #000 15%, transparent 95%)', maskImage: 'linear-gradient(to top, #000 15%, transparent 95%)' }}>
          {bars.map((h, i) => (
            <span key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-300 to-amber-200" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className={`absolute inset-0 opacity-70 ${DOTS}`} />
      </div>
    );
  }

  // staff: sober, restricted-access feel. No photo, no gold.
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <style>{FLOAT_CSS}</style>
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#030712_0%,#0a1428_55%,#0d1f3d_100%)]" />
      <div className="jasiri-drift absolute -top-48 right-[-120px] h-[560px] w-[560px] rounded-full bg-blue-600/20 blur-[130px]" />
      <div className="absolute inset-0 opacity-[0.55] [background-image:linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] [background-size:46px_46px]"
        style={{ WebkitMaskImage: 'radial-gradient(ellipse at 50% 35%, #000 25%, transparent 78%)', maskImage: 'radial-gradient(ellipse at 50% 35%, #000 25%, transparent 78%)' }} />
      <div className="absolute -left-24 top-[300px] h-px w-[60%] -rotate-[8deg] bg-gradient-to-r from-blue-400/70 to-transparent" />
    </div>
  );
}

const BRAND: Record<AuthVariant, [string, string, string]> = {
  retail: ['Jasiri', '', 'Capital'],
  otc: ['Jasiri ', 'OTC', 'Institutional desk'],
  staff: ['Jasiri ', 'Staff', 'Restricted access'],
};

export function AuthBrand({ variant }: { variant: AuthVariant }) {
  const [a, b, sub] = BRAND[variant];
  return (
    <Link to="/" className="inline-flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-black/30">
        <img src={logo} alt="Jasiri Capital" className="h-8 w-8 object-contain" />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-tight text-white">{a}<span className={variant === 'staff' ? 'text-blue-300' : 'text-amber-300'}>{b}</span></span>
        <span className={`block text-[10px] font-semibold uppercase tracking-[0.2em] ${variant === 'staff' ? 'text-blue-200/70' : variant === 'retail' ? 'text-emerald-200/70' : 'text-teal-200/70'}`}>{sub}</span>
      </span>
    </Link>
  );
}

// Class sets so every auth page looks the same per audience.
export function authStyles(variant: AuthVariant) {
  const dark = variant === 'staff';
  return {
    dark,
    card: dark
      ? 'rounded-2xl border border-[#1e2d3d] bg-[#0b1220]/85 p-6 sm:p-8 text-white shadow-2xl shadow-black/50 backdrop-blur-xl'
      : 'rounded-2xl bg-white p-5 sm:p-7 shadow-2xl shadow-black/40',
    title: dark ? 'text-white' : 'text-[#0b2a3b]',
    muted: dark ? 'text-gray-400' : 'text-slate-500',
    label: dark ? 'block text-[12px] font-semibold text-gray-300 mb-1' : 'block text-[12.5px] font-semibold text-[#0b2a3b] mb-1',
    input: dark
      ? 'w-full rounded-lg border border-[#243449] bg-[#0a0f1a] px-3 py-2 text-[13px] text-white placeholder:text-gray-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
      : `w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-2 ${variant === 'otc' ? 'focus:border-teal-600 focus:ring-teal-600/15' : 'focus:border-emerald-600 focus:ring-emerald-600/15'}`,
    button: variant === 'staff'
      ? 'flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
      : variant === 'otc'
        ? 'flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-700 to-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
        : 'flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50',
    link: dark ? 'font-semibold text-blue-300 hover:text-blue-200' : variant === 'otc' ? 'font-semibold text-teal-700 hover:text-teal-600' : 'font-semibold text-emerald-700 hover:text-emerald-600',
    error: dark ? 'rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300' : 'rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600',
    success: dark ? 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-300' : 'rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700',
    eye: dark ? 'text-gray-500 hover:text-gray-300' : 'text-slate-400 hover:text-slate-600',
  };
}

export function AuthAside({ title, items, footer }: { title: string; items: string[]; footer?: ReactNode }) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-[#04101c]/80 p-6 text-white shadow-2xl shadow-black/40 backdrop-blur-md lg:mt-6 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="mt-5 space-y-4">
        {items.map(b => (
          <li key={b} className="flex items-start gap-3 text-sm leading-relaxed text-white/95">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-8 rounded-xl border border-white/10 bg-black/25 p-5 text-sm text-white/90">{footer}</div>}
    </aside>
  );
}

export const ASIDE_ITEMS = {
  retail: [
    'Hold KES and stablecoins (USDT, USDC, cUSD, USDA) in one wallet.',
    'Deposit with mobile money or crypto, and withdraw when you need to.',
    'Swap between assets and send to other Jasiri users.',
    'Redeem airtime straight from your balance.',
    'Every sign-in is protected by a one-time email code.',
  ],
  otc: [
    'An institutional OTC desk with a dedicated dealer, quoting from live market and central bank rates.',
    'Multi-currency wallets across Kenya, Uganda, Nigeria and more, in one place.',
    'Settle conversions into your Jasiri wallet, a bank account, or your own crypto wallet on the network you choose.',
    'Pay your beneficiaries and suppliers from your balance, with every payout tracked.',
    'Two-person treasury approvals and a full audit trail on every settlement.',
  ],
} as const;

export function StaffNotice() {
  return (
    <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs leading-relaxed text-blue-200/80">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
      <span>Restricted to authorised Jasiri staff. Sign-ins need a one-time email code, and actions on settlements, rates and compliance cases are recorded in the audit log.</span>
    </div>
  );
}

type ShellProps = { variant: AuthVariant; children: ReactNode; aside?: ReactNode; narrow?: boolean; backTo?: { to: string; label: string } };

export default function AuthShell({ variant, children, aside, narrow, backTo }: ShellProps) {
  const s = authStyles(variant);
  const single = !aside;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04101c] font-sans">
      <AuthBackdrop variant={variant} />
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <AuthBrand variant={variant} />
          {backTo && <Link to={backTo.to} className="text-sm font-semibold text-white/70 hover:text-white">{backTo.label}</Link>}
        </div>
        {single ? (
          <div className="mx-auto mt-6 sm:mt-8 max-w-md"><div className={s.card}>{children}</div></div>
        ) : (
          <div className={`mt-5 grid items-start gap-6 lg:gap-10 ${narrow ? 'lg:grid-cols-[minmax(0,420px)_1fr]' : 'lg:grid-cols-[minmax(0,640px)_1fr]'}`}>
            <div className={s.card}>{children}</div>
            {aside}
          </div>
        )}
      </div>
    </div>
  );
}
