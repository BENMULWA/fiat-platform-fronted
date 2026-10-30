import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Clock, CreditCard, Eye, Loader2,
  Plus, RefreshCw, Snowflake, Upload, Wallet,
} from 'lucide-react';
import {
  fundCard, freezeCard, getCardBalance, getCardDetails, getCardQuote, getCardStatus, issueCard,
  submitCardKyc, unfreezeCard,
} from '../../api/client';
import StepUpModal, { StepUpFields } from '../../components/cards/StepUpModal';
import VirtualCard, { CardSecrets } from '../../components/cards/VirtualCard';
import useWebsocket from '../../hooks/useWebsocket';
import { useTheme } from '../../contexts/ThemeContext';

// ---------------------------------------------------------------- helpers
const MAX_BYTES = 2 * 1024 * 1024; // card processor limit per image
const FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const newKey = () => (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const errorText = (err: any): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => String(d?.msg || d).replace(/^Value error, /, '')).join('; ');
  return err?.message || 'Something went wrong. Please try again.';
};

const kes = (v: string | number) => Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Status {
  enabled: boolean;
  kyc?: { status: string; approved: boolean; reason?: string | null };
  cards?: { cardNo: string; status: string; createdAt?: string }[];
  holderName?: string | null;
  operations?: { id: string; kind: string; usd: string; chargedKes: string; status: string; cardNo?: string; reason?: string; createdAt: string }[];
  limits?: { minUsd: string; maxUsd: string; marginPct: string };
}

const OPEN_STATES = ['PENDING_DEBIT', 'DEBITED', 'SUBMITTED'];
const OP_LABEL: Record<string, string> = {
  PENDING_DEBIT: 'Starting', DEBITED: 'Processing', SUBMITTED: 'Processing', SUCCESS: 'Completed',
  REFUNDED: 'Refunded', FAILED: 'Failed', REVIEW: 'Under review',
};
// Wasabi's card statuses, as the card shows them
const CARD_LABEL: Record<string, string> = { normal: 'ACTIVE', freeze: 'FROZEN', cancel: 'CANCELLED', blocked: 'BLOCKED' };

// ---------------------------------------------------------------- page
export default function CardsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const panel = isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111827] border-[#1E2533]';
  const muted = isLight ? 'text-slate-500' : 'text-gray-400';
  const strong = isLight ? 'text-slate-900' : 'text-white';

  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState('');
  const [stepUp, setStepUp] = useState<null | { title: string; description: string; label: string; run: (f: StepUpFields) => Promise<void> }>(null);
  const [revealed, setRevealed] = useState<null | { cardNo: string; data: CardSecrets; expiresAt: number }>(null);
  const [notice, setNotice] = useState('');

  const userId = (() => {
    try { const u = JSON.parse(localStorage.getItem('meshex_user') || 'null'); return u ? (u._id || u.id || null) : null; } catch { return null; }
  })();

  const load = useCallback(async () => {
    try {
      const res = await getCardStatus();
      setStatus(res.data);
      setLoadError('');
    } catch (err: any) {
      setLoadError(errorText(err));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Live updates over the existing socket, plus a slow poll as a safety net (works without webhooks locally).
  useWebsocket('/ws/dashboard', userId, (msg: any) => { if (msg?.type === 'card_update') void load(); });
  const waiting = status?.kyc && ['wait_audit', 'under_review'].includes(status.kyc.status);
  const opOpen = status?.operations?.some((o) => OPEN_STATES.includes(o.status));
  useEffect(() => {
    const t = window.setInterval(() => void load(), waiting || opOpen ? 8000 : 30000);
    return () => window.clearInterval(t);
  }, [load, waiting, opOpen]);

  // Card details are shown briefly and then dropped from memory.
  useEffect(() => {
    if (!revealed) return;
    const t = window.setTimeout(() => setRevealed(null), Math.max(0, revealed.expiresAt - Date.now()));
    return () => window.clearTimeout(t);
  }, [revealed]);
  useEffect(() => () => setRevealed(null), []);

  const states = status?.kyc?.status || 'none';
  const holderName = status?.holderName || (() => {
    try { return JSON.parse(localStorage.getItem('meshex_user') || 'null')?.name || ''; } catch { return ''; }
  })();
  const cards = status?.cards || [];

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pt-4 px-4 md:px-0 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('/deposit')} aria-label="Back to deposits"
          className={`p-2.5 border rounded-xl ${isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-[#111827] border-[#1E2533] text-gray-400'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${strong}`}>
            <CreditCard className="w-6 h-6 text-emerald-500" /> Virtual Card
          </h2>
          <p className={`text-xs mt-0.5 ${muted}`}>Get a Mastercard and load it from your KES wallet.</p>
        </div>
      </div>

      {notice && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm font-medium">{notice}</div>}
      {loadError && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{loadError}</div>}

      {!status && !loadError && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>}

      {status && !status.enabled && (
        <div className={`p-6 rounded-2xl border ${panel}`}>
          <p className={`font-semibold ${strong}`}>Virtual cards are not available right now.</p>
          <p className={`text-sm mt-1 ${muted}`}>Please check back soon.</p>
        </div>
      )}

      {status?.enabled && (states === 'none' || states === 'reject') && (
        <KycForm panel={panel} muted={muted} strong={strong} isLight={isLight} rejectedReason={states === 'reject' ? status.kyc?.reason || 'Your application was not approved.' : null}
          onDone={() => { setNotice('Application submitted. You will see the decision here.'); void load(); }} />
      )}

      {status?.enabled && waiting && (
        <div className={`p-6 rounded-2xl border flex items-start gap-4 ${panel}`}>
          <Clock className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className={`font-semibold ${strong}`}>Your card application is under review</p>
            <p className={`text-sm mt-1 ${muted}`}>This usually takes a few hours. This page updates by itself when there is a decision.</p>
          </div>
        </div>
      )}

      {status?.enabled && status.kyc?.approved && (
        <>
          {cards.length === 0 && (
            <IssuePanel limits={status.limits!} panel={panel} muted={muted} strong={strong} isLight={isLight}
              askStepUp={setStepUp} onTopUp={() => navigate('/deposit')} onDone={() => { setNotice('Your card is being issued.'); void load(); }} />
          )}
          {cards.map((c) => (
            <CardTile key={c.cardNo} card={c} limits={status.limits!} panel={panel} muted={muted} strong={strong} isLight={isLight}
              holderName={holderName} secrets={revealed?.cardNo === c.cardNo ? revealed : null}
              askStepUp={setStepUp} onChanged={load} onHide={() => setRevealed(null)}
              onReveal={(data: CardSecrets) => setRevealed({ cardNo: c.cardNo, data, expiresAt: Date.now() + 45000 })} />
          ))}
        </>
      )}

      {status?.enabled && (status.operations?.length || 0) > 0 && (
        <div className={`p-5 rounded-2xl border ${panel}`}>
          <h3 className={`text-sm font-bold mb-3 ${strong}`}>Card activity</h3>
          <ul className="divide-y divide-slate-200/10">
            {status.operations!.map((o) => (
              <li key={o.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div>
                  <span className={strong}>{o.kind === 'ISSUE' ? 'Card issued' : 'Card loaded'} · ${Number(o.usd).toFixed(2)}</span>
                  <span className={`block text-xs ${muted}`}>KES {kes(o.chargedKes)} · {new Date(o.createdAt).toLocaleString()}</span>
                  {o.reason && o.status !== 'SUCCESS' && <span className="block text-xs text-amber-400">{o.reason}</span>}
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  o.status === 'SUCCESS' ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
                    : OPEN_STATES.includes(o.status) ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    : 'text-gray-400 border-gray-500/30 bg-gray-500/10'}`}>{OP_LABEL[o.status] || o.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <StepUpModal open={!!stepUp} title={stepUp?.title || ''} description={stepUp?.description || ''} confirmLabel={stepUp?.label}
        onClose={() => setStepUp(null)}
        onConfirm={async (f) => { await stepUp!.run(f); setStepUp(null); }} />

    </div>
  );
}

// ---------------------------------------------------------------- KYC form
const initialForm = {
  firstName: '', middleName: '', lastName: '', birthday: '', gender: 'M', nationality: 'KE', country: 'KE',
  town: '', postCode: '', address: '', areaCode: '+254', mobile: '', email: '',
  idType: 'GOVERNMENT_ISSUED_ID_CARD', idNumber: '', issueDate: '', idNoExpiryDate: '',
};

function KycForm({ panel, muted, strong, isLight, rejectedReason, onDone }: any) {
  const [form, setForm] = useState({ ...initialForm });
  const [files, setFiles] = useState<{ front?: File; back?: File; selfie?: File }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const keyRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('meshex_user') || 'null');
      if (u?.email) setForm((f) => ({ ...f, email: f.email || u.email }));
    } catch { /* ignore */ }
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const input = `mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0B0E14] border-[#1E2533] text-white'}`;
  const needsBack = form.idType !== 'PASSPORT';

  const pick = (kind: 'front' | 'back' | 'selfie') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!FILE_TYPES.includes(file.type)) { setError('Only JPG, PNG or PDF files are accepted.'); return; }
    if (file.size > MAX_BYTES) { setError(`${file.name} is larger than 2 MB.`); return; }
    setError('');
    setFiles((f) => ({ ...f, [kind]: file }));
  };

  const validate = (): string => {
    const need: [string, string][] = [['firstName', 'First name'], ['lastName', 'Last name'], ['birthday', 'Date of birth'],
      ['town', 'Town'], ['postCode', 'Postal code'], ['address', 'Street address'], ['mobile', 'Mobile number'],
      ['email', 'Contact email'], ['idNumber', 'ID number'], ['issueDate', 'Date of issue'], ['idNoExpiryDate', 'Expiry date']];
    for (const [k, label] of need) if (!(form as any)[k].trim()) return `${label} is required.`;
    if (`${form.firstName} ${form.middleName}`.trim().length + form.lastName.trim().length > 32) return 'First, middle and last name together can be at most 32 characters.';
    if (!/^[A-Za-z0-9 -]+$/.test(form.address)) return 'Street address can only contain letters, numbers, hyphens and spaces.';
    if (!/^[A-Za-z][A-Za-z .'-]*$/.test(form.town)) return 'Town can only contain letters.';
    if (!files.front || !files.selfie || (needsBack && !files.back)) return needsBack ? 'Upload the front and back of your ID and a selfie holding it.' : 'Upload your passport page and a selfie holding it.';
    return '';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) { setError(problem); return; }
    setBusy(true); setError('');
    const key = keyRef.current ?? (keyRef.current = newKey()); // a retry of the same form never creates a second application
    const { middleName, ...rest } = form;
    const details = { ...rest, firstName: `${form.firstName.trim()} ${middleName.trim()}`.trim(), mobile: form.mobile.replace(/^0/, '') };
    const body = new FormData();
    body.append('details', JSON.stringify(details));
    body.append('front', files.front!); body.append('selfie', files.selfie!);
    if (needsBack && files.back) body.append('back', files.back);
    try {
      await submitCardKyc(body, key);
      keyRef.current = null;
      onDone();
    } catch (err: any) {
      setError(errorText(err));
      if (err?.response?.status && err.response.status < 500) keyRef.current = null; // a refused form gets a fresh key next time
    } finally {
      setBusy(false);
    }
  };

  const FileBox = ({ kind, label, hint }: { kind: 'front' | 'back' | 'selfie'; label: string; hint: string }) => (
    <label className={`block rounded-xl border border-dashed p-4 cursor-pointer text-center ${files[kind] ? 'border-emerald-500/50 bg-emerald-500/5' : isLight ? 'border-slate-300' : 'border-[#2a3447]'}`}>
      <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={pick(kind)} />
      {files[kind] ? <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500" /> : <Upload className={`w-5 h-5 mx-auto ${muted}`} />}
      <span className={`block text-sm font-semibold mt-1.5 ${strong}`}>{label}</span>
      <span className={`block text-xs mt-0.5 ${muted}`}>{files[kind] ? files[kind]!.name : hint}</span>
    </label>
  );

  return (
    <form onSubmit={submit} className={`p-6 rounded-2xl border space-y-5 ${panel}`}>
      <div>
        <h3 className={`text-lg font-bold ${strong}`}>Apply for a virtual card</h3>
        <p className={`text-sm mt-1 ${muted}`}>Enter your details <b>exactly as they appear on your ID</b>. The card issuer checks them, usually within a few hours.</p>
      </div>
      {rejectedReason && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span><b>Not approved:</b> {rejectedReason} Correct the details and submit again.</span>
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-xs font-semibold">First name<input className={input} value={form.firstName} onChange={set('firstName')} /></label>
        <label className="text-xs font-semibold">Middle name <span className={muted}>(optional)</span><input className={input} value={form.middleName} onChange={set('middleName')} /></label>
        <label className="text-xs font-semibold">Last name<input className={input} value={form.lastName} onChange={set('lastName')} /></label>
        <label className="text-xs font-semibold">Date of birth<input type="date" className={input} value={form.birthday} onChange={set('birthday')} /></label>
        <label className="text-xs font-semibold">Gender
          <select className={input} value={form.gender} onChange={set('gender')}><option value="M">Male</option><option value="F">Female</option></select></label>
        <label className="text-xs font-semibold">Town / city<input className={input} value={form.town} onChange={set('town')} /></label>
        <label className="text-xs font-semibold sm:col-span-2">Street address<input className={input} value={form.address} onChange={set('address')} placeholder="Letters, numbers, hyphens and spaces" /></label>
        <label className="text-xs font-semibold">Postal code<input className={input} value={form.postCode} onChange={set('postCode')} /></label>
        <label className="text-xs font-semibold">Area code<input className={input} value={form.areaCode} onChange={set('areaCode')} /></label>
        <label className="text-xs font-semibold">Mobile number<input className={input} value={form.mobile} onChange={set('mobile')} placeholder="712345678" /></label>
        <label className="text-xs font-semibold">Contact email<input type="email" className={input} value={form.email} onChange={set('email')} /></label>
        <label className="text-xs font-semibold">ID type
          <select className={input} value={form.idType} onChange={set('idType')}>
            <option value="GOVERNMENT_ISSUED_ID_CARD">National ID card</option><option value="PASSPORT">Passport</option><option value="DLN">Driving licence</option>
          </select></label>
        <label className="text-xs font-semibold">ID number<input className={input} value={form.idNumber} onChange={set('idNumber')} /></label>
        <span className="hidden sm:block" />
        <label className="text-xs font-semibold">Date of issue<input type="date" className={input} value={form.issueDate} onChange={set('issueDate')} /></label>
        <label className="text-xs font-semibold">Expiry date<input type="date" className={input} value={form.idNoExpiryDate} onChange={set('idNoExpiryDate')} /></label>
      </div>
      <p className={`text-xs ${muted}`}>Your contact email must not already be registered for another card. We send your application to our card partner for verification.</p>

      <div className="grid sm:grid-cols-3 gap-3">
        <FileBox kind="front" label={needsBack ? 'ID front' : 'Passport page'} hint="JPG, PNG or PDF, max 2 MB" />
        {needsBack && <FileBox kind="back" label="ID back" hint="JPG, PNG or PDF, max 2 MB" />}
        <FileBox kind="selfie" label="Selfie with your ID" hint="Face and ID clearly visible" />
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit application'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- amount + quote (shared by issue and load)
function useQuote(kind: 'issue' | 'fund', usd: string) {
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setQuote(null); setError('');
    if (!usd || !/^\d+(\.\d{1,2})?$/.test(usd)) return;
    let live = true;
    const t = window.setTimeout(async () => {
      try { const r = await getCardQuote(kind, usd); if (live) setQuote(r.data); }
      catch (err: any) { if (live) setError(errorText(err)); }
    }, 400);
    return () => { live = false; window.clearTimeout(t); };
  }, [kind, usd]);
  return { quote, error };
}

function AmountPicker({ kind, limits, value, onChange, muted, strong, isLight }: any) {
  const { quote, error } = useQuote(kind, value);
  const presets = useMemo(() => Array.from(new Set([limits.minUsd, '20', '50', limits.maxUsd])).filter((p) => Number(p) >= Number(limits.minUsd) && Number(p) <= Number(limits.maxUsd)), [limits]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((p: string) => (
          <button type="button" key={p} onClick={() => onChange(p)}
            className={`px-4 py-2 rounded-xl border text-sm font-bold ${value === p ? 'bg-emerald-500 border-emerald-500 text-black' : isLight ? 'border-slate-200 text-slate-700' : 'border-[#2a3447] text-gray-300'}`}>${p}</button>
        ))}
      </div>
      <label className="block text-xs font-semibold">Amount in USD
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
          className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0B0E14] border-[#1E2533] text-white'}`} />
        <span className={`block mt-1 font-normal ${muted}`}>Between ${limits.minUsd} and ${limits.maxUsd}.</span>
      </label>
      {quote && (
        <div className={`p-3 rounded-xl border text-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0E14] border-[#1E2533]'}`}>
          <div className="flex justify-between"><span className={muted}>You pay</span><b className={strong}>KES {kes(quote.chargeKes)}</b></div>
          {kind === 'issue' && quote.cardFeeUsd && <p className={`text-xs mt-1 ${muted}`}>Includes the ${Number(quote.cardFeeUsd).toFixed(2)} card fee. Taken from your KES wallet.</p>}
          {kind === 'fund' && <p className={`text-xs mt-1 ${muted}`}>Taken from your KES wallet.</p>}
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- issue
function IssuePanel({ limits, panel, muted, strong, isLight, askStepUp, onTopUp, onDone }: any) {
  const [usd, setUsd] = useState(limits.minUsd);
  const keyRef = useRef<string | null>(null);
  const go = () => {
    askStepUp({
      title: 'Issue my card', description: `Confirm to pay for a $${usd} virtual card from your KES wallet.`, label: 'Pay and issue',
      run: async (f: StepUpFields) => {
        const key = keyRef.current ?? (keyRef.current = newKey());
        try { await issueCard({ usd, ...f }, key); keyRef.current = null; onDone(); }
        catch (err: any) { if (err?.response?.status && err.response.status < 500) keyRef.current = null; throw new Error(errorText(err)); }
      },
    });
  };
  return (
    <div className={`p-6 rounded-2xl border space-y-4 ${panel}`}>
      <div className="flex items-center gap-2 text-emerald-500"><CheckCircle2 className="w-5 h-5" /><b className="text-sm">Approved</b></div>
      <div>
        <h3 className={`text-lg font-bold ${strong}`}>Issue your virtual card</h3>
        <p className={`text-sm mt-1 ${muted}`}>The amount you choose is the card's opening balance.</p>
      </div>
      <AmountPicker kind="issue" limits={limits} value={usd} onChange={setUsd} muted={muted} strong={strong} isLight={isLight} />
      <button type="button" onClick={go} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm">Issue my card</button>
      <p className={`text-xs ${muted}`}>Not enough in your wallet? <button type="button" className="text-emerald-500 font-semibold" onClick={onTopUp}>Top up with mobile money</button> first.</p>
    </div>
  );
}

// ---------------------------------------------------------------- one card
function CardTile({ card, limits, panel, muted, strong, isLight, holderName, secrets, askStepUp, onChanged, onReveal, onHide }: any) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [usd, setUsd] = useState('10');
  const [error, setError] = useState('');
  const [revealing, setRevealing] = useState(false);
  const fundKey = useRef<string | null>(null);
  const frozen = /freeze|frozen/i.test(card.status || '');
  const label = frozen ? 'FROZEN' : (CARD_LABEL[(card.status || '').toLowerCase()] ?? (card.status || 'PENDING').toUpperCase());

  const refreshBalance = useCallback(async () => {
    try { const r = await getCardBalance(card.cardNo); setBalance(r.data?.balance != null ? Number(r.data.balance).toFixed(2) : null); } catch { /* shown as unavailable */ }
  }, [card.cardNo]);
  useEffect(() => { void refreshBalance(); }, [refreshBalance, card.status]);

  const toggleFreeze = async () => {
    setLoading(true); setError('');
    try { await (frozen ? unfreezeCard : freezeCard)(card.cardNo, newKey()); await onChanged(); }
    catch (err: any) { setError(errorText(err)); } finally { setLoading(false); }
  };

  // The card number, expiry and CVV are only fetched after the step-up passes, and live in memory for 45 seconds.
  const reveal = () => askStepUp({
    title: 'Show card details', description: 'For your security we need to confirm it is you. Details are shown on the card for 45 seconds.', label: 'Show details',
    run: async (f: StepUpFields) => {
      setRevealing(true);
      try { const r = await getCardDetails(card.cardNo, f); onReveal(r.data); }
      catch (err: any) { throw new Error(errorText(err)); }
      finally { setRevealing(false); }
    },
  });

  const load = () => askStepUp({
    title: 'Load card', description: `Confirm to move $${usd} onto your card from your KES wallet.`, label: 'Pay and load',
    run: async (f: StepUpFields) => {
      const key = fundKey.current ?? (fundKey.current = newKey());
      try { await fundCard(card.cardNo, { usd, ...f }, key); fundKey.current = null; setLoadOpen(false); await onChanged(); void refreshBalance(); }
      catch (err: any) { if (err?.response?.status && err.response.status < 500) fundKey.current = null; throw new Error(errorText(err)); }
    },
  });

  return (
    <div className={`p-6 rounded-2xl border space-y-5 ${panel}`}>
      <VirtualCard holderName={holderName} status={label} frozen={frozen} balance={balance}
        secrets={secrets?.data ?? null} secretsExpireAt={secrets?.expiresAt ?? null} revealing={revealing}
        onReveal={reveal} onHide={onHide} />

      <div className="grid grid-cols-3 gap-2 max-w-[380px] mx-auto">
        <button type="button" onClick={() => setLoadOpen((v) => !v)} className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${isLight ? 'border-slate-200 text-slate-700' : 'border-[#2a3447] text-gray-200'}`}><Plus className="w-4 h-4" /> Load</button>
        <button type="button" onClick={reveal} className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${isLight ? 'border-slate-200 text-slate-700' : 'border-[#2a3447] text-gray-200'}`}><Eye className="w-4 h-4" /> Details</button>
        <button type="button" onClick={toggleFreeze} disabled={loading} className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 ${isLight ? 'border-slate-200 text-slate-700' : 'border-[#2a3447] text-gray-200'}`}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Snowflake className="w-4 h-4" />} {frozen ? 'Unfreeze' : 'Freeze'}
        </button>
      </div>

      {loadOpen && (
        <div className="space-y-3 pt-1">
          <AmountPicker kind="fund" limits={{ minUsd: '1', maxUsd: limits.maxUsd }} value={usd} onChange={setUsd} muted={muted} strong={strong} isLight={isLight} />
          <button type="button" onClick={load} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm flex items-center justify-center gap-2"><Wallet className="w-4 h-4" /> Load from wallet</button>
        </div>
      )}
      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}
      <button type="button" onClick={() => void refreshBalance()} className={`text-xs flex items-center gap-1 mx-auto ${muted}`}><RefreshCw className="w-3 h-3" /> Refresh balance</button>
    </div>
  );
}
