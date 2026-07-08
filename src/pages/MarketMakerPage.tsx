//@ts-nocheck

import React, { useState, useEffect } from 'react';
import {
  Activity, ArrowLeftRight, Settings,
  TrendingUp, AlertTriangle, RefreshCw, Power,
  ChevronDown, ChevronUp, DollarSign, Terminal,
  Clock, CheckCircle2, Wallet, Layers,
  Server, Smartphone, Radio, Coins, Network,
  CreditCard, Link2, ArrowRight, Play, Hexagon
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getTreasuryDashboard, simulateTreasurySwap, getLiveLedgerFeed, api } from '../api/client';

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
  { id: 'N11', name: 'Commodities Vault', desc: 'Tokenized Gold Reserves', category: 'Commodities', icon: Hexagon, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', dbKey: 'N11_GOLD', currency: 'GOLD (OZ)' },
  { id: 'N12', name: 'Yeshara Protocol', desc: 'Custom Platform Utility Token', category: 'Web3', icon: Coins, color: 'text-pink-400', bg: 'bg-pink-400/10 border-pink-400/20', dbKey: 'N12_YESHARA', currency: 'YESHARA' },
];

const NODE_CATEGORIES = [
  { id: 'Mobile Money', label: 'Mobile Money Liquidity', icon: Smartphone, color: 'text-emerald-400' },
  { id: 'Airtime', label: 'Airtime Liquidity', icon: Radio, color: 'text-blue-400' },
  { id: 'Web3', label: 'Web3 Blockchain', icon: Coins, color: 'text-indigo-400' },
  { id: 'Payments', label: 'Cross-Border & PSP', icon: CreditCard, color: 'text-orange-400' },
  { id: 'Commodities', label: 'Commodities Vault', icon: Hexagon, color: 'text-yellow-400' }
];

export default function MarketMakerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('tab') || 'dashboard';

  const [globalKillSwitch, setGlobalKillSwitch] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);

  // Market Maker Spread State
  const [usdaRoute, setUsdaRoute] = useState({ active: true, autoPeg: true, bid: 128.00, ask: 132.00 });
  const binanceRate = 130.50;
  const cbkRate = 129.50; // Updated to 129.50 per user instruction

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simAmount, setSimAmount] = useState('100');
  const [simPair, setSimPair] = useState('USDA_KES');

  // Corridor Opportunity State
  const [activeOpp, setActiveOpp] = useState<'telkom' | 'airtime_celo'>('airtime_celo');

  // --- NEW: Visual HUD Tracking States ---
  const [isExecutingCorridor, setIsExecutingCorridor] = useState(false);
  const [deployAmountKes, setDeployAmountKes] = useState('50'); // Defaults to 50 KES
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  // Backend Feeds
  const [dbVaults, setDbVaults] = useState<any>({});
  const [dbSettlements, setDbSettlements] = useState<any[]>([]);
  const [liveTape, setLiveTape] = useState<any[]>([]);

  // Accordion State
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

  const toggleKillSwitch = () => {
    setGlobalKillSwitch(!globalKillSwitch);
    api.post('/api/treasury/kill-switch', { active: !globalKillSwitch }).catch(console.error);
  };

  const fmt = (n: number) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fetchDashboardData = async () => {
    try {
      const [dashRes, ledgerRes] = await Promise.allSettled([
        getTreasuryDashboard(),
        getLiveLedgerFeed(25)
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = (dashRes.value as any).data;
        if (d?.status === 'success') {
          setDbVaults(d.vaults || {});
          setDbSettlements(d.settlements || []);
        }
      }
      if (ledgerRes.status === 'fulfilled') {
        const l = (ledgerRes.value as any).data;
        if (l?.feed) {
          setLiveTape(l.feed);
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSimulateTrade = async () => {
    if (!simAmount || isNaN(Number(simAmount))) return;
    setIsSimulating(true);
    const [fromAsset, toAsset] = simPair.split('_');

    try {
      await simulateTreasurySwap({
        user_id: "test_user_123",
        from_asset: fromAsset,
        to_asset: toAsset,
        amount: parseFloat(simAmount)
      });
      await fetchDashboardData();
    } catch (error) {
      console.error("Simulation failed", error);
      alert("Simulation failed. Check backend logs.");
    } finally {
      setIsSimulating(false);
    }
  };

  // =========================================================================
  // THE VISUAL ORCHESTRATOR
  // This simulates the timeline of the execution on the UI, then calls the backend.
  // =========================================================================
  const handleExecuteCorridor = async () => {
    if (activeOpp !== 'airtime_celo') {
      alert("Only the Airtel -> Celo corridor is wired for live API execution in this demo!");
      return;
    }

    const amt = parseFloat(deployAmountKes);
    if (!amt || amt <= 0) {
      alert("Please enter a valid KES amount to deploy.");
      return;
    }

    setIsExecutingCorridor(true);
    setDeployLogs([]);

    // UI Math Pre-Calculation
    const startingUsd = amt / cbkRate;
    const faceValue = amt / (1 - 0.06);
    const mintedUsda = faceValue / cbkRate;
    const profitUsda = mintedUsda - startingUsd;

    // --- STEP 1: PROCURE ---
    setActiveNode('N2');
    setDeployLogs(prev => [...prev, `[1/4] Deployed ${amt.toFixed(2)} KES ($${startingUsd.toFixed(4)} USD). Procuring Airtel Airtime...`]);
    await new Promise(r => setTimeout(r, 1500));

    // --- STEP 2: DISCOUNT APPLIED ---
    setDeployLogs(prev => [...prev, `[2/4] 6% B2B Wholesale Discount Applied. Received ${faceValue.toFixed(2)} KES Face Value.`]);
    await new Promise(r => setTimeout(r, 1500));

    // --- STEP 3: MINT ---
    setActiveNode('N7');
    setDeployLogs(prev => [...prev, `[3/4] Liquidating fresh ${faceValue.toFixed(2)} Airtime at CBK 129.50. Minted $${mintedUsda.toFixed(4)} USDA.`]);
    await new Promise(r => setTimeout(r, 1500));

    // --- STEP 4: CELO EXIT ---
    setActiveNode('N9');
    setDeployLogs(prev => [...prev, `[4/4] Yield Captured: +$${profitUsda.toFixed(4)} USDA. Executing Celo Web3 Exit...`]);

    try {
      // 🚀 Send KES to the backend API
      const response = await api.post('/api/treasury/corridor/airtime-celo', { amount_kes: amt });
      const txHash = response.data.data.tx_hash;

      setDeployLogs(prev => [...prev, `✅ [SUCCESS] On-chain settlement confirmed!`]);
      setDeployLogs(prev => [...prev, `🔗 TxHash: ${txHash}`]);

      // Inject into Terminal Local State immediately so the admin sees the receipt
      const newTerminalLog = {
        id: `tx-UI-${Date.now().toString().slice(-6)}`,
        time: new Date().toLocaleTimeString(),
        from: 'N2_AIRTEL',
        to: 'N9_CELO',
        amount: `${amt.toFixed(2)} KES`,
        intValue: `$${mintedUsda.toFixed(4)}`,
        type: 'CELO_EXIT',
        typeColor: 'text-purple-400'
      };
      setLiveTape(prev => [newTerminalLog, ...prev]);

      await fetchDashboardData();
    } catch (error: any) {
      console.error(error);
      const serverError = error.response?.data?.detail || error.message || "Unknown execution error";
      setDeployLogs(prev => [...prev, `❌ [FAILED] Web3 execution reverted. Reason: ${serverError}`]);
    } finally {
      // Reset UI after 6 seconds
      setTimeout(() => {
        setIsExecutingCorridor(false);
        setActiveNode(null);
        setDeployLogs([]);
      }, 6000);
    }
  };

  // Live Balances mapped from DB
  const usdaBal = dbVaults['N7_USDA'] || 0;
  const kesBal = dbVaults['N4_MPESA'] || 0;
  const impBal = dbVaults['N8_IMP'] || 0;
  const airtBal = (dbVaults['N1_TELKOM'] || 0) + (dbVaults['N2_AIRTEL'] || 0) + (dbVaults['N3_SAFARICOM'] || 0);
  const xlmBal = dbVaults['N9_XLM'] || 0;
  const usdBal = dbVaults['N10_USD'] || 0;
  const goldBal = dbVaults['N11_GOLD'] || 0;

  const totalPortfolioUSD = usdaBal + (kesBal / 130.50) + impBal + (airtBal / 130.50) + (xlmBal * 0.10) + usdBal + (goldBal * 2400);

  // ==========================================
  // RENDER 1: TREASURY DASHBOARD
  // ==========================================
  const renderDashboard = () => {
    const VAULTS = [
      { id: 'USDA', name: 'USDA', desc: 'Master Wallet', balance: usdaBal, usdValue: usdaBal, color: 'bg-blue-500' },
      { id: 'KES', name: 'KES (Fiat)', desc: 'Mobile Money', balance: kesBal, usdValue: kesBal / 130.50, color: 'bg-emerald-500' },
      { id: 'IMP', name: 'IMP', desc: 'Impala Coin Treasury', balance: impBal, usdValue: impBal, color: 'bg-purple-500' },
      { id: 'AIRT', name: 'AIRT', desc: 'Telco Airtime', balance: airtBal, usdValue: airtBal / 130.50, color: 'bg-orange-500' },
      { id: 'XLM', name: 'XLM', desc: 'Stellar Router', balance: xlmBal, usdValue: xlmBal * 0.10, color: 'bg-cyan-500' },
      { id: 'USD', name: 'USD', desc: 'Virtual Cards', balance: usdBal, usdValue: usdBal, color: 'bg-slate-400' },
      { id: 'GOLD', name: 'GOLD', desc: 'Commodities Vault', balance: goldBal, usdValue: goldBal * 2400, color: 'bg-yellow-500' },
    ];

    return (
      <div className={`space-y-6 transition-opacity duration-500 ${isDashboardLoading ? 'opacity-60' : 'opacity-100'} animate-in fade-in`}>

        {/* MANUAL SIMULATOR */}
        <div className="bg-[#151c2f] border border-[#2a3754] rounded-2xl p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10 shrink-0">
            <button className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30 hover:bg-blue-600/30 transition-colors group">
              <Play className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform ml-1" fill="currentColor" />
            </button>
            <div>
              <h3 className="text-white font-bold text-base tracking-wide">Manual Simulator</h3>
              <p className="text-sm text-slate-400 mt-0.5">Inject mock volume to test node thresholds.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto relative z-10">
            <input
              type="number"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              className="bg-[#0b0f19] border border-[#2a3754] text-white text-sm rounded-lg px-4 py-2.5 w-full sm:w-32 outline-none focus:border-blue-500 font-mono shadow-inner"
            />
            <select
              value={simPair}
              onChange={(e) => setSimPair(e.target.value)}
              className="bg-[#0b0f19] border border-[#2a3754] text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 cursor-pointer w-full sm:w-56"
            >
              <optgroup label="Mobile Money Ramps">
                <option value="USDA_KES">USDA → M-Pesa (N4)</option>
                <option value="KES_USDA">M-Pesa (N4) → USDA</option>
              </optgroup>
              <optgroup label="Synthetic Minting (Airtime)">
                <option value="AIRT_IMP">Safaricom Airtime → IMP (N3)</option>
                <option value="IMP_AIRT">IMP → Safaricom Airtime (N3)</option>
              </optgroup>
            </select>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleSimulateTrade}
                disabled={isSimulating}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 whitespace-nowrap"
              >
                {isSimulating ? 'Running...' : 'Execute Test'}
              </button>
            </div>
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
            <p className="text-3xl font-bold text-white font-mono">{fmt(airtBal)}</p>
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Live Vault Allocation</h2>
              <button onClick={() => setSearchParams({ tab: 'otc' })} className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                Manage liquidity <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-0">
              {VAULTS.map((vault) => {
                const pct = totalPortfolioUSD > 0 ? (vault.usdValue / totalPortfolioUSD) * 100 : 0;
                const isWarning = pct > 0 && pct < 15;
                return (
                  <div key={vault.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 py-3.5 border-b border-[#1e2d3d]/60 last:border-0 ${isWarning ? 'bg-red-500/5 -mx-4 px-4 rounded-lg' : ''}`}>
                    <div className="w-full sm:w-44 shrink-0 flex items-center gap-3">
                      <div className="px-2.5 py-1 rounded bg-[#1e293b] border border-[#2a3754] text-[10px] font-bold text-slate-300 w-12 text-center">{vault.id}</div>
                      <div>
                        <h3 className="text-white font-bold text-sm flex items-center gap-1.5 tracking-wide">
                          {vault.name}
                          {isWarning && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">{vault.desc}</p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-4 w-full">
                      <div className="h-1.5 flex-1 bg-[#1e293b] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isWarning ? 'bg-red-500' : vault.color}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                      </div>
                      <span className={`text-[11px] font-mono font-bold w-12 text-right ${isWarning ? 'text-red-400' : 'text-slate-400'}`}>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full sm:w-32 shrink-0 sm:text-right flex justify-between sm:block">
                      <p className={`font-mono font-bold text-[15px] ${isWarning ? 'text-red-400' : 'text-white'}`}>{fmt(vault.balance)}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">≈ ${fmt(vault.usdValue)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ORACLE SYNC */}
          <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-lg flex flex-col">
            <h2 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-6">Oracle Sync</h2>

            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">System Collateralization</p>
              <p className="text-5xl font-extrabold text-emerald-400 tracking-tighter">
                {impBal > 0 ? (((airtBal / cbkRate * 0.95) / impBal) * 100).toFixed(1) : '285.0'}%
              </p>
            </div>

            <div className="space-y-5 mb-8 flex-1">
              <div className="flex justify-between items-center pb-3 border-b border-[#1e2d3d]">
                <span className="text-xs text-slate-400 font-medium">Airtime Reserve (Haircut)</span>
                <span className="text-sm text-white font-mono font-bold">${fmt(airtBal / cbkRate * 0.95)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[#1e2d3d]">
                <span className="text-xs text-slate-400 font-medium">IMP Minted (Circulation)</span>
                <span className="text-sm text-white font-mono font-bold">${fmt(impBal)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-400 font-medium">Oracle Status</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold tracking-widest uppercase">SYNCED</span>
              </div>
            </div>
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
                                <p className={`font-mono font-bold text-sm ${isOnline ? 'text-white' : 'text-slate-500'}`}>{fmt(liveBalance)}</p>
                                <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isOnline ? node.color : 'text-slate-600'}`}>{node.currency}</p>
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
      </div>
    );
  };

  // =========================================================================
  // RENDER 2: CORRIDOR + COMPOUND
  // 
  // Contains the visual state machine trace HUD.
  // =========================================================================
  const renderCorridor = () => {
    const isAirtimeCelo = activeOpp === 'airtime_celo';

    // Instantly calculate the math as the user types in the input box!
    const amt = parseFloat(deployAmountKes) || 0;
    const startingUsd = amt / cbkRate;
    const faceValue = amt / (1 - 0.06); // 6% Airtel Discount
    const mintedUsda = faceValue / cbkRate;
    const profitUsda = mintedUsda - startingUsd;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">

        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 border-b border-[#1e2d3d] pb-4 gap-4">
          <div>
            {isAirtimeCelo ? (
              <h2 className="text-sm font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                <span className="text-red-400">AIRTEL</span> <span className="text-slate-600">→</span>
                <span className="text-blue-400">USDA</span> <span className="text-slate-600">→</span>
                <span className="text-purple-400">CELO</span> <span className="text-slate-600">·</span>
                <span className="text-slate-400">CORRIDOR</span>
              </h2>
            ) : (
              <h2 className="text-sm font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                <span className="text-blue-400">TELKOM</span> <span className="text-slate-600">→</span>
                <span className="text-orange-400">T-KASH</span> <span className="text-slate-600">→</span>
                <span className="text-emerald-400">USDA</span> <span className="text-slate-600">→</span>
                <span className="text-purple-400">CELO</span> <span className="text-slate-600">·</span>
                <span className="text-slate-400">CORRIDOR</span>
              </h2>
            )}
            <p className="text-slate-400 text-sm tracking-wide">
              {isAirtimeCelo ? "Direct 1-cycle yield capture · minimal execution risk" : "5× internal rollovers · single Celo exit · zero external friction until cycle 5"}
            </p>
          </div>
          <div className="text-left md:text-right bg-[#111827] border border-[#1e2d3d] rounded-xl px-4 py-2">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-0.5">MULTIPLIER / CYCLE</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono">{isAirtimeCelo ? '1.0638×' : '1.2865×'}</p>
            <p className="text-[9px] text-slate-500 font-mono">{isAirtimeCelo ? '6% disc · 0 pip' : '10% disc · 5% FX · 0.1 pip'}</p>
          </div>
        </div>

        {/* Global Action Bar / Live Tracker */}
        <div className="bg-[#151c2f] border border-[#2a3754] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between shadow-xl mb-6 gap-4 min-h-[90px]">

          {/* Dynamic Left Content: Idle vs Executing */}
          {!isExecutingCorridor && deployLogs.length === 0 ? (
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/20 rounded-lg"><Activity className="w-5 h-5 text-blue-400" /></div>
              <div>
                <h3 className="text-white font-bold text-sm">Execution Engine Ready</h3>
                <p className="text-xs text-slate-400">Deploy capital directly into the active corridor.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full bg-[#040a0f] border border-[#1e2d3d] rounded-xl p-3 font-mono text-xs text-emerald-400 h-full overflow-y-auto custom-scrollbar shadow-inner">
              {deployLogs.map((log, idx) => (
                <div key={idx} className="mb-1 leading-relaxed opacity-90 animate-in slide-in-from-bottom-2">
                  {log}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 md:ml-4">
            <div className="relative">
              <input
                type="number"
                value={deployAmountKes}
                onChange={(e) => setDeployAmountKes(e.target.value)}
                disabled={isExecutingCorridor}
                className="bg-[#0b0f19] border border-[#2a3754] text-emerald-400 font-mono font-bold text-lg rounded-lg py-2.5 pl-4 pr-12 w-36 outline-none focus:border-blue-500 shadow-inner disabled:opacity-50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs uppercase tracking-wider pointer-events-none">KES</span>
            </div>

            <button
              onClick={handleExecuteCorridor}
              disabled={isExecutingCorridor}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-3 rounded-lg transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {isExecutingCorridor ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" fill="currentColor" />
              )}
              Deploy Live
            </button>
          </div>
        </div>

        {/* Visual Flow Map with Glowing Nodes */}
        <div className="flex flex-col xl:flex-row items-center gap-4 xl:gap-2 w-full overflow-x-auto pb-6 pt-2 custom-scrollbar px-2 min-h-[220px]">
          {isAirtimeCelo ? (
            <>
              {/* N2: AIRTEL (6% DISCOUNT) */}
              <div className={`border bg-[#1a0b0b] p-5 rounded-lg w-full xl:w-56 shrink-0 text-center flex flex-col items-center justify-center min-h-[160px] relative transition-all duration-500 ${activeNode === 'N2'
                  ? 'border-red-500 ring-2 ring-offset-4 ring-offset-[#0b0f19] ring-red-500/50 scale-105 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                  : 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:border-red-400'
                }`}
              >
                <div className="absolute -top-3 px-3 py-1 bg-[#1a0b0b] border border-red-500/50 rounded-full text-red-400 font-bold text-[10px] tracking-widest uppercase">Procure</div>
                <h4 className="text-red-400 font-bold text-2xl mb-3 font-mono mt-2">N2</h4>
                <p className="text-slate-400 text-xs">Airtel 6% disc.</p>
                <p className="text-red-400 font-mono text-xs mt-2 bg-red-500/10 px-3 py-1 rounded">{amt.toFixed(2)} KES → {faceValue.toFixed(2)} KES</p>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 xl:rotate-0 shrink-0" />

              {/* N7: USDA */}
              <div className={`border bg-[#061022] p-5 rounded-lg w-full xl:w-56 shrink-0 text-center flex flex-col items-center justify-center min-h-[160px] relative transition-all duration-500 ${activeNode === 'N7'
                  ? 'border-blue-500 ring-2 ring-offset-4 ring-offset-[#0b0f19] ring-blue-500/50 scale-105 shadow-[0_0_30px_rgba(59,130,246,0.2)]'
                  : 'border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:border-blue-400'
                }`}
              >
                <div className="absolute -top-3 px-3 py-1 bg-[#061022] border border-blue-500/50 rounded-full text-blue-400 font-bold text-[10px] tracking-widest uppercase">Mint USDA</div>
                <h4 className="text-blue-400 font-bold text-2xl mb-3 font-mono mt-2">N7</h4>
                <p className="text-slate-400 text-xs">Internal Realization</p>
                <p className="text-blue-400 font-mono text-xs mt-2 bg-blue-500/10 px-3 py-1 rounded">{cbkRate.toFixed(2)} KES/USD</p>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 xl:rotate-0 shrink-0" />

              {/* N9: CELO EXIT */}
              <div className={`border bg-[#10071a] p-5 rounded-lg w-full xl:w-56 shrink-0 text-center flex flex-col items-center justify-center min-h-[160px] relative transition-all duration-500 ${activeNode === 'N9'
                  ? 'border-purple-500 ring-2 ring-offset-4 ring-offset-[#0b0f19] ring-purple-500/50 scale-105 shadow-[0_0_30px_rgba(168,85,247,0.2)]'
                  : 'border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:border-purple-400'
                }`}
              >
                <div className="absolute -top-3 px-3 py-1 bg-[#10071a] border border-purple-500/50 rounded-full text-purple-400 font-bold text-[10px] tracking-widest uppercase">Celo Exit</div>
                <h4 className="text-purple-400 font-bold text-2xl mb-3 font-mono mt-2">N9</h4>
                <p className="text-slate-400 text-xs">Single Cycle Exit</p>
                <p className="text-purple-400 font-mono text-xs mt-2 bg-purple-500/10 px-3 py-1 rounded">USDA → USDC</p>
              </div>
            </>
          ) : (
            <>
              {/* Fallback Telkom Route Render... */}
              <div className="border border-blue-500/30 bg-[#061022] p-5 rounded-lg w-full xl:w-56 shrink-0 text-center flex flex-col items-center justify-center min-h-[160px] shadow-[0_0_20px_rgba(37,99,235,0.1)] relative group hover:border-blue-400 transition-colors">
                <div className="absolute -top-3 px-3 py-1 bg-[#061022] border border-blue-500/50 rounded-full text-blue-400 font-bold text-[10px] tracking-widest uppercase">Procure</div>
                <h4 className="text-blue-400 font-bold text-2xl mb-3 font-mono mt-2">N1</h4>
                <p className="text-slate-400 text-xs">Telkom 10% disc.</p>
                <p className="text-blue-400 font-mono text-xs mt-2 bg-blue-500/10 px-3 py-1 rounded">$100 → 13,888 KES</p>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 xl:rotate-0 shrink-0" />

              <div className="border border-orange-500/30 bg-[#140b05] p-5 rounded-lg w-full xl:w-56 shrink-0 text-center flex flex-col items-center justify-center min-h-[160px] shadow-[0_0_20px_rgba(249,115,22,0.1)] relative group hover:border-orange-400 transition-colors">
                <div className="absolute -top-3 px-3 py-1 bg-[#140b05] border border-orange-500/50 rounded-full text-orange-400 font-bold text-[10px] tracking-widest uppercase">Liquidate</div>
                <h4 className="text-orange-400 font-bold text-2xl mb-3 font-mono mt-2">N4</h4>
                <p className="text-slate-400 text-xs">T-Kash Super-Agent</p>
                <p className="text-orange-400 font-mono text-xs mt-2 bg-orange-500/10 px-3 py-1 rounded">Airtime → Hard Float</p>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 xl:rotate-0 shrink-0" />

              <div className="border border-emerald-500/30 bg-[#05130d] p-5 rounded-lg w-full xl:w-56 shrink-0 text-center flex flex-col items-center justify-center min-h-[160px] shadow-[0_0_20px_rgba(16,185,129,0.1)] relative group hover:border-emerald-400 transition-colors">
                <div className="absolute -top-3 px-3 py-1 bg-[#05130d] border border-emerald-500/50 rounded-full text-emerald-400 font-bold text-[10px] tracking-widest uppercase">Mint USDA</div>
                <h4 className="text-emerald-400 font-bold text-2xl mb-3 font-mono mt-2">N7</h4>
                <p className="text-slate-400 text-xs">+0.1 pip · 5% FX</p>
                <p className="text-emerald-400 font-mono text-xs mt-2 bg-emerald-500/10 px-3 py-1 rounded">{cbkRate.toFixed(2)} KES/USD</p>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 xl:rotate-0 shrink-0" />

              <div className="border border-purple-500/50 bg-[#10071a] p-5 rounded-lg w-full xl:w-56 shrink-0 text-center flex flex-col items-center justify-center min-h-[160px] shadow-[0_0_25px_rgba(168,85,247,0.2)] relative group hover:border-purple-400 transition-colors">
                <div className="absolute -top-3 px-3 py-1 bg-[#10071a] border border-purple-500/80 rounded-full text-purple-400 font-bold text-[10px] tracking-widest uppercase flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Rollover
                </div>
                <h4 className="text-purple-400 font-bold text-3xl mb-3 mt-2">↻</h4>
                <p className="text-slate-400 text-xs">Cycle 4/5 internal</p>
                <p className="text-purple-400 font-mono text-xs mt-2 bg-purple-500/10 px-3 py-1 rounded">No blockchain touch</p>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 xl:rotate-0 shrink-0" />

              <div className="border border-[#1e2d3d] bg-[#0d1420] p-5 rounded-lg w-full xl:w-56 shrink-0 text-center flex flex-col items-center justify-center min-h-[160px] shadow-lg relative group transition-colors opacity-50">
                <div className="absolute -top-3 px-3 py-1 bg-[#0d1420] border border-[#1e2d3d] rounded-full text-slate-400 font-bold text-[10px] tracking-widest uppercase">Celo Exit</div>
                <h4 className="text-slate-500 font-bold text-2xl mb-3 font-mono mt-2">N9</h4>
                <p className="text-slate-500 text-xs">Cycle 5 only</p>
                <p className="text-slate-400 font-mono text-xs mt-2 bg-[#111827] border border-[#1e2d3d] px-3 py-1 rounded">USDA → USDC</p>
              </div>
            </>
          )}
        </div>

        {/* Grid for Bottom Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Compounding Table */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">
                {isAirtimeCelo ? "1× Direct Execution" : "5× Rollover Compounding"}
              </h3>
              <span className="text-[11px] font-bold text-emerald-400 font-mono">
                {isAirtimeCelo ? `${amt.toFixed(2)} KES → ${faceValue.toFixed(2)} KES` : "$100 → $352.32"}
              </span>
            </div>
            <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-[11px] font-mono whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[#1e2d3d] text-slate-500">
                    <th className="p-3 font-normal">CYCLE</th>
                    <th className="p-3 font-normal">START KES</th>
                    <th className="p-3 font-normal">KES FLOAT</th>
                    <th className="p-3 font-normal">USDA MINTED</th>
                    <th className="p-3 font-normal text-right">PROFIT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d3d]/50 text-slate-300">
                  {isAirtimeCelo ? (
                    <>
                      <tr className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                        <td className="p-3 text-emerald-400 font-bold">• C1</td>
                        <td className="p-3 font-bold text-white">{amt.toFixed(2)}</td>
                        <td className="p-3 font-bold text-emerald-400">{faceValue.toFixed(2)} KES</td>
                        <td className="p-3 font-bold text-emerald-400">${mintedUsda.toFixed(4)}</td>
                        <td className="p-3 font-bold text-emerald-400 text-right">+${profitUsda.toFixed(4)}</td>
                      </tr>
                      <tr className="border-t-2 border-[#1e2d3d] font-bold">
                        <td className="p-3 text-slate-500 uppercase tracking-widest font-sans text-[10px]">Total</td>
                        <td className="p-3 text-white">{amt.toFixed(2)}</td>
                        <td className="p-3 text-slate-500">1× direct</td>
                        <td className="p-3 text-emerald-400">${mintedUsda.toFixed(4)}</td>
                        <td className="p-3 text-emerald-400 text-right">+${profitUsda.toFixed(4)}</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className="hover:bg-[#1a2638] transition-colors">
                        <td className="p-3 text-slate-500">✓ C1</td>
                        <td className="p-3">100.00</td>
                        <td className="p-3 text-orange-400/80">138.88 KES</td>
                        <td className="p-3">$128.65</td>
                        <td className="p-3 text-emerald-400/80 text-right">+$28.65</td>
                      </tr>
                      <tr className="hover:bg-[#1a2638] transition-colors">
                        <td className="p-3 text-slate-500">✓ C2</td>
                        <td className="p-3">128.65</td>
                        <td className="p-3 text-orange-400/80">178.68 KES</td>
                        <td className="p-3">$165.51</td>
                        <td className="p-3 text-emerald-400/80 text-right">+$36.86</td>
                      </tr>
                      <tr className="border-t-2 border-[#1e2d3d] font-bold">
                        <td className="p-3 text-slate-500 uppercase tracking-widest font-sans text-[10px]">Total</td>
                        <td className="p-3 text-white">100.00</td>
                        <td className="p-3 text-slate-500">5× internal</td>
                        <td className="p-3 text-emerald-400">$352.32</td>
                        <td className="p-3 text-emerald-400 text-right">+$252.32</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Price Discovery & Opportunities */}
          <div className="space-y-6">

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">PRICE DISCOVERY ENGINE</h3>
                <span className="text-[11px] font-bold text-emerald-400 font-mono">
                  {cbkRate.toFixed(2)} <span className="text-slate-500">KES/USD</span>
                </span>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-emerald-400/50 to-transparent rounded-full mb-3" />

              <div className="grid grid-cols-2 gap-px bg-[#1e2d3d] border border-[#1e2d3d] rounded-xl overflow-hidden text-[11px] font-mono">
                <div className="bg-[#0b0f19] p-3 flex justify-between">
                  <span className="text-slate-500">Discount Rate</span>
                  <span className="text-emerald-400 font-bold">{isAirtimeCelo ? '6%' : '10%'}</span>
                </div>
                <div className="bg-[#0b0f19] p-3 flex justify-between">
                  <span className="text-slate-500">FX Edge</span>
                  <span className="text-emerald-400 font-bold">{isAirtimeCelo ? '0%' : '5%'}</span>
                </div>
                <div className="bg-[#0b0f19] p-3 flex justify-between col-span-2">
                  <span className="text-slate-500">Exit Gate</span>
                  <span className="text-purple-400 font-bold">{isAirtimeCelo ? 'CYCLE 1' : 'CYCLE 5'}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3">RANKED OPPORTUNITIES</h3>
              <div className="space-y-2">
                <div
                  onClick={() => setActiveOpp('airtime_celo')}
                  className={`border rounded-xl p-3 flex justify-between items-center group cursor-pointer transition-colors ${activeOpp === 'airtime_celo' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#111827] border-[#1e2d3d] hover:bg-[#1a2638] opacity-70'}`}
                >
                  <div>
                    <p className={`text-sm font-bold mb-1 ${activeOpp === 'airtime_celo' ? 'text-emerald-400' : 'text-slate-300'}`}>Airtel → USDA → Celo Exit</p>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">PATH: N2-N7-N9  RSK 2%  LIQ 98</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${activeOpp === 'airtime_celo' ? 'text-emerald-400' : 'text-orange-400'}`}>+6.38%</p>
                    {activeOpp === 'airtime_celo' && <p className="text-[10px] text-emerald-500/70 font-bold tracking-widest uppercase flex items-center justify-end gap-1"><Play className="w-3 h-3" fill="currentColor" /> SELECTED</p>}
                  </div>
                </div>

                <div
                  onClick={() => setActiveOpp('telkom')}
                  className={`border rounded-xl p-3 flex justify-between items-center group cursor-pointer transition-colors ${activeOpp === 'telkom' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#111827] border-[#1e2d3d] hover:bg-[#1a2638] opacity-70'}`}
                >
                  <div>
                    <p className={`text-sm font-bold mb-1 ${activeOpp === 'telkom' ? 'text-emerald-400' : 'text-slate-300'}`}>Telkom → T-Kash → USDA → ×5 Rollover → Celo</p>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">PATH: N1-N4-N7-N9  RSK 10%  LIQ 91</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${activeOpp === 'telkom' ? 'text-emerald-400' : 'text-slate-300'}`}>+252.32%</p>
                    {activeOpp === 'telkom' && <p className="text-[10px] text-emerald-500/70 font-bold tracking-widest uppercase flex items-center justify-end gap-1"><Play className="w-3 h-3" fill="currentColor" /> SELECTED</p>}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // PAGE 3: SPREAD ENGINE
  // ==========================================
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
          <p className="text-2xl font-bold text-gray-400 font-mono">{fmt(cbkRate)} KES</p>
        </div>
      </div>

      <h2 className="text-lg font-medium text-white flex items-center gap-2 pt-2">
        <Settings className="w-5 h-5 text-blue-400" />
        Pricing Configuration
      </h2>

      <div className={`bg-[#111827] border rounded-2xl p-6 transition-colors shadow-xl ${!usdaRoute.active || globalKillSwitch ? 'border-red-500/50 opacity-80' : 'border-[#1e2d3d]'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
              <ArrowLeftRight className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                USDA <span className="text-gray-500">↔</span> KES
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Core Remittance Route</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <label className="flex items-center gap-2 cursor-pointer bg-[#0d1420] px-3 py-2 rounded-lg border border-[#1e2d3d]">
              <span className="text-xs font-semibold text-gray-300">Auto-Peg to Binance</span>
              <input type="checkbox" className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-500" checked={usdaRoute.autoPeg} onChange={() => setUsdaRoute({ ...usdaRoute, autoPeg: !usdaRoute.autoPeg })} />
            </label>
            <button
              onClick={() => setUsdaRoute({ ...usdaRoute, active: !usdaRoute.active })}
              className={`text-xs px-4 py-2.5 rounded-lg border font-bold tracking-wide uppercase whitespace-nowrap ${usdaRoute.active && !globalKillSwitch ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
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

  // ==========================================
  // PAGE 4: OTC REBALANCE DESK
  // ==========================================
  const renderOTCDesk = () => {
    const mobileMoney = dbVaults['N4_MPESA'] || 0;

    return (
      <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 bg-red-500/20 rounded-lg shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-red-400 font-bold text-lg">Action Required: Liquidity Imbalance</h3>
              <p className="text-sm text-gray-400">KES Paybill is dropping rapidly based on current USDA sell volume.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 bg-[#0b0f17]/50 p-4 rounded-xl border border-red-500/10 relative z-10">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Target Float</p>
              <p className="text-xl font-mono text-gray-300">10,000,000 <span className="text-sm">KES</span></p>
            </div>
            <div>
              <p className="text-xs text-red-500 uppercase font-bold tracking-wider mb-1">Current Balance</p>
              <p className="text-xl font-mono text-red-400 font-bold">{fmt(mobileMoney)} <span className="text-sm">KES</span></p>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-xl">
          <h3 className="text-white font-bold text-lg mb-2">Log Fiat Rebalance</h3>
          <p className="text-sm text-gray-400 mb-6">
            Record a real-world bank transfer or Binance P2P transaction to rebalance the internal system vaults.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Asset Withdrawn</label>
                <select className="w-full bg-[#0d1420] border border-[#1e2d3d] rounded-xl py-3 px-4 text-white font-medium outline-none cursor-pointer">
                  <option>USDA (Master Wallet)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Amount</label>
                <input type="number" placeholder="e.g. 5000" className="w-full bg-[#0d1420] border border-[#1e2d3d] rounded-xl py-3 px-4 text-white font-mono outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="flex justify-center py-2">
              <ArrowLeftRight className="w-6 h-6 text-gray-600 rotate-90 sm:rotate-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Asset Deposited</label>
                <select className="w-full bg-[#0d1420] border border-[#1e2d3d] rounded-xl py-3 px-4 text-white font-medium outline-none cursor-pointer">
                  <option>KES (M-Pesa Paybill)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Amount Received</label>
                <input type="number" placeholder="e.g. 650000" className="w-full bg-[#0d1420] border border-[#1e2d3d] rounded-xl py-3 px-4 text-white font-mono outline-none focus:border-blue-500" />
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

  // ==========================================
  // PAGE 5: EXECUTION TERMINAL
  // ==========================================
  const renderTerminal = () => (
    <div className="space-y-6 animate-in fade-in duration-300">

      <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[#1e2d3d] flex items-center gap-3">
          <Terminal className="w-5 h-5 text-indigo-400" />
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

      <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl flex flex-col max-h-[800px]">
        <div className="p-5 border-b border-[#1e2d3d] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[#060c11] shrink-0">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Execution Tape (HFT Output)</h2>
          </div>
          <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase bg-[#0d1420] px-2 py-1 rounded border border-[#1e2d3d]">WSS://LEDGER.MAMLAKA.COM</span>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar bg-[#060c11]">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-[#1e2d3d] text-[10px] text-[#4a728f] uppercase tracking-widest font-bold bg-[#040a0f] sticky top-0 z-10">
              <div className="col-span-2">TIME</div>
              <div className="col-span-2">ID</div>
              <div className="col-span-1">FROM</div>
              <div className="col-span-1">TO</div>
              <div className="col-span-3 text-right">AMOUNT</div>
              <div className="col-span-2 text-right">INT.VALUE</div>
              <div className="col-span-1 pl-6">TYPE</div>
            </div>

            <div className="divide-y divide-[#1e2d3d]/30">
              {liveTape.map((log: any, i: number) => (
                <div key={log.id || i} className="grid grid-cols-12 gap-4 p-3 text-[11px] font-mono text-[#8ba3b8] hover:bg-[#162a36]/40 transition-colors group cursor-default">
                  <div className="col-span-2 tracking-tight group-hover:text-white transition-colors">{log.time}</div>
                  <div className="col-span-2 text-slate-500 truncate">{log.id}</div>

                  <div className="col-span-1 text-white font-bold truncate">{log.from}</div>
                  <div className="col-span-1 text-white font-bold flex items-center gap-2 truncate">
                    <span className="text-[#4a728f]">→</span> {log.to}
                  </div>

                  <div className="col-span-3 text-right text-gray-300 font-bold truncate">{log.amount}</div>
                  <div className="col-span-2 text-right text-emerald-400 font-bold tracking-wide truncate">{log.intValue}</div>

                  <div className={`col-span-1 pl-6 ${log.typeColor} flex items-center justify-between font-bold`}>
                    {log.type}
                    <span className="w-1.5 h-1.5 bg-current rounded-full shadow-[0_0_8px_currentColor] animate-pulse shrink-0" />
                  </div>
                </div>
              ))}
              {liveTape.length === 0 && (
                <div className="p-10 text-center text-slate-500">
                  Waiting for the background Python HFT Bot to execute trades...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-200 flex flex-col">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <header className="bg-[#0b0f19] px-4 md:px-6 pt-6 pb-2 shrink-0">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 border-b border-[#1e2d3d] pb-5">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-widest flex items-center gap-2 md:gap-3 uppercase flex-wrap">
                <span className="text-slate-500">Internal</span> <span className="text-emerald-400">Market Maker</span> <span className="text-sm text-slate-500 font-mono normal-case">v3.0</span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold ml-0 md:ml-2 mt-2 md:mt-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-4 md:gap-8 text-right flex-wrap lg:flex-nowrap w-full lg:w-auto">
              <div className="hidden sm:block">
                <p className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-widest uppercase">KES/USD Internal</p>
                <p className="text-emerald-400 font-bold font-mono text-sm">{cbkRate.toFixed(2)}</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-widest uppercase">Active Cycle</p>
                <p className="text-purple-400 font-bold font-mono text-sm">4/5</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-widest uppercase">Cycle Capital</p>
                <p className="text-orange-400 font-bold font-mono text-sm">$212.93</p>
              </div>
              <div className="flex-1 sm:flex-none text-left sm:text-right">
                <p className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-widest uppercase">Pool Value</p>
                <p className="text-white font-bold font-mono text-sm">${fmt(totalPortfolioUSD)}</p>
              </div>

              <button
                onClick={toggleKillSwitch}
                className={`ml-0 lg:ml-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-lg border w-full sm:w-auto ${globalKillSwitch
                    ? 'bg-red-600/20 text-red-500 border-red-500/50 animate-pulse'
                    : 'bg-[#111827] hover:bg-red-500/10 text-red-500 border-red-500/30'
                  }`}
              >
                <Power className="w-4 h-4" />
                {globalKillSwitch ? 'SYSTEM HALTED' : 'KILL SWITCH'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto pt-4 custom-scrollbar">
            {[
              { id: 'dashboard', label: 'Vault Overview' },
              { id: 'corridor', label: 'Corridor + Compound' },
              { id: 'engine', label: 'Spread Engine' },
              { id: 'otc', label: 'OTC Desk' },
              { id: 'terminal', label: 'Execution Tape' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`pb-3 text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-colors relative whitespace-nowrap ${activeView === tab.id ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {tab.label}
                {activeView === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 rounded-t-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                )}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#0b0f19]">
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'corridor' && renderCorridor()}
          {activeView === 'engine' && renderSpreadEngine()}
          {activeView === 'otc' && renderOTCDesk()}
          {activeView === 'terminal' && renderTerminal()}
        </main>
      </div>
    </div>
  );
}