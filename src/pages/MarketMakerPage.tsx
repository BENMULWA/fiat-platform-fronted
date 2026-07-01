// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Activity, ArrowRightLeft, Settings,
  TrendingUp, AlertTriangle, RefreshCw, Power,
  ChevronDown, ChevronUp, TerminalSquare,
  Clock, CheckCircle2, Wallet, Layers,
  Server, Smartphone, Radio, Coins, Network,
  CreditCard, Link2, ArrowRight, Play, Hexagon, Gem, XCircle
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getTreasuryDashboard, simulateTreasurySwap, resetTreasurySandbox } from '../api/client';

const MOCK_ROUTES = [
  { id: '#0042', path: 'KES → USDA', volume: 10000, entry: 125, market: 130.50, spreadPct: 4.4, timeElapsed: '12m', status: 'OPEN', isStuck: false },
  { id: '#0045', path: 'USDA → KES', volume: 5000, entry: 131, market: 130.50, spreadPct: -0.3, timeElapsed: '2h', status: 'OPEN', isStuck: true },
];

const INFRASTRUCTURE_NODES = [
  { id: 'N1', name: 'Telkom Kenya Airtime', desc: '10% Discount Rate', category: 'Airtime', icon: Radio, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', dbKey: 'N1_TELKOM', currency: 'KES' },
  { id: 'N2', name: 'Airtel Kenya Airtime', desc: '6% Discount Rate', category: 'Airtime', icon: Radio, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', dbKey: 'N2_AIRTEL', currency: 'KES' },
  { id: 'N3', name: 'Safaricom Airtime', desc: '4% Discount Rate', category: 'Airtime', icon: Radio, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', dbKey: 'N3_SAFARICOM', currency: 'KES' },
  { id: 'N4', name: 'M-Pesa Super Agent', desc: 'B2C & C2B Liquidity', category: 'Mobile Money', icon: Smartphone, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', dbKey: 'N4_MPESA', currency: 'KES' },
  { id: 'N5', name: 'Airtel Money Agent', desc: 'B2C & C2B Liquidity', category: 'Mobile Money', icon: Smartphone, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', dbKey: 'N5_AIRTEL_MONEY', currency: 'KES' },
  { id: 'N6', name: 'T-Kash Super Agent', desc: 'B2C & C2B Liquidity', category: 'Mobile Money', icon: Smartphone, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', dbKey: 'N6_TKASH', currency: 'KES' },
  { id: 'N7', name: 'USDA Stablecoin Mint', desc: 'Cardano Native Token', category: 'Web3', icon: Coins, color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/20', dbKey: 'N7_USDA', currency: 'USDA' },
  { id: 'N8', name: 'Impalacoin Treasury', desc: 'Collateral & Reserve Mgr', category: 'Web3', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', dbKey: 'N8_IMP', currency: 'IMP' },
  { id: 'N9', name: 'Multi-Chain Router', desc: 'Stellar / Midnight Network', category: 'Web3', icon: Network, color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20', dbKey: 'N9_XLM', currency: 'XLM' },
  { id: 'N10', name: 'PSP & Virtual Card Engine', desc: 'Global Card Settlement', category: 'Payments', icon: CreditCard, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', dbKey: 'N10_USD', currency: 'USD' },
  { id: 'N11', name: 'Commodities Vault', desc: 'Tokenized Gold Reserves', category: 'Commodities', icon: Gem, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', dbKey: 'N11_GOLD', currency: 'GOLD (OZ)' },
  { id: 'N12', name: 'Yeshara Protocol', desc: 'Custom Platform Utility Token', category: 'Web3', icon: Hexagon, color: 'text-pink-400', bg: 'bg-pink-400/10 border-pink-400/20', dbKey: 'N12_YESHARA', currency: 'YESHARA' },
];

const NODE_CATEGORIES = [
  { id: 'Mobile Money', label: 'Mobile Money Liquidity', icon: Smartphone, color: 'text-emerald-400' },
  { id: 'Airtime', label: 'Airtime Liquidity', icon: Radio, color: 'text-blue-400' },
  { id: 'Web3', label: 'Web3 Blockchain', icon: Coins, color: 'text-indigo-400' },
  { id: 'Payments', label: 'Cross-Border & PSP', icon: CreditCard, color: 'text-orange-400' },
  { id: 'Commodities', label: 'Commodities Vault', icon: Gem, color: 'text-yellow-400' }
];

export default function MarketMakerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('tab') || 'dashboard';

  const [globalKillSwitch, setGlobalKillSwitch] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);

  const [usdaRoute, setUsdaRoute] = useState({ active: true, autoPeg: true, bid: 128.00, ask: 132.00 });
  const binanceRate = 130.50;

  const [isSimulating, setIsSimulating] = useState(false);
  const [simAmount, setSimAmount] = useState('10000');
  const [simPair, setSimPair] = useState('USDA_KES-MPESA');

  const [dbVaults, setDbVaults] = useState<any>({});
  const [dbSettlements, setDbSettlements] = useState<any[]>([]);

  const [showLiquidityModal, setShowLiquidityModal] = useState(false);
  const [liquidityAlertVault, setLiquidityAlertVault] = useState('');
  const [simulationToast, setSimulationToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Mobile Money': true,
    'Airtime': false,
    'Web3': true,
    'Payments': false,
    'Commodities': false
  });

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const toggleKillSwitch = () => setGlobalKillSwitch(!globalKillSwitch);
  const fmt = (n: number) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getPnlColor = (pnlStr: string) => {
    if (!pnlStr) return 'text-slate-400';
    if (pnlStr.includes('+')) return 'text-emerald-400';
    if (pnlStr.includes('-')) return 'text-red-400';
    return 'text-slate-400';
  };

  const fetchDashboardData = async () => {
    try {
      const res: any = await getTreasuryDashboard();
      if (res.data?.status === 'success') {
        setDbVaults(res.data.vaults);
        setDbSettlements(res.data.settlements);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  // Poll for updates (Fast enough to see simulation results instantly)
  useEffect(() => {
    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 2000);
    return () => clearInterval(intervalId);
  }, []);

  // Aggregation of DB Balances for Top KPI Cards only
  const usdaBal = dbVaults['N7_USDA'] || 0;
  const impBal = dbVaults['N8_IMP'] || 0;

  const totalAirt = (dbVaults['N1_TELKOM'] || 0) + (dbVaults['N2_AIRTEL'] || 0) + (dbVaults['N3_SAFARICOM'] || 0);

  // 1. DYNAMIC MATH: Map all 12 infrastructure nodes to their true USD values
  const LIVE_VAULTS = INFRASTRUCTURE_NODES.map(node => {
    const balance = dbVaults[node.dbKey] || 0;
    let usdValue = 0;

    // Convert Native Currency to USD mathematically
    if (node.currency === 'KES') {
      usdValue = balance / 130.50;
    } else if (node.currency === 'USDA' || node.currency === 'IMP' || node.currency === 'USD') {
      usdValue = balance; // Pegged 1:1 to USD
    } else if (node.currency === 'XLM') {
      usdValue = balance * 0.10; // Assuming $0.10 per XLM
    } else if (node.currency === 'GOLD (OZ)') {
      usdValue = balance * 2400.00; // Assuming $2,400 per ounce
    } else if (node.currency === 'YESHARA') {
      usdValue = balance * 1.05; // Assuming $1.05 per Yeshara token
    }

    return { ...node, balance, usdValue };
  });

  // 2. MATHEMATICALLY DERIVE TOTAL PORTFOLIO
  const totalPortfolioUSD = LIVE_VAULTS.reduce((sum, vault) => sum + vault.usdValue, 0);

  const showToast = (type: 'success' | 'error', message: string) => {
    setSimulationToast({ type, message });
    setTimeout(() => setSimulationToast(null), 5000);
  };

  const handleSimulateTrade = async () => {
    if (!simAmount || isNaN(Number(simAmount))) return;

    // Safety check - what specific node are we draining?
    const [fromAsset, toAssetFull] = simPair.split('_');

    // Map the dropdown string directly to the Database Key
    const SIMULATOR_NODE_MAP: Record<string, string> = {
      "KES-MPESA": "N4_MPESA", "KES-AIRTEL": "N5_AIRTEL_MONEY", "KES-TKASH": "N6_TKASH",
      "AIRT-SAF": "N3_SAFARICOM", "AIRT-AIRTEL": "N2_AIRTEL", "AIRT-TELKOM": "N1_TELKOM",
      "USDA": "N7_USDA", "IMP": "N8_IMP", "XLM": "N9_XLM",
      "USD": "N10_USD", "GOLD": "N11_GOLD", "YESHARA": "N12_YESHARA"
    };

    const targetDbKey = SIMULATOR_NODE_MAP[toAssetFull] || SIMULATOR_NODE_MAP[toAssetFull?.split('-')[0]];
    const targetVault = LIVE_VAULTS.find(v => v.dbKey === targetDbKey);

    if (targetVault) {
      // Calculate the exact percentage this node holds of the entire platform
      const pct = totalPortfolioUSD > 0 ? (targetVault.usdValue / totalPortfolioUSD) * 100 : 0;

      // CIRCUIT BREAKER: Since 12 perfectly balanced nodes = 8.3% each, warn if below 5%
      if (pct > 0 && pct < 5) {
        setLiquidityAlertVault(targetVault.name);
        setShowLiquidityModal(true);
        return;
      }
    }

    setIsSimulating(true);
    try {
      await simulateTreasurySwap({
        user_id: "test_user_123",
        from_asset: fromAsset,
        to_asset: toAssetFull,
        amount: parseFloat(simAmount)
      });
      await fetchDashboardData(); // Instantly refresh data to move the progress bars
      showToast('success', `Simulated swap of ${simAmount} ${fromAsset} executed successfully.`);
    } catch (error: any) {
      console.error("Simulation failed", error);
      const errMsg = error.response?.data?.detail || "Simulation failed. Please check network logs.";
      showToast('error', errMsg);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetSandbox = async () => {
    if (window.confirm("Are you sure? This will wipe all current balances and reset all 8 vaults to exactly $100,000 each.")) {
      setIsResetting(true);
      try {
        await resetTreasurySandbox();
        await fetchDashboardData();
        showToast('success', 'Sandbox balances reset to perfectly balanced 12.5% targets.');
      } catch (err) {
        showToast('error', 'Failed to reset sandbox.');
      } finally {
        setIsResetting(false);
      }
    }
  };

  const renderDashboard = () => (
    <div className={`space-y-6 transition-opacity duration-500 ${isDashboardLoading ? 'opacity-60' : 'opacity-100'} animate-in fade-in`}>

      {/* QUICK SIMULATOR PANEL */}
      <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg"><Play className="w-5 h-5 text-blue-400" /></div>
          <div>
            <h3 className="text-white font-bold text-sm">Quick Simulator</h3>
            <p className="text-xs text-blue-200/60">Test treasury flows and watch nodes react in real-time.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="number"
            value={simAmount}
            onChange={(e) => setSimAmount(e.target.value)}
            className="bg-[#0b0f19] border border-[#1e2d3d] text-white text-sm rounded-lg px-3 py-2 w-28 outline-none focus:border-blue-500 font-mono"
          />
          <select
            value={simPair}
            onChange={(e) => setSimPair(e.target.value)}
            className="bg-[#0b0f19] border border-[#1e2d3d] text-white text-sm rounded-lg px-2 py-2 outline-none focus:border-blue-500 cursor-pointer w-full max-w-[280px]"
          >
            <optgroup label="Mobile Money Ramps" className="bg-[#111827] text-emerald-400 font-semibold">
              <option value="USDA_KES-MPESA" className="text-white">USDA → M-Pesa (N4)</option>
              <option value="KES-MPESA_USDA" className="text-white">M-Pesa → USDA (N4)</option>
              <option value="USDA_KES-AIRTEL" className="text-white">USDA → Airtel Money (N5)</option>
              <option value="KES-AIRTEL_USDA" className="text-white">Airtel Money → USDA (N5)</option>
              <option value="USDA_KES-TKASH" className="text-white">USDA → T-Kash (N6)</option>
              <option value="KES-TKASH_USDA" className="text-white">T-Kash → USDA (N6)</option>
            </optgroup>
            <optgroup label="Synthetic Minting (Airtime)" className="bg-[#111827] text-blue-400 font-semibold">
              <option value="AIRT-SAF_IMP" className="text-white">Safaricom Airtime → IMP (N3)</option>
              <option value="IMP_AIRT-SAF" className="text-white">IMP → Safaricom Airtime (N3)</option>
              <option value="AIRT-AIRTEL_IMP" className="text-white">Airtel Airtime → IMP (N2)</option>
              <option value="AIRT-TELKOM_IMP" className="text-white">Telkom Airtime → IMP (N1)</option>
            </optgroup>
            <optgroup label="Global Routing & Commodities" className="bg-[#111827] text-orange-400 font-semibold">
              <option value="XLM_USD" className="text-white">XLM → USD (N9 to N10)</option>
              <option value="USD_XLM" className="text-white">USD → XLM (N10 to N9)</option>
              <option value="USD_GOLD" className="text-white">USD → Gold (N10 to N11)</option>
              <option value="GOLD_USD" className="text-white">Gold → USD (N11 to N10)</option>
              <option value="USD_YESHARA" className="text-white">USD → Yeshara (N10 to N12)</option>
            </optgroup>
          </select>
          <button
            onClick={handleSimulateTrade}
            disabled={isSimulating}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-5 py-2 rounded-lg transition-colors shadow-lg disabled:opacity-50 whitespace-nowrap"
          >
            {isSimulating ? 'Running...' : 'Execute'}
          </button>
          <button
            onClick={handleResetSandbox}
            disabled={isResetting}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm px-3 py-2 rounded-lg transition-colors shadow-lg disabled:opacity-50"
            title="Reset all vaults to $100k"
          >
            <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Portfolio Value</span>
          </div>
          <p className="text-3xl font-bold text-white font-mono">${fmt(totalPortfolioUSD)}</p>
          <p className="text-slate-500 text-xs mt-1">USD equivalent</p>
        </div>
        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Link2 className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider">AIRT Inventory</span>
          </div>
          <p className="text-3xl font-bold text-white font-mono">{fmt(totalAirt)}</p>
          <p className="text-slate-500 text-xs mt-1">Total Tokenized Airtime</p>
        </div>
        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider">USDA Float</span>
          </div>
          <p className="text-3xl font-bold text-white font-mono">{fmt(usdaBal)}</p>
          <p className="text-slate-500 text-xs mt-1">Master Wallet</p>
        </div>
        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Open Routes</span>
          </div>
          <p className="text-3xl font-bold text-white font-mono">12</p>
          <p className="text-slate-500 text-xs mt-1">Active MM Quotes</p>
        </div>
      </div>

      {/* PANELS (VAULTS & ORACLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Live Vault Allocation (12 Nodes)</h2>
            <button
              onClick={() => setSearchParams({ tab: 'otc' })}
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
            >
              Manage liquidity <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-0 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            {LIVE_VAULTS.map((vault) => {
              const pct = totalPortfolioUSD > 0 ? (vault.usdValue / totalPortfolioUSD) * 100 : 0;
              const isWarning = pct > 0 && pct < 5;
              const CatIcon = vault.icon;

              return (
                <div key={vault.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 py-3 border-b border-[#1e2d3d]/60 last:border-0 ${isWarning ? 'bg-red-500/5 -mx-4 px-4 rounded-lg' : ''}`}>
                  <div className="w-48 shrink-0 flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${vault.bg}`}>
                      <CatIcon className={`w-4 h-4 ${vault.color}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm flex items-center gap-1.5 truncate">
                        {vault.id}
                        {isWarning && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      </h3>
                      <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{vault.name}</p>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="h-2 flex-1 bg-[#1e293b] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${isWarning ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                    </div>
                    <span className={`text-xs font-mono font-medium w-12 text-right ${isWarning ? 'text-red-400' : 'text-slate-400'}`}>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-32 shrink-0 text-right">
                    <p className={`font-mono font-bold text-sm ${isWarning ? 'text-red-400' : 'text-white'}`}>
                      {fmt(vault.balance)} <span className="text-[10px] text-slate-500 ml-1">{vault.currency}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">≈ ${fmt(vault.usdValue)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ORACLE SYNC */}
        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-lg flex flex-col">
          <h2 className="text-lg font-bold text-white mb-6">Oracle Sync</h2>
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">System Collateralization</p>
            <p className="text-5xl font-bold text-emerald-400 tracking-tighter">
              {impBal > 0 ? (((totalAirt / 130.50 * 0.95) / impBal) * 100).toFixed(1) : '100.0'}%
            </p>
          </div>
          <div className="space-y-4 mb-8 flex-1">
            <div className="flex justify-between items-center py-2 border-b border-[#1e2d3d]/60">
              <span className="text-xs text-slate-400">Airtime Reserve (Haircut)</span>
              <span className="text-sm text-white font-mono font-medium">${fmt(totalAirt / 130.50 * 0.95)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1e2d3d]/60">
              <span className="text-xs text-slate-400">IMP Minted (Circulation)</span>
              <span className="text-sm text-white font-mono font-medium">${fmt(impBal)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-slate-400">Oracle Status</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold tracking-wider">SYNCED</span>
            </div>
          </div>
          <button
            onClick={async () => {
              setIsAuditing(true);
              await new Promise(r => setTimeout(r, 2000));
              setIsAuditing(false);
            }}
            disabled={isAuditing}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all border ${isAuditing ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse cursor-wait' : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'}`}
          >
            {isAuditing ? 'Auditing On-Chain...' : 'Audit Smart Contract'}
          </button>
        </div>
      </div>

      {/* SYSTEM INFRASTRUCTURE NODES ACCORDION */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" /> Active Infrastructure Nodes
        </h2>

        <div className="space-y-4">
          {NODE_CATEGORIES.map(category => {
            const nodesInCategory = INFRASTRUCTURE_NODES.filter(n => n.category === category.id);
            if (nodesInCategory.length === 0) return null;

            const isExpanded = expandedCategories[category.id];
            const CatIcon = category.icon;

            return (
              <div key={category.id} className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#0d1420] transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <CatIcon className={`w-5 h-5 ${category.color}`} />
                    <span className="font-bold text-white text-sm tracking-wide">{category.label}</span>
                    <span className="bg-[#1e2d3d] text-gray-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {nodesInCategory.length} Nodes
                    </span>
                  </div>
                  <div className="p-1 rounded-full bg-[#1e2d3d]/50">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-5 pt-2 border-t border-[#1e2d3d]/50 bg-[#0b0f19]/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {nodesInCategory.map((node) => {
                        const Icon = node.icon;
                        const liveBalance = dbVaults[node.dbKey] || 0;
                        const isOnline = liveBalance > 0;

                        return (
                          <div key={node.id} className={`bg-[#111827] border rounded-xl p-4 flex items-center justify-between transition-all group ${isOnline ? 'border-[#1e2d3d] hover:border-slate-500 hover:shadow-lg' : 'border-[#1e2d3d]/50 opacity-50 grayscale-[40%]'}`}>
                            <div className="flex items-start gap-4 min-w-0">
                              <div className={`p-2.5 rounded-xl border ${node.bg} shrink-0`}><Icon className={`w-5 h-5 ${node.color}`} /></div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{node.id}</span>
                                  {isOnline ? (
                                    <span className="flex items-center gap-1 text-[8px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"><div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Online</span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[8px] text-slate-400 bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"><div className="w-1 h-1 rounded-full bg-slate-500" /> Offline</span>
                                  )}
                                </div>
                                <h3 className={`font-semibold text-sm truncate ${isOnline ? 'text-white' : 'text-slate-300'}`}>{node.name}</h3>
                                <p className="text-slate-500 text-[10px] truncate mt-0.5">{node.desc}</p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right ml-2 border-l border-[#1e2d3d]/60 pl-4 flex flex-col justify-center min-w-[90px]">
                              <p className={`font-mono font-bold text-sm ${isOnline ? 'text-white' : 'text-slate-500'}`}>
                                {fmt(liveBalance)}
                              </p>
                              <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isOnline ? node.color : 'text-slate-600'}`}>
                                {node.currency}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ROW 4: SETTLEMENT LOG (REALIZED P&L) */}
      <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-lg mt-6">
        <h2 className="text-lg font-bold text-white mb-4">Settlement Log (Realized P&L)</h2>

        <div className="space-y-2">
          {dbSettlements.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-[#0d1420] rounded-xl transition-colors border border-transparent hover:border-[#1e2d3d]">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white font-mono">{tx.desc}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {tx.time}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-0.5">Profit</span>
                  <span className={`text-sm font-bold font-mono ${getPnlColor(tx.profit)}`}>{tx.profit}</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 tracking-wider flex items-center gap-1.5 min-w-[100px] justify-center">
                  {tx.status} <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}

          {dbSettlements.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No recent settlements.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderSpreadEngine = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-4 shadow-lg shadow-black/20">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">24h Realized P&L</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-emerald-400 font-mono">+ 142,500 KES</p>
            <TrendingUp className="text-emerald-400/50 w-6 h-6" />
          </div>
        </div>
        <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-4 shadow-lg shadow-black/20">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Binance P2P (Ref)</p>
          <p className="text-2xl font-bold text-white font-mono">{fmt(binanceRate)} KES</p>
        </div>
        <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-4 shadow-lg shadow-black/20">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">CBK Official (Ref)</p>
          <p className="text-2xl font-bold text-gray-400 font-mono">129.80 KES</p>
        </div>
      </div>

      <h2 className="text-lg font-medium text-white flex items-center gap-2 pt-2">
        <Settings className="w-5 h-5 text-blue-400" />
        Pricing Configuration
      </h2>

      <div className={`bg-[#111827] border rounded-2xl p-6 transition-colors shadow-xl ${!usdaRoute.active || globalKillSwitch ? 'border-red-500/50 opacity-80' : 'border-[#1e2d3d]'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <ArrowRightLeft className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                USDA <span className="text-gray-500">↔</span> KES
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Core Remittance Route</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-[#0d1420] px-3 py-2 rounded-lg border border-[#1e2d3d]">
              <span className="text-xs font-semibold text-gray-300">Auto-Peg to Binance</span>
              <input type="checkbox" className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-500" checked={usdaRoute.autoPeg} onChange={() => setUsdaRoute({ ...usdaRoute, autoPeg: !usdaRoute.autoPeg })} />
            </label>
            <button
              onClick={() => setUsdaRoute({ ...usdaRoute, active: !usdaRoute.active })}
              className={`text-xs px-4 py-2.5 rounded-lg border font-bold tracking-wide uppercase ${usdaRoute.active && !globalKillSwitch ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
            >
              {globalKillSwitch ? 'SYSTEM HALTED' : usdaRoute.active ? 'ROUTE LIVE' : 'ROUTE PAUSED'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0d1420] p-6 rounded-xl border border-[#1e2d3d]">
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">We Buy USDA from Users (Bid)</label>
            <div className="relative">
              <input
                type="number"
                value={usdaRoute.bid}
                onChange={(e) => setUsdaRoute({ ...usdaRoute, bid: parseFloat(e.target.value) })}
                disabled={usdaRoute.autoPeg || globalKillSwitch}
                className="w-full bg-[#111827] border border-[#1e2d3d] rounded-xl py-3 pl-4 pr-16 text-white text-lg font-mono focus:border-blue-500 outline-none disabled:opacity-50 shadow-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono font-bold">KES</span>
            </div>
            <p className="text-emerald-400 text-xs mt-2 font-medium">Spread Profit: +{(binanceRate - usdaRoute.bid).toFixed(2)} KES per USD</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">We Sell USDA to Users (Ask)</label>
            <div className="relative">
              <input
                type="number"
                value={usdaRoute.ask}
                onChange={(e) => setUsdaRoute({ ...usdaRoute, ask: parseFloat(e.target.value) })}
                disabled={usdaRoute.autoPeg || globalKillSwitch}
                className="w-full bg-[#111827] border border-[#1e2d3d] rounded-xl py-3 pl-4 pr-16 text-white text-lg font-mono focus:border-blue-500 outline-none disabled:opacity-50 shadow-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono font-bold">KES</span>
            </div>
            <p className="text-emerald-400 text-xs mt-2 font-medium">Spread Profit: +{(usdaRoute.ask - binanceRate).toFixed(2)} KES per USD</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOTCDesk = () => {
    const totalKesForOtc = (dbVaults['N4_MPESA'] || 0) + (dbVaults['N5_AIRTEL_MONEY'] || 0) + (dbVaults['N6_TKASH'] || 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-red-400 font-bold text-lg">Action Required: Liquidity Imbalance</h3>
              <p className="text-sm text-gray-400">Vault balances have dropped below the 5% safety margin.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 bg-[#0b0f17]/50 p-4 rounded-xl border border-red-500/10">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Target Float</p>
              <p className="text-xl font-mono text-gray-300">10,000,000 <span className="text-sm">KES</span></p>
            </div>
            <div>
              <p className="text-xs text-red-500 uppercase font-bold tracking-wider mb-1">Current Balance</p>
              <p className="text-xl font-mono text-red-400 font-bold">{fmt(totalKesForOtc)} <span className="text-sm">KES</span></p>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-xl">
          <h3 className="text-white font-bold text-lg mb-2">Log Fiat Rebalance</h3>
          <p className="text-sm text-gray-400 mb-6">
            Record a real-world bank transfer or Binance P2P transaction to rebalance the internal system vaults.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Asset Withdrawn</label>
                <select className="w-full bg-[#0d1420] border border-[#1e2d3d] rounded-xl py-3 px-4 text-white font-medium outline-none">
                  <option>USDA (Master Wallet)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Amount</label>
                <input type="number" placeholder="e.g. 5000" className="w-full bg-[#0d1420] border border-[#1e2d3d] rounded-xl py-3 px-4 text-white font-mono outline-none" />
              </div>
            </div>

            <div className="flex justify-center py-2">
              <ArrowRightLeft className="w-6 h-6 text-gray-600 rotate-90 md:rotate-0" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Asset Deposited</label>
                <select className="w-full bg-[#0d1420] border border-[#1e2d3d] rounded-xl py-3 px-4 text-white font-medium outline-none">
                  <option>KES (M-Pesa Paybill)</option>
                  <option>KES (Airtel Money)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Amount Received</label>
                <input type="number" placeholder="e.g. 650000" className="w-full bg-[#0d1420] border border-[#1e2d3d] rounded-xl py-3 px-4 text-white font-mono outline-none" />
              </div>
            </div>

            <button className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl text-sm transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Submit Ledger Update
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTerminal = () => (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* 1. ACTIVE ROUTES TABLE */}
      <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[#1e2d3d] flex items-center gap-3">
          <TerminalSquare className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">Active Arbitration Routes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[#0b0f17] text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Route ID</th>
                <th className="p-4 font-bold">Path</th>
                <th className="p-4 font-bold text-right">Volume</th>
                <th className="p-4 font-bold text-right">Entry / Market</th>
                <th className="p-4 font-bold text-center">Status</th>
                <th className="p-4 font-bold text-right">Spread</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2d3d]/50 font-mono">
              {MOCK_ROUTES.map(route => (
                <tr key={route.id} className="hover:bg-[#0d1420]/50 transition-colors group">
                  <td className="p-4 text-gray-400">{route.id}</td>
                  <td className="p-4 text-gray-200">{route.path}</td>
                  <td className="p-4 text-right text-gray-300">{fmt(route.volume)}</td>
                  <td className="p-4 text-right">
                    <span className="text-gray-300">{route.entry}</span>
                    <span className="text-gray-600 mx-2">/</span>
                    <span className="text-blue-400">{route.market}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${route.isStuck ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      <Clock className="w-3 h-3" /> {route.timeElapsed}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${route.spreadPct >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/20 text-red-400 animate-pulse'}`}>
                      {route.spreadPct > 0 ? '+' : ''}{route.spreadPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. THE LIVE TAPE (Execution Log with P&L Support) */}
      <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[#1e2d3d] flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">The Live Tape (Execution Log)</h2>
        </div>
        <div className="divide-y divide-[#1e2d3d]/50">
          {dbSettlements.map((tx) => {
            const pnlColor = getPnlColor(tx.profit);
            return (
              <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-[#0d1420]/50 transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{tx.date} • {tx.time}</span>
                  <div className="flex items-center gap-2">
                    {tx.profit?.includes('-') && <XCircle className="w-4 h-4 text-red-500" />}
                    {tx.profit?.includes('+') && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    <span className={`text-sm font-medium ${tx.profit?.includes('-') ? 'text-gray-400' : 'text-gray-200'}`}>
                      User executed: {tx.desc}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-0.5">P&L</span>
                  <span className={`text-sm font-mono font-bold ${pnlColor}`}>
                    {tx.profit}
                  </span>
                </div>
              </div>
            );
          })}
          {dbSettlements.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              Waiting for simulated trades... Use the Quick Simulator on the Dashboard tab.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-200 flex flex-col md:flex-row">

      {/* --- SIMULATION TOAST POPUP --- */}
      {simulationToast && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-start gap-3 border animate-in slide-in-from-right-8 duration-300 max-w-sm w-full ${simulationToast.type === 'success'
            ? 'bg-[#111827] border-emerald-500/30'
            : 'bg-[#111827] border-red-500/30'
          }`}>
          <div className={`p-2 rounded-lg shrink-0 ${simulationToast.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            {simulationToast.type === 'success'
              ? <CheckCircle2 className={`w-5 h-5 text-emerald-400`} />
              : <XCircle className={`w-5 h-5 text-red-400`} />
            }
          </div>
          <div className="flex-1 mt-0.5">
            <h4 className={`text-sm font-bold ${simulationToast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {simulationToast.type === 'success' ? 'Simulation Successful' : 'Simulation Failed'}
            </h4>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              {simulationToast.message}
            </p>
          </div>
          <button onClick={() => setSimulationToast(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* --- LIQUIDITY CIRCUIT BREAKER MODAL --- */}
      {showLiquidityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#111827] border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-red-900/20 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-red-400">Liquidity Halted</h3>
            </div>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              The <strong>{liquidityAlertVault}</strong> vault has dropped below the <strong className="text-white">5% safety threshold</strong>. All automated swaps drawing from this node have been disabled to prevent system insolvency.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLiquidityModal(false)}
                className="flex-1 py-3 bg-[#1e2d3d] hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
              >
                Dismiss
              </button>

              <button
                onClick={() => {
                  setShowLiquidityModal(false);
                  setSearchParams({ tab: 'otc' });
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-lg"
              >
                Go to OTC Desk
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-[#111827] border-b border-[#1e2d3d] px-6 py-4 flex items-center justify-between shrink-0 z-10 relative">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {activeView === 'dashboard' && 'Treasury Overview'}
              {activeView === 'engine' && 'The Spread Engine'}
              {activeView === 'otc' && 'OTC Rebalance Desk'}
              {activeView === 'terminal' && 'Execution Terminal'}
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">Mamlaka Global Treasury Operations</p>
          </div>

          <button
            onClick={toggleKillSwitch}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg border ${globalKillSwitch
                ? 'bg-red-600/20 text-red-500 border-red-500/50 animate-pulse'
                : 'bg-red-500 hover:bg-red-600 text-white border-red-600'
              }`}
          >
            <Power className="w-4 h-4" />
            {globalKillSwitch ? 'SYSTEM HALTED' : 'GLOBAL KILL SWITCH'}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative z-0">
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'engine' && renderSpreadEngine()}
          {activeView === 'otc' && renderOTCDesk()}
          {activeView === 'terminal' && renderTerminal()}
        </main>
      </div>
    </div>
  );
}