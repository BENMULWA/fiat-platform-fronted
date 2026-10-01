import { useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw, ChevronDown, ChevronUp, Check, X, Paperclip, FileText, Image as ImageIcon, ShieldAlert,
  ArrowRight, Wallet, Landmark, Link2, Clock3, CheckCircle2, Radio,
} from 'lucide-react';
import { actOnDealerSettlement, getDealerSettlements, uploadSettlementEvidence, getSettlementEvidence } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

type S = Record<string, any>;

const STEPS = ['Review', 'Funds received', 'Approved', 'Transferred', 'Receipt confirmed', 'Reconciled'];
const STEP_INDEX: Record<string, number> = {
  pending: 0, executed: 0, treasury_review: 1, funds_confirmed: 2, transfer_approved: 3,
  transfer_pending: 4, fiat_confirmed: 5, crypto_confirmed: 5, reconciled: 6, completed: 6,
};
const TERMINAL = ['reconciled', 'completed', 'failed', 'reservation_released'];
const PHASE: Record<string, string> = {
  pending: 'awaiting_funds', executed: 'awaiting_funds', treasury_review: 'awaiting_funds',
  funds_confirmed: 'ready', transfer_approved: 'ready',
  transfer_pending: 'completing', fiat_confirmed: 'completing', crypto_confirmed: 'completing',
  reconciled: 'done', completed: 'done', failed: 'failed', reservation_released: 'failed',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Just created', executed: 'Just created', treasury_review: 'Waiting for merchant funds', funds_confirmed: 'Ready for approval',
  transfer_approved: 'Ready to settle', transfer_pending: 'Awaiting receipt', fiat_confirmed: 'Ready to close', crypto_confirmed: 'Ready to close',
  reconciled: 'Completed', completed: 'Completed', failed: 'Failed', reservation_released: 'Cancelled',
};
const FILTERS: [string, string][] = [
  ['active', 'Needs action'], ['awaiting_funds', 'Awaiting funds'], ['ready', 'Ready to settle'], ['completing', 'Closing'], ['done', 'Completed'], ['failed', 'Failed / cancelled'], ['all', 'All'],
];

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const ago = (iso?: string) => {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const TreasurySettlementsPage = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const currentAdminId = user?.email || user?.id;

  const [settlements, setSettlements] = useState<S[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState('active');
  const [openId, setOpenId] = useState('');
  const [forms, setForms] = useState<Record<string, S>>({});
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [listError, setListError] = useState('');
  const [allowSelfSubmit, setAllowSelfSubmit] = useState(false);
  const autoOpened = useRef(false);

  const load = async () => {
    try {
      const res = await getDealerSettlements();
      const rows: S[] = res.data.settlements || [];
      setSettlements(rows);
      setAllowSelfSubmit(Boolean(res.data.demoMode?.allowSelfSubmit));
      setLastUpdated(new Date());
      setListError('');
      if (!autoOpened.current) {
        const first = rows.find(r => !TERMINAL.includes(String(r.status)));
        if (first) setOpenId(first.id);
        autoOpened.current = true;
      }
    } catch {
      setListError('Could not refresh the queue. Showing the last data received.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); const t = window.setInterval(load, 10000); return () => window.clearInterval(t); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { active: 0, awaiting_funds: 0, ready: 0, completing: 0, done: 0, failed: 0, all: settlements.length };
    settlements.forEach(s => {
      const phase = PHASE[String(s.status)] || 'awaiting_funds';
      c[phase] = (c[phase] || 0) + 1;
      if (!TERMINAL.includes(String(s.status))) c.active += 1;
    });
    return c;
  }, [settlements]);

  const visible = settlements.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'active') return !TERMINAL.includes(String(s.status));
    return PHASE[String(s.status)] === filter;
  });

  const form = (id: string) => forms[id] || {};
  const setField = (id: string, key: string, value: string) => setForms(f => ({ ...f, [id]: { ...f[id], [key]: value } }));
  const setError = (id: string, msg: string) => setErrors(e => ({ ...e, [id]: msg }));

  const run = async (s: S, action: string, details: S = {}, success = 'Saved.') => {
    setBusy(`${s.id}:${action}`); setError(s.id, '');
    try {
      await actOnDealerSettlement(s.id, action, details);
      setNotice(`${s.id}: ${success}`);
      setTimeout(() => setNotice(''), 4000);
      setForms(f => ({ ...f, [s.id]: {} }));
      await load();
    } catch (err: any) {
      setError(s.id, err?.response?.data?.detail || 'That action could not be completed.');
    } finally { setBusy(''); }
  };

  const attach = (s: S, file?: File | null) => {
    if (!file) return;
    if (file.size > 3_000_000) return setError(s.id, 'File is too large (max 3MB).');
    const reader = new FileReader();
    reader.onload = async () => {
      setBusy(`${s.id}:upload`); setError(s.id, '');
      try {
        await uploadSettlementEvidence(s.id, { filename: file.name, dataUrl: String(reader.result) });
        setNotice(`${s.id}: proof "${file.name}" saved.`);
        setTimeout(() => setNotice(''), 4000);
        await load();
      } catch (err: any) {
        setError(s.id, err?.response?.data?.detail || 'Upload failed.');
      } finally { setBusy(''); }
    };
    reader.readAsDataURL(file);
  };

  const viewEvidence = async (s: S, ev: S) => {
    try {
      const res = await getSettlementEvidence(s.id, ev.id);
      const w = window.open();
      if (w) { w.document.title = ev.filename; w.document.body.style.margin = '0'; w.document.body.innerHTML = res.data.mime === 'application/pdf' ? `<iframe src="${res.data.dataUrl}" style="border:0;width:100vw;height:100vh"></iframe>` : `<img src="${res.data.dataUrl}" style="max-width:100%"/>`; }
    } catch { setError(s.id, 'Could not open that file.'); }
  };

  const card = `rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#182536]'}`;
  const strong = isLight ? 'text-slate-900' : 'text-white';
  const muted = isLight ? 'text-slate-500' : 'text-gray-500';
  const input = `w-full rounded-lg px-3 py-2 text-sm outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-[#080d13] border-[#26364B] text-white focus:border-emerald-500'}`;
  const label = `block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`;
  const primaryBtn = 'inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5';
  const subtle = `rounded-lg p-3 text-xs ${isLight ? 'bg-slate-50 text-slate-600' : 'bg-[#0A0F16] text-gray-400'}`;

  const kpis: [string, number, string, string][] = [
    ['Awaiting funds', counts.awaiting_funds, 'Merchant has not paid in, or you have not confirmed yet', 'text-amber-500'],
    ['Ready to settle', counts.ready, 'Funds confirmed. Approve, then a second admin submits', 'text-sky-500'],
    ['Closing', counts.completing, 'Transfer sent. Confirm receipt and reconcile', 'text-indigo-500'],
    ['Completed', counts.done, 'Fully settled and reconciled', 'text-emerald-500'],
  ];

  const renderStepper = (s: S) => {
    const idx = STEP_INDEX[String(s.status)] ?? 0;
    const failed = PHASE[String(s.status)] === 'failed';
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((name, i) => {
          const done = !failed && i < idx;
          const current = !failed && i === idx;
          return (
            <div key={name} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold border ${done ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : current ? 'bg-sky-500/10 border-sky-500/40 text-sky-400' : isLight ? 'border-slate-200 text-slate-400' : 'border-[#26364B] text-gray-600'}`}>
                {done ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">{i + 1}</span>}
                {name}
              </div>
              {i < STEPS.length - 1 && <ArrowRight className={`w-3 h-3 ${isLight ? 'text-slate-300' : 'text-gray-700'}`} />}
            </div>
          );
        })}
      </div>
    );
  };

  const renderAction = (s: S) => {
    const status = String(s.status);
    const f = form(s.id);
    const channel = String(s.settlementChannel || '');
    const inbound = s.legs?.crypto || {};
    const outbound = s.legs?.fiat || {};
    const pi = s.paymentInstructions || {};
    const approver = [...(s.audit || [])].reverse().find((e: S) => e.action === 'approve_crypto_transfer')?.performedBy;
    const selfApproved = approver && approver === currentAdminId && !allowSelfSubmit;
    const demoSelf = approver && approver === currentAdminId && allowSelfSubmit;
    const working = (a: string) => busy === `${s.id}:${a}`;

    if (TERMINAL.includes(status)) {
      return <div className={subtle}>{status === 'reconciled' || status === 'completed' ? 'This settlement is complete. Nothing more to do.' : 'This settlement was stopped. The audit trail below shows who closed it and when.'}</div>;
    }

    if (status === 'pending' || status === 'executed') {
      return (
        <div className="space-y-3">
          <p className={`text-sm ${strong}`}>Start the review. This tells the team a treasury member has picked it up.</p>
          <button className={primaryBtn} disabled={!!busy} onClick={() => run(s, 'review', {}, 'review started.')}>{working('review') ? 'Working...' : 'Start review'}</button>
        </div>
      );
    }

    if (status === 'treasury_review') {
      return (
        <div className="space-y-4">
          <div className={subtle}>
            <p className={`font-bold mb-1 ${strong}`}>Step: confirm the merchant's payment arrived</p>
            <p>The merchant should send <b>{fmt(inbound.amount)} {inbound.asset}</b>{pi.network ? <> on <b>{pi.network}</b></> : null}{pi.address ? <> to <span className="font-mono break-all">{pi.address}</span></> : null}{pi.memo ? <> with memo <span className="font-mono">{pi.memo}</span></> : null}. Check your wallet or bank for it, then record what you see. Nothing is saved until you press the green button.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block"><span className={label}>Where it came from (provider)</span><input className={input} value={f.provider || ''} onChange={e => setField(s.id, 'provider', e.target.value)} placeholder="e.g. Tron USDT, Binance" /></label>
            <label className="block"><span className={label}>Transaction hash or reference</span><input className={input} value={f.reference || ''} onChange={e => setField(s.id, 'reference', e.target.value)} placeholder="Paste the tx hash / bank reference" /></label>
            <label className="block"><span className={label}>Amount that arrived ({inbound.asset})</span><input type="number" className={input} value={f.amount ?? ''} onChange={e => setField(s.id, 'amount', e.target.value)} placeholder={`Expected ${fmt(inbound.amount)}`} /></label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className={primaryBtn} disabled={!!busy} onClick={() => run(s, 'confirm_customer_funds', { payment_provider: f.provider || undefined, payment_reference: f.reference || undefined, payment_amount: f.amount === '' || f.amount == null ? undefined : Number(f.amount) }, 'funds confirmed.')}>
              <CheckCircle2 className="w-3.5 h-3.5" /> {working('confirm_customer_funds') ? 'Saving...' : 'Confirm funds received'}
            </button>
            <span className={`text-[11px] ${muted}`}>The amount must match exactly. A short or excess payment is refused.</span>
          </div>
        </div>
      );
    }

    if (status === 'funds_confirmed') {
      return (
        <div className="space-y-3">
          <div className={subtle}><p className={`font-bold mb-1 ${strong}`}>Step: approve the payout (first admin)</p><p>Funds are confirmed. Approving does not move money yet. After you approve, a <b>different</b> admin must press "Submit transfer". This two-person rule is enforced by the system.</p></div>
          <button className={primaryBtn} disabled={!!busy} onClick={() => run(s, 'approve_crypto_transfer', {}, 'payout approved. Another admin must now submit it.')}>{working('approve_crypto_transfer') ? 'Working...' : 'Approve payout'}</button>
        </div>
      );
    }

    if (status === 'transfer_approved') {
      const bank = s.bankDetails || {};
      return (
        <div className="space-y-4">
          <div className={subtle}>
            <p className={`font-bold mb-1 ${strong}`}>Step: submit the transfer (second admin)</p>
            {channel === 'WALLET_BALANCE' && <p>This credits <b>{fmt(outbound.amount)} {outbound.asset}</b> to {s.customer?.name || 'the merchant'}'s Jasiri wallet. No bank or blockchain transfer is needed.</p>}
            {channel === 'TO_BANK' && <p>Send <b>{fmt(outbound.amount)} {outbound.asset}</b> from treasury's bank to <b>{bank.accountName}</b>, {bank.bankName}, account <span className="font-mono">{bank.accountNumber}</span>{bank.swift ? <>, SWIFT {bank.swift}</> : null} ({bank.country}). Then enter the transfer reference below and attach the bank slip.</p>}
            {channel === 'TO_EXTERNAL_WALLET' && <p>Deliver <b>{fmt(outbound.amount)} {outbound.asset}</b> on <b>{s.network}</b> to <span className="font-mono break-all">{s.destinationWallet}</span>. {['celo', 'cardano'].includes(String(s.network)) ? 'The platform sends this automatically when you submit.' : 'This network is sent manually: send it from your wallet, then paste the transaction hash below.'}</p>}
          </div>
          {selfApproved ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500"><ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /> You approved this payout, so you cannot also submit it. Ask a different admin to sign in and press Submit.</div>
          ) : (
            <>
              {demoSelf && <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500"><ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /> Demo mode: you approved this payout and may also submit it. This skips the two-person rule and is recorded in the history as DEMO MODE.</div>}
              {channel === 'TO_BANK' && <label className="block max-w-md"><span className={label}>Bank transfer reference (required)</span><input className={input} value={f.reference || ''} onChange={e => setField(s.id, 'reference', e.target.value)} /></label>}
              {channel === 'TO_EXTERNAL_WALLET' && !['celo', 'cardano'].includes(String(s.network)) && <label className="block max-w-md"><span className={label}>Blockchain transaction hash (required)</span><input className={input} value={f.txHash || ''} onChange={e => setField(s.id, 'txHash', e.target.value)} /></label>}
              <button className={primaryBtn} disabled={!!busy} onClick={() => run(s, 'submit_transfer', { payment_reference: f.reference || undefined, tx_hash: f.txHash || undefined }, channel === 'WALLET_BALANCE' ? 'wallet credited.' : 'transfer submitted.')}>
                <Check className="w-3.5 h-3.5" /> {working('submit_transfer') ? 'Working...' : channel === 'WALLET_BALANCE' ? 'Credit merchant wallet' : 'Submit transfer'}
              </button>
            </>
          )}
        </div>
      );
    }

    if (status === 'transfer_pending') {
      return (
        <div className="space-y-3">
          <div className={subtle}><p className={`font-bold mb-1 ${strong}`}>Step: confirm the merchant received it</p><p>{channel === 'WALLET_BALANCE' ? 'The wallet has been credited. Confirm to move to the final step.' : 'Check with the merchant, the bank or the explorer that the money arrived.'}</p></div>
          <button className={primaryBtn} disabled={!!busy} onClick={() => run(s, 'confirm_fiat_receipt', {}, 'receipt confirmed.')}>{working('confirm_fiat_receipt') ? 'Working...' : 'Confirm receipt'}</button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className={subtle}><p className={`font-bold mb-1 ${strong}`}>Final step: close the settlement</p><p>Reconciling releases the reserved {outbound.asset} from treasury inventory and marks the trade complete. Check the OTC Reconciliation page afterwards.</p></div>
        <button className={primaryBtn} disabled={!!busy} onClick={() => run(s, 'mark_reconciled', {}, 'settlement reconciled.')}>{working('mark_reconciled') ? 'Working...' : 'Mark reconciled'}</button>
      </div>
    );
  };

  const renderCard = (s: S) => {
    const status = String(s.status || 'pending');
    const open = openId === s.id;
    const quote = s.quote || {};
    const inbound = s.legs?.crypto || {};
    const outbound = s.legs?.fiat || {};
    const channel = String(s.settlementChannel || '');
    const dest = channel === 'WALLET_BALANCE' ? 'Jasiri wallet' : channel === 'TO_BANK' ? 'Bank account' : channel === 'TO_EXTERNAL_WALLET' ? `Wallet on ${s.network}` : channel.replace(/_/g, ' ');
    const phase = PHASE[status];
    const badge = phase === 'done' ? 'bg-emerald-500/10 text-emerald-500' : phase === 'failed' ? 'bg-red-500/10 text-red-400' : phase === 'awaiting_funds' ? 'bg-amber-500/10 text-amber-500' : 'bg-sky-500/10 text-sky-400';
    const evidence: S[] = s.evidence || [];

    return (
      <div key={s.id} className={`${card} overflow-hidden`}>
        <button type="button" onClick={() => setOpenId(open ? '' : s.id)} className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className={muted}>{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${strong}`}>{s.customer?.name || 'Customer'} <span className={`font-mono text-[11px] font-normal ${muted}`}>{s.id}</span></p>
            <p className={`text-xs mt-0.5 ${muted}`}>
              Sells <b className={strong}>{fmt(inbound.amount)} {inbound.asset}</b> and receives <b className={strong}>{fmt(outbound.amount)} {outbound.asset}</b> into: {dest}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-[10px] ${muted}`}><Clock3 className="w-3 h-3 inline mr-1" />{ago(s.updatedAt || s.createdAt)}</span>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${badge}`}>{STATUS_LABEL[status] || status}</span>
          </div>
        </button>

        {open && (
          <div className={`border-t px-5 py-5 space-y-6 ${isLight ? 'border-slate-100' : 'border-[#182536]'}`}>
            {renderStepper(s)}

            {errors[s.id] && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{errors[s.id]}</div>}

            <div>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${muted}`}>What to do now</p>
              {renderAction(s)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className={subtle}>
                <p className={`font-bold mb-2 ${strong}`}>The trade</p>
                <div className="space-y-1">
                  <p>Merchant sends: <b>{fmt(inbound.amount)} {inbound.asset}</b> <span className={muted}>({inbound.status})</span></p>
                  <p>Merchant receives: <b>{fmt(outbound.amount)} {outbound.asset}</b> <span className={muted}>({outbound.status})</span></p>
                  <p>Market rate: {quote.market_rate ? fmt(quote.market_rate, 4) : 'n/a'} · margin {quote.spread_bps != null ? `${quote.spread_bps} bps` : 'n/a'}</p>
                  <p>Rate given: <b>{quote.execution_rate ? fmt(quote.execution_rate, 4) : 'n/a'}</b></p>
                  {quote.expected_pnl != null && <p>Jasiri margin: <b className="text-emerald-500">{fmt(quote.expected_pnl)} {outbound.asset}</b></p>}
                  {quote.priceSource && <p className={muted}>Priced from: {quote.priceSource === 'cbk' ? 'CBK' : quote.priceSource === 'live' ? 'Live market' : 'Rate book'}</p>}
                </div>
              </div>

              <div className={subtle}>
                <p className={`font-bold mb-2 ${strong}`}>What was recorded</p>
                <div className="space-y-1">
                  <p>Funds confirmed: {s.paymentEvidence?.confirmedAt ? <b>yes, {ago(s.paymentEvidence.confirmedAt)}</b> : <b>not yet</b>}</p>
                  <p>Provider: {s.paymentEvidence?.provider || <span className={muted}>not recorded</span>}</p>
                  <p className="break-all">Reference: {s.paymentEvidence?.reference || <span className={muted}>not recorded</span>}</p>
                  <p>Amount received: {s.paymentEvidence?.amount ?? <span className={muted}>not recorded</span>}</p>
                  {s.blockchain?.txHash && <p className="break-all">On-chain TX: {s.blockchain.txHash}</p>}
                </div>
              </div>

              <div className={subtle}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`font-bold ${strong}`}>Proof & documents</p>
                  <>
                    <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" id={`up-${s.id}`} onChange={e => { attach(s, e.target.files?.[0]); e.target.value = ''; }} />
                    <label htmlFor={`up-${s.id}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 cursor-pointer"><Paperclip className="w-3 h-3" /> {busy === `${s.id}:upload` ? 'Uploading...' : 'Attach file'}</label>
                  </>
                </div>
                {evidence.length === 0 ? <p className={muted}>No files yet. Attach a bank slip, explorer screenshot or exchange receipt. Files save immediately.</p> : (
                  <ul className="space-y-1.5">
                    {evidence.map(ev => (
                      <li key={ev.id}>
                        <button type="button" onClick={() => viewEvidence(s, ev)} className="flex items-center gap-2 text-left hover:text-emerald-500">
                          {ev.mime === 'application/pdf' ? <FileText className="w-3.5 h-3.5 shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">{ev.filename}</span>
                          <span className={`text-[10px] shrink-0 ${muted}`}>{ev.uploadedBy} · {ago(ev.uploadedAt)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${muted}`}>History</p>
              {(s.audit || []).length === 0 ? <p className={`text-xs ${muted}`}>No actions yet.</p> : (
                <ol className="space-y-1.5 text-xs">
                  {s.audit.map((e: S, i: number) => (
                    <li key={i} className={isLight ? 'text-slate-600' : 'text-gray-400'}>
                      <span className="text-emerald-500 font-semibold">{String(e.action).replace(/_/g, ' ')}</span> by {e.performedBy || 'unknown'} <span className={muted}>· {e.performedAt ? new Date(e.performedAt).toLocaleString() : ''}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {!TERMINAL.includes(status) && (
              <div className={`pt-4 border-t flex flex-wrap items-center gap-3 ${isLight ? 'border-slate-100' : 'border-[#182536]'}`}>
                <span className={`text-[11px] ${muted}`}>Something wrong?</span>
                {status === 'treasury_review' && (
                  <button className="text-[11px] font-bold text-amber-500 hover:text-amber-400" disabled={!!busy} onClick={() => window.confirm('Release the reserved inventory and cancel this settlement?') && run(s, 'release_reservation', {}, 'reservation released.')}>Release reservation</button>
                )}
                {!(String(s.settlementChannel) === 'WALLET_BALANCE' && ['transfer_pending', 'fiat_confirmed', 'crypto_confirmed'].includes(status)) && (
                  <button className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300" disabled={!!busy} onClick={() => window.confirm('Mark this settlement as failed? This cannot be undone.') && run(s, 'fail_settlement', {}, 'marked as failed.')}><X className="w-3 h-3" /> Fail settlement</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto p-3 sm:p-5 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className={`text-xl font-semibold ${strong}`}>Treasury Settlements</h1>
          <p className={`mt-1 text-xs max-w-2xl ${muted}`}>Each settlement moves through six steps. Open one to see exactly what to do next, enter the details, and attach proof. Nothing is saved until you press the action button, and files save the moment you attach them.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 text-[11px] ${muted}`}><Radio className="w-3 h-3 text-emerald-500 animate-pulse" /> Live · refreshes every 10s{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString()}` : ''}</span>
          <button onClick={() => load()} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border ${isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#111827] border-[#1E2533] text-gray-300'}`}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(([name, value, hint, color]) => (
          <div key={name} className={`${card} p-4`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>{name}</p>
            <p className={`text-3xl font-bold font-mono mt-1 ${color}`}>{value}</p>
            <p className={`text-[10.5px] mt-1 ${muted}`}>{hint}</p>
          </div>
        ))}
      </div>

      {listError && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">{listError}</div>}
      {notice && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">{notice}</div>}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([key, name]) => (
          <button key={key} onClick={() => setFilter(key)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${filter === key ? 'bg-emerald-600 text-white' : isLight ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-[#111827] border border-[#1E2533] text-gray-400 hover:text-white'}`}>
            {name} <span className="opacity-70">({counts[key] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center"><RefreshCw className="mx-auto h-5 w-5 animate-spin text-emerald-400" /></div>
        ) : visible.length === 0 ? (
          <div className={`${card} p-12 text-center text-xs ${muted}`}>
            {filter === 'active' ? <><Wallet className="w-6 h-6 mx-auto mb-2 opacity-50" />Nothing needs action right now.</> : 'No settlements in this view.'}
          </div>
        ) : visible.map(renderCard)}
      </div>

      <p className={`text-[11px] flex items-center gap-1.5 ${muted}`}><Landmark className="w-3 h-3" /><Link2 className="w-3 h-3" /> Money legs: "sends" is what the merchant pays in. "receives" is what treasury delivers.</p>
    </div>
  );
};

export default TreasurySettlementsPage;
