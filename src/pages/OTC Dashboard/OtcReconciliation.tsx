import { useEffect, useState } from 'react';
import { RefreshCw, Scale, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import { getOtcReconciliation, recordTreasurySnapshot } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';

type Row = {
  asset: string; tracked: boolean; netInventory: number; reserved: number; availableToTrade: number;
  merchantHeld: number; merchantsHolding: number; pendingPayouts: number; unconfirmedFunding: number;
  expectedHoldings: number; actualBalance: number | null; actualSource?: string; actualAsOf?: string;
  variance: number | null; status: 'balanced' | 'short' | 'over' | 'no_snapshot';
};

const fmt = (n: number | null | undefined) => n == null ? '—' : Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUS = {
  balanced: { label: 'Balanced', cls: 'bg-emerald-500/10 text-emerald-500', Icon: CheckCircle2 },
  short: { label: 'Short', cls: 'bg-red-500/10 text-red-400', Icon: AlertTriangle },
  over: { label: 'Over', cls: 'bg-amber-500/10 text-amber-500', Icon: AlertTriangle },
  no_snapshot: { label: 'No real balance', cls: 'bg-slate-500/10 text-slate-400', Icon: MinusCircle },
};

export default function OtcReconciliation() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    getOtcReconciliation().then(res => setRows(res.data.rows || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = async (asset: string) => {
    const balance = Number(inputs[asset]);
    if (!Number.isFinite(balance) || inputs[asset] === '' || balance < 0) return setError('Enter the real balance as a number.');
    setSaving(asset); setError('');
    try {
      await recordTreasurySnapshot({ asset, balance, source: sources[asset] || 'manual' });
      setInputs(i => ({ ...i, [asset]: '' }));
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not save the balance.');
    } finally { setSaving(''); }
  };

  const card = `rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`;
  const strong = isLight ? 'text-slate-900' : 'text-white';
  const muted = isLight ? 'text-slate-500' : 'text-gray-500';
  const input = `w-28 rounded-lg px-2.5 py-1.5 text-xs outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-[#0A0D14] border-[#1E2D3D] text-white focus:border-emerald-500'}`;
  const stripe = (i: number) => i % 2 === 0 ? (isLight ? 'bg-emerald-50/70' : 'bg-emerald-500/[0.06]') : (isLight ? 'bg-orange-50/60' : 'bg-orange-500/[0.05]');
  const th = 'px-4 py-3';
  const problems = rows.filter(r => r.status === 'short' || r.status === 'over').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className={`text-xl font-semibold flex items-center gap-2 ${strong}`}><Scale className="w-5 h-5 text-emerald-500" /> OTC Reconciliation</h1>
          <p className={`text-xs mt-1 max-w-2xl ${muted}`}>
            Real cash on hand should equal net trading inventory plus everything merchants hold in their wallets. Enter the real balance you see at the bank, M-Pesa or on-chain, and any difference is flagged.
          </p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border ${isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#111827] border-[#1E2533] text-gray-300'}`}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {problems > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{problems} asset{problems > 1 ? 's' : ''} out of balance. Investigate before releasing more payouts.</div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="p-10 text-center"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto" /></div>
        ) : rows.length === 0 ? (
          <div className={`p-12 text-center text-xs ${muted}`}>No treasury positions or merchant balances yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[1100px]">
              <thead>
                <tr className="bg-emerald-600 text-white text-[10.5px] font-bold uppercase tracking-wider">
                  <th className={th}>Asset</th>
                  <th className={`${th} text-right`}>Net inventory</th>
                  <th className={`${th} text-right`}>Reserved</th>
                  <th className={`${th} text-right`}>Merchants hold</th>
                  <th className={`${th} text-right`}>Expected cash</th>
                  <th className={`${th} text-right`}>Real balance</th>
                  <th className={`${th} text-right`}>Variance</th>
                  <th className={th}>Status</th>
                  <th className={th}>Record real balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const st = STATUS[r.status];
                  return (
                    <tr key={r.asset} className={stripe(i)}>
                      <td className={`px-4 py-3 text-xs font-bold ${strong}`}>
                        {r.asset}
                        {!r.tracked && <p className={`text-[10px] font-normal ${muted}`}>No inventory position</p>}
                        {(r.pendingPayouts > 0 || r.unconfirmedFunding > 0) && (
                          <p className={`text-[10px] font-normal ${muted}`}>
                            {r.pendingPayouts > 0 && `Payouts awaiting: ${fmt(r.pendingPayouts)}. `}{r.unconfirmedFunding > 0 && `Top-ups unconfirmed: ${fmt(r.unconfirmedFunding)}.`}
                          </p>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${strong}`}>{fmt(r.netInventory)}</td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${muted}`}>{fmt(r.reserved)}</td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${strong}`}>{fmt(r.merchantHeld)}<p className={`text-[10px] ${muted}`}>{r.merchantsHolding} merchant{r.merchantsHolding === 1 ? '' : 's'}</p></td>
                      <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${strong}`}>{fmt(r.expectedHoldings)}</td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${strong}`}>
                        {fmt(r.actualBalance)}
                        {r.actualAsOf && <p className={`text-[10px] ${muted}`}>{r.actualSource} · {new Date(r.actualAsOf).toLocaleString()}</p>}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${r.status === 'short' ? 'text-red-400' : r.status === 'over' ? 'text-amber-500' : strong}`}>{r.variance == null ? '—' : `${r.variance > 0 ? '+' : ''}${fmt(r.variance)}`}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${st.cls}`}><st.Icon className="w-3 h-3" /> {st.label}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input type="number" value={inputs[r.asset] ?? ''} onChange={e => setInputs(v => ({ ...v, [r.asset]: e.target.value }))} placeholder="0.00" className={input} />
                          <select value={sources[r.asset] || 'bank'} onChange={e => setSources(v => ({ ...v, [r.asset]: e.target.value }))} className={`${input} w-24`}>
                            <option value="bank">Bank</option><option value="mpesa">M-Pesa</option><option value="onchain">On-chain</option><option value="manual">Other</option>
                          </select>
                          <button onClick={() => save(r.asset)} disabled={saving === r.asset} className="text-[10.5px] font-bold uppercase px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50">{saving === r.asset ? '...' : 'Save'}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
