import { useEffect, useState } from 'react';
import { RefreshCw, HandCoins, ChevronDown, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { listOtcSettlements } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { SETTLEMENT_LABELS, TERMINAL_SETTLEMENT_STATUSES, settlementProgressPct } from '../../utils/settlementStatus';

interface Quote { market_rate?: number; execution_rate?: number; spread_bps?: number; quotedBy?: string }
interface Settlement {
  id: string; rfqId: string; status: string; updatedAt?: string; createdAt?: string;
  fromAsset?: string; toAsset?: string; amount?: number; quote?: Quote;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  reconciled: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  pending: { icon: Clock3, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  treasury_review: { icon: Clock3, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  funds_confirmed: { icon: Clock3, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  transfer_approved: { icon: Clock3, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  transfer_pending: { icon: Clock3, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  fiat_confirmed: { icon: Clock3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  crypto_confirmed: { icon: Clock3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

export default function OtcSettlements() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    listOtcSettlements()
      .then(res => setSettlements(res.data.settlements || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const cardClass = `rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`;

  const filtered = settlements.filter(s => {
    if (filter === 'active') return !TERMINAL_SETTLEMENT_STATUSES.has(s.status);
    if (filter === 'completed') return TERMINAL_SETTLEMENT_STATUSES.has(s.status);
    return true;
  });

  const activeCount = settlements.filter(s => !TERMINAL_SETTLEMENT_STATUSES.has(s.status)).length;
  const completedCount = settlements.filter(s => TERMINAL_SETTLEMENT_STATUSES.has(s.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className={`text-xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Settlements</h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Treasury execution status for your accepted conversions.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-emerald-600 text-white'
                : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#1E2D3D] text-gray-400 hover:bg-[#2A3F55]'
            }`}
          >
            {f === 'all' ? `All (${settlements.length})` : f === 'active' ? `Active (${activeCount})` : `Completed (${completedCount})`}
          </button>
        ))}
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        {isLoading ? (
          <div className="p-10 text-center"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className={`p-10 text-center text-xs flex flex-col items-center gap-2 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
            <HandCoins className="w-6 h-6 opacity-50" />
            {filter === 'active' ? 'No active settlements.' : filter === 'completed' ? 'No completed settlements.' : 'No settlements yet -- accept a quote to start one.'}
          </div>
        ) : filtered.map(s => {
          const isOpen = expanded === s.id;
          const isTerminal = TERMINAL_SETTLEMENT_STATUSES.has(s.status);
          const pct = settlementProgressPct(s.status);
          const statusCfg = STATUS_CONFIG[s.status] || { icon: Clock3, color: 'text-amber-500', bg: 'bg-amber-500/10' };
          const StatusIcon = statusCfg.icon;

          return (
            <div key={s.id} className={`border-b last:border-0 ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
              <button onClick={() => setExpanded(isOpen ? '' : s.id)} className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12.5px] font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{s.id}</span>
                    {s.fromAsset && s.toAsset && (
                      <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{s.fromAsset}→{s.toAsset}</span>
                    )}
                  </div>
                  <p className={`text-[10.5px] mt-0.5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>RFQ {s.rfqId} · {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '-'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {SETTLEMENT_LABELS[s.status] || s.status}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isLight ? 'text-slate-400' : 'text-gray-500'}`} />
                </div>
              </button>

              {isOpen && (
                <div className={`px-4 pb-4 ${isLight ? 'bg-slate-50/60' : 'bg-[#0A0D14]/60'}`}>
                  {!isTerminal && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Progress</span>
                        <span className={`text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>{pct}%</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-[#1E2D3D]'}`}>
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Amount</p>
                      <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{s.amount ? Number(s.amount).toLocaleString() : 'N/A'} {s.fromAsset}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Base Rate</p>
                      <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{s.quote?.market_rate ?? 'N/A'}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Desk Margin</p>
                      <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{s.quote?.spread_bps != null ? `${s.quote.spread_bps} bps` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Execution Rate</p>
                      <p className={`text-xs font-mono mt-0.5 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{s.quote?.execution_rate ?? 'N/A'}</p>
                    </div>
                  </div>
                  {s.quote?.quotedBy && (
                    <p className={`text-[10.5px] mt-3 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Quoted by {s.quote.quotedBy}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
