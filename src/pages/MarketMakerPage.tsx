import { useState } from 'react';
import {
  ShieldAlert, AlertTriangle, ArrowRightLeft,
  Settings, Clock, Activity, DollarSign, AlertCircle} from 'lucide-react';

// --- MOCK DATA ---
const PNL_STATE = {
  net: 850000,
  target: 500000,
  openPending: 120000,
  grossToday: 1250000,
  exchangeFees: 400000
};

const MOCK_ROUTES = [
  { id: '#0042', path: 'KES → IMC', volume: 10000, entry: 125, market: 130, spreadPct: 4.0, timeElapsed: '12m 34s', status: 'OPEN', isStuck: false },
  { id: '#0043', path: 'IMC → USDT', volume: 8000, entry: 130, market: 132, spreadPct: 1.5, timeElapsed: '45m 10s', status: 'OPEN', isStuck: false },
  { id: '#0044', path: 'KES → IMC', volume: 15000, entry: 125, market: 128, spreadPct: 2.4, timeElapsed: '1h 15m', status: 'PENDING', isStuck: false },
  { id: '#0045', path: 'IMC → USDT', volume: 5000, entry: 131, market: 130, spreadPct: -0.8, timeElapsed: '2h 05m', status: 'OPEN', isStuck: true },
];

export default function DealingDesk() {
  const [globalKillSwitch, setGlobalKillSwitch] = useState(false);
  const [autoPeg, setAutoPeg] = useState(true);

  const fmt = (n: number) => n.toLocaleString('en-US');

  // Logic to determine the color of the spread status dot
  const getSpreadStatus = (spreadPct: number) => {
    if (spreadPct >= 4.0) return { color: 'bg-emerald-500', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.8)]' };
    if (spreadPct >= 2.0) return { color: 'bg-yellow-500', glow: 'shadow-[0_0_8px_rgba(234,179,8,0.8)]' };
    if (spreadPct >= 0) return { color: 'bg-orange-500', glow: 'shadow-[0_0_8px_rgba(249,115,22,0.8)]' };
    return { color: 'bg-red-500', glow: 'animate-pulse shadow-[0_0_12px_rgba(239,68,68,1)]' };
  };

  const criticalSpreadRoutes = MOCK_ROUTES.filter(r => r.spreadPct < 0);
  const stuckRoutes = MOCK_ROUTES.filter(r => r.isStuck);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-200 font-sans p-6 space-y-8 selection:bg-blue-500/30">

      {/* HEADER & GLOBAL KILL SWITCH */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-800/60">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dealing Desk</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time configuration, OTC operations, and trade execution monitoring.</p>
        </div>
        <button
          onClick={() => setGlobalKillSwitch(!globalKillSwitch)}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg ${globalKillSwitch
              ? 'bg-red-600 text-white animate-pulse shadow-red-900/50'
              : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
            }`}
        >
          <ShieldAlert className="w-4 h-4" />
          {globalKillSwitch ? 'SYSTEM HALTED' : 'GLOBAL KILL SWITCH'}
        </button>
      </div>

      {/* TOP ROW: KPIs & REFERENCES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111827] border border-gray-800/60 rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1.5">24H Trade Volume</p>
            <p className="text-2xl font-bold text-blue-400 font-mono">{fmt(12450000)} <span className="text-blue-400/70 text-lg">KES</span></p>
          </div>
          <Activity className="w-8 h-8 text-blue-500/20" />
        </div>
        <div className="bg-[#111827] border border-gray-800/60 rounded-xl p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1.5">Binance P2P (Ref)</p>
          <p className="text-2xl font-bold text-white font-mono">130.50 <span className="text-gray-400 text-lg">KES</span></p>
        </div>
        <div className="bg-[#111827] border border-gray-800/60 rounded-xl p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1.5">CBK Official (Ref)</p>
          <p className="text-2xl font-bold text-white font-mono">129.80 <span className="text-gray-400 text-lg">KES</span></p>
        </div>
      </div>

      {/* LAYER 1: CONFIGURATION (The Trap) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Spread Engine (Inputs) */}
        <div className="xl:col-span-2 space-y-4">
          <h2 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-cyan-400" /> The Spread Engine (Configuration)
          </h2>

          <div className="bg-[#111827] border border-gray-800/60 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800/60 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#1f2937] flex items-center justify-center border border-gray-700/50">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base tracking-wide">USDA ↔ KES</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Core Remittance Route</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  Auto-Peg to Binance
                  <input
                    type="checkbox"
                    checked={autoPeg}
                    onChange={(e) => setAutoPeg(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                  />
                </label>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold uppercase tracking-wider">
                  Route Live
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">We Buy USDA from Users (Bid)</label>
                <div className="relative">
                  <input
                    type="text"
                    value="128"
                    readOnly={autoPeg}
                    className={`w-full bg-[#0b0f17] border border-gray-800 rounded-lg py-2.5 px-4 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 ${autoPeg ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                  <span className="absolute right-4 top-3 text-gray-600 font-mono text-xs">KES</span>
                </div>
                <p className="text-[10px] text-emerald-400/80 text-right font-mono mt-1.5">Profit: +2.50 KES per USD</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">We Sell USDA to Users (Ask)</label>
                <div className="relative">
                  <input
                    type="text"
                    value="132"
                    readOnly={autoPeg}
                    className={`w-full bg-[#0b0f17] border border-gray-800 rounded-lg py-2.5 px-4 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 ${autoPeg ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                  <span className="absolute right-4 top-3 text-gray-600 font-mono text-xs">KES</span>
                </div>
                <p className="text-[10px] text-emerald-400/80 text-right font-mono mt-1.5">Profit: +1.50 KES per USD</p>
              </div>
            </div>
          </div>
        </div>

        {/* OTC Rebalance Desk */}
        <div className="space-y-4">
          <h2 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2.5">
            <DollarSign className="w-4 h-4 text-emerald-400" /> OTC Rebalance Desk
          </h2>
          <div className="bg-red-950/10 border border-red-900/30 rounded-xl p-6 shadow-sm relative overflow-hidden">
            {/* Subtle red glow effect in corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

            <h3 className="flex items-center gap-2 text-red-400 font-bold mb-3 text-sm">
              <AlertTriangle className="w-4 h-4" /> Liquidity Warning
            </h3>
            <p className="text-gray-400 text-xs mb-5 leading-relaxed pr-2">
              KES Paybill is dropping rapidly based on current USDA sell volume. Est. depletion: <strong className="text-white font-semibold">2 Hours</strong>.
            </p>
            <div className="space-y-2.5 text-xs font-mono mb-6">
              <div className="flex justify-between border-b border-gray-800/50 pb-2">
                <span className="text-gray-500">KES Target</span>
                <span className="text-gray-400">10,000,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400 font-semibold">Current KES</span>
                <span className="text-red-400 font-bold">1,240,000</span>
              </div>
            </div>
            <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors shadow-lg shadow-blue-900/20">
              Log Fiat Rebalance
            </button>
          </div>
        </div>
      </div>

      {/* LAYER 2: EXECUTION TERMINAL (The Catch) */}
      <div className="space-y-4 pt-2">
        <h2 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-emerald-400" /> Live Execution Terminal (Active Routes)
        </h2>

        <div className="bg-[#111827] border border-gray-800/60 rounded-xl overflow-hidden shadow-xl">
          {/* P&L Header Section - Integrated beautifully */}
          <div className="p-6 pb-5">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Running Daily P&L (Net)</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-bold text-emerald-400">+ {fmt(PNL_STATE.net)} KES</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] mb-1"></div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Target</p>
                <p className="text-base font-mono text-gray-300">{fmt(PNL_STATE.target)} KES</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dashed border-gray-700/70">
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Open P&L (Pending)</p>
                <p className="text-xs font-mono text-blue-400">+ {fmt(PNL_STATE.openPending)} KES</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Gross P&L (Today)</p>
                <p className="text-xs font-mono text-emerald-400">+ {fmt(PNL_STATE.grossToday)} KES</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Exchange Fees (Today)</p>
                <p className="text-xs font-mono text-red-400">- {fmt(PNL_STATE.exchangeFees)} KES</p>
              </div>
            </div>
          </div>

          {/* Active Routes Table */}
          <div className="overflow-x-auto border-t border-gray-800/60">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#0b0f17]/50 text-[9px] uppercase tracking-widest text-gray-500">
                  <th className="py-4 pl-6 font-semibold">Route</th>
                  <th className="py-4 font-semibold">Path</th>
                  <th className="py-4 font-semibold text-right">Volume</th>
                  <th className="py-4 font-semibold text-right">Entry (Cost)</th>
                  <th className="py-4 font-semibold text-right">Market (Oracle)</th>
                  <th className="py-4 font-semibold text-center">Time Elapsed</th>
                  <th className="py-4 font-semibold text-center">Status</th>
                  <th className="py-4 pr-6 font-semibold text-right">Spread</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {MOCK_ROUTES.map((route) => {
                  const status = getSpreadStatus(route.spreadPct);
                  return (
                    <tr key={route.id} className="border-b border-gray-800/40 hover:bg-[#1f2937]/30 transition-colors">
                      <td className="py-3 pl-6 text-gray-500">{route.id}</td>
                      <td className="py-3 text-gray-300 tracking-wide">{route.path}</td>
                      <td className="py-3 text-right text-gray-300">{fmt(route.volume)}</td>
                      <td className="py-3 text-right text-gray-500">{route.entry} KES</td>
                      <td className="py-3 text-right text-gray-500">{route.market} KES</td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] ${route.isStuck ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-500'}`}>
                          <Clock className="w-3 h-3" /> {route.timeElapsed}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-[9px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                          {route.status}
                        </span>
                      </td>
                      <td className="py-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <span className={route.spreadPct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {route.spreadPct > 0 ? '+' : ''}{route.spreadPct.toFixed(1)}%
                          </span>
                          <div className={`w-2 h-2 rounded-full ${status.color} ${status.glow}`} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Dynamic Circuit Breaker Alerts */}
          {(criticalSpreadRoutes.length > 0 || stuckRoutes.length > 0) && (
            <div className="p-4 bg-[#0d131f] border-t border-gray-800/60">
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  {criticalSpreadRoutes.length > 0 && (
                    <div>
                      <h4 className="text-red-400 font-semibold text-xs tracking-wide">
                        SPREAD ALERT: Route {criticalSpreadRoutes.map(r => r.id).join(', ')} is showing negative spread. Circuit Breaker engaged.
                      </h4>
                      <p className="text-red-400/60 text-[10px] mt-1">Action Required: Close position manually or adjust Oracle rate immediately.</p>
                    </div>
                  )}
                  {stuckRoutes.length > 0 && (
                    <div>
                      <h4 className="text-red-400 font-bold text-sm">
                        ⏱️ TIME EXCEEDED: Route {stuckRoutes.map(r => r.id).join(', ')} has been open for &gt; 2 Hours.
                      </h4>
                      <p className="text-red-400/60 text-[10px] mt-1">🚨 Action Required: Transaction is likely stuck. Investigate off-chain settlement status and manually close.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}