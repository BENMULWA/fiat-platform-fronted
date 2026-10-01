import { Fragment, useEffect, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Circle, RefreshCw, X, Zap } from 'lucide-react';
import { acceptDealerRfq, api, analyzeDealerRfq, createDealerRfq, executeDealerRfq, getDealerClients, getDealerSettlement, getOtcMarketRates, setCbkReferenceRate, quoteDealerRfq } from '../../api/client';
import { useSearchParams } from 'react-router-dom';

// Types
interface Client { id: string; name: string; phone?: string; walletAddress?: string; }
interface FormState { customer_id: string; from_asset: string; to_asset: string; side: 'BUY' | 'SELL'; amount: string; settlement_channel: string; collection_phone: string; destination_wallet: string; network: string; }
interface RfqRecord { id: string; customerName: string; customerId: string; fromAsset: string; toAsset: string; side: string; amount: number; settlementChannel: string; destinationWallet?: string; status: string; analysis?: any; quote?: any; settlementId?: string; }

const ASSETS = ['KES', 'USDA', 'USDC', 'USDT', 'USD', 'BTC', 'ETH'];
const NETWORKS = ['Airtel', 'M-Pesa (Mobile Money)', 'Celo (USDC)', 'Celo (USDT)', 'Tron', 'Polygon', 'Ethereum'];
const SETTLEMENT_CHANNELS: [string, string][] = [
  ['BANK_TO_WALLET', 'Bank → Wallet'],
  ['WALLET_TO_BANK', 'Wallet → Bank'],
  ['BANK_TRANSFER', 'Bank Transfer (RTGS)'],
  ['WALLET_TRANSFER', 'Wallet Transfer'],
];
const STEPS = ['New RFQ', 'RFQ Analysis', 'Dealer Quote', 'Execution', 'Settlement', 'Completed Trade'];

const EMPTY_FORM: FormState = { customer_id: 'CUST-01', from_asset: 'USDC', to_asset: 'KES', side: 'BUY', amount: '2000000', settlement_channel: 'BANK_TO_WALLET', collection_phone: '', destination_wallet: '0x71C7...9e2A', network: 'Ethereum' };

/* ---------- shared Tailwind class fragments ---------- */
const btnBase = 'inline-flex items-center gap-2 rounded-md px-3.5 py-2.5 text-[12.5px] font-semibold cursor-pointer border transition-colors font-sans';
const btnPrimary = `${btnBase} border-blue-600 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-35 disabled:cursor-not-allowed`;
const inputBase = 'block w-full mt-1.5 bg-[#0B0E14] text-gray-200 border border-[#232D39] rounded-md px-3 py-2.5 text-[13px] outline-none focus:border-blue-500 font-sans';
const fieldLabel = 'block text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1';

export default function DealerWorkspaceWizard({ initialOpen = true, rfqId }: { initialOpen?: boolean; rfqId?: string }) {
  const [searchParams] = useSearchParams();
  const requestedRfqId = rfqId || searchParams.get('rfqId') || undefined;
  const [clients, setClients] = useState<Client[]>([]);
  const [stage, setStage] = useState(requestedRfqId ? 1 : 0);
  const [open, setOpen] = useState(initialOpen);
  const [spread, setSpread] = useState(50);
  const [priceSource, setPriceSource] = useState<'auto' | 'auto' | 'live' | 'cbk' | 'rate_book'>('auto');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [rfq, setRfq] = useState<RfqRecord | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [settlement, setSettlement] = useState<any | null>(null);
  const [error, setError] = useState('');
  const current = rfq || { id: 'DRAFT', amount: Number(form.amount || 0), fromAsset: form.from_asset, toAsset: form.to_asset, side: form.side, customerName: 'New customer request' };

  useEffect(() => {
    getDealerClients().then(response => setClients(response.data.clients || [])).catch(() => setError('Unable to load institutional clients.'));
  }, []);

  useEffect(() => {
    if (!requestedRfqId) return;
    api.get(`/api/admin/dealer/rfqs`).then(async response => {
      const existing = (response.data.rfqs || []).find((item: RfqRecord) => item.id === requestedRfqId);
      if (!existing) throw new Error('RFQ not found');
      setRfq(existing);
      const analysisResponse = await analyzeDealerRfq(requestedRfqId);
      setRfq(analysisResponse.data.rfq || existing);
      setAnalysis(analysisResponse.data.analysis || null);
    }).catch(() => setError('Unable to load this RFQ.'));
  }, [requestedRfqId]);

  const handleError = (err: any) => setError(err?.response?.data?.detail || err?.message || 'The operation could not be completed.');

  const create = async () => {
    setError('');
    const amount = Number(form.amount);
    if (!form.customer_id || !Number.isFinite(amount) || amount <= 0) { setError('Select a customer and enter a valid amount.'); return; }
    try {
      const response = await createDealerRfq({ customer_id: form.customer_id, from_asset: form.from_asset, to_asset: form.to_asset, side: form.side, amount, settlement_channel: form.settlement_channel, collection_phone: form.collection_phone, destination_wallet: form.destination_wallet, network: form.network });
      setRfq(response.data.rfq);
      setAnalysis(response.data.rfq.analysis || null);
      setStage(1);
    } catch (err) { handleError(err); }
  };

  const refreshAnalysis = async () => {
    if (!rfq) return;
    try { const response = await analyzeDealerRfq(rfq.id); setAnalysis(response.data.analysis); setRfq(response.data.rfq); } catch (err) { handleError(err); }
  };

  const createQuote = async () => {
    if (!rfq) return;
    try { const response = await quoteDealerRfq(rfq.id, Number(spread), false, priceSource); setRfq(response.data.rfq); setStage(2); } catch (err) { handleError(err); }
  };

  const sendQuote = async () => {
    if (!rfq) return;
    try { const response = await quoteDealerRfq(rfq.id, Number(spread), true, priceSource); setRfq(response.data.rfq); } catch (err) { handleError(err); }
  };

  const acceptQuote = async () => {
    if (!rfq) return;
    try {
      const response = await acceptDealerRfq(rfq.id);
      if (response.data?.status === 'pending_compliance_review') {
        // Held by ZIGRAM -- not accepted. Advancing to Execution here would
        // show a false "accepted, ready to execute" state for a trade that
        // actually needs a compliance officer to release it first (see
        // KYC/AML/Risk -> ZIGRAM Holds).
        setRfq({ ...rfq, ...response.data.rfq, status: 'pending_compliance_review' });
        setError('This RFQ is held for compliance review. Release it from KYC/AML/Risk -> ZIGRAM Holds, then re-accept.');
        return;
      }
      setError('');
      setRfq(response.data.rfq);
      setStage(3);
    } catch (err: any) {
      // Merchant self-service RFQs are accepted by the merchant themselves; if
      // that already happened, the dealer just continues to execution.
      if (/accepted state/i.test(String(err?.response?.data?.detail || ''))) {
        setError('');
        setRfq({ ...rfq, status: 'accepted' });
        setStage(3);
        return;
      }
      handleError(err);
    }
  };

  const execute = async () => {
    if (!rfq) return;
    try { const response = await executeDealerRfq(rfq.id); setSettlement(response.data.settlement); setStage(4); } catch (err) { handleError(err); }
  };

  const [isReverifying, setIsReverifying] = useState(false);

  useEffect(() => {
    // Execution claims "nothing is assumed from before" -- make that true by
    // actually re-running the real AnalysisEngine checks when this stage
    // opens, instead of the static "everything verified" checklist this used
    // to render regardless of backend state.
    if (stage !== 3 || !rfq?.id) return;
    setIsReverifying(true);
    analyzeDealerRfq(rfq.id)
      .then(response => { setAnalysis(response.data.analysis); setRfq((prev: RfqRecord | null) => prev ? { ...prev, ...response.data.rfq } : prev); })
      .catch(err => handleError(err))
      .finally(() => setIsReverifying(false));
  }, [stage, rfq?.id]);

  const refreshSettlement = async () => {
    if (!settlement?.id) return;
    try { const response = await getDealerSettlement(settlement.id); setSettlement(response.data.settlement); } catch (err) { handleError(err); }
  };

  useEffect(() => {
    // Terminal statuses from the backend's settlement action state machine
    // (routes/otc_admin.py::_SETTLEMENT_TRANSITIONS) -- "completed" was the
    // old fake-simulation status and is never emitted anymore, so checking
    // only for it here polled forever.
    if (stage !== 4 || !settlement?.id || ['reconciled', 'failed', 'reservation_released'].includes(settlement.status)) return;
    const timer = window.setInterval(refreshSettlement, 5000);
    return () => window.clearInterval(timer);
  }, [stage, settlement?.id, settlement?.status]);

  if (!open) return <button onClick={() => setOpen(true)} className="m-8 bg-blue-600 text-white px-4 py-2 rounded">Open Dealer Wizard</button>;

  return (
    <div className="fixed inset-0 z-50 bg-[#03060ad9] backdrop-blur-sm grid place-items-center p-2 sm:p-4 lg:p-6 font-sans">
      <div className="w-full max-w-[1280px] h-[calc(100vh-16px)] sm:h-[min(820px,calc(100vh-32px))] grid grid-cols-1 lg:grid-cols-[220px_1fr] bg-[#0B0E14] border border-[#232D39] rounded-xl overflow-hidden shadow-2xl">
        
        {/* SIDEBAR */}
        <aside className="bg-[#121822] border-b lg:border-b-0 lg:border-r border-[#232D39] px-3 sm:px-4 py-3 lg:py-6 flex flex-col">
          <div className="mb-2 lg:mb-8 px-2">
            <h2 className="text-white font-bold text-sm">New RFQ</h2>
            <p className="text-gray-500 text-[10px] font-mono mt-1">{current?.id || 'DRAFT'}</p>
          </div>
          <ol className="list-none m-0 p-0 flex lg:flex-col gap-1 overflow-x-auto">
            {STEPS.map((step: string, i: number) => (
              <li key={step}>
                <button
                  onClick={() => i <= stage && setStage(i)}
                  className={`w-auto lg:w-full flex items-center gap-2 lg:gap-3 whitespace-nowrap bg-transparent border-0 text-left px-2 py-2 lg:py-3 text-[11px] lg:text-[12px] cursor-pointer rounded-lg
                    ${i === stage ? 'text-white font-bold bg-[#1C2431]/50' : 'text-gray-400 hover:bg-[#1C2431]/30'}`}
                >
                  {i < stage ? (
                    <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                  ) : (
                    <span className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-mono flex-shrink-0 border
                      ${i === stage ? 'text-blue-500 border-blue-500' : 'text-gray-600 border-gray-600'}`}>
                      {i + 1}
                    </span>
                  )}
                  {step}
                </button>
              </li>
            ))}
          </ol>
          <button className="hidden lg:flex mt-auto text-gray-500 hover:text-gray-300 text-left text-[11px] items-center gap-2 cursor-pointer px-2" onClick={() => setOpen(false)}>
            <X size={14} /> Close wizard
          </button>
        </aside>

        {/* MAIN CONTENT AREA */}
        <section className="flex flex-col bg-[#0B0E14] overflow-hidden relative">
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
            {error && <div className="max-w-5xl mx-auto mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
            {stage === 0 && <NewRfq form={form} setForm={setForm} clients={clients} onSubmit={create} />}
            {stage === 1 && rfq && <Analysis rfq={rfq} analysis={analysis} onRefresh={refreshAnalysis} onNext={createQuote} />}
            {stage === 2 && rfq && <Quote rfq={rfq} spread={spread} setSpread={setSpread} priceSource={priceSource} setPriceSource={setPriceSource} onRequote={createQuote} onBack={() => setStage(1)} onSend={sendQuote} onNext={acceptQuote} />}
            {stage === 3 && rfq && <Execution analysis={analysis} isReverifying={isReverifying} onExecute={execute} />}
            {stage === 4 && rfq && <Settlement settlement={settlement} onRefresh={refreshSettlement} onNext={() => setStage(5)} />}
            {stage === 5 && rfq && <Completed rfq={rfq} settlement={settlement} onNew={() => { setStage(0); setForm(EMPTY_FORM); setRfq(null); setAnalysis(null); setSettlement(null); }} onClose={() => setOpen(false)} />}
          </div>
          
        </section>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// STAGE 0: NEW RFQ
// --------------------------------------------------------------------------------------
function NewRfq({ form, setForm, clients, onSubmit }: any) {
  return (
    <div className="max-w-3xl mx-auto mt-4">
      <h2 className="text-[22px] font-bold text-white mb-1">New RFQ</h2>
      <p className="text-gray-400 text-sm mb-8">Enter one customer request — the platform runs every check and calculation behind it.</p>
      
      <div className="space-y-6">
        <label className="block">
          <span className={fieldLabel}>CUSTOMER</span>
          <select className={inputBase} value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name} — Institutional, Kenya</option>)}
          </select>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={fieldLabel}>DIRECTION</span>
            <div className="flex gap-2 mt-1.5">
              <button type="button" onClick={() => setForm({ ...form, side: 'BUY' })} className={`flex-1 py-2.5 rounded-md border text-[13px] font-bold ${form.side === 'BUY' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#0B0E14] border-[#232D39] text-gray-500'}`}>BUY</button>
              <button type="button" onClick={() => setForm({ ...form, side: 'SELL' })} className={`flex-1 py-2.5 rounded-md border text-[13px] font-bold ${form.side === 'SELL' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#0B0E14] border-[#232D39] text-gray-500'}`}>SELL</button>
            </div>
          </label>
          <label className="block"><span className={fieldLabel}>ASSET</span><select className={inputBase} value={form.from_asset} onChange={e => setForm({ ...form, from_asset: e.target.value })}>{ASSETS.map(a => <option key={a}>{a}</option>)}</select></label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block"><span className={fieldLabel}>AMOUNT</span><input type="text" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={inputBase} /></label>
          <label className="block"><span className={fieldLabel}>PAY WITH</span><select className={inputBase} value={form.to_asset} onChange={e => setForm({ ...form, to_asset: e.target.value })}>{ASSETS.map(a => <option key={a}>{a}</option>)}</select></label>
        </div>

        <label className="block"><span className={fieldLabel}>SETTLEMENT</span><select className={inputBase} value={form.settlement_channel} onChange={e => setForm({ ...form, settlement_channel: e.target.value })}>{SETTLEMENT_CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-[#232D39]">
          <label className="block"><span className={fieldLabel}>CUSTOMER WALLET</span><input type="text" className={inputBase} value={form.destination_wallet} onChange={e => setForm({...form, destination_wallet: e.target.value})} /></label>
          <label className="block"><span className={fieldLabel}>NETWORK</span><select className={inputBase} value={form.network} onChange={e => setForm({ ...form, network: e.target.value })}>{NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        </div>

        <div className="flex justify-end pt-2">
          <button className={btnPrimary} onClick={onSubmit}><Zap size={16} /> Get Quote</button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// STAGE 1: RFQ ANALYSIS
// --------------------------------------------------------------------------------------
function Analysis({ rfq, analysis, onRefresh, onNext }: { rfq: RfqRecord; analysis: any; onRefresh: () => void; onNext: () => void }) {
  const groups: [string, any[]][] = [
    ['CUSTOMER CHECKS', analysis?.customer || []],
    ['TREASURY CHECKS', analysis?.treasury || []],
    ['COMPLIANCE CHECKS', analysis?.compliance || []],
  ];
  const formatMetric = (value: any, suffix = '') => value === undefined || value === null ? 'N/A' : `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 4 })}${suffix}`;
  const liquidity = analysis?.liquidity || {};
  const treasury = analysis?.treasurySummary || {};
  const costs = analysis?.costs || {};
  const risk = analysis?.risk || {};
  const sources = liquidity.sources || [];
  const totalAvailable = sources.reduce((total: number, source: any) => total + Number(source.available || 0), 0);
  const segments = sources.map((source: any) => ({ ...source, width: totalAvailable ? `${(Number(source.amount || 0) / totalAvailable) * 100}%` : '0%' }));
  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5 mt-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[22px] font-bold text-white mb-1">RFQ Analysis</h2>
          <p className="text-gray-400 text-sm">Customer, treasury and compliance checks run in parallel, then liquidity, pricing and risk resolve one executable quote.</p>
        </div>
      </div>

      <div className="bg-[#121822] rounded-xl p-4 border border-[#232D39]">
        <div className="flex flex-wrap justify-between gap-3 mb-2">
          <h3 className="text-white font-bold">{rfq.id}</h3>
          {analysis?.expiresAt && <span className="text-[11px] font-mono text-amber-400">Expiry: {analysis.expiresAt}</span>}
        </div>
        <div className="text-sm font-mono text-gray-400 space-y-1">
          <p>Customer: <span className="text-gray-300">{rfq.customerName}</span></p>
          <p>{rfq.side}: <span className="text-blue-400">{rfq.amount.toLocaleString()} {rfq.fromAsset}</span></p>
          <p>Pay with: {rfq.toAsset}</p>
          <p>Settlement: {rfq.settlementChannel.split('_').join(' ')}</p>
          <p>Status: {rfq.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {groups.map(([title, checks]: [string, any[]]) => (
          <div key={title} className="bg-[#121822] border border-[#232D39] rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 flex-1">
              <h4 className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-4">{title}</h4>
              <div className="space-y-3 text-[13px]">
                {checks.map(check => <div key={check.key} className="flex justify-between gap-3 border-b border-[#232D39]/70 pb-1.5"><span className="text-gray-400">{check.label}</span><span className={check.passed ? 'text-emerald-400 font-bold text-right' : 'text-red-400 font-bold text-right'}>{check.passed ? '✓ ' : '✕ '}{check.value}</span></div>)}
              </div>
            </div>
            <div className={`text-center py-2.5 text-xs font-bold tracking-widest border-t ${checks.every(check => check.passed) ? 'bg-[#0e1715] text-emerald-500 border-[#1a2f26]' : 'bg-red-950/30 text-red-400 border-red-900/40'}`}>{checks.every(check => check.passed) ? 'PASS' : 'BLOCKED'}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#121822] border border-[#232D39] rounded-xl p-4">
        <h4 className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-4">TREASURY POSITION</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[12px]">
          {[
            [`Total to ${treasury.side === 'SELL' ? 'sell' : 'buy'}`, treasury.requestedAmount, treasury.requestedAsset],
            ['Reserved', treasury.reserved, treasury.asset],
            ['Available', treasury.available, treasury.asset],
            ['Required', treasury.required, treasury.asset],
            ['Coverage', treasury.coverage, '%'],
            ['Internal inventory', treasury.internalInventory, ''],
          ].map(([label, value, unit]) => (
            <div key={String(label)} className="border-l border-[#232D39] pl-3 first:border-l-0 first:pl-0">
              <p className="text-gray-500 mb-1">{label}</p>
              <p className="text-gray-200 font-mono font-bold">{typeof value === 'string' && ['FULL', 'PARTIAL', 'UNAVAILABLE'].includes(value) ? value : `${formatMetric(value)} ${unit || ''}`}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center -my-2 relative z-10">
        <button className="bg-[#1C2431] border border-[#232D39] text-gray-300 font-bold text-[11px] px-6 py-2 rounded-md uppercase tracking-wider shadow-lg">LIQUIDITY ENGINE</button>
      </div>

      <div className="bg-[#121822] border border-[#232D39] rounded-xl p-4 pt-7 -mt-4 space-y-5">
        <div className="text-xs text-gray-500">Liquidity routing is calculated from current treasury inventory and executable sources.</div>

        <div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">SMART ROUTER — RECOMMENDED ROUTE</p>
          <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-2 text-[11px] font-mono text-gray-400 mb-2">
            <span>SOURCE</span><span>RATE</span><span className="text-right">AVAILABLE</span>
            {sources.map((source: any) => <Fragment key={source.name}><span className="text-gray-300">{source.name}</span><span>{formatMetric(source.rate)}</span><span className="text-right">{formatMetric(source.available)}</span></Fragment>)}
          </div>
          <div className="border-t border-[#232D39] pt-2 text-[10px] text-gray-500 uppercase tracking-wider">SMART ROUTER — RECOMMENDED ROUTE</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 mb-2">{segments.map((source: any, index: number) => <span key={source.name}><i className={`inline-block w-2 h-2 mr-1 ${['bg-blue-500', 'bg-emerald-400', 'bg-amber-400'][index % 3]}`} />{source.name} — {formatMetric(source.amount)} @ {formatMetric(source.rate)}</span>)}</div>
          <div className="h-4 w-full bg-[#1C2431] rounded flex overflow-hidden">
            {segments.map((source: any, index: number) => <div key={source.name} className={`h-full ${['bg-blue-500', 'bg-emerald-400', 'bg-amber-400'][index % 3]} text-[9px] font-bold flex items-center justify-center text-[#07101a]`} style={{ width: source.width }}>{Math.round(Number(source.width.replace('%', '')))}%</div>)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-[12px]"><div className="flex justify-between"><span className="text-gray-400">Blended acquisition cost</span><span className="font-mono text-gray-200">{formatMetric(liquidity.blendedCost)} {rfq.toAsset}</span></div><div className="flex justify-between"><span className="text-gray-400">Liquidity sufficient</span><span className="font-bold text-emerald-400">{liquidity.sufficient ? 'YES' : 'NO'}</span></div></div>
        </div>

        <div className="border-t border-[#232D39] pt-4 grid grid-cols-1 gap-2 text-[13px]">
          <div className="flex justify-between"><span className="text-gray-400">Analysis result</span><span className="font-mono text-white font-bold">{analysis?.passed ? 'ELIGIBLE FOR QUOTE' : 'BLOCKED'}</span></div>
        </div>

        <div className="border-t border-[#232D39] pt-3">
           <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-3">COST & RISK ENGINE</p>
           <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-gray-400">Funding cost</span><span className="font-mono text-gray-300">${formatMetric(costs.fundingUsd)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">FX conversion cost</span><span className="font-mono text-gray-300">${formatMetric(costs.fxUsd)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Network / blockchain cost</span><span className="font-mono text-gray-300">${formatMetric(costs.networkUsd)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{rfq.fromAsset} exposure — before → after</span><span className="font-mono text-gray-300">{formatMetric(risk.exposureBefore)} → {formatMetric(risk.exposureAfter)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Limit utilization — before → after</span><span className="font-mono text-gray-300">{formatMetric(risk.limitBefore, '%')} → {formatMetric(risk.limitAfter, '%')}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Risk level</span><span className="font-bold text-emerald-400">{risk.level || 'LOW'}</span></div>
           </div>
        </div>

          <div className={`border rounded-lg p-3 text-sm flex items-center gap-2 ${analysis?.passed ? 'bg-[#0e1715] border-[#1a2f26] text-emerald-500' : 'bg-red-950/30 border-red-900/40 text-red-400'}`}>
            {analysis?.passed ? <CheckCircle2 size={16} /> : <Circle size={16} />} {analysis?.passed ? 'All checks passed. Backend quote is available.' : 'Checks failed. Review the blocked items before quoting.'}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-2">
        <button className="text-gray-400 font-bold text-sm hover:text-white px-4" onClick={onRefresh}>Re-run checks</button>
        <button className={btnPrimary} disabled={!analysis?.passed} onClick={onNext}>Continue to Dealer Quote</button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// STAGE 2: DEALER QUOTE
// --------------------------------------------------------------------------------------
function MarketPanel({ rfq, priceSource, setPriceSource, onRequote }: { rfq: RfqRecord; priceSource: 'auto' | 'live' | 'cbk' | 'rate_book'; setPriceSource: (v: 'auto' | 'live' | 'cbk' | 'rate_book') => void; onRequote: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cbkInput, setCbkInput] = useState('');
  const assets = [rfq.fromAsset, rfq.toAsset].filter(a => !['USDT', 'USDC', 'USDA', 'USD'].includes(a));

  const load = (refresh = false) => {
    if (assets.length === 0) return;
    setLoading(true);
    getOtcMarketRates(assets, refresh).then(res => setData(res.data)).catch(() => setData({ status: 'unavailable', detail: 'Could not reach the market-rate service.' })).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [rfq.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (assets.length === 0) return null;

  const unavailable = data?.status === 'unavailable';
  const effective = priceSource === 'auto' ? (rfq.quote?.priceSource || (assets.includes('KES') ? 'cbk' : 'live')) : priceSource;
  return (
    <div className="bg-[#121822] border border-[#232D39] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">MARKET CHECK</p>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-[#232D39] overflow-hidden text-[11px] font-bold">
            <button type="button" onClick={() => setPriceSource('live')} className={`px-3 py-1.5 ${effective === 'live' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>Live market</button>
            <button type="button" onClick={() => setPriceSource('cbk')} className={`px-3 py-1.5 ${effective === 'cbk' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}>CBK</button>
            <button type="button" onClick={() => setPriceSource('rate_book')} className={`px-3 py-1.5 ${effective === 'rate_book' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Rate book</button>
          </div>
          <button type="button" onClick={() => load(true)} className="text-gray-400 hover:text-white" title="Refresh market rate"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>
      {unavailable ? (
        <p className="text-amber-400 text-xs">{data.detail} Switch to Rate book to quote anyway.</p>
      ) : !data ? (
        <p className="text-gray-500 text-xs">Loading market rates...</p>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-6 gap-y-2 font-mono text-[13px] text-gray-300">
            <span className="text-gray-500 text-[11px]">PAIR</span><span className="text-gray-500 text-[11px] text-right">LIVE MARKET</span><span className="text-gray-500 text-[11px] text-right">CBK</span><span className="text-gray-500 text-[11px] text-right">RATE BOOK</span><span className="text-gray-500 text-[11px] text-right">BOOK vs MARKET</span>
            {data.rows.map((r: any) => (
              <Fragment key={r.asset}>
                <span>USDT / {r.asset} <span className="text-gray-600 text-[10px]">{r.source ? `· ${r.source}` : ''}</span></span>
                <span className="text-right text-white">{r.liveRate ?? '—'}</span>
                <span className="text-right">{r.cbkRate ?? '—'}</span>
                <span className="text-right">{r.rateBookRate ?? '—'}</span>
                <span className={`text-right ${Math.abs(r.deviationBps ?? 0) > 50 ? 'text-amber-400' : 'text-gray-400'}`}>{r.deviationBps == null ? '—' : `${r.deviationBps > 0 ? '+' : ''}${r.deviationBps} bps`}</span>
              </Fragment>
            ))}
          </div>
          <p className="text-gray-500 text-[11px] mt-3">
            {data.provider} · {data.cadence} · fetched {new Date(data.fetchedAt).toLocaleTimeString()}{data.usdtUsd ? ` · USDT = $${data.usdtUsd}` : ''}
          </p>
          {assets.includes('KES') && (
            <div className="mt-3 pt-3 border-t border-[#232D39] flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
              <span className="font-bold uppercase tracking-wider text-gray-500">CBK mean USD/KES</span>
              {data.cbk ? (
                <span className="font-mono text-gray-200">
                  {data.cbk.usdKes}{' '}
                  <span className="text-gray-500">
                    {data.cbk.automatic ? `${data.cbk.source} · CBK date ${data.cbk.cbkDate} · fetched ${new Date(data.cbk.fetchedAt).toLocaleTimeString()}` : `${data.cbk.source} · ${new Date(data.cbk.enteredAt).toLocaleString()}`}
                  </span>
                  {data.cbk.deviationVsLiveBps != null && <span className={Math.abs(data.cbk.deviationVsLiveBps) > 50 ? ' text-amber-400' : ' text-gray-500'}> · {data.cbk.deviationVsLiveBps > 0 ? '+' : ''}{data.cbk.deviationVsLiveBps} bps vs live</span>}
                </span>
              ) : <span className="text-gray-500">CBK rates unavailable from Comet</span>}
              {!data.cbk?.automatic && (
                <span className="flex items-center gap-1.5">
                  <input value={cbkInput} onChange={e => setCbkInput(e.target.value)} placeholder="manual e.g. 129.25" className="w-28 bg-[#0A0D12] border border-[#232D39] rounded px-2 py-1 font-mono text-white outline-none" />
                  <button type="button" onClick={() => { const v = Number(cbkInput); if (v) setCbkReferenceRate(v).then(() => { setCbkInput(''); load(true); }).catch(() => {}); }} className="font-bold text-blue-400 hover:text-blue-300">Save</button>
                </span>
              )}
            </div>
          )}
          {rfq.quote?.autoNote && <p className="text-amber-400 text-[11px] mt-1">{rfq.quote.autoNote}</p>}
          {(data.providerErrors || []).length > 0 && <p className="text-amber-400 text-[11px] mt-1">Provider issue: {data.providerErrors.join(' · ')}</p>}
          {data.rows.some((r: any) => Math.abs(r.deviationBps ?? 0) > 50) && (
            <p className="text-amber-400 text-[11px] mt-1">The rate book is more than 50 bps away from the market. Price from Live market, or update the book.</p>
          )}
          <div className="flex items-center justify-between mt-4">
            <p className="text-[11px] text-gray-400">Quoting from: <span className={effective === 'live' ? 'text-emerald-400 font-bold' : effective === 'cbk' ? 'text-amber-400 font-bold' : 'text-blue-400 font-bold'}>{effective === 'live' ? 'Live market' : effective === 'cbk' ? 'CBK (Central Bank of Kenya)' : 'Rate book'}</span>{priceSource === 'auto' ? ' (automatic: CBK for KES pairs, Live market otherwise)' : ''}. The rate is locked when you press Send Quote.</p>
            <button type="button" onClick={onRequote} className="text-xs font-bold text-blue-400 hover:text-blue-300">Recalculate preview</button>
          </div>
        </>
      )}
    </div>
  );
}

function Quote({ rfq, spread, setSpread, priceSource, setPriceSource, onRequote, onBack, onSend, onNext }: { rfq: RfqRecord; spread: number; setSpread: (value: number) => void; priceSource: 'auto' | 'live' | 'cbk' | 'rate_book'; setPriceSource: (v: 'auto' | 'live' | 'cbk' | 'rate_book') => void; onRequote: () => void; onBack: () => void; onSend: () => void; onNext: () => void }) {
  const quote = rfq.quote || {};
  const executionRate = Number(quote.execution_rate || 0);
  const receiveAmount = Number(quote.receive_amount || 0);
  const isSent = Boolean(quote.sent && quote.expiresAt);
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (!isSent) return;
    const updateCountdown = () => {
      const expiresAt = new Date(quote.expiresAt).getTime();
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(timer);
  }, [isSent, quote.expiresAt]);

  const quoteExpired = isSent && secondsLeft <= 0;
  const progress = isSent ? Math.min((secondsLeft / 60) * 100, 100) : 0;
  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 mt-4">
      <div>
        <h2 className="text-[22px] font-bold text-white mb-1">Dealer Quote</h2>
        <p className="text-gray-400 text-sm">Execution analysis is calculated automatically. You may override the spread within permitted limits.</p>
      </div>

      <div className="bg-[#0A0D12] border border-[#232D39] rounded-xl p-6 font-mono text-[13px] text-gray-300 space-y-6 shadow-inner">
        <div>
          <p className="text-gray-500 text-[11px] mb-1">CUSTOMER REQUEST</p>
          <p>{rfq.amount.toLocaleString()} {rfq.fromAsset} / {rfq.toAsset}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[11px] mb-1">INTERNAL TREASURY</p>
          <p>Backend treasury and liquidity route</p>
        </div>
        <div>
          <p className="text-gray-500 text-[11px] mb-1">EXTERNAL LIQUIDITY</p>
          <p>{quote.routeSummary || (Array.isArray(quote.route) ? quote.route.map((item: any) => `${item.source} ${Number(item.amount || 0).toLocaleString()}`).join(' + ') : quote.route) || 'Liquidity sources resolved by backend'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-[11px] mb-1">RECOMMENDED ROUTE</p>
          <p>{quote.routeSummary || (Array.isArray(quote.route) ? quote.route.map((item: any) => `${item.source} ${Number(item.amount || 0).toLocaleString()}`).join(' + ') : quote.route) || 'Route selected by liquidity engine'}</p>
        </div>
        
        <div className="border-t border-[#232D39] pt-4 w-2/3 space-y-1">
          <div className="flex justify-between"><span>Execution rate</span><span>{executionRate || 'Pending'}</span></div>
          <div className="flex justify-between"><span>Receive amount</span><span>{receiveAmount ? receiveAmount.toLocaleString() : 'Pending'} {rfq.toAsset}</span></div>
          <div className="flex justify-between"><span>Requested amount</span><span>{rfq.amount.toLocaleString()} {rfq.fromAsset}</span></div>
          <div className="flex justify-between"><span>Pricing source</span><span>{quote.priceSource === 'live' ? `Live · ${quote.marketProvider || ''}` : quote.priceSource === 'cbk' ? `CBK · ${quote.cbkDate || ''}` : 'Rate book'}</span></div>
          <div className="flex justify-between"><span>Quote status</span><span>{rfq.status}</span></div>
        </div>
      </div>

      {!isSent && <MarketPanel rfq={rfq} priceSource={priceSource} setPriceSource={setPriceSource} onRequote={onRequote} />}

      {!isSent && <div className="bg-[#121822] border border-[#232D39] rounded-xl p-5">
        <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-4">DEALER OVERRIDE</p>
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <span>Spread in basis points — dealer override:</span>
          <input 
            type="number"
            value={spread}
            onChange={e => setSpread(Number(e.target.value))}
            className="bg-[#0A0D12] border border-[#232D39] rounded px-3 py-1.5 font-mono text-white outline-none focus:border-blue-500 w-32"
          />
        </div>
      </div>}

      {isSent && <div className="bg-[#121822] border border-[#232D39] rounded-xl p-5">
        <div className="flex justify-between items-center mb-6">
          <span className="text-red-400 text-xs font-bold uppercase tracking-widest">PAY</span>
          <span className="text-white font-mono text-[17px] font-bold">{rfq.amount.toLocaleString()} {rfq.fromAsset}</span>
        </div>
        <div className="text-center -my-2 text-gray-500 text-[10px]">
          ↓ at {executionRate || 'pending'} ↓
        </div>
        <div className="flex justify-between items-center mt-6">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">RECEIVE</span>
          <span className="text-emerald-400 font-mono text-[17px] font-bold">{receiveAmount ? receiveAmount.toLocaleString() : 'Pending'} {rfq.toAsset}</span>
        </div>
        <div className="mt-8">
          <p className={`text-[10px] mb-2 ${quoteExpired ? 'text-red-400' : 'text-gray-500'}`}>Quote {quoteExpired ? 'expired' : 'QT-' + rfq.id.replace('RFQ-', '') + ` · expires in ${secondsLeft}s`}</p>
          <div className="h-1 w-full bg-[#1C2431] rounded overflow-hidden">
            <div className={`h-full transition-[width] duration-200 ${quoteExpired ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>}

      <div className="flex justify-end gap-4 mt-2 items-center">
        <button className="text-gray-400 font-bold text-sm hover:text-white px-4" onClick={onBack}>Cancel quote</button>
        {!isSent ? <button className={`${btnPrimary} bg-blue-600 border-blue-600 hover:bg-blue-500`} onClick={onSend} disabled={!rfq.quote}><ArrowRight size={16} /> Send Quote</button> : <button className={`${btnPrimary} bg-emerald-600 border-emerald-600 hover:bg-emerald-500`} onClick={onNext} disabled={quoteExpired}><Check size={16} /> {quoteExpired ? 'Quote expired' : 'Accept (customer agreed)'}</button>}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// STAGE 3: EXECUTION
// --------------------------------------------------------------------------------------
function Execution({ analysis, isReverifying, onExecute }: { analysis: any; isReverifying: boolean; onExecute: () => void }) {
  // Real re-check, not a static "everything verified" list -- see the
  // useEffect in the parent that calls analyzeDealerRfq(rfq.id) the instant
  // this stage opens. Same check groups the Analysis stage (stage 1) shows,
  // because it's the same backend AnalysisEngine, run again.
  const groups: [string, any[]][] = [
    ['Customer', analysis?.customer || []],
    ['Treasury', analysis?.treasury || []],
    ['Compliance', analysis?.compliance || []],
  ];
  const allChecks = groups.flatMap(([, checks]) => checks);
  const allPassed = Boolean(analysis?.passed) && allChecks.length > 0;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 mt-4">
      <div>
        <h2 className="text-[22px] font-bold text-white mb-1">Execution</h2>
        <p className="text-gray-400 text-sm">Every check is re-verified at the moment of execution — nothing is assumed from before.</p>
      </div>

      {isReverifying ? (
        <div className="border border-[#232D39] bg-[#121822] rounded-xl p-8 flex items-center justify-center gap-3 text-gray-400 text-sm">
          <RefreshCw size={16} className="animate-spin" /> Re-running customer, treasury and compliance checks...
        </div>
      ) : (
        <div className="border border-[#232D39] bg-[#121822] rounded-xl overflow-hidden shadow-sm">
          {allChecks.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">Unable to load current checks. Try again.</div>
          ) : allChecks.map((check, i, arr) => (
            <div key={check.key || check.label} className={`flex items-center gap-3 px-5 py-4 text-[13px] ${i !== arr.length - 1 ? 'border-b border-[#232D39]' : ''}`}>
              {check.passed ? (
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle size={18} className="text-red-500 flex-shrink-0" />
              )}
              <span className="text-gray-300 font-medium">{check.label}</span>
              <b className={`ml-auto text-[10px] font-mono tracking-wide uppercase ${check.passed ? 'text-emerald-500' : 'text-red-400'}`}>
                {check.passed ? 'verified' : `failed — ${check.value ?? ''}`}
              </b>
            </div>
          ))}
        </div>
      )}

      {!isReverifying && !allPassed && allChecks.length > 0 && (
        <p className="text-xs text-red-400">One or more checks failed on re-verification. Resolve the issue and refresh before executing.</p>
      )}

      <div className="flex justify-end mt-4">
        <button
          className={`${btnPrimary} bg-emerald-600 border-emerald-600 hover:bg-emerald-500 py-3`}
          onClick={onExecute}
          disabled={isReverifying || !allPassed}
        >
          <Check size={16} /> Execute Trade
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// STAGE 4: SETTLEMENT
// --------------------------------------------------------------------------------------
function Settlement({ settlement, onRefresh, onNext }: { settlement: any; onRefresh: () => void; onNext: () => void }) {
  const legs = settlement?.legs || {};
  const fiatStatus = legs.fiat?.status || 'pending';
  const cryptoStatus = legs.crypto?.status || 'pending';
  const fiatComplete = ['confirmed', 'completed'].includes(fiatStatus.toLowerCase());
  const cryptoComplete = ['confirmed', 'completed'].includes(cryptoStatus.toLowerCase());
  // "reconciled" is the sole authoritative complete state (routes/otc_admin.py
  // ::_SETTLEMENT_TRANSITIONS) -- it's a deliberate treasury sign-off action
  // (mark_reconciled), not something inferred from both legs looking
  // "confirmed". Both legs confirmed just means the transfer/receipt steps
  // are done; reconciliation is treasury's explicit final review.
  const status = String(settlement?.status || 'pending').toLowerCase();
  const isComplete = status === 'reconciled';
  const isTerminatedEarly = ['failed', 'reservation_released'].includes(status);
  const steps = [
    ['Trade executed', true],
    ['Fiat collection', fiatComplete],
    ['Digital asset transfer', cryptoComplete],
    ['Blockchain confirmation', cryptoComplete],
    ['Settlement reconciled', isComplete],
  ] as [string, boolean][];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 mt-4">
      <div>
        <h2 className="text-[22px] font-bold text-white mb-1">Settlement</h2>
        <p className="text-gray-400 text-sm">Two independent obligations, one unified settlement engine.</p>
      </div>

      <div>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-3">FIAT LEG</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#121822] border border-[#232D39] rounded-xl p-4 text-center">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">FROM</span>
            <span className="text-white font-bold text-sm">Customer Bank</span>
          </div>
          <ArrowRight className="text-gray-500 flex-shrink-0 w-4 h-4" />
          <div className="flex-1 bg-[#121822] border border-[#232D39] rounded-xl p-4 text-center">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">TO</span>
            <span className="text-white font-bold text-sm">Treasury Bank Account</span>
          </div>
        </div>
        <p className="text-center text-gray-400 font-mono text-[11px] mt-3">{legs.fiat?.amount || settlement?.amount || 0} {legs.fiat?.asset || 'KES'}</p>
      </div>

      <div className="mt-2">
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-3">DIGITAL LEG</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#121822] border border-[#232D39] rounded-xl p-4 text-center">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">FROM</span>
            <span className="text-white font-bold text-sm">Treasury Wallet</span>
          </div>
          <ArrowRight className="text-gray-500 flex-shrink-0 w-4 h-4" />
          <div className="flex-1 bg-[#121822] border border-[#232D39] rounded-xl p-4 text-center">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">TO</span>
            <span className="text-white font-bold text-sm">Customer Wallet</span>
          </div>
        </div>
        <p className="text-center text-gray-400 font-mono text-[11px] mt-3">{legs.crypto?.amount || 'Pending'} {legs.crypto?.asset || 'digital asset'}</p>
      </div>

      <div className="border border-[#232D39] bg-[#121822] rounded-xl overflow-hidden mt-4">
        {steps.map(([label, complete], i, arr) => {
          return (
            <div key={label} className={`flex items-center gap-3 px-5 py-4 text-[13px] ${i !== arr.length - 1 ? 'border-b border-[#232D39]' : ''}`}>
              {complete ? (
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle size={18} className="text-gray-600 flex-shrink-0" />
              )}
              <span className={complete ? "text-gray-300" : "text-gray-500"}>{label}</span>
              <b className={`ml-auto text-[10px] font-mono tracking-wide uppercase ${complete ? 'text-emerald-500' : 'text-amber-500'}`}>
                {complete ? 'complete' : 'pending'}
              </b>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-gray-500">
        Treasury reviews, confirms funds, approves and submits the transfer, then reconciles this
        settlement in the <a href="/admin/settlements" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline">Treasury Settlement Queue</a> -- this screen just tracks its progress.
      </p>

      <div className="flex justify-end gap-3 mt-2">
        <button className="text-gray-400 font-bold text-sm hover:text-white px-4" onClick={onRefresh}>Refresh status</button>
        <button className={`${btnPrimary} ${isComplete ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#1C2431] border-[#1C2431] text-gray-400'}`} onClick={onNext} disabled={!isComplete}>
          {isComplete ? <><Check size={16}/> View Completed Trade</> : isTerminatedEarly ? `Settlement ${status.replace('_', ' ')}` : 'Awaiting treasury confirmation...'}
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// STAGE 5: COMPLETED TRADE
// --------------------------------------------------------------------------------------
function Completed({ rfq, settlement, onNew, onClose }: { rfq: RfqRecord; settlement: any; onNew: () => void; onClose: () => void }) {
  const quote = rfq.quote || {};
  const analysis = rfq.analysis || {};
  const costs = analysis.costs || {};
  const customerRate = Number(quote.execution_rate || 0);
  const blendedCost = Number(quote.blended_cost || analysis.liquidity?.blendedCost || 0);
  const difference = customerRate - blendedCost;
  const grossMargin = difference * Number(rfq.amount || 0);
  const totalCostsUsd = Number(costs.fundingUsd || 0) + Number(costs.fxUsd || 0) + Number(costs.networkUsd || 0);
  const totalCosts = totalCostsUsd * (blendedCost || customerRate || 1);
  const netPnl = grossMargin - totalCosts;
  const formatAmount = (value: number, decimals = 4) => Number.isFinite(value) ? value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : 'Unavailable';
  const settlementComplete = String(settlement?.status || '').toLowerCase() === 'reconciled';
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 mt-4 pb-12">
      <div>
        <h2 className="text-[22px] font-bold text-white mb-1">Completed Trade</h2>
        <p className="text-gray-400 text-sm">Immutable trade record, reconciled across ledger, wallet/bank and blockchain.</p>
      </div>

      <div className="bg-[#0A0D12] border border-[#232D39] rounded-xl p-4 sm:p-5 font-mono text-[13px] text-gray-300 space-y-2">
        <p className="text-white font-bold text-sm mb-4">{settlement?.id || rfq.id}</p>
        <p>Trade: <span className="text-emerald-400">EXECUTED</span></p>
        <p>Settlement: <span className="text-emerald-400">{settlementComplete ? 'COMPLETE' : String(settlement?.status || 'PENDING').toUpperCase()}</span></p>
        <p>Reconciliation: <span className="text-emerald-400">{settlementComplete ? 'MATCHED' : 'PENDING'}</span></p>
        <p className="text-gray-500 pt-2">Trade ledger - Treasury wallet/bank - Blockchain/bank confirmation: {settlementComplete ? 'all match' : 'awaiting confirmation'}</p>
      </div>

      <div>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-4">P&L BREAKDOWN</p>
        <div className="space-y-2 font-mono text-[13px]">
          <div className="flex justify-between gap-4"><span className="text-gray-500">Customer rate</span><span className="text-white">{formatAmount(customerRate)} {rfq.toAsset}/{rfq.fromAsset}</span></div>
          <div className="flex justify-between gap-4"><span className="text-gray-500">Blended acquisition cost</span><span className="text-white">{formatAmount(blendedCost)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-gray-500">Difference</span><span className="text-white">{formatAmount(difference)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-gray-500">Gross trading margin</span><span className="text-white">{formatAmount(grossMargin, 2)} {rfq.toAsset}</span></div>
          <div className="flex justify-between gap-4 border-b border-[#232D39] pb-2"><span className="text-gray-500">Funding + FX + network costs</span><span className="text-rose-400">-{formatAmount(totalCosts, 2)} {rfq.toAsset}</span></div>
          <div className="flex justify-between gap-4 pt-1"><span className="text-gray-400 font-sans font-semibold">Net P&amp;L</span><span className={`${netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-bold`}>{formatAmount(netPnl, 2)} {rfq.toAsset}</span></div>
        </div>
        <p className="text-gray-500 text-[10px] mt-4">Flows into Dealer P&L · Treasury P&L · Daily P&L · Customer profitability</p>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <button className="bg-[#1C2431] text-white border border-[#232D39] hover:bg-[#232D39] px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2" onClick={onNew}>
          <Zap size={14}/> New RFQ
        </button>
        <button className="bg-blue-600 text-white hover:bg-blue-500 px-6 py-2.5 rounded-lg text-sm font-bold" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}