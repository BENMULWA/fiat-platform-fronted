import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Plus, Send, Clock3, Search, ChevronDown, CircleDollarSign,
} from 'lucide-react';
import { getOtcWallet, listOtcFundingRequests } from '../../api/client';
import FundBalanceModal, { type FundingRequest } from '../../components/otc/FundBalanceModal';
import { WALLET_CATALOGUE } from '../../utils/walletCatalogue';
import { useTheme } from '../../contexts/ThemeContext';

interface AssetBalance { available: number; locked: number; ledger?: number; rollingReserve?: number }

const PALETTE: Record<string, { dark: string; light: string; text: string }> = {
  emerald: { dark: 'from-emerald-500/10 via-[#0B0E14] to-[#0B0E14] border-emerald-500/30 hover:border-emerald-500/60', light: 'from-emerald-50 via-white to-white border-emerald-200 hover:border-emerald-300', text: 'text-emerald-500' },
  blue: { dark: 'from-blue-500/10 via-[#0B0E14] to-[#0B0E14] border-blue-500/30 hover:border-blue-500/60', light: 'from-blue-50 via-white to-white border-blue-200 hover:border-blue-300', text: 'text-blue-500' },
  indigo: { dark: 'from-indigo-500/10 via-[#0B0E14] to-[#0B0E14] border-indigo-500/30 hover:border-indigo-500/60', light: 'from-indigo-50 via-white to-white border-indigo-200 hover:border-indigo-300', text: 'text-indigo-500' },
  amber: { dark: 'from-amber-500/10 via-[#0B0E14] to-[#0B0E14] border-amber-500/30 hover:border-amber-500/60', light: 'from-amber-50 via-white to-white border-amber-200 hover:border-amber-300', text: 'text-amber-500' },
  green: { dark: 'from-green-500/10 via-[#0B0E14] to-[#0B0E14] border-green-500/30 hover:border-green-500/60', light: 'from-green-50 via-white to-white border-green-200 hover:border-green-300', text: 'text-green-500' },
  yellow: { dark: 'from-yellow-500/10 via-[#0B0E14] to-[#0B0E14] border-yellow-500/30 hover:border-yellow-500/60', light: 'from-yellow-50 via-white to-white border-yellow-200 hover:border-yellow-300', text: 'text-yellow-500' },
  sky: { dark: 'from-sky-500/10 via-[#0B0E14] to-[#0B0E14] border-sky-500/30 hover:border-sky-500/60', light: 'from-sky-50 via-white to-white border-sky-200 hover:border-sky-300', text: 'text-sky-500' },
  teal: { dark: 'from-teal-500/10 via-[#0B0E14] to-[#0B0E14] border-teal-500/30 hover:border-teal-500/60', light: 'from-teal-50 via-white to-white border-teal-200 hover:border-teal-300', text: 'text-teal-500' },
  pink: { dark: 'from-pink-500/10 via-[#0B0E14] to-[#0B0E14] border-pink-500/30 hover:border-pink-500/60', light: 'from-pink-50 via-white to-white border-pink-200 hover:border-pink-300', text: 'text-pink-500' },
  fuchsia: { dark: 'from-fuchsia-500/10 via-[#0B0E14] to-[#0B0E14] border-fuchsia-500/30 hover:border-fuchsia-500/60', light: 'from-fuchsia-50 via-white to-white border-fuchsia-200 hover:border-fuchsia-300', text: 'text-fuchsia-500' },
  cyan: { dark: 'from-cyan-500/10 via-[#0B0E14] to-[#0B0E14] border-cyan-500/30 hover:border-cyan-500/60', light: 'from-cyan-50 via-white to-white border-cyan-200 hover:border-cyan-300', text: 'text-cyan-500' },
  rose: { dark: 'from-rose-500/10 via-[#0B0E14] to-[#0B0E14] border-rose-500/30 hover:border-rose-500/60', light: 'from-rose-50 via-white to-white border-rose-200 hover:border-rose-300', text: 'text-rose-500' },
  purple: { dark: 'from-purple-500/10 via-[#0B0E14] to-[#0B0E14] border-purple-500/30 hover:border-purple-500/60', light: 'from-purple-50 via-white to-white border-purple-200 hover:border-purple-300', text: 'text-purple-500' },
  orange: { dark: 'from-orange-500/10 via-[#0B0E14] to-[#0B0E14] border-orange-500/30 hover:border-orange-500/60', light: 'from-orange-50 via-white to-white border-orange-200 hover:border-orange-300', text: 'text-orange-500' },
};
const ASSET_COLOR: Record<string, string> = {
  KES: 'emerald', USDT: 'blue', USDC: 'indigo', USDA: 'amber', cUSD: 'green', USD: 'sky',
  UGX: 'yellow', TZS: 'teal', RWF: 'cyan', BIF: 'rose', XAF: 'purple', XOF: 'orange',
  NGN: 'green', GHS: 'yellow', ZAR: 'teal', ETB: 'fuchsia', MWK: 'rose', ZMW: 'emerald',
  EUR: 'indigo', GBP: 'pink', CNY: 'rose', CNH: 'orange', CNGN: 'cyan',
};
const FALLBACK_COLORS = ['sky', 'purple', 'teal', 'pink'];
const INITIAL_VISIBLE = 8;

function AssetIcon({ code, iso, isLight, crypto, tint }: { code: string; iso?: string; isLight: boolean; crypto?: boolean; tint: string }) {
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner overflow-hidden p-2 border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520]/80 border-[#1E2533]'}`}>
      {iso
        ? <img src={`https://flagcdn.com/w40/${iso}.png`} alt={`${code} flag`} className="w-8 h-6 object-cover rounded shadow" />
        : crypto
          ? <CircleDollarSign className={`w-6 h-6 ${tint}`} />
          : <span className={`text-xs font-extrabold ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{code.slice(0, 2)}</span>}
    </div>
  );
}

const FUNDING_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending review', cls: 'bg-amber-500/10 text-amber-500' },
  approved: { label: 'Approved', cls: 'bg-sky-500/10 text-sky-500' },
  rejected: { label: 'Rejected', cls: 'bg-red-500/10 text-red-400' },
  credited: { label: 'Credited', cls: 'bg-emerald-500/10 text-emerald-500' },
};

const empty: AssetBalance = { available: 0, locked: 0 };

export default function OtcWalletBalances() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [balances, setBalances] = useState<Record<string, AssetBalance>>({});
  const [fundingRequests, setFundingRequests] = useState<FundingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundCurrency, setFundCurrency] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<'all' | 'held' | 'fiat' | 'crypto'>('all');
  const [sortBy, setSortBy] = useState<'held' | 'balance' | 'name'>('held');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

  const load = () => {
    Promise.all([getOtcWallet(), listOtcFundingRequests()])
      .then(([res, fRes]) => {
        setBalances(res.data.balances || {});
        setFundingRequests(fRes.data.requests || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const catalogueCodes = new Set(WALLET_CATALOGUE.map(w => w.code));
  const extra = Object.keys(balances).filter(k => k !== 'updatedAt' && !catalogueCodes.has(k) && !catalogueCodes.has(k.replace(/^CUSD$/, 'cUSD'))).map(code => ({ code, name: code, iso: undefined as string | undefined, crypto: false }));
  const allRows = [...WALLET_CATALOGUE, ...extra].map(w => ({ ...w, bal: balances[w.code] || balances[w.code.toUpperCase()] || empty }));
  const q = search.trim().toLowerCase();
  const filteredRows = allRows
    .filter(w => (kind === 'all' ? true : kind === 'held' ? (w.bal.available || 0) > 0 || (w.bal.locked || 0) > 0 : kind === 'crypto' ? !!w.crypto : !w.crypto))
    .filter(w => !q || w.code.toLowerCase().includes(q) || w.name.toLowerCase().includes(q))
    .sort((x, y) => sortBy === 'name' ? x.code.localeCompare(y.code)
      : sortBy === 'balance' ? (y.bal.available || 0) - (x.bal.available || 0)
      : Number((y.bal.available || 0) > 0) - Number((x.bal.available || 0) > 0));
  const filtering = q !== '' || kind !== 'all';
  const assetRows = showAll || filtering ? filteredRows : filteredRows.slice(0, INITIAL_VISIBLE);
  const cardClass = `rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`;

  const selectedBalance = selectedCurrency ? (balances[selectedCurrency] || balances[selectedCurrency.toUpperCase()] || empty) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className={`text-xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Wallet Balances</h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Multi-currency balances held with the desk. Fund your balance, then make payouts to beneficiaries.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFundCurrency(null); setShowFundModal(true); }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${isLight ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-[#111827] border border-[#1E2533] text-gray-300 hover:bg-[#1A2533]'}`}
          >
            <Plus className="w-3.5 h-3.5" /> Fund Balance
          </button>
          <button
            onClick={() => navigate('/otc/payouts')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> Make Payout
          </button>
        </div>
      </div>

      {fundingRequests.length > 0 && (
        <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
          <div className={`px-4 py-3 border-b ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
            <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>Funding requests</span>
          </div>
          {fundingRequests.map(r => {
            const status = FUNDING_STATUS_LABELS[r.status] || { label: r.status, cls: 'bg-slate-500/10 text-slate-400' };
            return (
              <div key={r.id} className={`flex items-center justify-between px-4 py-3 border-b last:border-0 ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
                <div>
                  <p className={`text-[13px] font-medium ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{r.currency} {Number(r.amount).toLocaleString()}</p>
                  <p className={`text-[10.5px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status.cls}`}>
                  <Clock3 className="w-2.5 h-2.5" /> {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="p-10 text-center"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto" /></div>
      ) : (
        <>
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
              <h2 className={`text-sm font-bold uppercase tracking-wide ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                {showAll || filtering ? 'All wallets' : 'Your wallets'} <span className="font-normal normal-case opacity-70">({filteredRows.length})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search currency" className={`rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none border w-40 ${isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-[#0A0D14] border-[#1E2D3D] text-white focus:border-emerald-500'}`} />
                </div>
                <select value={kind} onChange={e => setKind(e.target.value as typeof kind)} className={`rounded-lg px-2.5 py-1.5 text-xs border outline-none ${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#0A0D14] border-[#1E2D3D] text-gray-300'}`}>
                  <option value="all">All types</option>
                  <option value="held">Funded only</option>
                  <option value="fiat">Fiat</option>
                  <option value="crypto">Stablecoins / crypto</option>
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className={`rounded-lg px-2.5 py-1.5 text-xs border outline-none ${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#0A0D14] border-[#1E2D3D] text-gray-300'}`}>
                  <option value="held">Sort: funded first</option>
                  <option value="balance">Sort: highest balance</option>
                  <option value="name">Sort: A to Z</option>
                </select>
                {!filtering && filteredRows.length > INITIAL_VISIBLE && (
                  <button onClick={() => setShowAll(v => !v)} className="flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-400">
                    {showAll ? 'View less' : `View all ${filteredRows.length}`}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {assetRows.length === 0 ? (
              <div className={`${cardClass} p-10 text-center text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No wallets match your filters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {assetRows.map(({ code, name, iso, crypto, bal }) => {
                  const held = (bal.available || 0) > 0 || (bal.locked || 0) > 0;
                  const accent = PALETTE[ASSET_COLOR[code] || FALLBACK_COLORS[code.charCodeAt(0) % FALLBACK_COLORS.length]];
                  const ledgerTotal = bal.ledger ?? ((bal.available || 0) + (bal.locked || 0));
                  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: crypto ? 4 : 2 });
                  return (
                    <div
                      key={code}
                      onClick={() => setSelectedCurrency(code)}
                      className={`relative rounded-2xl p-6 transition-all duration-300 border cursor-pointer group hover:-translate-y-0.5 bg-gradient-to-br ${isLight ? accent.light : accent.dark} ${held ? 'shadow-xl' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <AssetIcon code={code} iso={iso} isLight={isLight} crypto={crypto} tint={accent.text} />
                        <span className={`text-xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${isLight ? 'text-slate-900 bg-white border-slate-200' : 'text-white bg-[#0F1520] border-[#1E2533]'}`}>{code}</span>
                      </div>
                      <p className={`text-xs font-semibold tracking-wide mb-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{name}</p>
                      <p className={`text-3xl font-extrabold font-mono tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{fmt(bal.available || 0)}</p>
                      <div className={`mt-3 pt-3 border-t text-[10.5px] font-mono space-y-1 ${isLight ? 'border-slate-200 text-slate-500' : 'border-[#1E2533] text-gray-500'}`}>
                        <div className="flex justify-between"><span>Ledger</span><span>{fmt(ledgerTotal)}</span></div>
                        <div className="flex justify-between"><span>Locked</span><span>{fmt(bal.locked || 0)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Currency Detail Modal */}
          {selectedCurrency && selectedBalance && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedCurrency(null)} />
              <div className={`relative w-full max-w-lg rounded-2xl border p-6 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedCurrency}</span>
                    <h2 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedCurrency} Balance</h2>
                  </div>
                  <button onClick={() => setSelectedCurrency(null)} className={`p-1 rounded ${isLight ? 'hover:bg-slate-100' : 'hover:bg-[#1E2D3D]'}`}>
                    <span className={`text-lg ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>✕</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className={`rounded-lg p-3 ${isLight ? 'bg-slate-50' : 'bg-[#0A0D14]'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Available</p>
                    <p className={`text-lg font-bold font-mono mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{(selectedBalance.available || 0).toLocaleString()}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${isLight ? 'bg-slate-50' : 'bg-[#0A0D14]'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Locked</p>
                    <p className={`text-lg font-bold font-mono mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{(selectedBalance.locked || 0).toLocaleString()}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${isLight ? 'bg-slate-50' : 'bg-[#0A0D14]'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Ledger</p>
                    <p className={`text-lg font-bold font-mono mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{(selectedBalance.ledger ?? 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setFundCurrency(selectedCurrency); setSelectedCurrency(null); setShowFundModal(true); }}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold ${isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-[#1E2D3D] text-gray-300 hover:bg-[#2A3F55]'}`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Fund
                  </button>
                  <button
                    onClick={() => { setSelectedCurrency(null); navigate('/otc/payouts'); }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Send className="w-3.5 h-3.5" /> Payout
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Balances list */}
          <div className={`${cardClass} overflow-hidden`}>
            <div className={`px-5 py-4 border-b ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
              <p className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>List of my balances</p>
              <p className={`text-[14px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Follows the search, type and sort filters above.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[760px]">
                <thead>
                  <tr className="bg-emerald-600 h-6 text-white text-[12px] font-bold uppercase tracking-wider">
                    <th className="px-5 py-3">Currency</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Available Balance</th>
                    <th className="px-4 py-3 text-right">Locked Balance</th>
                    <th className="px-4 py-3 text-right">Ledger Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ code, name, iso, crypto, bal }, i) => {
                    const held = (bal.available || 0) > 0 || (bal.locked || 0) > 0;
                    const accent = PALETTE[ASSET_COLOR[code] || FALLBACK_COLORS[code.charCodeAt(0) % FALLBACK_COLORS.length]];
                    const ledgerTotal = bal.ledger ?? ((bal.available || 0) + (bal.locked || 0));
                    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: crypto ? 4 : 2 });
                    const stripe = i % 2 === 0 ? (isLight ? 'bg-emerald-50/70' : 'bg-emerald-500/[0.06]') : (isLight ? 'bg-orange-50/60' : 'bg-orange-500/[0.05]');
                    return (
                      <tr key={code} onClick={() => setSelectedCurrency(code)} className={`${stripe} cursor-pointer transition-colors ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {iso
                              ? <img src={`https://flagcdn.com/w40/${iso}.png`} alt={code} className="w-6 h-6 rounded-full object-cover border border-black/10" />
                              : <CircleDollarSign className={`w-6 h-6 ${accent.text}`} />}
                            <div>
                              <p className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-gray-100'}`}>{code}</p>
                              <p className={`text-[10.5px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{name}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{crypto ? 'Stablecoin' : 'Fiat'}</td>
                        <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-gray-100'}`}>{code} {fmt(bal.available || 0)}</td>
                        <td className={`px-4 py-3 text-right font-mono text-xs ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{code} {fmt(bal.locked || 0)}</td>
                        <td className={`px-4 py-3 text-right font-mono text-xs ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{code} {fmt(ledgerTotal)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${held ? 'bg-emerald-500/10 text-emerald-500' : isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-gray-500'}`}>{held ? 'Funded' : 'Empty'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[10.5px] font-bold uppercase text-emerald-500">View details</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showFundModal && (
        <FundBalanceModal
          isLight={isLight}
          initialCurrency={fundCurrency || undefined}
          onClose={() => setShowFundModal(false)}
          onCreated={r => setFundingRequests(prev => [r, ...prev])}
        />
      )}
    </div>
  );
}
