import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, Wallet, Repeat, HandCoins,
  Clock3, ArrowRight, LifeBuoy, TrendingUp,
  ArrowUpRight, ArrowDownRight, Zap, BarChart3, Activity,
} from 'lucide-react';
import {
  getOtcWallet, getOtcRates, listOtcRfqs, listOtcSettlements, listOtcTransactions, acceptOtcRfq,
} from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { useInstitutional } from '../../contexts/InstitutionalContext';
import useOtcLiveEvent from '../../hooks/useOtcLiveEvent';
import { SETTLEMENT_LABELS, TERMINAL_SETTLEMENT_STATUSES, settlementProgressPct } from '../../utils/settlementStatus';
import { badgeFor } from '../../utils/assetBadge';

// --- Types ----------------------------------------------------------------

interface AssetBalance { available: number; locked: number }
interface RateRow { pair: string; fromAsset: string; toAsset: string; rate: number }
interface Rfq {
  id: string; fromAsset: string; toAsset: string; amount: number; status: string; updatedAt?: string;
  quote?: { execution_rate?: number; receive_amount?: number; expiresAt?: string; sent?: boolean; quotedBy?: string; sentAt?: string };
}
interface Settlement { id: string; rfqId: string; status: string; updatedAt?: string; createdAt?: string }
interface LedgerEntry { id: string; direction: 'in' | 'out'; asset: string; amount: number; source: string; status: string; createdAt: string }

const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const countdown = (iso?: string, now = Date.now()) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const estimateUsdtValue = (assetRows: [string, AssetBalance][], rates: RateRow[]) => {
  let total = 0;
  let covered = 0;
  const held = assetRows.filter(([, b]) => (b.available + b.locked) > 0);
  for (const [asset, b] of held) {
    const amount = b.available + b.locked;
    if (asset === 'USDT' || asset === 'USDC') { total += amount; covered++; continue; }
    const direct = rates.find(r => r.fromAsset === asset && r.toAsset === 'USDT');
    if (direct && direct.rate > 0) { total += amount * direct.rate; covered++; continue; }
    const inverse = rates.find(r => r.fromAsset === 'USDT' && r.toAsset === asset);
    if (inverse && inverse.rate > 0) { total += amount / inverse.rate; covered++; continue; }
  }
  return { total, covered, totalHeld: held.length };
};

export default function OtcDashboard() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { profile } = useInstitutional();

  const [balances, setBalances] = useState<Record<string, AssetBalance>>({});
  const [rates, setRates] = useState<RateRow[]>([]);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [activity, setActivity] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [ratesAsOf, setRatesAsOf] = useState<string | null>(null);
  const [ratesUnavailable, setRatesUnavailable] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(() => {
    Promise.all([getOtcWallet(), getOtcRates(), listOtcRfqs(), listOtcSettlements(), listOtcTransactions(20)])
      .then(([walletRes, ratesRes, rfqRes, settlementRes, txRes]) => {
        setBalances(walletRes.data.balances || {});
        setRates(ratesRes.data.rates || []);
        setRatesAsOf(ratesRes.data.updatedAt || null);
        setRatesUnavailable(Boolean(ratesRes.data.unavailable));
        setRfqs(rfqRes.data.rfqs || []);
        setSettlements(settlementRes.data.settlements || []);
        setActivity(txRes.data.transactions || []);
        setLastSynced(new Date());
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 20000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [load]);

  useOtcLiveEvent((msg) => {
    if (msg?.category === 'settlement') load();
  });

  const assetRows = Object.entries(balances).filter(([k]) => k !== 'updatedAt') as [string, AssetBalance][];
  const openQuotes = rfqs.filter(r => r.status === 'quoted' && r.quote?.sent && countdown(r.quote?.expiresAt, now));
  const activeSettlements = settlements.filter(s => !TERMINAL_SETTLEMENT_STATUSES.has(s.status));
  const completedSettlements = settlements.filter(s => TERMINAL_SETTLEMENT_STATUSES.has(s.status));
  const businessName = profile?.legalName || profile?.businessName || '';
  const { total: estValue, covered, totalHeld } = estimateUsdtValue(assetRows, rates);

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try { await acceptOtcRfq(id); load(); } catch { /* surfaced via next poll */ }
    finally { setAcceptingId(null); }
  };

  const cardClass = `rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={`text-xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Welcome back{businessName ? `, ${businessName}` : ''}
            </h1>
            
              
        
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
            Here's how your OTC desk is performing{lastSynced ? ` · synced ${timeAgo(lastSynced.toISOString())}` : ''}.
          </p>
        </div>
        <a href="https://wa.me/254714073826" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold w-fit ${isLight ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-[#111827] border border-[#1E2533] text-gray-300 hover:bg-[#1A2533]'}`}>
          <LifeBuoy className="w-3.5 h-3.5" /> Contact Support
        </a>
      </div>

      {isLoading ? (
        <div className="p-16 text-center"><RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              isLight={isLight}
              icon={<Wallet className="w-4 h-4" />}
              label="Estimated Balance"
              value={totalHeld === 0 ? '—' : `≈ ${estValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`}
              sub={totalHeld === 0 ? 'No balances yet' : `${covered} of ${totalHeld} assets priced`}
              accent="emerald"
            />
            <KpiCard
              isLight={isLight}
              icon={<HandCoins className="w-4 h-4" />}
              label="Active Settlements"
              value={String(activeSettlements.length)}
              sub={activeSettlements.length === 0 ? 'Nothing in flight' : 'In progress'}
              accent="blue"
            />
            <KpiCard
              isLight={isLight}
              icon={<Clock3 className="w-4 h-4" />}
              label="Open Quotes"
              value={String(openQuotes.length)}
              sub={openQuotes.length === 0 ? 'No pending quotes' : 'Awaiting your decision'}
              accent="amber"
            />
            <KpiCard
              isLight={isLight}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Completed"
              value={String(completedSettlements.length)}
              sub="Total settlements"
              accent="purple"
            />
          </div>

          {/* Quick Trade + Market Rates */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick Trade */}
            <div className={`rounded-2xl border p-5 ${isLight ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200' : 'bg-gradient-to-br from-[#0A1F17] to-[#0F1520] border-emerald-500/20'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Quick Trade</h3>
                  <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Get a live quote in seconds</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className={`rounded-lg p-3 ${isLight ? 'bg-white/80 border border-slate-200' : 'bg-[#0A0D14]/60 border-[#1E2D3D]'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>You Sell</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>KES</span>
                    <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Kenyan Shilling</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isLight ? 'bg-slate-100' : 'bg-[#1E2D3D]'}`}>
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <div className={`rounded-lg p-3 ${isLight ? 'bg-white/80 border border-slate-200' : 'bg-[#0A0D14]/60 border-[#1E2D3D]'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>You Receive</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>USDA</span>
                    <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Cardano USD</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/otc/request')}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                >
                  <Repeat className="w-4 h-4" /> Start New Conversion
                </button>
              </div>
            </div>

            {/* Market Rates */}
            <div className={`${cardClass} lg:col-span-2 overflow-hidden`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>Indicative Market Rates</span>
                </div>
                <span className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Rate as of {ratesAsOf ? timeAgo(ratesAsOf) : '—'}</span>
              </div>
              {ratesUnavailable && (
                <p className={`px-4 py-6 text-xs text-center ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Market rates are temporarily unavailable. Request a conversion and your dealer will quote the live rate.</p>
              )}
              {!ratesUnavailable && (
                <p className={`px-4 py-2 text-[10.5px] border-b ${isLight ? 'text-slate-400 border-slate-100' : 'text-gray-500 border-[#1E2D3D]'}`}>Indicative only. Your dealer sets the final rate in your quote.</p>
              )}
              <div className={`grid gap-px ${rates.length <= 2 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} bg-slate-100 dark:bg-[#1E2D3D]/60`}>
                {rates.slice(0, 8).map((rate, idx) => {
                  const isLast = idx === rates.slice(0, 8).length - 1;
                  const oddCount = rates.slice(0, 8).length % 2 !== 0;
                  return (
                    <div key={rate.pair} className={`p-4 ${isLight ? 'bg-white' : 'bg-[#0F1520]'} ${isLast && oddCount ? 'sm:col-span-2' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{rate.pair}</span>
                        <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>1 {rate.fromAsset}</span>
                      </div>
                      <p className={`text-lg font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {rate.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </p>
                      <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>per {rate.fromAsset}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Asset Balances */}
          {assetRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className={`text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                  <Wallet className="w-3 h-3" /> Asset Balances
                </h2>
                <button onClick={() => navigate('/otc/wallet')} className="text-[10px] font-bold uppercase text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {assetRows.slice(0, 4).map(([asset, b]) => {
                  const badge = badgeFor(asset);
                  const ledgerTotal = (b.available || 0) + (b.locked || 0);
                  return (
                    <div key={asset} className={`${cardClass} p-4`}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0" style={{ background: badge.bg, color: badge.text }}>{asset.slice(0, 1)}</span>
                        <span className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{asset}</span>
                      </div>
                      <p className={`text-base font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{Number(b.available || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>available</p>
                      <div className={`flex items-center justify-between mt-2.5 pt-2.5 border-t text-[10px] ${isLight ? 'border-slate-100 text-slate-400' : 'border-[#1E2D3D] text-gray-500'}`}>
                        <span>Ledger <span className={isLight ? 'text-slate-600' : 'text-gray-300'}>{ledgerTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
                        <span>Locked <span className={isLight ? 'text-slate-600' : 'text-gray-300'}>{Number(b.locked || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Quotes + Settlements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className={`${cardClass} overflow-hidden`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
                <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>Active Quotes</span>
                <span className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{openQuotes.length} open</span>
              </div>
              {openQuotes.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Clock3 className={`w-8 h-8 mx-auto mb-2 ${isLight ? 'text-slate-300' : 'text-gray-600'}`} />
                  <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No open quotes right now.</p>
                  <button onClick={() => navigate('/otc/request')} className="mt-3 text-xs font-bold text-emerald-500 hover:text-emerald-400">
                    Request a quote →
                  </button>
                </div>
              ) : openQuotes.map(rfq => (
                <div key={rfq.id} className={`px-4 py-3 flex items-center justify-between gap-3 border-b last:border-0 ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
                  <div>
                    <p className={`text-[13px] font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{rfq.fromAsset} → {rfq.toAsset}</p>
                    <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{Number(rfq.amount).toLocaleString()} {rfq.fromAsset} @ {rfq.quote?.execution_rate}</p>
                    {rfq.quote?.quotedBy && (
                      <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Quoted by {rfq.quote.quotedBy}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-[10.5px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2 py-1 rounded-full">
                      <Clock3 className="w-3 h-3" /> {countdown(rfq.quote?.expiresAt, now)}
                    </span>
                    <button onClick={() => handleAccept(rfq.id)} disabled={acceptingId === rfq.id} className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold">
                      {acceptingId === rfq.id ? '...' : 'Accept'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className={`${cardClass} overflow-hidden`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
                <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>Settlements in Progress</span>
                <span className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{activeSettlements.length} active</span>
              </div>
              {activeSettlements.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <HandCoins className={`w-8 h-8 mx-auto mb-2 ${isLight ? 'text-slate-300' : 'text-gray-600'}`} />
                  <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Nothing in flight.</p>
                </div>
              ) : activeSettlements.map(s => {
                const pct = settlementProgressPct(s.status);
                return (
                  <div key={s.id} className={`px-4 py-3 border-b last:border-0 ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[11px] font-bold font-mono ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{s.id}</span>
                      <span className="text-[10.5px] font-bold text-emerald-500">{SETTLEMENT_LABELS[s.status] || s.status}</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-[#1E2D3D]'}`}>
                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                <TrendingUp className="w-3 h-3" /> Recent Activity
              </h2>
              <button onClick={() => navigate('/otc/transactions')} className="text-[10px] font-bold uppercase text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className={`${cardClass} overflow-hidden`}>
              {activity.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Activity className={`w-8 h-8 mx-auto mb-2 ${isLight ? 'text-slate-300' : 'text-gray-600'}`} />
                  <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No activity yet.</p>
                </div>
              ) : activity.slice(0, 10).map(entry => (
                <div key={entry.id} className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${entry.direction === 'in' ? 'bg-emerald-500/10' : 'bg-slate-500/10'}`}>
                    {entry.direction === 'in' ? <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowUpRight className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{String(entry.source).replace(/_/g, ' ')}</p>
                    <p className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{timeAgo(entry.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[13px] font-bold font-mono ${entry.direction === 'in' ? 'text-emerald-500' : isLight ? 'text-slate-800' : 'text-gray-200'}`}>
                      {entry.direction === 'in' ? '+' : '-'}{Number(entry.amount).toLocaleString()} {entry.asset}
                    </p>
                    <p className={`text-[10px] uppercase ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{entry.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- KPI Card Component -----------------------------------------------------

function KpiCard({ isLight, icon, label, value, sub, accent }: {
  isLight: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: 'emerald' | 'blue' | 'amber' | 'purple';
}) {
  const accentMap = {
    emerald: isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-400',
    blue: isLight ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/10 text-blue-400',
    amber: isLight ? 'bg-amber-50 text-amber-600' : 'bg-amber-500/10 text-amber-400',
    purple: isLight ? 'bg-purple-50 text-purple-600' : 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className={`rounded-xl border p-4 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{label}</span>
      </div>
      <p className={`text-lg font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{value}</p>
      <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{sub}</p>
    </div>
  );
}
