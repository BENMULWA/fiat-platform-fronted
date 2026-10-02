import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ShieldCheck, Lock, UserPlus } from 'lucide-react';
import logo from '../../pages/assets/jasiri-icon.png';
import OtcArtwork, { DeskEmblem } from './OtcArtwork';
import WorkspaceScene from './WorkspaceScene';

export type AuthVariant = 'retail' | 'otc' | 'staff';

const FLOAT_CSS = `
@keyframes jasiriFloat { 0%,100% { transform: translate3d(0,0,0) scale(1.03); } 50% { transform: translate3d(0,-16px,0) scale(1.06); } }
@keyframes jasiriDrift { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(18px,-22px,0); } }
.jasiri-float { animation: jasiriFloat 16s ease-in-out infinite; will-change: transform; }
.jasiri-drift { animation: jasiriDrift 22s ease-in-out infinite; will-change: transform; }
@media (prefers-reduced-motion: reduce) { .jasiri-float, .jasiri-drift { animation: none; } }
.auth-light { color-scheme: light; }
.auth-light input:-webkit-autofill, .auth-light input:-webkit-autofill:focus, .auth-light select:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important; -webkit-text-fill-color: #0f172a !important; caret-color: #0f172a; transition: background-color 9999s ease-out 0s; }
.auth-dark { color-scheme: dark; }
.auth-dark input:-webkit-autofill, .auth-dark input:-webkit-autofill:focus { -webkit-box-shadow: 0 0 0 1000px #0a0f1a inset !important; -webkit-text-fill-color: #ffffff !important; caret-color: #ffffff; transition: background-color 9999s ease-out 0s; }
`;

const DOTS = '[background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:26px_26px]';

export function AuthBackdrop({ variant, art = true }: { variant: AuthVariant; art?: boolean }) {
  if (variant === 'otc' && !art) {
    // Clean OTC form pages: only the three brand colours (navy, teal, gold), no artwork, and no gold laid
    // over teal (that blend turns olive-green). Gold appears only as a thin line and a faint glow.
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <style>{FLOAT_CSS}</style>
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#04101c_0%,#06263a_55%,#0a4a5a_100%)]" />
        <div className="jasiri-drift absolute -top-40 -left-32 h-[340px] w-[340px] rounded-full bg-teal-500/20 blur-[110px] sm:h-[520px] sm:w-[520px]" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300/60 to-transparent" />
        <div className="absolute -left-24 top-[30%] hidden h-px w-[55%] -rotate-[8deg] bg-gradient-to-r from-amber-300/70 to-transparent sm:block" />
        <div className="absolute -right-24 bottom-[22%] hidden h-px w-[55%] -rotate-[8deg] bg-gradient-to-l from-amber-300/60 to-transparent sm:block" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[460px] w-[460px] rounded-full bg-amber-400/[0.07] blur-[120px]" />
        <div className={`absolute inset-0 opacity-70 ${DOTS}`} />
      </div>
    );
  }

  if (variant === 'otc') {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <style>{FLOAT_CSS}</style>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#04101c_0%,#06263a_46%,#0a4a5a_100%)]" />
        {/* Original Jasiri OTC artwork (SVG): stablecoins -> Jasiri desk -> African currencies. Floats and fades at the edges. */}
        <div className="absolute inset-0 hidden lg:block"
          style={{ WebkitMaskImage: 'radial-gradient(ellipse 85% 80% at 50% 46%, #000 40%, transparent 100%)', maskImage: 'radial-gradient(ellipse 85% 80% at 50% 46%, #000 40%, transparent 100%)' }}>
          <div className="jasiri-float absolute inset-0">
            <OtcArtwork className="h-full w-full opacity-60" />
          </div>
        </div>
        <div className="absolute -top-40 -left-32 h-[320px] w-[320px] sm:h-[520px] sm:w-[520px] rounded-full bg-teal-500/25 blur-[100px] sm:blur-[120px]" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[320px] w-[320px] sm:h-[560px] sm:w-[560px] rounded-full bg-amber-400/20 blur-[100px] sm:blur-[130px]" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300/60 to-transparent sm:hidden" />
        <div className="absolute -left-24 top-[250px] hidden h-12 w-[62%] -rotate-[8deg] bg-gradient-to-r from-amber-400 via-amber-300/80 to-transparent sm:block" />
        <div className="absolute -right-32 bottom-[18%] hidden h-16 w-[70%] -rotate-[8deg] bg-gradient-to-l from-amber-400/70 via-amber-300/40 to-transparent sm:block" />
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
        <div className="jasiri-drift absolute bottom-[-200px] right-[-120px] h-[320px] w-[320px] sm:h-[560px] sm:w-[560px] rounded-full bg-amber-400/20 blur-[100px] sm:blur-[130px] [animation-delay:-8s]" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300/60 to-transparent sm:hidden" />
        <div className="absolute -left-24 top-[250px] hidden h-12 w-[62%] -rotate-[8deg] bg-gradient-to-r from-amber-400 via-amber-300/80 to-transparent sm:block" />
        <div className="absolute -right-32 bottom-[18%] hidden h-16 w-[70%] -rotate-[8deg] bg-gradient-to-l from-amber-400/70 via-amber-300/40 to-transparent sm:block" />
        {/* market-bar motif: low, floating, faded out to the top */}
        <div className="jasiri-float absolute bottom-0 right-0 hidden h-[46%] w-[58%] items-end gap-3 px-6 opacity-[0.16] sm:flex"
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


// Light, friendly backdrop for the customer pages (retail and OTC): a pale tint with two soft brand-colour glows.
export function LightBackdrop({ variant }: { variant: AuthVariant }) {
  const a = variant === 'otc' ? 'bg-[radial-gradient(circle_at_40%_40%,rgba(20,184,166,0.45),transparent_70%)]' : 'bg-[radial-gradient(circle_at_40%_40%,rgba(22,163,106,0.42),transparent_70%)]';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[linear-gradient(150deg,#f4f9fa_0%,#e8f3f4_100%)]" aria-hidden>
      <style>{FLOAT_CSS}</style>
      <div className="jasiri-drift absolute -right-32 -top-48 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(245,184,61,0.5),transparent_70%)] opacity-60 sm:h-[560px] sm:w-[560px]" />
      <div className={`jasiri-drift absolute -bottom-72 -left-52 h-[460px] w-[460px] rounded-full opacity-50 [animation-delay:-9s] sm:h-[620px] sm:w-[620px] ${a}`} />
    </div>
  );
}

export function LightBrand({ variant }: { variant: AuthVariant }) {
  const [a, b, sub] = BRAND[variant];
  return (
    <Link to="/" className="inline-flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <img src={logo} alt="Jasiri Capital" className="h-7 w-7 object-contain" />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold tracking-tight text-[#0b2a3b]">{a}<span className={variant === 'otc' ? 'text-teal-600' : 'text-emerald-600'}>{b}</span></span>
        <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">{sub}</span>
      </span>
    </Link>
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
      ? 'rounded-3xl border border-[#1e2d3d] bg-[#0b1220]/85 p-6 sm:p-8 text-white shadow-2xl shadow-black/50 backdrop-blur-xl'
      : 'rounded-3xl bg-white p-6 sm:p-8 shadow-2xl shadow-black/40',
    title: dark ? 'text-white' : 'text-[#0b2a3b]',
    muted: dark ? 'text-gray-400' : 'text-slate-500',
    label: dark ? 'block text-[12.5px] font-semibold text-gray-300 mb-1.5' : 'block text-[13px] font-semibold text-[#0b2a3b] mb-1.5',
    input: dark
      ? 'w-full rounded-xl border border-[#243449] bg-[#0a0f1a] px-3.5 py-3 text-base text-white sm:py-2.5 sm:text-[13.5px] placeholder:text-gray-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
      : `w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 sm:py-2.5 sm:text-[13.5px] placeholder:text-slate-400 outline-none transition focus:ring-2 ${variant === 'otc' ? 'focus:border-teal-600 focus:ring-teal-600/15' : 'focus:border-emerald-600 focus:ring-emerald-600/15'}`,
    button: variant === 'staff'
      ? 'flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-[15px] font-bold text-white shadow-lg shadow-blue-900/30 sm:text-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
      : variant === 'otc'
        ? 'flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-700 to-emerald-600 px-6 py-3 text-[15px] font-bold text-white shadow-lg shadow-teal-900/20 sm:text-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
        : 'flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-[15px] font-bold text-white shadow-lg shadow-emerald-900/25 sm:text-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50',
    link: dark ? 'font-semibold text-blue-300 hover:text-blue-200' : variant === 'otc' ? 'font-semibold text-teal-700 hover:text-teal-600' : 'font-semibold text-emerald-700 hover:text-emerald-600',
    error: dark ? 'rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300' : 'rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600',
    success: dark ? 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-300' : 'rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700',
    eye: dark ? 'text-gray-500 hover:text-gray-300' : 'text-slate-400 hover:text-slate-600',
  };
}

export function AuthCardHeader({ variant, kind = 'signin', title, subtitle }: { variant: AuthVariant; kind?: 'signin' | 'signup'; title: string; subtitle?: string }) {
  const st = authStyles(variant);
  const tone = variant === 'staff' ? 'from-blue-600 to-indigo-600 shadow-blue-900/30' : variant === 'otc' ? 'from-teal-600 to-emerald-500 shadow-teal-900/25' : 'from-emerald-600 to-teal-500 shadow-emerald-900/25';
  const Icon = kind === 'signup' ? UserPlus : Lock;
  return (
    <div className="mb-7 flex flex-col items-center text-center">
      <span className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${tone}`}><Icon className="h-6 w-6" /></span>
      <h1 className={`text-2xl font-extrabold tracking-tight ${st.title}`}>{title}</h1>
      {subtitle && <p className={`mt-1.5 max-w-xs text-sm leading-relaxed ${st.muted}`}>{subtitle}</p>}
    </div>
  );
}

export function AuthAside({ title, items, footer, emblem, summary = 'Why Jasiri? Learn more', light = false }: { title: string; items: readonly string[]; footer?: ReactNode; emblem?: boolean; summary?: string; light?: boolean }) {
  const list = (
    <ul className="mt-5 space-y-4">
      {items.map(b => (
        <li key={b} className={`flex items-start gap-3 text-sm leading-relaxed ${light ? 'text-slate-700' : 'text-white/95'}`}>
          <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${light ? 'text-amber-500' : 'text-amber-300'}`} />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
  const extra = footer ? <div className={`mt-6 rounded-xl border p-4 text-sm ${light ? 'border-slate-200 bg-slate-50 text-slate-700 [&_.text-amber-300]:!text-amber-600' : 'border-white/10 bg-black/25 text-white/90'}`}>{footer}</div> : null;
  return (
    <>
      {/* Collapsed under the form on every screen size, so the form stays centred and uncluttered until you ask for more */}
      <details className={`group overflow-hidden rounded-2xl border backdrop-blur-md ${light ? 'border-slate-200 bg-white/80 text-[#0b2a3b] shadow-sm' : 'border-white/15 bg-[#04101c]/75 text-white'}`}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2.5">
            {emblem && <DeskEmblem className="h-8 w-8 shrink-0" />}
            <span className="truncate">{summary}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-5">
          <h2 className="text-base font-bold">{title}</h2>
          {list}
          {extra}
        </div>
      </details>
    </>
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

type ShellProps = { variant: AuthVariant; children: ReactNode; aside?: ReactNode; narrow?: boolean; backTo?: { to: string; label: string }; showArt?: boolean };

export default function AuthShell({ variant, children, aside, narrow, backTo, showArt = true }: ShellProps) {
  const s = authStyles(variant);
  const single = !aside;

  // Customer pages (retail and OTC): dark backdrop, animated workspace scene on the left, sign-in card on the right.
  if (variant !== 'staff') {
    const copy = variant === 'otc'
      ? { title: 'Quotes, wallets and settlements in one place.', subtitle: 'Sign in to pick up where you left off.' }
      : { title: 'Your money, in shillings and stablecoins.', subtitle: 'Deposit, swap and send in a few taps.' };
    const bar = variant === 'otc' ? 'from-teal-500 via-emerald-400 to-amber-300' : 'from-emerald-500 via-teal-400 to-amber-300';
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#04101c] font-sans">
        <AuthBackdrop variant={variant} art={false} />
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <AuthBrand variant={variant} />
            {backTo && <Link to={backTo.to} className="text-sm font-semibold text-white/70 hover:text-white">{backTo.label}</Link>}
          </div>
          <main className="grid flex-1 items-center gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-12">
            <div className="order-2 hidden h-[560px] lg:order-1 lg:block"><WorkspaceScene dark variant={variant} title={copy.title} subtitle={copy.subtitle} /></div>
            <div className="order-1 mx-auto w-full max-w-md space-y-4 lg:order-2">
              <div className={`${s.card} auth-light relative overflow-hidden`}>
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${bar}`} />
                {children}
              </div>
              {aside}
            </div>
          </main>
        </div>
      </div>
    );
  }

  const bar = 'from-blue-500 via-indigo-500 to-blue-400';
  const card = (
    <div className={`${s.card} relative overflow-hidden ${s.dark ? 'auth-dark' : 'auth-light'}`}>
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${bar}`} />
      {children}
    </div>
  );
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#04101c] font-sans">
      <AuthBackdrop variant={variant} art={showArt} />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <AuthBrand variant={variant} />
          {backTo && <Link to={backTo.to} className="text-sm font-semibold text-white/70 hover:text-white">{backTo.label}</Link>}
        </div>
        <main className="flex flex-1 items-center py-8 sm:py-10">
          <div className={`mx-auto w-full space-y-4 ${narrow || single ? 'max-w-md' : 'max-w-2xl'}`}>
            {card}
            {aside}
          </div>
        </main>
      </div>
    </div>
  );
}
