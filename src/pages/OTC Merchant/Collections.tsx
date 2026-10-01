import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, ArrowDownToLine, ArrowRight, Search, Filter, Plus, X, Landmark, Link2, Clock3, Smartphone, Coins,
} from 'lucide-react';
import { listOtcCollections, listOtcCollectionRequests, createOtcCollectionRequest, listOtcFundingRequests } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { WALLET_CATALOGUE } from '../../utils/walletCatalogue';

interface Collection {
  id: string;
  asset: string;
  amount: number;
  source: string;
  status: string;
  createdAt: string;
  relatedRfqId?: string;
  relatedSettlementId?: string;
}

type CollectionMethod = 'mobile_money' | 'crypto' | 'virtual_card' | 'virtual_account' | 'payment_link';
interface CollectionRequest {
  id: string; currency: string; method: CollectionMethod; status: string; createdAt: string; details?: string;
}

const METHOD_LABELS: Record<string, string> = {
  mobile_money: 'Mobile Money', crypto: 'Crypto (Web3)', virtual_card: 'Virtual Card', virtual_account: 'Virtual Account', payment_link: 'Payment Link',
};

function VirtualCardLogo({ className = 'w-10 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 28" className={className} aria-label="Virtual card">
      <defs>
        <linearGradient id="vcg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10b981" /><stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="26" rx="4" fill="url(#vcg)" />
      <rect x="5" y="7" width="8" height="6" rx="1.5" fill="#fde68a" opacity="0.95" />
      <rect x="5" y="19" width="14" height="2" rx="1" fill="#ffffff" opacity="0.7" />
      <circle cx="30" cy="20" r="3.2" fill="#ffffff" opacity="0.55" />
      <circle cx="26.5" cy="20" r="3.2" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}

function RequestCollectionModal({ isLight, onClose, onCreated }: { isLight: boolean; onClose: () => void; onCreated: (r: CollectionRequest) => void }) {
  const [currency, setCurrency] = useState('KES');
  const [method, setMethod] = useState<'mobile_money' | 'crypto' | 'virtual_card'>('mobile_money');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSaving(true); setError('');
    try {
      const res = await createOtcCollectionRequest({ currency, method });
      onCreated(res.data.request);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not submit request.');
    } finally { setSaving(false); }
  };

  const inputClass = `w-full rounded-lg px-3.5 py-2.5 text-sm outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-[#0A0D14] border-[#1E2D3D] text-white focus:border-emerald-500'}`;
  const iconCls = (on: boolean) => `w-5 h-5 ${on ? 'text-emerald-500' : isLight ? 'text-slate-400' : 'text-gray-500'}`;

  const options: { id: CollectionMethod; label: string; desc: string; enabled: boolean; icon: React.ReactNode }[] = [
    { id: 'mobile_money', label: 'Mobile Money', desc: 'Collect from M-Pesa, MTN, Airtel and more', enabled: true, icon: <Smartphone className={iconCls(method === 'mobile_money')} /> },
    { id: 'crypto', label: 'Crypto (Web3)', desc: 'USDT, USDC, cUSD on Celo', enabled: true, icon: <Coins className={iconCls(method === 'crypto')} /> },
    { id: 'virtual_card', label: 'Virtual Card', desc: 'Collect card payments', enabled: true, icon: <VirtualCardLogo /> },
    { id: 'virtual_account', label: 'Virtual Account', desc: 'Dedicated bank account number', enabled: false, icon: <Landmark className={iconCls(false)} /> },
    { id: 'payment_link', label: 'Payment Link', desc: 'Shareable pay-by-link checkout', enabled: false, icon: <Link2 className={iconCls(false)} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-md rounded-2xl border p-5 my-8 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Request a collection method</h2>
          <button onClick={onClose} className={isLight ? 'text-slate-400' : 'text-gray-500'}><X className="w-4 h-4" /></button>
        </div>
        <p className={`text-xs mb-4 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Treasury sets this up manually and confirms once it's live.</p>

        <label className="block mb-4">
          <span className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Currency</span>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputClass}>
            <optgroup label="Stablecoins">
              {WALLET_CATALOGUE.filter(w => w.crypto).map(w => <option key={w.code} value={w.code}>{w.code} - {w.name}</option>)}
            </optgroup>
            <optgroup label="Fiat">
              {WALLET_CATALOGUE.filter(w => !w.crypto).map(w => <option key={w.code} value={w.code}>{w.code} - {w.name}</option>)}
            </optgroup>
          </select>
        </label>

        <span className={`block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Method</span>
        <div className="space-y-2 mb-4">
          {options.map(o => (
            <button
              key={o.id}
              type="button"
              disabled={!o.enabled}
              onClick={() => o.enabled && setMethod(o.id as typeof method)}
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                !o.enabled ? `opacity-55 cursor-not-allowed ${isLight ? 'border-slate-200 bg-slate-50' : 'border-[#1E2D3D] bg-white/[0.02]'}`
                  : method === o.id ? 'border-emerald-500 bg-emerald-500/10' : isLight ? 'border-slate-200 hover:border-emerald-300' : 'border-[#1E2D3D] hover:border-emerald-500/40'
              }`}
            >
              <span className="w-10 flex items-center justify-center shrink-0">{o.icon}</span>
              <span className="flex-1 min-w-0">
                <span className={`block text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{o.label}</span>
                <span className={`block text-[10.5px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{o.desc}</span>
              </span>
              {!o.enabled && <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 shrink-0">Coming soon</span>}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <button onClick={submit} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg">
          {saving ? 'Submitting...' : 'Submit request'}
        </button>
      </div>
    </div>
  );
}

export default function OtcCollections() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [entries, setEntries] = useState<Collection[]>([]);
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [tab, setTab] = useState<'history' | 'funding' | 'methods'>('history');
  const [funding, setFunding] = useState<{ id: string; currency: string; amount: number; status: string; createdAt: string }[]>([]);
  const gridStripe = (i: number) =>
    i % 2 === 0 ? (isLight ? 'bg-emerald-50/70' : 'bg-emerald-500/[0.06]') : (isLight ? 'bg-orange-50/60' : 'bg-orange-500/[0.05]');

  const load = () => {
    Promise.all([listOtcCollections(), listOtcCollectionRequests(), listOtcFundingRequests()])
      .then(([cRes, rRes, fRes]) => {
        setEntries(cRes.data.collections || []);
        setRequests(rRes.data.requests || []);
        setFunding(fRes.data.requests || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const cardClass = `rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`;

  const assets = [...new Set(entries.map(e => e.asset))];
  const filtered = entries.filter(e => {
    if (assetFilter !== 'all' && e.asset !== assetFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.id.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        e.relatedSettlementId?.toLowerCase().includes(q) ||
        e.relatedRfqId?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);
  const thisMonth = filtered.filter(e => {
    const d = new Date(e.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className={`text-xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Collections</h1>
          <p className={`text-xs mt-1 max-w-lg ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
            Money that's come into your desk balance — the inbound leg of a settled conversion, or a deposit treasury has confirmed.
          </p>
        </div>
        <button onClick={() => setShowRequestModal(true)} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg w-fit shrink-0">
          <Plus className="w-3.5 h-3.5" /> Request Collection Method
        </button>
      </div>

      <div className={`inline-flex gap-1 p-1 rounded-xl border ${cardClass}`}>
        {([['history', 'Collection History'], ['funding', 'Top-up History'], ['methods', `Collection Methods (${requests.length})`]] as const).map(([t, text]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t ? 'bg-emerald-600 text-white' : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:bg-white/5'}`}>{text}</button>
        ))}
      </div>

      {tab === 'methods' && (
        <div className={`${cardClass} overflow-hidden`}>
          {requests.length === 0 ? (
            <div className={`p-12 text-center text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
              <Landmark className="w-7 h-7 mx-auto mb-3 opacity-50" />
              <p className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>No collection methods yet</p>
              <p className="mt-1">Request a virtual account or payment link to start receiving payments.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-emerald-600 text-white text-[10.5px] font-bold uppercase tracking-wider">
                    <th className="px-5 py-3">Date Requested</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Currency</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">How to use it</th><th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r, i) => (
                    <tr key={r.id} className={gridStripe(i)}>
                      <td className={`px-5 py-3 text-xs ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                          {r.method === 'virtual_card' ? <VirtualCardLogo className="w-6 h-4" /> : r.method === 'mobile_money' ? <Smartphone className="w-3.5 h-3.5 text-emerald-500" /> : r.method === 'crypto' ? <Coins className="w-3.5 h-3.5 text-emerald-500" /> : <Landmark className="w-3.5 h-3.5 text-emerald-500" />}
                          {METHOD_LABELS[r.method] || r.method}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs font-mono ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{r.currency}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{r.id}</td>
                      <td className={`px-4 py-3 text-xs max-w-[260px] ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{r.details || <span className={isLight ? 'text-slate-400' : 'text-gray-500'}>Treasury is setting this up</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${r.status === 'provisioned' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          <Clock3 className="w-3 h-3" /> {r.status === 'provisioned' ? 'Live' : r.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'funding' && (
        <div className={`${cardClass} overflow-hidden`}>
          {funding.length === 0 ? (
            <div className={`p-12 text-center text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
              <ArrowDownToLine className="w-7 h-7 mx-auto mb-3 opacity-50" />
              <p className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>No top-ups yet</p>
              <p className="mt-1">Use Fund Balance on the Wallet Balances page to request a top-up.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-emerald-600 text-white text-[10.5px] font-bold uppercase tracking-wider">
                    <th className="px-5 py-3">Date Requested</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Currency</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {funding.map((f, i) => (
                    <tr key={f.id} className={gridStripe(i)}>
                      <td className={`px-5 py-3 text-xs ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{new Date(f.createdAt).toLocaleString()}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{f.id}</td>
                      <td className={`px-4 py-3 text-xs font-mono ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{f.currency}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold text-emerald-500">+{Number(f.amount).toLocaleString()} {f.currency}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${f.status === 'credited' ? 'bg-emerald-500/10 text-emerald-500' : f.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-500'}`}>{f.status === 'pending' ? 'Pending review' : f.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (<>
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`${cardClass} p-4`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Total Collected</p>
          <p className={`text-lg font-bold font-mono mt-1 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>+{totalAmount.toLocaleString()}</p>
        </div>
        <div className={`${cardClass} p-4`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>This Month</p>
          <p className={`text-lg font-bold font-mono mt-1 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>+{thisMonth.toLocaleString()}</p>
        </div>
        <div className={`${cardClass} p-4`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Total Entries</p>
          <p className={`text-lg font-bold font-mono mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{filtered.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-slate-400' : 'text-gray-500'}`} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by reference, settlement, or source..."
            className={`w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none transition-colors border ${isLight
              ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
              : 'bg-[#0A0D14] border-[#1E2D3D] text-white placeholder:text-slate-600 focus:border-emerald-500'}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-gray-500'}`} />
          <select
            value={assetFilter}
            onChange={e => setAssetFilter(e.target.value)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold border outline-none ${isLight
              ? 'bg-white border-slate-200 text-slate-700'
              : 'bg-[#0A0D14] border-[#1E2D3D] text-gray-300'}`}
          >
            <option value="all">All Assets</option>
            {assets.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      <div className={`${cardClass} overflow-hidden`}>
        {isLoading ? (
          <div className="p-10 text-center"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className={`p-10 text-center text-xs flex flex-col items-center gap-3 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
            <ArrowDownToLine className="w-6 h-6 opacity-50" />
            <p>{search || assetFilter !== 'all' ? 'No collections match your filters.' : 'No collections yet — these appear automatically once a conversion you accept settles.'}</p>
            {!search && assetFilter === 'all' && (
              <button onClick={() => navigate('/otc/request')} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-400">
                Start a conversion <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[820px]">
              <thead>
                <tr className="bg-emerald-600 text-white text-[10.5px] font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Date Initiated</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Transaction Ref</th>
                  <th className="px-4 py-3">Settlement Ref</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr
                    key={e.id}
                    className={`${i % 2 === 0 ? (isLight ? 'bg-emerald-50/70' : 'bg-emerald-500/[0.06]') : (isLight ? 'bg-orange-50/60' : 'bg-orange-500/[0.05]')} transition-colors ${e.relatedSettlementId ? 'cursor-pointer' : ''} ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}
                    onClick={() => e.relatedSettlementId && navigate(`/otc/settlements`)}
                  >
                    <td className={`px-5 py-3 text-xs ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{new Date(e.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium capitalize ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                        <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" />
                        {String(e.source).replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{e.id}</td>
                    <td className="px-4 py-3">
                      {e.relatedSettlementId ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                          {e.relatedSettlementId}
                        </span>
                      ) : <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold text-emerald-500">
                      +{Number(e.amount).toLocaleString()} {e.asset}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">{e.status || 'Completed'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.relatedSettlementId && <span className="text-[10.5px] font-bold uppercase text-emerald-500">View details</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results count */}
      {!isLoading && filtered.length > 0 && (
        <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
          Showing {filtered.length} of {entries.length} collections
        </p>
      )}
      </>)}

      {showRequestModal && (
        <RequestCollectionModal isLight={isLight} onClose={() => setShowRequestModal(false)} onCreated={r => setRequests(prev => [r, ...prev])} />
      )}
    </div>
  );
}
