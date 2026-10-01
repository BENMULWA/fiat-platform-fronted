import { useEffect, useState } from 'react';
import { RefreshCw, Inbox, X, CheckCircle2, Ban, Send, Wallet, Landmark, ArrowUpFromLine } from 'lucide-react';
import {
  listOtcFundingRequestsAdmin, actOnOtcFundingRequest,
  listOtcCollectionRequestsAdmin, actOnOtcCollectionRequest,
  listOtcPayoutRequestsAdmin, actOnOtcPayoutRequest,
} from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';

type Tab = 'funding' | 'payouts' | 'collections';
type Row = Record<string, any>;
interface Dialog { kind: 'credit' | 'reject-funding' | 'mark_paid' | 'reject-payout' | 'provision' | 'reject-collection'; row: Row }

const STATUS_CLS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500', pending_review: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-sky-500/10 text-sky-500', credited: 'bg-emerald-500/10 text-emerald-500',
  paid: 'bg-emerald-500/10 text-emerald-500', provisioned: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-400',
};
const fmt = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OtcRequests() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [tab, setTab] = useState<Tab>('funding');
  const [funding, setFunding] = useState<Row[]>([]);
  const [payouts, setPayouts] = useState<Row[]>([]);
  const [collections, setCollections] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = () => {
    Promise.all([listOtcFundingRequestsAdmin(), listOtcPayoutRequestsAdmin(), listOtcCollectionRequestsAdmin()])
      .then(([f, p, c]) => { setFunding(f.data.requests || []); setPayouts(p.data.requests || []); setCollections(c.data.requests || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const isPending = (tabName: Tab, r: Row) => tabName === 'payouts' ? ['pending_review', 'approved'].includes(r.status) : r.status === 'pending';
  const counts = {
    funding: funding.filter(r => isPending('funding', r)).length,
    payouts: payouts.filter(r => isPending('payouts', r)).length,
    collections: collections.filter(r => isPending('collections', r)).length,
  };
  const rows = (tab === 'funding' ? funding : tab === 'payouts' ? payouts : collections).filter(r => !pendingOnly || isPending(tab, r));

  const open = (kind: Dialog['kind'], row: Row) => {
    setDialog({ kind, row }); setError('');
    setField1(kind === 'credit' ? String(row.amount ?? '') : ''); setField2('');
  };

  const submit = async () => {
    if (!dialog) return;
    setBusy(true); setError('');
    try {
      const { kind, row } = dialog;
      if (kind === 'credit') await actOnOtcFundingRequest(row.id, { action: 'credit', amount: Number(field1), reference: field2 || undefined });
      else if (kind === 'reject-funding') await actOnOtcFundingRequest(row.id, { action: 'reject', notes: field1 || undefined });
      else if (kind === 'mark_paid') await actOnOtcPayoutRequest(row.id, 'mark_paid', { reference: field1 || undefined });
      else if (kind === 'reject-payout') await actOnOtcPayoutRequest(row.id, 'reject', { notes: field1 || undefined });
      else if (kind === 'provision') await actOnOtcCollectionRequest(row.id, { action: 'provision', details: field1 });
      else await actOnOtcCollectionRequest(row.id, { action: 'reject' });
      setDialog(null);
      setToast('Done. The merchant has been notified.');
      setTimeout(() => setToast(''), 3500);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Action failed.');
    } finally { setBusy(false); }
  };

  const card = `rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`;
  const strong = isLight ? 'text-slate-900' : 'text-white';
  const muted = isLight ? 'text-slate-500' : 'text-gray-500';
  const input = `w-full rounded-lg px-3 py-2.5 text-sm outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-[#0A0D14] border-[#1E2D3D] text-white focus:border-emerald-500'}`;
  const stripe = (i: number) => i % 2 === 0 ? (isLight ? 'bg-emerald-50/70' : 'bg-emerald-500/[0.06]') : (isLight ? 'bg-orange-50/60' : 'bg-orange-500/[0.05]');
  const th = 'px-4 py-3';
  const btn = (cls: string) => `inline-flex items-center gap-1 text-[10.5px] font-bold uppercase px-2.5 py-1.5 rounded-lg ${cls}`;
  const when = (r: Row) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '—';

  const tabBtn = (t: Tab, label: string, Icon: typeof Wallet) => (
    <button onClick={() => setTab(t)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t ? 'bg-emerald-600 text-white' : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:bg-white/5'}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
      {counts[t] > 0 && <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center ${tab === t ? 'bg-white/25 text-white' : 'bg-amber-500 text-white'}`}>{counts[t]}</span>}
    </button>
  );

  const dialogTitle: Record<Dialog['kind'], string> = {
    credit: 'Confirm funds received and credit wallet', 'reject-funding': 'Reject funding request', mark_paid: 'Mark payout as sent',
    'reject-payout': 'Reject payout request', provision: 'Provision collection method', 'reject-collection': 'Reject collection request',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className={`text-xl font-semibold ${strong}`}>Merchant Requests</h1>
          <p className={`text-xs mt-1 max-w-xl ${muted}`}>Treasury desk for institutional merchants: confirm incoming funds, release payouts to beneficiaries, and set up collection methods.</p>
        </div>
        <label className={`inline-flex items-center gap-2 text-xs ${muted}`}>
          <input type="checkbox" checked={pendingOnly} onChange={e => setPendingOnly(e.target.checked)} /> Only needs action
        </label>
      </div>

      <div className={`inline-flex gap-1 p-1 rounded-xl border ${card}`}>
        {tabBtn('funding', 'Funding', Wallet)}
        {tabBtn('payouts', 'Payouts', ArrowUpFromLine)}
        {tabBtn('collections', 'Collection methods', Landmark)}
      </div>

      {toast && <p className="text-xs text-emerald-500">{toast}</p>}

      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="p-10 text-center"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto" /></div>
        ) : rows.length === 0 ? (
          <div className={`p-12 text-center text-xs ${muted}`}>
            <Inbox className="w-7 h-7 mx-auto mb-3 opacity-50" />
            {pendingOnly ? 'Nothing waiting on treasury.' : 'No requests yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[900px]">
              <thead>
                <tr className="bg-emerald-600 text-white text-[10.5px] font-bold uppercase tracking-wider">
                  <th className={th}>Date</th><th className={th}>Merchant</th>
                  {tab === 'funding' && <><th className={th}>Method</th><th className={th}>Pay-in details</th><th className={`${th} text-right`}>Amount</th></>}
                  {tab === 'payouts' && <><th className={th}>Beneficiary</th><th className={th}>Destination</th><th className={`${th} text-right`}>Amount</th></>}
                  {tab === 'collections' && <><th className={th}>Method</th><th className={th}>Currency</th><th className={th}>Details given</th></>}
                  <th className={th}>Status</th><th className={th} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={stripe(i)}>
                    <td className={`px-4 py-3 text-xs ${muted}`}>{when(r)}<p className="font-mono text-[10px]">{r.id}</p></td>
                    <td className={`px-4 py-3 text-xs font-bold ${strong}`}>{r.merchantName}</td>

                    {tab === 'funding' && <>
                      <td className={`px-4 py-3 text-xs capitalize ${muted}`}>{String(r.method || 'bank_transfer').replace('_', ' ')}</td>
                      <td className={`px-4 py-3 text-xs ${muted}`}>{r.method === 'mobile_money' ? `${r.provider || ''} ${r.phoneNumber || ''} (${r.country || ''})` : 'Bank wire (reference to be agreed)'}</td>
                      <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${strong}`}>{r.currency} {fmt(r.creditedAmount ?? r.amount)}</td>
                    </>}
                    {tab === 'payouts' && <>
                      <td className={`px-4 py-3 text-xs ${strong}`}>{r.beneficiaryName}{r.purpose && <p className={`text-[10.5px] ${muted}`}>{r.purpose}</p>}</td>
                      <td className={`px-4 py-3 text-xs ${muted}`}>
                        {r.beneficiary?.bankName ? `${r.beneficiary.bankName} - ${r.beneficiary.accountNumber}` : r.beneficiary?.phoneNumber ? `${r.beneficiary.provider || 'Mobile money'} ${r.beneficiary.phoneNumber}` : String(r.channel || '').replace('_', ' ')}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${strong}`}>{r.currency} {fmt(r.amount)}</td>
                    </>}
                    {tab === 'collections' && <>
                      <td className={`px-4 py-3 text-xs capitalize ${muted}`}>{String(r.method).replace('_', ' ')}</td>
                      <td className={`px-4 py-3 text-xs font-mono ${muted}`}>{r.currency}</td>
                      <td className={`px-4 py-3 text-xs ${muted}`}>{r.details || '—'}</td>
                    </>}

                    <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_CLS[r.status] || 'bg-slate-500/10 text-slate-400'}`}>{String(r.status).replace('_', ' ')}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {tab === 'funding' && r.status === 'pending' && <>
                          <button onClick={() => open('credit', r)} className={btn('bg-emerald-600 text-white hover:bg-emerald-500')}><CheckCircle2 className="w-3 h-3" /> Confirm &amp; credit</button>
                          <button onClick={() => open('reject-funding', r)} className={btn('text-red-400 hover:bg-red-500/10')}><Ban className="w-3 h-3" /> Reject</button>
                        </>}
                        {tab === 'payouts' && r.status === 'pending_review' && <>
                          <button onClick={() => actOnOtcPayoutRequest(r.id, 'approve').then(() => { setToast('Approved. The merchant has been notified.'); load(); }).catch((e: any) => setToast(e?.response?.data?.detail || 'Failed'))} className={btn('bg-emerald-600 text-white hover:bg-emerald-500')}><CheckCircle2 className="w-3 h-3" /> Approve</button>
                          <button onClick={() => open('reject-payout', r)} className={btn('text-red-400 hover:bg-red-500/10')}><Ban className="w-3 h-3" /> Reject</button>
                        </>}
                        {tab === 'payouts' && r.status === 'approved' && (
                          <button onClick={() => open('mark_paid', r)} className={btn('bg-sky-600 text-white hover:bg-sky-500')}><Send className="w-3 h-3" /> Mark sent</button>
                        )}
                        {tab === 'collections' && r.status === 'pending' && <>
                          <button onClick={() => open('provision', r)} className={btn('bg-emerald-600 text-white hover:bg-emerald-500')}><CheckCircle2 className="w-3 h-3" /> Provision</button>
                          <button onClick={() => open('reject-collection', r)} className={btn('text-red-400 hover:bg-red-500/10')}><Ban className="w-3 h-3" /> Reject</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDialog(null)}>
          <div onClick={e => e.stopPropagation()} className={`w-full max-w-md rounded-2xl border p-5 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
            <div className="flex items-center justify-between mb-1">
              <h2 className={`text-sm font-bold ${strong}`}>{dialogTitle[dialog.kind]}</h2>
              <button onClick={() => setDialog(null)} className={muted}><X className="w-4 h-4" /></button>
            </div>
            <p className={`text-xs mb-4 ${muted}`}>{dialog.row.merchantName} &middot; {dialog.row.currency} {fmt(dialog.row.amount)}</p>

            {dialog.kind === 'credit' && <>
              <label className="block mb-3">
                <span className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>Amount actually received ({dialog.row.currency})</span>
                <input type="number" value={field1} onChange={e => setField1(e.target.value)} className={input} />
              </label>
              <label className="block mb-3">
                <span className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>Payment reference (M-Pesa code, bank ref)</span>
                <input value={field2} onChange={e => setField2(e.target.value)} className={input} />
              </label>
              <p className={`text-[11px] mb-3 ${muted}`}>This adds the amount to the merchant's available balance immediately. Only confirm after you have seen the money land.</p>
            </>}
            {dialog.kind === 'mark_paid' && <>
              <label className="block mb-3">
                <span className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>Payment reference</span>
                <input value={field1} onChange={e => setField1(e.target.value)} className={input} placeholder="Bank / mobile money reference" />
              </label>
              <p className={`text-[11px] mb-3 ${muted}`}>Confirms you have sent the money to the beneficiary. The amount is deducted from the merchant's balance.</p>
            </>}
            {(dialog.kind === 'reject-funding' || dialog.kind === 'reject-payout') && (
              <label className="block mb-3">
                <span className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>Reason shown to the merchant</span>
                <input value={field1} onChange={e => setField1(e.target.value)} className={input} />
              </label>
            )}
            {dialog.kind === 'provision' && (
              <label className="block mb-3">
                <span className={`block text-[11px] font-semibold mb-1.5 ${muted}`}>Details for the merchant (account, paybill, instructions)</span>
                <textarea value={field1} onChange={e => setField1(e.target.value)} rows={4} className={input} placeholder="e.g. Paybill 123456, Account: SMARTCYBER" />
              </label>
            )}
            {dialog.kind === 'reject-collection' && <p className={`text-xs mb-3 ${muted}`}>The merchant will be told this request was not approved.</p>}

            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <button onClick={submit} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg">
              {busy ? 'Working...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
