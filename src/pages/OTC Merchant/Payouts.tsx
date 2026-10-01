import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, ArrowUpFromLine, ArrowRight, Search, Plus, X, Landmark, Smartphone, Trash2, Send, Users, User,
} from 'lucide-react';
import {
  getOtcWallet, listOtcPayouts, listOtcBeneficiaries, createOtcBeneficiary, deleteOtcBeneficiary,
  listOtcPayoutRequests, createOtcPayoutRequest,
} from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';

interface Payout {
  id: string; asset: string; amount: number; source: string; status: string; createdAt: string;
  relatedRfqId?: string; relatedSettlementId?: string;
}
interface Beneficiary {
  id: string; name: string; channel: 'bank' | 'mobile_money'; currency: string; beneficiaryType?: string; email?: string;
  bankName?: string; accountNumber?: string; accountName?: string; phoneNumber?: string; provider?: string; createdAt: string;
}
interface PayoutRequest {
  id: string; beneficiaryId: string; beneficiaryName: string; channel: string; currency: string; amount: number;
  purpose?: string; reference?: string; batchId?: string; status: string; createdAt: string; reviewNotes?: string;
}
type BenForm = Partial<Beneficiary>;
type Tab = 'history' | 'beneficiaries' | 'make';

const PAYOUT_CURRENCIES = ['KES', 'NGN', 'UGX', 'TZS', 'GHS', 'XAF', 'ZAR', 'USD', 'USDT', 'USDC'];
const STATUS: Record<string, { label: string; cls: string }> = {
  pending_review: { label: 'Pending review', cls: 'bg-amber-500/10 text-amber-500' },
  approved: { label: 'Approved', cls: 'bg-sky-500/10 text-sky-500' },
  rejected: { label: 'Rejected', cls: 'bg-red-500/10 text-red-400' },
  paid: { label: 'Paid', cls: 'bg-emerald-500/10 text-emerald-500' },
};

const stripe = (i: number, isLight: boolean) =>
  i % 2 === 0 ? (isLight ? 'bg-emerald-50/70' : 'bg-emerald-500/[0.06]') : (isLight ? 'bg-orange-50/60' : 'bg-orange-500/[0.05]');
const fmt = (n: number) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function BeneficiaryFields({ isLight, value, onChange, showCurrency }: { isLight: boolean; value: BenForm; onChange: (v: BenForm) => void; showCurrency?: boolean }) {
  const input = `w-full rounded-lg px-3 py-2.5 text-sm outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-[#0A0D14] border-[#1E2D3D] text-white focus:border-emerald-500'}`;
  const label = `block text-[11px] font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`;
  const req = <span className="text-red-500">*</span>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <label className="block">
        <span className={label}>Beneficiary Type {req}</span>
        <select value={value.beneficiaryType || 'individual'} onChange={e => onChange({ ...value, beneficiaryType: e.target.value })} className={input}>
          <option value="individual">Individual</option>
          <option value="business">Business</option>
        </select>
      </label>
      <label className="block">
        <span className={label}>Payment Destination {req}</span>
        <select value={value.channel || 'bank'} onChange={e => onChange({ ...value, channel: e.target.value as Beneficiary['channel'] })} className={input}>
          <option value="bank">Bank Account</option>
          <option value="mobile_money">Mobile Money</option>
        </select>
      </label>
      {showCurrency ? (
        <label className="block">
          <span className={label}>Currency {req}</span>
          <select value={value.currency || 'KES'} onChange={e => onChange({ ...value, currency: e.target.value })} className={input}>
            {PAYOUT_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      ) : <div />}
      <label className="block">
        <span className={label}>Beneficiary / Account Holder Name {req}</span>
        <input value={value.name || ''} onChange={e => onChange({ ...value, name: e.target.value, accountName: e.target.value })} className={input} />
      </label>
      <label className="block md:col-span-2">
        <span className={label}>Email</span>
        <input type="email" value={value.email || ''} onChange={e => onChange({ ...value, email: e.target.value })} className={input} />
      </label>
      {value.channel === 'mobile_money' ? (
        <>
          <label className="block">
            <span className={label}>Phone Number {req}</span>
            <input value={value.phoneNumber || ''} onChange={e => onChange({ ...value, phoneNumber: e.target.value })} className={input} placeholder="+254..." />
          </label>
          <label className="block">
            <span className={label}>Provider</span>
            <input value={value.provider || ''} onChange={e => onChange({ ...value, provider: e.target.value })} className={input} placeholder="M-Pesa, MTN, Airtel..." />
          </label>
        </>
      ) : (
        <>
          <label className="block">
            <span className={label}>Beneficiary Bank {req}</span>
            <input value={value.bankName || ''} onChange={e => onChange({ ...value, bankName: e.target.value })} className={input} placeholder="Enter Beneficiary Bank" />
          </label>
          <label className="block">
            <span className={label}>Account Number {req}</span>
            <input value={value.accountNumber || ''} onChange={e => onChange({ ...value, accountNumber: e.target.value })} className={input} />
          </label>
        </>
      )}
    </div>
  );
}

function AddBeneficiaryModal({ isLight, onClose, onCreated }: { isLight: boolean; onClose: () => void; onCreated: (b: Beneficiary) => void }) {
  const [form, setForm] = useState<BenForm>({ channel: 'bank', beneficiaryType: 'individual', currency: 'KES' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setSaving(true); setError('');
    try {
      const res = await createOtcBeneficiary(form as any);
      onCreated(res.data.beneficiary);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not save beneficiary.');
    } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-2xl rounded-2xl border p-6 my-8 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Add A New Beneficiary</h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Enter beneficiary details to continue</p>
          </div>
          <button onClick={onClose} className={isLight ? 'text-slate-400' : 'text-gray-500'}><X className="w-4 h-4" /></button>
        </div>
        <BeneficiaryFields isLight={isLight} value={form} onChange={setForm} showCurrency />
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        <button onClick={submit} disabled={saving} className="w-full mt-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg">
          {saving ? 'Saving...' : 'Save beneficiary'}
        </button>
      </div>
    </div>
  );
}

function MakePayout({ isLight, beneficiaries, balances, onBeneficiaryCreated, onSubmitted }: {
  isLight: boolean; beneficiaries: Beneficiary[]; balances: Record<string, { available: number }>;
  onBeneficiaryCreated: (b: Beneficiary) => void; onSubmitted: (rs: PayoutRequest[]) => void;
}) {
  const [mode, setMode] = useState<'one' | 'multi'>('one');
  const [currency, setCurrency] = useState('KES');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [reference, setReference] = useState('');
  const [benMode, setBenMode] = useState<'new' | 'saved'>('new');
  const [savedId, setSavedId] = useState('');
  const [newBen, setNewBen] = useState<BenForm>({ channel: 'bank', beneficiaryType: 'individual' });
  const [saveBen, setSaveBen] = useState(false);
  const [rows, setRows] = useState<{ beneficiaryId: string; amount: string; reference: string }[]>([{ beneficiaryId: '', amount: '', reference: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const available = Number(balances[currency]?.available || 0);
  const currencyBens = useMemo(() => beneficiaries.filter(b => b.currency === currency), [beneficiaries, currency]);
  const multiTotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const input = `w-full rounded-lg px-3 py-2.5 text-sm outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-[#0A0D14] border-[#1E2D3D] text-white focus:border-emerald-500'}`;
  const label = `block text-[11px] font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`;
  const panel = `rounded-xl border p-5 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`;
  const pill = (on: boolean) => `px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${on ? 'bg-emerald-600 text-white' : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:bg-white/5'}`;

  const submitOne = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError('Enter the amount to send.');
    if (!purpose.trim()) return setError('Enter the purpose of the transaction.');
    let beneficiaryId = savedId;
    if (benMode === 'new') {
      if (!newBen.name || (newBen.channel === 'mobile_money' ? !newBen.phoneNumber : !newBen.bankName || !newBen.accountNumber)) return setError('Complete the beneficiary details.');
    } else if (!beneficiaryId) return setError('Select a saved beneficiary.');
    setSaving(true); setError('');
    try {
      if (benMode === 'new') {
        const b = await createOtcBeneficiary({ ...(newBen as any), currency, saved: saveBen });
        beneficiaryId = b.data.beneficiary.id;
        if (saveBen) onBeneficiaryCreated(b.data.beneficiary);
      }
      const r = await createOtcPayoutRequest({ beneficiaryId, amount: amt, purpose, reference: reference || undefined });
      onSubmitted([r.data.request]);
      setDone('Payout request sent to treasury for review.');
      setAmount(''); setPurpose(''); setReference('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not submit payout.');
    } finally { setSaving(false); }
  };

  const submitMulti = async () => {
    const valid = rows.filter(r => r.beneficiaryId && Number(r.amount) > 0);
    if (valid.length === 0) return setError('Add at least one beneficiary with an amount.');
    if (!purpose.trim()) return setError('Enter the purpose of the transaction.');
    if (multiTotal > available) return setError(`Total ${fmt(multiTotal)} ${currency} exceeds your available balance of ${fmt(available)}.`);
    setSaving(true); setError('');
    const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
    const created: PayoutRequest[] = [];
    try {
      for (const r of valid) {
        const res = await createOtcPayoutRequest({ beneficiaryId: r.beneficiaryId, amount: Number(r.amount), purpose, reference: r.reference || undefined, batchId });
        created.push(res.data.request);
      }
      onSubmitted(created);
      setDone(`${created.length} payout request${created.length > 1 ? 's' : ''} sent to treasury as batch ${batchId}.`);
      setRows([{ beneficiaryId: '', amount: '', reference: '' }]); setPurpose('');
    } catch (err: any) {
      if (created.length) onSubmitted(created);
      setError(`${created.length} of ${valid.length} submitted. ${err?.response?.data?.detail || 'The rest failed.'}`);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className={`inline-flex gap-1 p-1 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
        <button onClick={() => { setMode('one'); setError(''); setDone(''); }} className={pill(mode === 'one')}><User className="w-3.5 h-3.5 inline mr-1.5" />One Time Payout</button>
        <button onClick={() => { setMode('multi'); setError(''); setDone(''); }} className={pill(mode === 'multi')}><Users className="w-3.5 h-3.5 inline mr-1.5" />Pay Multiple Beneficiaries</button>
      </div>

      <div className={panel}>
        <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{mode === 'one' ? 'Make A One-Time Payout' : 'Pay Multiple Beneficiaries'}</h3>
        <p className={`text-xs mb-4 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Send money locally and internationally. Treasury reviews and sends each payout.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className={label}>Currency</span>
            <select value={currency} onChange={e => { setCurrency(e.target.value); setSavedId(''); setRows([{ beneficiaryId: '', amount: '', reference: '' }]); }} className={input}>
              {PAYOUT_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {mode === 'one' && (
            <label className="block md:col-span-2">
              <span className={label}>I want to send</span>
              <input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} className={input} placeholder="Enter Amount" />
            </label>
          )}
        </div>
        <p className="text-[11px] mt-2 text-emerald-600 text-right">Available Balance - {currency} {fmt(available)}</p>
      </div>

      <div className={panel}>
        <h3 className={`text-sm font-bold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>Transaction Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block md:col-span-2">
            <span className={label}>Purpose of Transaction <span className="text-red-500">*</span></span>
            <input value={purpose} onChange={e => setPurpose(e.target.value)} className={input} placeholder="e.g Goods purchase" />
          </label>
          {mode === 'one' && (
            <label className="block">
              <span className={label}>Customer Reference</span>
              <input value={reference} onChange={e => setReference(e.target.value)} className={input} />
            </label>
          )}
        </div>
      </div>

      {mode === 'one' ? (
        <div className={panel}>
          <h3 className={`text-sm font-bold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>Beneficiary Details</h3>
          <div className={`inline-flex gap-1 p-1 rounded-xl border mb-4 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0A0D14] border-[#1E2D3D]'}`}>
            <button onClick={() => setBenMode('new')} className={pill(benMode === 'new')}>New Beneficiary</button>
            <button onClick={() => setBenMode('saved')} className={pill(benMode === 'saved')}>Saved Beneficiary</button>
          </div>
          {benMode === 'new' ? (
            <>
              <BeneficiaryFields isLight={isLight} value={newBen} onChange={setNewBen} />
              <label className={`flex items-center gap-2 mt-4 text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                <input type="checkbox" checked={saveBen} onChange={e => setSaveBen(e.target.checked)} /> Save this beneficiary
              </label>
            </>
          ) : currencyBens.length === 0 ? (
            <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No saved {currency} beneficiaries yet. Add one in the Beneficiaries tab or use New Beneficiary.</p>
          ) : (
            <select value={savedId} onChange={e => setSavedId(e.target.value)} className={input}>
              <option value="">Select a saved beneficiary</option>
              {currencyBens.map(b => <option key={b.id} value={b.id}>{b.name} - {b.channel === 'bank' ? `${b.bankName} ${b.accountNumber}` : b.phoneNumber}</option>)}
            </select>
          )}
        </div>
      ) : (
        <div className={panel}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Beneficiaries ({currency})</h3>
            <button onClick={() => setRows(r => [...r, { beneficiaryId: '', amount: '', reference: '' }])} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500"><Plus className="w-3.5 h-3.5" /> Add beneficiary</button>
          </div>
          {currencyBens.length === 0 ? (
            <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No saved {currency} beneficiaries. Add them in the Beneficiaries tab first.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
                  <label className="block">
                    {i === 0 && <span className={label}>Beneficiary</span>}
                    <select value={r.beneficiaryId} onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, beneficiaryId: e.target.value } : x))} className={input}>
                      <option value="">Select beneficiary</option>
                      {currencyBens.map(b => <option key={b.id} value={b.id}>{b.name} - {b.channel === 'bank' ? b.bankName : b.phoneNumber}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    {i === 0 && <span className={label}>Amount</span>}
                    <input type="number" min={0} value={r.amount} onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} className={input} placeholder="0.00" />
                  </label>
                  <label className="block">
                    {i === 0 && <span className={label}>Reference</span>}
                    <input value={r.reference} onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, reference: e.target.value } : x))} className={input} />
                  </label>
                  <button onClick={() => setRows(rs => rs.length > 1 ? rs.filter((_, j) => j !== i) : rs)} className="text-red-400 hover:text-red-300 pb-3"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <p className={`text-xs text-right font-mono ${multiTotal > available ? 'text-red-400' : isLight ? 'text-slate-600' : 'text-gray-300'}`}>Total: {currency} {fmt(multiTotal)}</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
      {done && <p className="text-xs text-emerald-500">{done}</p>}
      <button onClick={mode === 'one' ? submitOne : submitMulti} disabled={saving} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-8 py-2.5 rounded-lg">
        <Send className="w-4 h-4" /> {saving ? 'Submitting...' : mode === 'one' ? 'Continue' : 'Submit batch'}
      </button>
    </div>
  );
}

export default function OtcPayouts() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [tab, setTab] = useState<Tab>('history');
  const [entries, setEntries] = useState<Payout[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [balances, setBalances] = useState<Record<string, { available: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddBen, setShowAddBen] = useState(false);

  const load = () => {
    Promise.all([listOtcPayouts(), listOtcBeneficiaries(), listOtcPayoutRequests(), getOtcWallet()])
      .then(([pRes, bRes, rRes, wRes]) => {
        setEntries(pRes.data.payouts || []);
        setBeneficiaries(bRes.data.beneficiaries || []);
        setRequests(rRes.data.requests || []);
        setBalances(wRes.data.balances || {});
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };
  useEffect(() => { load(); }, []);

  const cardClass = `rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`;
  const th = 'px-4 py-3';
  const q = search.trim().toLowerCase();
  const filteredRequests = requests.filter(r => !q || r.id.toLowerCase().includes(q) || r.beneficiaryName?.toLowerCase().includes(q) || r.reference?.toLowerCase().includes(q));
  const filteredEntries = entries.filter(e => !q || e.id.toLowerCase().includes(q) || e.source.toLowerCase().includes(q) || e.relatedSettlementId?.toLowerCase().includes(q));

  const removeBeneficiary = async (id: string) => {
    if (!window.confirm('Remove this beneficiary?')) return;
    try { await deleteOtcBeneficiary(id); setBeneficiaries(prev => prev.filter(b => b.id !== id)); } catch { /* best-effort */ }
  };

  const tabBtn = (t: Tab, text: string) => (
    <button onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t ? 'bg-emerald-600 text-white' : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:bg-white/5'}`}>{text}</button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className={`text-xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Payouts</h1>
          <p className={`text-xs mt-1 max-w-lg ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Send money to beneficiaries from your settled balance, and track every outbound payment.</p>
        </div>
        {tab === 'beneficiaries' && (
          <button onClick={() => setShowAddBen(true)} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg w-fit shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add Beneficiary
          </button>
        )}
      </div>

      <div className={`inline-flex gap-1 p-1 rounded-xl border ${cardClass}`}>
        {tabBtn('history', 'History')}
        {tabBtn('beneficiaries', `Beneficiaries (${beneficiaries.length})`)}
        {tabBtn('make', 'Make Payout')}
      </div>

      {isLoading ? (
        <div className="p-10 text-center"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto" /></div>
      ) : tab === 'make' ? (
        <MakePayout
          isLight={isLight}
          beneficiaries={beneficiaries}
          balances={balances}
          onBeneficiaryCreated={b => setBeneficiaries(prev => [b, ...prev])}
          onSubmitted={rs => setRequests(prev => [...rs, ...prev])}
        />
      ) : tab === 'beneficiaries' ? (
        <div className={`${cardClass} overflow-hidden`}>
          {beneficiaries.length === 0 ? (
            <div className={`p-12 text-center ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
              <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>No Beneficiary</p>
              <p className="text-xs mt-1">Simply create a beneficiary to send funds to frequently</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[760px]">
                <thead>
                  <tr className="bg-emerald-600 text-white text-[10.5px] font-bold uppercase tracking-wider">
                    <th className={th}>Beneficiary</th><th className={th}>Type</th><th className={th}>Destination</th><th className={th}>Currency</th><th className={th}>Account / Phone</th><th className={th} />
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((b, i) => (
                    <tr key={b.id} className={stripe(i, isLight)}>
                      <td className="px-4 py-3">
                        <p className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-gray-100'}`}>{b.name}</p>
                        {b.email && <p className={`text-[10.5px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{b.email}</p>}
                      </td>
                      <td className={`px-4 py-3 text-xs capitalize ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{b.beneficiaryType || 'individual'}</td>
                      <td className={`px-4 py-3 text-xs ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
                        <span className="inline-flex items-center gap-1.5">{b.channel === 'bank' ? <Landmark className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}{b.channel === 'bank' ? b.bankName : b.provider || 'Mobile Money'}</span>
                      </td>
                      <td className={`px-4 py-3 text-xs font-mono ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{b.currency}</td>
                      <td className={`px-4 py-3 text-xs font-mono ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{b.channel === 'bank' ? b.accountNumber : b.phoneNumber}</td>
                      <td className="px-4 py-3 text-right"><button onClick={() => removeBeneficiary(b.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-slate-400' : 'text-gray-500'}`} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by reference, beneficiary or settlement..." className={`w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-[#0A0D14] border-[#1E2D3D] text-white focus:border-emerald-500'}`} />
          </div>

          <div className={`${cardClass} overflow-hidden`}>
            <div className={`px-5 py-4 border-b ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
              <p className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Payout requests</p>
            </div>
            {filteredRequests.length === 0 ? (
              <div className={`p-10 text-center text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                <ArrowUpFromLine className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No payout requests yet.
                <button onClick={() => setTab('make')} className="block mx-auto mt-2 font-bold text-emerald-500">Make a payout</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[820px]">
                  <thead>
                    <tr className="bg-emerald-600 text-white text-[10.5px] font-bold uppercase tracking-wider">
                      <th className={th}>Date Initiated</th><th className={th}>Beneficiary</th><th className={th}>Transaction Ref</th><th className={th}>Batch</th><th className={`${th} text-right`}>Amount</th><th className={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((r, i) => {
                      const st = STATUS[r.status] || { label: r.status, cls: 'bg-slate-500/10 text-slate-400' };
                      return (
                        <tr key={r.id} className={stripe(i, isLight)}>
                          <td className={`px-4 py-3 text-xs ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{new Date(r.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <p className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-gray-100'}`}>{r.beneficiaryName}</p>
                            {r.purpose && <p className={`text-[10.5px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{r.purpose}</p>}
                          </td>
                          <td className={`px-4 py-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{r.id}</td>
                          <td className={`px-4 py-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{r.batchId || '—'}</td>
                          <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${isLight ? 'text-slate-800' : 'text-gray-100'}`}>{r.currency} {fmt(r.amount)}</td>
                          <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={`${cardClass} overflow-hidden`}>
            <div className={`px-5 py-4 border-b ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
              <p className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Settlement payouts</p>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Outbound legs from conversions you accepted.</p>
            </div>
            {filteredEntries.length === 0 ? (
              <div className={`p-10 text-center text-xs flex flex-col items-center gap-3 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                <p>No settlement payouts yet — these appear once a conversion you accept fully settles.</p>
                <button onClick={() => navigate('/otc/request')} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-400">Start a conversion <ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[720px]">
                  <thead>
                    <tr className="bg-emerald-600 text-white text-[10.5px] font-bold uppercase tracking-wider">
                      <th className={th}>Date Initiated</th><th className={th}>Source</th><th className={th}>Transaction Ref</th><th className={th}>Settlement Ref</th><th className={`${th} text-right`}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((e, i) => (
                      <tr key={e.id} onClick={() => e.relatedSettlementId && navigate('/otc/settlements')} className={`${stripe(i, isLight)} ${e.relatedSettlementId ? 'cursor-pointer' : ''}`}>
                        <td className={`px-4 py-3 text-xs ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{new Date(e.createdAt).toLocaleString()}</td>
                        <td className={`px-4 py-3 text-xs capitalize ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{String(e.source).replace(/_/g, ' ')}</td>
                        <td className={`px-4 py-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{e.id}</td>
                        <td className={`px-4 py-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{e.relatedSettlementId || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-orange-500">-{Number(e.amount).toLocaleString()} {e.asset}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showAddBen && <AddBeneficiaryModal isLight={isLight} onClose={() => setShowAddBen(false)} onCreated={b => setBeneficiaries(prev => [b, ...prev])} />}
    </div>
  );
}
