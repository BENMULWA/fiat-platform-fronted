import { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, History, Search, ArrowDownRight, ArrowUpRight, Download, ArrowDownToLine, ArrowUpFromLine, Layers,
} from 'lucide-react';
import { listOtcTransactions } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';

interface Transaction {
  id: string;
  direction: 'in' | 'out';
  asset: string;
  amount: number;
  source: string;
  status: string;
  createdAt: string;
}

type Period = 7 | 30 | 90 | 0;
const PERIODS: { value: Period; label: string }[] = [
  { value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }, { value: 0, label: 'All time' },
];
const PAGE_SIZE = 15;
const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export default function OtcTransactionsHistory() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'in' | 'out'>('all');
  const [period, setPeriod] = useState<Period>(30);
  const [currency, setCurrency] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    listOtcTransactions(500)
      .then(res => setEntries(res.data.transactions || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const cardClass = `rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`;
  const muted = isLight ? 'text-slate-400' : 'text-gray-500';
  const strong = isLight ? 'text-slate-900' : 'text-white';

  const inPeriod = useMemo(() => {
    if (!period) return entries;
    const cutoff = Date.now() - period * 86400000;
    return entries.filter(e => new Date(e.createdAt).getTime() >= cutoff);
  }, [entries, period]);

  const currencies = useMemo(() => {
    const counts: Record<string, number> = {};
    inPeriod.forEach(e => { counts[e.asset] = (counts[e.asset] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [inPeriod]);
  const activeCurrency = currencies.includes(currency) ? currency : currencies[0] || '';

  const perCurrency = useMemo(() => {
    const m: Record<string, { in: number; out: number; count: number }> = {};
    inPeriod.forEach(e => {
      const row = (m[e.asset] ||= { in: 0, out: 0, count: 0 });
      row[e.direction] += Number(e.amount) || 0;
      row.count += 1;
    });
    return Object.entries(m).sort((a, b) => b[1].count - a[1].count);
  }, [inPeriod]);

  const bySource = useMemo(() => {
    const m: Record<string, number> = {};
    inPeriod.forEach(e => { const k = String(e.source).replace(/_/g, ' '); m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [inPeriod]);

  const chart = useMemo(() => {
    const days = period === 0 ? 30 : Math.min(period, 30);
    const buckets: { key: string; label: string; in: number; out: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      buckets.push({ key: dayKey(d), label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), in: 0, out: 0 });
    }
    inPeriod.filter(e => e.asset === activeCurrency).forEach(e => {
      const b = buckets.find(x => x.key === dayKey(new Date(e.createdAt)));
      if (b) b[e.direction] += Number(e.amount) || 0;
    });
    const max = Math.max(1, ...buckets.map(b => Math.max(b.in, b.out)));
    return { buckets, max };
  }, [inPeriod, activeCurrency, period]);

  const inCount = inPeriod.filter(e => e.direction === 'in').length;
  const outCount = inPeriod.filter(e => e.direction === 'out').length;
  const cur = perCurrency.find(([c]) => c === activeCurrency)?.[1] || { in: 0, out: 0, count: 0 };

  const filtered = inPeriod.filter(e => {
    if (directionFilter !== 'all' && e.direction !== directionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.id.toLowerCase().includes(q) || e.source.toLowerCase().includes(q) || e.asset.toLowerCase().includes(q);
    }
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((Math.min(page, pageCount) - 1) * PAGE_SIZE, Math.min(page, pageCount) * PAGE_SIZE);

  const exportCsv = () => {
    const headers = ['Reference', 'Type', 'Source', 'Amount', 'Asset', 'Status', 'Date'];
    const rows = filtered.map(e => [e.id, e.direction === 'in' ? 'Collection' : 'Payout', e.source, e.amount.toString(), e.asset, e.status, new Date(e.createdAt).toLocaleString()]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `jasiri-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const th = 'px-4 py-3';
  const stripe = (i: number) => i % 2 === 0 ? (isLight ? 'bg-emerald-50/70' : 'bg-emerald-500/[0.06]') : (isLight ? 'bg-orange-50/60' : 'bg-orange-500/[0.05]');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className={`text-xl font-semibold ${strong}`}>Transactions History</h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Every movement on your institutional wallet -- collections and payouts combined.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`inline-flex gap-1 p-1 rounded-xl border ${cardClass}`}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => { setPeriod(p.value); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${period === p.value ? 'bg-emerald-600 text-white' : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:bg-white/5'}`}>{p.label}</button>
            ))}
          </div>
          <button onClick={exportCsv} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold ${isLight ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-[#111827] border border-[#1E2533] text-gray-300 hover:bg-[#1A2533]'}`}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-10 text-center"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto" /></div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`${cardClass} p-4 bg-gradient-to-br ${isLight ? 'from-slate-50 via-white to-white' : 'from-sky-500/10 via-[#0B0E14] to-[#0B0E14]'}`}>
              <Layers className="w-4 h-4 text-sky-500 mb-2" />
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>Total Transactions</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${strong}`}>{inPeriod.length}</p>
            </div>
            <div className={`${cardClass} p-4 bg-gradient-to-br ${isLight ? 'from-emerald-50 via-white to-white' : 'from-emerald-500/10 via-[#0B0E14] to-[#0B0E14]'}`}>
              <ArrowDownToLine className="w-4 h-4 text-emerald-500 mb-2" />
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>Collections</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${strong}`}>{inCount}</p>
            </div>
            <div className={`${cardClass} p-4 bg-gradient-to-br ${isLight ? 'from-orange-50 via-white to-white' : 'from-orange-500/10 via-[#0B0E14] to-[#0B0E14]'}`}>
              <ArrowUpFromLine className="w-4 h-4 text-orange-500 mb-2" />
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>Payouts</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${strong}`}>{outCount}</p>
            </div>
            <div className={`${cardClass} p-4 bg-gradient-to-br ${isLight ? 'from-indigo-50 via-white to-white' : 'from-indigo-500/10 via-[#0B0E14] to-[#0B0E14]'}`}>
              <History className="w-4 h-4 text-indigo-500 mb-2" />
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>Currencies Used</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${strong}`}>{currencies.length}</p>
            </div>
          </div>

          {inPeriod.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Cash flow chart */}
              <div className={`${cardClass} p-5 lg:col-span-2`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className={`text-sm font-bold ${strong}`}>Cash flow</p>
                    <p className={`text-[11px] ${muted}`}>Daily collections vs payouts in one currency (amounts across currencies aren't added together).</p>
                  </div>
                  <select value={activeCurrency} onChange={e => setCurrency(e.target.value)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border outline-none ${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#0A0D14] border-[#1E2D3D] text-gray-300'}`}>
                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div><p className={`text-[10px] uppercase font-semibold ${muted}`}>In</p><p className="text-sm font-bold font-mono text-emerald-500">+{fmt(cur.in)}</p></div>
                  <div><p className={`text-[10px] uppercase font-semibold ${muted}`}>Out</p><p className="text-sm font-bold font-mono text-orange-500">-{fmt(cur.out)}</p></div>
                  <div><p className={`text-[10px] uppercase font-semibold ${muted}`}>Net</p><p className={`text-sm font-bold font-mono ${strong}`}>{fmt(cur.in - cur.out)}</p></div>
                </div>
                <div className="flex items-end gap-[3px] h-32">
                  {chart.buckets.map(b => (
                    <div key={b.key} className="flex-1 flex items-end justify-center gap-px h-full group relative" title={`${b.label}: +${fmt(b.in)} / -${fmt(b.out)} ${activeCurrency}`}>
                      <div className="w-1/2 rounded-t bg-emerald-500/80 min-h-[2px]" style={{ height: `${Math.max(b.in ? (b.in / chart.max) * 100 : 0, b.in ? 3 : 1)}%`, opacity: b.in ? 1 : 0.15 }} />
                      <div className="w-1/2 rounded-t bg-orange-500/80 min-h-[2px]" style={{ height: `${Math.max(b.out ? (b.out / chart.max) * 100 : 0, b.out ? 3 : 1)}%`, opacity: b.out ? 1 : 0.15 }} />
                    </div>
                  ))}
                </div>
                <div className={`flex justify-between text-[9.5px] mt-1.5 ${muted}`}>
                  <span>{chart.buckets[0]?.label}</span>
                  <span className="flex items-center gap-3"><span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />In</span><span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-orange-500 inline-block" />Out</span></span>
                  <span>{chart.buckets[chart.buckets.length - 1]?.label}</span>
                </div>
              </div>

              {/* By source */}
              <div className={`${cardClass} p-5`}>
                <p className={`text-sm font-bold mb-4 ${strong}`}>By source</p>
                <div className="space-y-3">
                  {bySource.map(([name, n]) => (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={`capitalize ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{name}</span>
                        <span className={`font-mono ${muted}`}>{n}</span>
                      </div>
                      <div className={`h-1.5 rounded-full ${isLight ? 'bg-slate-100' : 'bg-white/5'}`}>
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(n / inPeriod.length) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Per-currency summary */}
          {perCurrency.length > 0 && (
            <div className={`${cardClass} overflow-hidden`}>
              <div className={`px-5 py-4 border-b ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}>
                <p className={`text-sm font-bold ${strong}`}>Summary by currency</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[620px]">
                  <thead>
                    <tr className="bg-emerald-600 text-white text-[10.5px] font-bold uppercase tracking-wider">
                      <th className={th}>Currency</th><th className={`${th} text-right`}>Total In</th><th className={`${th} text-right`}>Total Out</th><th className={`${th} text-right`}>Net</th><th className={`${th} text-right`}>Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perCurrency.map(([c, r], i) => (
                      <tr key={c} className={stripe(i)}>
                        <td className={`px-4 py-3 text-xs font-bold ${strong}`}>{c}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-emerald-500">+{fmt(r.in)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-orange-500">-{fmt(r.out)}</td>
                        <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${strong}`}>{fmt(r.in - r.out)}</td>
                        <td className={`px-4 py-3 text-right font-mono text-xs ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${muted}`} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by reference, source, or asset..." className={`w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500' : 'bg-[#0A0D14] border-[#1E2D3D] text-white placeholder:text-slate-600 focus:border-emerald-500'}`} />
            </div>
            <div className={`inline-flex gap-1 p-1 rounded-xl border ${cardClass}`}>
              {(['all', 'in', 'out'] as const).map(f => (
                <button key={f} onClick={() => { setDirectionFilter(f); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${directionFilter === f ? 'bg-emerald-600 text-white' : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:bg-white/5'}`}>
                  {f === 'all' ? 'All' : f === 'in' ? 'Collections' : 'Payouts'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className={`${cardClass} overflow-hidden`}>
            {filtered.length === 0 ? (
              <div className={`p-10 text-center text-xs flex flex-col items-center gap-2 ${muted}`}>
                <History className="w-6 h-6 opacity-50" />
                {search || directionFilter !== 'all' || period ? 'No transactions match your filters.' : 'No transactions yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[760px]">
                  <thead>
                    <tr className="bg-emerald-600 text-white text-[10.5px] font-bold uppercase tracking-wider">
                      <th className="px-5 py-3">Date</th><th className={th}>Type</th><th className={th}>Source</th><th className={th}>Transaction Ref</th><th className={`${th} text-right`}>Amount</th><th className={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((e, i) => (
                      <tr key={e.id} className={stripe(i)}>
                        <td className={`px-5 py-3 text-xs ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>{new Date(e.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${e.direction === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                            {e.direction === 'in' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {e.direction === 'in' ? 'Collection' : 'Payout'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-xs capitalize ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{String(e.source).replace(/_/g, ' ')}</td>
                        <td className={`px-4 py-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{e.id}</td>
                        <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${e.direction === 'in' ? 'text-emerald-500' : 'text-orange-500'}`}>
                          {e.direction === 'in' ? '+' : '-'}{Number(e.amount).toLocaleString()} {e.asset}
                        </td>
                        <td className="px-4 py-3"><span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">{e.status || 'Completed'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {filtered.length > 0 && (
            <div className={`flex items-center justify-between text-[11px] ${muted}`}>
              <span>Showing {pageRows.length} of {filtered.length} transactions</span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg border disabled:opacity-40 hover:border-emerald-500">Prev</button>
                <span>Page {Math.min(page, pageCount)} / {pageCount}</span>
                <button disabled={page >= pageCount} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg border disabled:opacity-40 hover:border-emerald-500">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
