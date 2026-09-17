// @ts-nocheck

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, ArrowLeftRight, Settings,
  TrendingUp, AlertTriangle, RefreshCw, Power,
  ChevronDown, ChevronUp, TerminalSquare,
  Clock, Wallet, Layers,
  Server, Smartphone, Radio, Coins, Network,
  CreditCard, Link2, ArrowRight, Play,
  Repeat
} from 'lucide-react';

// imports for api router
import { useSearchParams } from 'react-router-dom';
import { getTreasuryDashboard, getLiveLedgerFeed, api } from '../api/client';

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
  { id: 'Celo', name: 'Celo Exit', desc: 'DEX Settlement Layer', category: 'Web3', icon: Link2, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', dbKey: 'CELO_USDC', currency: 'USDC' },
  { id: 'N10', name: 'PSP & Virtual Card Engine', desc: 'Global Card Settlement', category: 'Payments', icon: CreditCard, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', dbKey: 'N10_USD', currency: 'USD' },
  // 11th node — placeholder slot only. No provider, no credentials, no
  // real balance source anywhere in the backend yet (see /dashboard's
  // "N11_GOLD": 0.0, which nothing ever overwrites). Listed here so it's
  // visible (and honestly shown OFFLINE / $0.00) rather than silently
  // absent, the same fix already applied to N10.
  { id: 'N11', name: 'Commodities Vault', desc: 'Gold-Backed Reserve (not yet integrated)', category: 'Commodities', icon: Layers, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', dbKey: 'N11_GOLD', currency: 'GOLD' },
];

const NODE_CATEGORIES = [
  { id: 'Mobile Money', label: 'Mobile Money Liquidity', icon: Smartphone, color: 'text-emerald-400' },
  { id: 'Airtime', label: 'Airtime Liquidity', icon: Radio, color: 'text-blue-400' },
  { id: 'Web3', label: 'Web3 Blockchain', icon: Coins, color: 'text-indigo-400' },
  // N10 (PSP & Virtual Card Engine) has always had category: 'Payments' —
  // this entry was simply missing, so N10 never rendered in this section
  // at all, on any data.
  { id: 'Payments', label: 'Payments & Card Settlement', icon: CreditCard, color: 'text-orange-400' },
  { id: 'Commodities', label: 'Commodities', icon: Layers, color: 'text-amber-400' },
];

export default function MarketMakerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('tab') || 'dashboard';

  const [globalKillSwitch, setGlobalKillSwitch] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  // DYNAMIC BACKEND STATE
  const [opportunities, setOpportunities] = useState<any>(null);
  const [spreadConfig, setSpreadConfig] = useState({ active: true, autoPeg: true, bid: 128.00, ask: 132.00, reference: 130.50 });
  // Live KES/IMC rate read straight from Comet Engine's IMM (not admin-typed)
  // — separate from spreadConfig above, which stays the existing USDA/KES
  // admin-set peg. `error` carries Comet's own reason (e.g. "no rate set
  // for this pair" or a stale-rate refusal) so the UI can show it honestly
  // instead of silently falling back to a stale number.
  const [cometQuote, setCometQuote] = useState<{ rate: number | null; rateAge: string | null; error: string | null }>({
    rate: null, rateAge: null, error: null,
  });
  const [activeOpp, setActiveOpp] = useState<string>('');

  const [simCycle, setSimCycle] = useState<number>(4);
  const [isExecutingCorridor, setIsExecutingCorridor] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // AWAITING_OPPORTUNITY can legitimately hold a live run for minutes to a
  // day (see Brain_Engine/state_engine.py) — the status poll below keeps
  // going for as long as that takes, so it must stop touching state the
  // moment this page unmounts rather than assuming the run finishes while
  // the component is still around.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  const [deployAmountInput, setDeployAmountInput] = useState('100');
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const [dbVaults, setDbVaults] = useState<any>({});
  const [liveTape, setLiveTape] = useState<any[]>([]);

  // IMM per-node / per-corridor switches — gates both the autonomous
  // DecisionEngine (Brain_Engine/bot.py) and the manual Deploy button
  // (routes/treasury.py execute-hft), source of truth in node_registry.py
  const [immNodes, setImmNodes] = useState<any[]>([]);
  const [immCorridors, setImmCorridors] = useState<any[]>([]);
  const [immTogglingId, setImmTogglingId] = useState<string | null>(null);
  // N9 (Celo Exit) is the one node whose output is already a real
  // Comet-registered asset (USDC) — see market_maker.py's /n9-reference/comet.
  // Read-only price check, not tied to the 5s poll loop since it's a
  // secondary detail, not core dashboard state.
  const [n9CometRef, setN9CometRef] = useState<{ realUsdcBalance: number; quotedOut: number; quoteTo: string } | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Mobile Money': true,
    'Airtime': true,
    'Web3': true,
    'Payments': true,
    'Commodities': true,
  });

  const toggleCategory = (catId: string) => setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  const toggleKillSwitch = () => {
    setGlobalKillSwitch(!globalKillSwitch);
    api.post('/api/treasury/kill-switch', { active: !globalKillSwitch }).catch(console.error);
  };
  const fmt = (n: number) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fetchDashboardData = async () => {
    try {
      const [dashRes, ledgerRes, oppRes, spreadRes, immNodesRes, immCorridorsRes, cometRes] = await Promise.allSettled([
        getTreasuryDashboard(),
        getLiveLedgerFeed(25),
        api.get('/api/market-maker/opportunities'),
        api.get('/api/market-maker/spread'),
        api.get('/api/imm/nodes'),
        api.get('/api/imm/corridors'),
        api.get('/api/market-maker/spread/comet', { params: { base: 'KES', quote: 'IMC', amount_in: 1 } }),
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = (dashRes.value as any).data;
        if (d?.status === 'success') {
          setDbVaults(d.vaults || {});
        }
      }

      if (ledgerRes.status === 'fulfilled') {
        const l = (ledgerRes.value as any).data;
        if (l?.feed) setLiveTape(l.feed);
      }

      if (oppRes.status === 'fulfilled') {
        const o = oppRes.value.data;
        if (o?.opportunities) {
          setOpportunities(o.opportunities);
          // Default to first opportunity if not set
          setActiveOpp(prev => prev || Object.keys(o.opportunities)[0]);
        }
      }

      if (spreadRes.status === 'fulfilled') {
        const s = spreadRes.value.data;
        if (s) setSpreadConfig(s);
      }

      if (immNodesRes.status === 'fulfilled' && Array.isArray(immNodesRes.value.data)) {
        setImmNodes(immNodesRes.value.data);
      }

      if (immCorridorsRes.status === 'fulfilled' && Array.isArray(immCorridorsRes.value.data)) {
        setImmCorridors(immCorridorsRes.value.data);
      }

      if (cometRes.status === 'fulfilled') {
        const c = cometRes.value.data;
        setCometQuote({ rate: c?.rate ?? null, rateAge: c?.rateAge ?? null, error: null });
      } else {
        // 502 from our backend means Comet itself refused (no rate set, or
        // stale past its 60-min window) — surface that reason, don't guess.
        const detail = (cometRes.reason as any)?.response?.data?.detail;
        setCometQuote({ rate: null, rateAge: null, error: detail || 'Comet IMM unreachable' });
      }

    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchN9CometRef = async () => {
      try {
        const res = await api.get('/api/market-maker/n9-reference/comet', { params: { to_symbol: 'USDT' } });
        setN9CometRef(res.data);
      } catch {
        setN9CometRef(null); // real balance read or Comet AMM call failed — omit the badge, don't show a stale/fake number
      }
    };
    fetchN9CometRef();
    const id = setInterval(fetchN9CometRef, 30000); // slower cadence: this hits a live Celo RPC call server-side, not just a cache read
    return () => clearInterval(id);
  }, []);

  const handleSpreadUpdate = async (updates: any) => {
    const newConfig = { ...spreadConfig, ...updates };
    setSpreadConfig(newConfig);
    try {
      await api.post('/api/market-maker/spread', newConfig);
    } catch (err) {
      console.error("Failed to update spread configuration", err);
    }
  };

  const handleToggleImmNode = async (nodeId: string, nextEnabled: boolean) => {
    setImmTogglingId(`node:${nodeId}`);
    setImmNodes(prev => prev.map(n => n.id === nodeId ? { ...n, enabled: nextEnabled } : n));
    try {
      await api.post(`/api/imm/nodes/${nodeId}/enabled`, { enabled: nextEnabled });
      await fetchDashboardData(); // refresh corridor eligibility + opportunities, which may depend on this node
    } catch (err) {
      console.error('Failed to toggle IMM node', err);
      setImmNodes(prev => prev.map(n => n.id === nodeId ? { ...n, enabled: !nextEnabled } : n)); // revert on failure
    } finally {
      setImmTogglingId(null);
    }
  };

  const handleToggleImmCorridor = async (corridorId: string, nextEnabled: boolean) => {
    setImmTogglingId(`corridor:${corridorId}`);
    setImmCorridors(prev => prev.map(c => c.id === corridorId ? { ...c, corridorEnabled: nextEnabled } : c));
    try {
      await api.post(`/api/imm/corridors/${corridorId}/enabled`, { enabled: nextEnabled });
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to toggle IMM corridor', err);
      setImmCorridors(prev => prev.map(c => c.id === corridorId ? { ...c, corridorEnabled: !nextEnabled } : c)); // revert
    } finally {
      setImmTogglingId(null);
    }
  };

  // Polls GET /corridor/{run_id}/status until COMPLETED or HALTED, logging
  // each distinct (status, cycle) transition it observes — including
  // AWAITING_OPPORTUNITY holds, which can legitimately last minutes to a
  // day (Brain_Engine/state_engine.py) and are no longer something a
  // single blocking request could wait out. Stops touching component
  // state the moment the page unmounts; the run itself keeps going on the
  // server regardless (see workers/corridor_worker.py's resume sweep).
  const pollCorridorRun = async (runId: string, opp: any) => {
    let lastKey = '';
    while (isMountedRef.current) {
      const res = await api.get(`/api/treasury/corridor/${runId}/status`);
      const run = res.data;
      const key = `${run.status}:${run.currentCycle}`;

      if (key !== lastKey) {
        lastKey = key;
        if (run.status === 'PROCURE') setActiveNode(opp.nodes[0].id);
        else if (run.status === 'MINT') setActiveNode('N7');
        else if (run.status === 'AWAITING_OPPORTUNITY') setActiveNode(null);
        else if (run.status === 'CELO_EXIT' || run.status === 'COMPLETED') setActiveNode(opp.nodes[opp.nodes.length - 1].id);

        if (run.status === 'AWAITING_OPPORTUNITY') {
          setDeployLogs(prev => [...prev, `[C${run.currentCycle}] ⏸ AWAITING OPPORTUNITY — holding $${run.currentUsdPrincipal.toFixed(4)} USDA, no open corridor yet...`]);
        } else if (run.status === 'COMPLETED') {
          setDeployLogs(prev => [...prev,
            `✅ [SUCCESS] Live 5x Rollover Complete!`,
            `💰 Profit: +$${run.profit.toFixed(4)} USDC (final: $${run.finalUsd.toFixed(4)})`,
            `🔗 Check General Ledger for the Celo exit tx hash.`,
          ]);
        } else if (run.status === 'HALTED') {
          setDeployLogs(prev => [...prev, `❌ [FAILED] Corridor halted at cycle ${run.currentCycle}. Reason: ${run.haltReason || 'unknown'}`]);
        } else {
          setDeployLogs(prev => [...prev, `[C${run.currentCycle}] → ${run.status}`]);
        }
      }

      if (run.status === 'COMPLETED' || run.status === 'HALTED') return run;
      await new Promise(r => setTimeout(r, 1000));
    }
    return null; // page unmounted mid-run — the run itself is unaffected
  };

  const handleExecuteCorridor = async () => {
    const amt = parseFloat(deployAmountInput);
    if (!amt || amt <= 0) return alert("Please enter a valid amount.");
    if (!opportunities || !opportunities[activeOpp]) return;

    setIsExecutingCorridor(true);
    setDeployLogs([]);
    const opp = opportunities[activeOpp];

    setActiveNode(opp.nodes[0].id);
    setDeployLogs([`Deploying ${amt} ${opp.currency} — starting real 5x rollover via ${activeOpp}...`]);

    try {
      // 🟢 Starts the real 5-cycle HFTCorridorFSM (state_engine.py) as a
      // background task and returns immediately — the run can no longer be
      // awaited inside one request now that AWAITING_OPPORTUNITY can hold
      // for a long time. Poll for progress instead.
      const startRes = await api.post('/api/treasury/corridor/start', {
        amount: amt,
        corridor_id: activeOpp,
        currency: opp.currency,
      });
      const runId = startRes.data.run._id;
      setDeployLogs(prev => [...prev, `🆔 Run ${runId} started — polling live status...`]);

      await pollCorridorRun(runId, opp);
      await fetchDashboardData();
    } catch (error: any) {
      const serverError = error.response?.data?.detail || error.message || "Execution error";
      setDeployLogs(prev => [...prev, `❌ [FAILED] ${serverError}`]);
    } finally {
      if (isMountedRef.current) {
        setIsExecutingCorridor(false);
        setActiveNode(null);
      }
    }
  };

  // Drives the REAL corridor state machine (Brain_Engine/state_engine.py's
  // HFTCorridorFSM) with every external dependency swapped for a
  // deterministic fake — see Brain_Engine/simulate.py. No real airtime,
  // paybill balance, Cardano vault, or Celo broadcast is touched; nothing
  // here writes to the real ledger. Replays the returned step trace with a
  // short delay between entries so PROCURE -> LIQUIDATE -> MINT ->
  // AWAITING_OPPORTUNITY (hold/poll) -> ... -> CELO_EXIT is visible on the
  // flow map and terminal log, not just a instant jump to the result.
  const handleSimulateCorridor = async () => {
    const amt = parseFloat(deployAmountInput);
    if (!amt || amt <= 0) return alert("Please enter a valid amount.");
    if (!opportunities || !opportunities[activeOpp]) return;

    setIsSimulating(true);
    setDeployLogs([`🧪 SIMULATION MODE — mocked nodes, no real airtime/paybill/Cardano/Celo calls`]);
    setActiveNode(null);
    const opp = opportunities[activeOpp];

    try {
      const response = await api.post('/api/treasury/corridor/simulate-5x', {
        amount: amt,
        currency: opp.currency,
      });
      const result = response.data;

      for (const step of result.steps) {
        if (step.type === 'STATE_CHANGE') {
          if (step.to === 'PROCURE') setActiveNode(opp.nodes[0].id);
          else if (step.to === 'MINT') setActiveNode('N7');
          else if (step.to === 'AWAITING_OPPORTUNITY') setActiveNode(null);
          else if (step.to === 'CELO_EXIT' || step.to === 'COMPLETED') setActiveNode(opp.nodes[opp.nodes.length - 1].id);
          setDeployLogs(prev => [...prev, `[C${step.cycle}] ${step.from} → ${step.to}`]);
        } else if (step.type === 'HOLDING') {
          setDeployLogs(prev => [...prev, `[C${step.cycle}] ⏸ AWAITING OPPORTUNITY — holding $${step.amount.toFixed(4)} USDA, no open corridor yet...`]);
        } else if (step.type === 'PROCURE') {
          setDeployLogs(prev => [...prev, `[C${step.cycle}] 📦 PROCURE: bought ${step.amount.toFixed(2)} KES airtime (${step.externalRef})`]);
        } else if (step.type === 'LIQUIDATE') {
          setDeployLogs(prev => [...prev, `[C${step.cycle}] 💵 LIQUIDATE: recognized ${step.amount.toFixed(2)} KES against paybill float (no STK push)`]);
        } else if (step.type === 'MINT') {
          setDeployLogs(prev => [...prev, `[C${step.cycle}] 🪙 MINT: $${step.amount.toFixed(4)} USDA vault-backed`]);
        } else if (step.type === 'CELO_EXIT') {
          setDeployLogs(prev => [...prev, `[C${step.cycle}] 🔗 CELO EXIT (hot wallet): $${step.amount.toFixed(4)} USDC — tx ${step.externalRef}`]);
        }
        await new Promise(r => setTimeout(r, 300));
      }

      setDeployLogs(prev => [...prev, result.status === 'success'
        ? `✅ SIMULATED 5x COMPLETE — final $${result.finalUsd.toFixed(4)} USDC (profit +$${result.profit.toFixed(4)}) over ${result.cyclesReached} cycles`
        : `⚠️ SIMULATION HALTED at ${result.finalState} (cycle ${result.cyclesReached})`]);
    } catch (error: any) {
      const serverError = error.response?.data?.detail || error.message || "Simulation error";
      setDeployLogs(prev => [...prev, `❌ [SIM FAILED] ${serverError}`]);
    } finally {
      setTimeout(() => {
        setIsSimulating(false);
        setActiveNode(null);
      }, 3000);
    }
  };

  const renderCorridor = () => {
    if (isDashboardLoading || !opportunities || !opportunities[activeOpp]) {
      return <div className="p-20 text-center text-emerald-400 animate-pulse font-mono font-bold tracking-widest">CONNECTING TO DISCOVERY ENGINE...</div>;
    }

    const opp = opportunities[activeOpp];
    const rawInputAmt = parseFloat(deployAmountInput) || 0;
    const baselineRate = parseFloat(opp.baseline) || spreadConfig.reference || 129.50;

    // --- GENERIC MATH ENGINE FOR CYCLES ---
    let baseUsd = 0;
    const rolloverCycles = [];
    let runningUsd = 0;
    let runningKes = 0;

    if (opp.currency === 'KES') {
      baseUsd = rawInputAmt / baselineRate;
      runningUsd = baseUsd;
      runningKes = rawInputAmt;

      for (let i = 1; i <= 5; i++) {
        const kesFloat = runningKes / (1 - opp.discountNum);
        const usdaMinted = kesFloat / (baselineRate * (1 - (parseFloat(opp.fxEdge) / 100 || 0)));
        const profit = usdaMinted - runningUsd;

        rolloverCycles.push({
          cycle: i,
          startVal: runningKes,
          kesFloat: kesFloat,
          usdaMinted: usdaMinted,
          profit: profit
        });

        runningKes = kesFloat;
        runningUsd = usdaMinted;
      }
    } else {
      baseUsd = rawInputAmt || 100;
      runningUsd = baseUsd;

      for (let i = 1; i <= 5; i++) {
        const kesFloat = (runningUsd * baselineRate) / (1 - opp.discountNum);
        const usdaMinted = kesFloat / (baselineRate * (1 - (parseFloat(opp.fxEdge) / 100 || 0)));
        const profit = usdaMinted - runningUsd;

        rolloverCycles.push({
          cycle: i,
          startVal: runningUsd,
          kesFloat: kesFloat,
          usdaMinted: usdaMinted,
          profit: profit
        });
        runningUsd = usdaMinted;
      }
    }

    const finalUsd = rolloverCycles[4].usdaMinted;
    const totalProfit = finalUsd - baseUsd;
    const maxProfit = Math.max(...rolloverCycles.map(c => c.profit));

    const colorClasses: Record<string, string> = {
      red: 'border-red-500/30 text-red-400 bg-[#1a0b0b] shadow-[0_0_20px_rgba(239,68,68,0.1)]',
      blue: 'border-blue-500/30 text-blue-400 bg-[#061022] shadow-[0_0_20px_rgba(59,130,246,0.1)]',
      emerald: 'border-emerald-500/30 text-emerald-400 bg-[#05130d] shadow-[0_0_20px_rgba(16,185,129,0.1)]',
      orange: 'border-orange-500/30 text-orange-400 bg-[#140b05] shadow-[0_0_20px_rgba(249,115,22,0.1)]',
      purple: 'border-purple-500/50 text-purple-400 bg-[#10071a] shadow-[0_0_25px_rgba(168,85,247,0.2)]',
      slate: 'border-[#1e2d3d] text-slate-400 bg-[#0d1420] shadow-lg opacity-50'
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">

        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 border-b border-[#1e2d3d] pb-4 gap-4">
          <div>
            <h2 className="text-sm font-bold tracking-widest uppercase mb-1 flex flex-wrap items-center gap-2">
              <span className={opp.nodes[0].color === 'red' ? "text-red-400" : "text-blue-400"}>{opp.nodes[0].name.split(' ')[0]}</span>
              <span className="text-slate-600">→</span>
              <span className="text-emerald-400">USDA</span> <span className="text-slate-600">→</span>
              {opp.exitGate === 'CYCLE 5' && <><span className="text-purple-400">×5 ROLLOVER</span> <span className="text-slate-600">→</span></>}
              <span className="text-slate-400">{opp.nodes[opp.nodes.length - 1].id === 'N9' ? 'CELO' : 'MERCHANT'}</span>
            </h2>
            <p className="text-slate-400 text-sm tracking-wide">
              {opp.exitGate === 'CYCLE 5' ? '5× internal rollovers · single external exit · zero friction until cycle 5' : 'Direct 1-cycle yield capture · minimal execution risk'}
            </p>
          </div>
          <div className="text-left md:text-right bg-[#111827] border border-[#1e2d3d] rounded-xl px-4 py-2 shrink-0">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-0.5">MULTIPLIER / CYCLE</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono">{opp.multiplier}</p>
            <p className="text-[9px] text-slate-500 font-mono">{opp.discount} disc · {opp.fxEdge} FX</p>
          </div>
        </div>

        {/* Action Bar / Flow Map */}
        <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-2xl p-4 md:p-6 shadow-xl mb-6 overflow-hidden">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/20 rounded-lg"><Activity className="w-5 h-5 text-blue-400" /></div>
              <div>
                <h3 className="text-white font-bold text-sm">Execution Engine Ready</h3>
                <p className="text-xs text-slate-400">Deploy capital directly into the active {opp.exitGate === 'CYCLE 5' ? '5x compounding' : 'direct'} corridor.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
              <div className="relative">
                <input
                  type="number"
                  value={deployAmountInput}
                  onChange={(e) => setDeployAmountInput(e.target.value)}
                  disabled={isExecutingCorridor || isSimulating}
                  className="bg-[#111827] border border-[#1e2d3d] text-emerald-400 font-mono font-bold text-lg rounded-lg py-2.5 pl-4 pr-16 w-full sm:w-40 outline-none focus:border-blue-500 shadow-inner disabled:opacity-50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs uppercase tracking-wider pointer-events-none">
                  {opp.currency}
                </span>
              </div>
              <button
                onClick={handleSimulateCorridor}
                disabled={isExecutingCorridor || isSimulating}
                title="Runs the real 5x state machine with mocked nodes — no real airtime, paybill, Cardano vault, or Celo call is made"
                className="bg-purple-600/90 hover:bg-purple-500 text-white font-bold text-sm px-6 py-3 rounded-lg transition-colors shadow-[0_0_15px_rgba(147,51,234,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TerminalSquare className="w-4 h-4" />}
                Simulate 5x
              </button>
              <button
                onClick={handleExecuteCorridor}
                disabled={isExecutingCorridor || isSimulating}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-3 rounded-lg transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isExecutingCorridor ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" fill="currentColor" />}
                Deploy Live
              </button>
            </div>
          </div>

          {/* Terminal Logs */}
          {deployLogs.length > 0 && (
            <div className="mb-8 bg-[#040a0f] border border-[#1e2d3d] rounded-xl p-4 font-mono text-xs space-y-2 text-slate-400 shadow-inner">
              {deployLogs.map((log, idx) => (
                <div key={idx} className={`${log.includes('SUCCESS') ? 'text-emerald-400' : log.includes('FAILED') ? 'text-red-400' : 'text-blue-300'} animate-in slide-in-from-left-2`}>
                   {'>'} {log}
                </div>
              ))}
            </div>
          )}

          {/* DYNAMIC FLOW MAP WITH CLIPPING FIX */}
          <div className="w-full overflow-x-auto pt-8 pb-6 px-2 custom-scrollbar">
            <div className="flex items-center gap-4 w-max min-w-full">
              {opp.nodes.map((node: any, index: number) => {
                const isLast = index === opp.nodes.length - 1;
                const isActive = activeNode === node.id && node.type !== 'rollover';
                const activeRing = isActive ? 'ring-2 ring-offset-4 ring-offset-[#0b0f19] scale-105 opacity-100 border-current' : 'border-current opacity-80 hover:opacity-100';

                return (
                  <React.Fragment key={node.id}>
                    <div className={`border p-4 rounded-lg w-44 text-center flex flex-col items-center justify-center h-[120px] relative transition-all duration-500 group ${colorClasses[node.color]} ${activeRing}`}>
                      {/* ABSOLUTE POSITIONED BADGE FIX */}
                      <div className={`absolute -top-3.5 px-3 py-1 bg-inherit border rounded-full font-bold text-[9px] tracking-widest uppercase flex items-center gap-1 border-current z-10 shadow-sm`}>
                        {node.type === 'rollover' && <Repeat className="w-3 h-3" />}
                        {node.tag}
                      </div>
                      <h4 className="font-bold text-xl mb-1 mt-2 font-mono relative z-0">{node.id}</h4>
                      <p className="text-slate-400 text-[10px] relative z-0">{node.name}</p>
                    </div>
                    {!isLast && <ArrowRight className="w-4 h-4 text-slate-700 shrink-0" />}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>

        { }
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Compounding Table & Bar Chart */}
          <div className="lg:col-span-2 overflow-hidden">

            {/* Simulation Controls for 5x Loop */}
            {opp.exitGate !== 'CYCLE 1' && (
              <div className="flex items-center gap-2 mb-4 bg-[#111827] p-1.5 rounded-lg border border-[#1e2d3d] w-max">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold px-3">Simulate Cycle:</span>
                {[1, 2, 3, 4, 5].map(c => (
                  <button
                    key={c}
                    onClick={() => setSimCycle(c)}
                    className={`w-10 h-8 rounded-md text-xs font-bold font-mono transition-colors ${simCycle === c ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-transparent text-slate-400 hover:text-white border border-transparent'}`}
                  >
                    C{c}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center mb-3 mt-2">
              <h3 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">
                {opp.exitGate === 'CYCLE 1' ? '1× DIRECT EXECUTION' : '5× ROLLOVER COMPOUNDING'}
              </h3>
              <span className="text-[11px] font-bold text-emerald-400 font-mono tracking-widest">
                {opp.currency === 'KES'
                  ? `${rawInputAmt.toFixed(2)} KES → ${rolloverCycles[opp.exitGate === 'CYCLE 1' ? 0 : 4]?.kesFloat.toFixed(2)} KES`
                  : `$${baseUsd.toFixed(2)} → $${finalUsd.toFixed(2)}`}
              </span>
            </div>

            <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl overflow-x-auto w-full mb-6 custom-scrollbar">
              <table className="w-full min-w-[500px] text-left text-[11px] font-mono whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[#1e2d3d] text-slate-500 bg-[#0d1420]">
                    <th className="p-3 font-normal">CYCLE</th>
                    <th className="p-3 font-normal">{opp.currency === 'KES' ? 'START KES' : 'START USD'}</th>
                    <th className="p-3 font-normal">KES FLOAT</th>
                    <th className="p-3 font-normal">USDA MINTED</th>
                    <th className="p-3 font-normal text-right">PROFIT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d3d]/50 text-slate-300">
                  {rolloverCycles.slice(0, opp.exitGate === 'CYCLE 1' ? 1 : 5).map(c => (
                    <tr key={c.cycle} className={`transition-colors ${simCycle === c.cycle || opp.exitGate === 'CYCLE 1' ? 'bg-[#1a2638]' : 'hover:bg-[#151c2f]'}`}>
                      <td className={`p-3 font-bold ${simCycle === c.cycle || opp.exitGate === 'CYCLE 1' ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {simCycle === c.cycle || opp.exitGate === 'CYCLE 1' ? '•' : '✓'} C{c.cycle}
                      </td>
                      <td className={`p-3 ${simCycle === c.cycle || opp.exitGate === 'CYCLE 1' ? 'text-white font-bold' : ''}`}>
                        {opp.currency === 'KES' ? c.startVal.toFixed(2) : `$${c.startVal.toFixed(2)}`}
                      </td>
                      <td className={`p-3 ${simCycle === c.cycle || opp.exitGate === 'CYCLE 1' ? 'text-emerald-400 font-bold' : 'text-emerald-400/80'}`}>
                        {c.kesFloat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES
                      </td>
                      <td className={`p-3 ${simCycle === c.cycle || opp.exitGate === 'CYCLE 1' ? 'text-emerald-400 font-bold' : ''}`}>
                        ${c.usdaMinted.toFixed(4)}
                      </td>
                      <td className={`p-3 text-right ${simCycle === c.cycle || opp.exitGate === 'CYCLE 1' ? 'text-emerald-400 font-bold' : 'text-emerald-400/80'}`}>
                        +${c.profit.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[#1e2d3d] font-bold">
                    <td className="p-3 text-slate-500 uppercase tracking-widest font-sans text-[10px]">Total</td>
                    <td className="p-3 text-white">
                      {opp.currency === 'KES' ? rawInputAmt.toFixed(2) : `$${baseUsd.toFixed(2)}`}
                    </td>
                    <td className="p-3 text-slate-500">{opp.exitGate === 'CYCLE 1' ? '1× direct' : '5× internal'}</td>
                    <td className="p-3 text-emerald-400">${opp.exitGate === 'CYCLE 1' ? rolloverCycles[0].usdaMinted.toFixed(4) : finalUsd.toFixed(4)}</td>
                    <td className="p-3 text-emerald-400 text-right">+${opp.exitGate === 'CYCLE 1' ? rolloverCycles[0].profit.toFixed(4) : totalProfit.toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CAPITAL GROWTH BAR CHART */}
            {opp.exitGate !== 'CYCLE 1' && (
              <div className="mt-8 overflow-x-auto w-full pb-4">
                <div className="min-w-[400px]">
                  <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Capital Growth Per Cycle</h3>
                  <div className="flex items-end gap-3 h-28 border-b border-[#1e2d3d] pb-1 px-2">
                    {rolloverCycles.map(c => {
                      const heightPct = (c.profit / maxProfit) * 100;
                      return (
                        <div key={c.cycle} className="flex-1 flex flex-col items-center justify-end h-full group">
                          <span className="text-[10px] text-emerald-400 font-mono mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            +${c.profit.toFixed(4)}
                          </span>
                          <div
                            className={`w-full transition-all duration-500 rounded-t-sm ${simCycle === c.cycle ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'bg-emerald-500/20 hover:bg-emerald-500/40'}`}
                            style={{ height: `${Math.max(heightPct, 5)}%` }}
                          ></div>
                          <span className="text-[10px] font-bold text-slate-500 mt-2 block w-full text-center">C{c.cycle}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          { }
          {/* Right Column: Engine & Opportunities */}
          <div className="space-y-6">

            {/* Price Discovery Engine Box */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">PRICE DISCOVERY ENGINE</h3>
                <span className="text-xs font-bold text-emerald-400 font-mono tracking-widest">
                  {opp.engineTopRight} <span className="text-slate-500 text-[10px]">KES/USD</span>
                </span>
              </div>
              <div className="h-[2px] w-full bg-gradient-to-r from-emerald-400/50 to-transparent rounded-full mb-3" />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[#1e2d3d] border border-[#1e2d3d] rounded-xl overflow-hidden text-[11px] font-mono shadow-lg">
                <div className="bg-[#0b0f19] p-3 flex flex-col gap-1 justify-between">
                  <span className="text-slate-500">Discount Rate</span>
                  <span className="text-emerald-400 font-bold">{opp.discount}</span>
                </div>
                <div className="bg-[#0b0f19] p-3 flex flex-col gap-1 justify-between">
                  <span className="text-slate-500">FX Edge</span>
                  <span className="text-emerald-400 font-bold">{opp.fxEdge}</span>
                </div>
                <div className="bg-[#0b0f19] p-3 flex flex-col gap-1 justify-between">
                  <span className="text-slate-500">Pip Discovery</span>
                  <span className="text-purple-400 font-bold">{opp.pip}</span>
                </div>

                <div className="bg-[#0b0f19] p-3 flex flex-col gap-1 justify-between">
                  <span className="text-slate-500">Rollover FX Rate</span>
                  <span className="text-blue-400 font-bold">{opp.rolloverRate}</span>
                </div>
                <div className="bg-[#0b0f19] p-3 flex flex-col gap-1 justify-between">
                  <span className="text-slate-500">Baseline KES/USD</span>
                  <span className="text-slate-400 font-bold">{opp.baseline}</span>
                </div>
                <div className="bg-[#0b0f19] p-3 flex flex-col gap-1 justify-between">
                  <span className="text-slate-500">Multiplier/Cycle</span>
                  <span className="text-emerald-400 font-bold">{opp.multiplier}</span>
                </div>

                <div className="bg-[#0b0f19] p-3 flex flex-col gap-1 justify-between">
                  <span className="text-slate-500">Celo Gas Cost</span>
                  <span className="text-slate-400 font-bold">~$0.01</span>
                </div>
                <div className="bg-[#0b0f19] p-3 flex flex-col gap-1 justify-between">
                  <span className="text-slate-500">Internal Fees</span>
                  <span className="text-emerald-400 font-bold">$0.00</span>
                </div>
                <div className="bg-[#0b0f19] p-3 flex flex-col gap-1 justify-between">
                  <span className="text-slate-500">Exit Gate</span>
                  <span className="text-purple-400 font-bold">{opp.exitGate}</span>
                </div>
              </div>
            </div>

            {/* Ranked Opportunities List */}
            <div className="mt-6">
              <h3 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3">RANKED OPPORTUNITIES</h3>
              <div className="space-y-3">
                {Object.values(opportunities).map((opportunity: any) => (
                  <div
                    key={opportunity.id}
                    onClick={() => { setActiveOpp(opportunity.id); setDeployAmountInput('100'); }}
                    className={`border rounded-xl p-3 flex justify-between items-center group cursor-pointer transition-colors ${activeOpp === opportunity.id ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-[#111827] border-[#1e2d3d] hover:bg-[#1a2638] opacity-70'}`}
                  >
                    <div>
                      <p className={`text-sm font-bold mb-1 ${activeOpp === opportunity.id ? 'text-emerald-400' : 'text-slate-300'}`}>{opportunity.title}</p>
                      <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{opportunity.pathDesc}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className={`text-sm font-bold font-mono ${activeOpp === opportunity.id ? 'text-emerald-400' : 'text-slate-300'}`}>{opportunity.profitPct}</p>
                      {activeOpp === opportunity.id && <p className="text-[10px] text-emerald-500/70 font-bold tracking-widest uppercase flex items-center justify-end gap-1 mt-1"><Play className="w-3 h-3" fill="currentColor" /> SELECTED</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Celo Exit Ramp Widget */}
            {opp.exitGate.includes('5') && (
              <div className="mt-6 border border-purple-500/30 rounded-xl p-4 bg-[#10071a] shadow-[0_0_15px_rgba(168,85,247,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                <div className="flex justify-between items-center mb-4 relative z-10">
                  <h3 className="text-[11px] font-bold text-purple-400 tracking-widest uppercase">CELO EXIT RAMP · N9</h3>
                  <span className="text-[9px] font-mono text-slate-500 bg-[#0d1420] px-2 py-0.5 rounded border border-[#1e2d3d]">LOCKED · CYCLE {simCycle}/5</span>
                </div>
                <div className="space-y-3 text-[11px] font-mono relative z-10">
                  <div className="flex justify-between">
                    <span className="text-slate-400">USDA → USDC via Celo pools</span>
                    <span className="text-purple-400 font-bold">low-gas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total USDA to exit</span>
                    <span className="text-white font-bold">{simCycle === 5 ? `$${finalUsd.toFixed(2)}` : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Internal txns avoided</span>
                    <span className="text-emerald-400 font-bold">12 blockchain calls</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Est. gas cost</span>
                    <span className="text-slate-300">~$0.01</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  };

  // Converts a node's raw balance into a USD estimate. Same per-asset
  // math the old hardcoded VAULTS array used (KES-family / spread
  // reference, XLM/GOLD at a rough spot price, everything else ~$1-pegged)
  // — centralized here so it applies per-node instead of only to the
  // handful of asset classes the old list happened to aggregate.
  const KES_DENOMINATED_NODE_IDS = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'];
  const getNodeUsdValue = (node: any, balance: number, referenceRate: number) => {
    if (KES_DENOMINATED_NODE_IDS.includes(node.id)) return balance / referenceRate;
    if (node.dbKey === 'N9_XLM') return balance * 0.10;
    if (node.dbKey === 'N11_GOLD') return balance * 2400;
    return balance; // USDA, IMP, CELO_USDC, USD — already ~$1-pegged
  };

  const VAULT_NODE_COLORS: Record<string, string> = {
    N1: 'bg-blue-500', N2: 'bg-red-500', N3: 'bg-emerald-500',
    N4: 'bg-emerald-600', N5: 'bg-red-600', N6: 'bg-blue-600',
    N7: 'bg-indigo-500', N8: 'bg-purple-500', N9: 'bg-cyan-500',
    Celo: 'bg-yellow-500', N10: 'bg-orange-500', N11: 'bg-amber-600',
  };

  const renderDashboard = () => {
    const usdaBal = dbVaults['N7_USDA'] || 0;
    const impBal = dbVaults['N8_IMP'] || 0;
    const airtBal = (dbVaults['N1_TELKOM'] || 0) + (dbVaults['N2_AIRTEL'] || 0) + (dbVaults['N3_SAFARICOM'] || 0);

    // Same node list "Active Infrastructure Nodes" renders below — this is
    // the fix for the two sections showing different, drifting sets of
    // assets: both now read the exact same INFRASTRUCTURE_NODES array
    // against the exact same dbVaults response.
    const VAULTS = INFRASTRUCTURE_NODES.map((node) => {
      const balance = dbVaults[node.dbKey] || 0;
      return {
        id: node.id,
        name: node.name,
        desc: node.desc,
        category: node.category,
        balance,
        usdValue: getNodeUsdValue(node, balance, spreadConfig.reference),
        color: VAULT_NODE_COLORS[node.id] || 'bg-slate-500',
      };
    });
    const totalPortfolioUSD = VAULTS.reduce((sum, v) => sum + v.usdValue, 0);

    return (
      <div className={`space-y-6 transition-opacity duration-500 ${isDashboardLoading ? 'opacity-60' : 'opacity-100'} animate-in fade-in`}>
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
            <p className="text-3xl font-bold text-white font-mono">{opportunities ? Object.keys(opportunities).length : 0}</p>
            <p className="text-slate-500 text-xs mt-1">Active MM Quotes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 bg-[#111827] border border-[#1e2d3d] rounded-2xl shadow-lg flex flex-col max-h-[600px]">
            <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
              <div>
                <h2 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Live Vault Allocation</h2>
                <p className="text-[10px] text-slate-600 mt-1">{VAULTS.length} nodes · updated every refresh</p>
              </div>
              <button onClick={() => setSearchParams({ tab: 'otc' })} className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors shrink-0">
                Manage liquidity <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-[1fr_auto_auto_auto_20px] gap-x-3 px-6 pb-2 text-[9px] font-bold uppercase tracking-widest text-slate-600 shrink-0 border-b border-[#1e2d3d]">
              <span>Node</span>
              <span className="text-right w-24">Balance</span>
              <span className="text-right w-14">Alloc.</span>
              <span className="text-right w-20">USD</span>
              <span />
            </div>

            <div className="overflow-y-auto px-6 pb-4">
              {NODE_CATEGORIES.map((cat) => {
                const rows = VAULTS.filter((v) => v.category === cat.id);
                if (!rows.length) return null;
                const CatIcon = cat.icon;
                const catTotal = rows.reduce((sum, v) => sum + v.usdValue, 0);
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between pt-3 pb-1.5 sticky top-0 bg-[#111827]">
                      <div className="flex items-center gap-1.5">
                        <CatIcon className={`w-3 h-3 ${cat.color}`} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{cat.label}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-600">= ${fmt(catTotal)}</span>
                    </div>
                    {rows.map((vault) => {
                      const pct = totalPortfolioUSD > 0 ? (vault.usdValue / totalPortfolioUSD) * 100 : 0;
                      const isWarning = pct > 0 && pct < 15;
                      return (
                        <div
                          key={vault.id}
                          title={vault.desc}
                          className={`grid grid-cols-[1fr_auto_auto_auto_20px] gap-x-3 items-center h-9 border-b border-[#1e2d3d]/40 last:border-0 ${isWarning ? 'bg-red-500/[0.04]' : ''}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#2a3754] text-[9px] font-bold text-slate-400 tabular-nums">{vault.id}</span>
                            <span className={`text-xs font-medium truncate ${isWarning ? 'text-red-300' : 'text-slate-200'}`}>{vault.name}</span>
                          </div>
                          <span className={`text-right w-24 text-xs font-mono tabular-nums ${isWarning ? 'text-red-400' : 'text-white'}`}>{fmt(vault.balance)}</span>
                          <span className={`text-right w-14 text-[11px] font-mono tabular-nums ${isWarning ? 'text-red-400' : 'text-slate-500'}`}>{pct.toFixed(1)}%</span>
                          <span className="text-right w-20 text-[11px] font-mono tabular-nums text-slate-500">${fmt(vault.usdValue)}</span>
                          <span className="flex justify-center">
                            <span className={`w-1.5 h-1.5 rounded-full ${isWarning ? 'bg-red-500' : 'bg-emerald-500'}`} title={isWarning ? 'Below 5% portfolio share' : 'Nominal'} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-lg flex flex-col">
            <h2 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-6">Oracle Sync</h2>

            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">System Collateralization</p>
              <p className="text-5xl font-extrabold text-emerald-400 tracking-tighter">
                {impBal > 0 ? (((airtBal / spreadConfig.reference * 0.95) / impBal) * 100).toFixed(1) : '285.0'}%
              </p>
            </div>

            <div className="space-y-5 mb-8 flex-1">
              <div className="flex justify-between items-center pb-3 border-b border-[#1e2d3d]">
                <span className="text-xs text-slate-400 font-medium">Airtime Reserve (Haircut)</span>
                <span className="text-sm text-white font-mono font-bold">${fmt(airtBal / spreadConfig.reference * 0.95)}</span>
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

  const renderSpreadEngine = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-4 shadow-lg shadow-black/20">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">24h Realized P&L</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-emerald-400 font-mono">+ 142,500 KES</p>
            <TrendingUp className="text-emerald-400/50 w-6 h-6" />
          </div>
        </div>
        <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-4 shadow-lg shadow-black/20">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Binance P2P (Ref)</p>
          <p className="text-2xl font-bold text-white font-mono">{fmt(spreadConfig.reference)} KES</p>
        </div>
        <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-4 shadow-lg shadow-black/20">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">CBK Official (Ref)</p>
          <p className="text-2xl font-bold text-gray-400 font-mono">129.50 KES</p>
        </div>
        <div className={`bg-[#111827] border rounded-xl p-4 shadow-lg shadow-black/20 ${cometQuote.error ? 'border-red-500/40' : 'border-[#1e2d3d]'}`}>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
            Comet IMM (KES/IMC) <Radio className="w-3 h-3 text-blue-400" />
          </p>
          {cometQuote.error ? (
            <p className="text-sm font-semibold text-red-400" title={cometQuote.error}>
              {cometQuote.error.length > 40 ? 'Rate unavailable' : cometQuote.error}
            </p>
          ) : (
            <>
              <p className="text-2xl font-bold text-blue-400 font-mono">{cometQuote.rate ?? '—'}</p>
              <p className="text-[10px] text-gray-500 mt-1">age: {cometQuote.rateAge ?? '—'}</p>
            </>
          )}
        </div>
      </div>

      <h2 className="text-lg font-medium text-white flex items-center gap-2 pt-2">
        <Settings className="w-5 h-5 text-blue-400" />
        Pricing Configuration
      </h2>

      <div className={`bg-[#111827] border rounded-2xl p-6 transition-colors shadow-xl ${!spreadConfig.active || globalKillSwitch ? 'border-red-500/50 opacity-80' : 'border-[#1e2d3d]'}`}>
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
              <input type="checkbox" className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-500" checked={spreadConfig.autoPeg} onChange={() => handleSpreadUpdate({ autoPeg: !spreadConfig.autoPeg })} />
            </label>
            <button
              onClick={() => handleSpreadUpdate({ active: !spreadConfig.active })}
              className={`text-xs px-4 py-2.5 rounded-lg border font-bold tracking-wide uppercase whitespace-nowrap ${spreadConfig.active && !globalKillSwitch ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
            >
              {globalKillSwitch ? 'SYSTEM HALTED' : spreadConfig.active ? 'ROUTE LIVE' : 'ROUTE PAUSED'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0d1420] p-6 rounded-xl border border-[#1e2d3d]">
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">We Buy USDA from Users (Bid)</label>
            <div className="relative">
              <input
                type="number"
                value={spreadConfig.bid}
                onChange={(e) => handleSpreadUpdate({ bid: parseFloat(e.target.value) })}
                disabled={spreadConfig.autoPeg || globalKillSwitch}
                className="w-full bg-[#111827] border border-[#1e2d3d] rounded-xl py-3 pl-4 pr-16 text-white text-lg font-mono focus:border-blue-500 outline-none disabled:opacity-50 shadow-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono font-bold">KES</span>
            </div>
            <p className="text-emerald-400 text-xs mt-2 font-medium">Spread Profit: +{(spreadConfig.reference - spreadConfig.bid).toFixed(2)} KES per USD</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">We Sell USDA to Users (Ask)</label>
            <div className="relative">
              <input
                type="number"
                value={spreadConfig.ask}
                onChange={(e) => handleSpreadUpdate({ ask: parseFloat(e.target.value) })}
                disabled={spreadConfig.autoPeg || globalKillSwitch}
                className="w-full bg-[#111827] border border-[#1e2d3d] rounded-xl py-3 pl-4 pr-16 text-white text-lg font-mono focus:border-blue-500 outline-none disabled:opacity-50 shadow-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono font-bold">KES</span>
            </div>
            <p className="text-emerald-400 text-xs mt-2 font-medium">Spread Profit: +{(spreadConfig.ask - spreadConfig.reference).toFixed(2)} KES per USD</p>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-medium text-white flex items-center gap-2 pt-2">
        <Power className="w-5 h-5 text-purple-400" />
        Strategy & Node Switches
      </h2>
      <p className="text-xs text-gray-500 -mt-4">
        Independent of the global kill switch above — pull a single node out of service, or park a whole
        rollover strategy, without halting everything else.
      </p>

      <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider text-gray-400">Corridors</h3>
        {immCorridors.length === 0 && (
          <p className="text-xs text-gray-500">No corridors loaded.</p>
        )}
        {immCorridors.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-[#0d1420] border border-[#1e2d3d] rounded-xl p-4">
            <div>
              <p className="text-white font-semibold text-sm">{c.name} <span className="text-gray-500 font-mono text-xs">({c.id})</span></p>
              <p className="text-xs text-gray-500 mt-0.5">
                {c.node_procure} → {c.node_liquidate} &nbsp;·&nbsp; disc {(c.discount * 100).toFixed(0)}% &nbsp;·&nbsp; fx {(c.fx_edge * 100).toFixed(0)}%
              </p>
              {!c.eligible && (
                <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {c.corridorEnabled ? 'A required node is disabled or not live' : 'Corridor switched off'}
                </p>
              )}
            </div>
            <button
              onClick={() => handleToggleImmCorridor(c.id, !c.corridorEnabled)}
              disabled={immTogglingId === `corridor:${c.id}`}
              className={`text-xs px-4 py-2 rounded-lg border font-bold tracking-wide uppercase whitespace-nowrap disabled:opacity-50 ${c.corridorEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
            >
              {c.corridorEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider text-gray-400">Nodes</h3>
        {immNodes.length === 0 && (
          <p className="text-xs text-gray-500">No nodes loaded.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {immNodes.map((n) => (
            <div key={n.id} className="flex items-center justify-between bg-[#0d1420] border border-[#1e2d3d] rounded-xl p-3">
              <div>
                <p className="text-white font-semibold text-sm">{n.id} <span className="text-gray-500">· {n.label}</span></p>
                <p className="text-[11px] text-gray-500">{n.assetType} / {n.category}{!n.live && <span className="text-gray-600"> · no live integration</span>}</p>
                {n.id === 'N9' && n9CometRef && (
                  <p className="text-[10px] text-blue-400 font-mono mt-1">
                    Comet AMM ref: {n9CometRef.realUsdcBalance.toFixed(4)} USDC → {n9CometRef.quotedOut.toFixed(4)} {n9CometRef.quoteTo}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleToggleImmNode(n.id, !n.enabled)}
                disabled={immTogglingId === `node:${n.id}`}
                className={`text-[11px] px-3 py-1.5 rounded-lg border font-bold tracking-wide uppercase whitespace-nowrap disabled:opacity-50 ${n.enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
              >
                {n.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

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

  const renderTerminal = () => (
    <div className="space-y-6 animate-in fade-in duration-300">

      <div className="bg-[#111827] border border-[#1e2d3d] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[#1e2d3d] flex items-center gap-3">
          <TerminalSquare className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">Active Arbitration Routes</h2>
        </div>
        <div className="overflow-x-auto w-full">
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

        {/* Main Header */}
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
                <p className="text-emerald-400 font-bold font-mono text-sm">{spreadConfig.reference.toFixed(2)}</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-widest uppercase">Active Cycle</p>
                <p className="text-purple-400 font-bold font-mono text-sm">4/5</p>
              </div>
              <div className="flex-1 sm:flex-none text-left sm:text-right">
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

        {/* Main Content Area */}
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