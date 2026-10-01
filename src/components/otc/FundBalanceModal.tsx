import { useEffect, useState } from 'react';
import { X, Copy, Check, ExternalLink, Smartphone, Landmark, Link2, Info } from 'lucide-react';
import { getOtcWallet, createOtcFundingRequest } from '../../api/client';
import { WALLET_CATALOGUE, MOBILE_MONEY_MARKETS, CELO_DEPOSIT_ASSETS } from '../../utils/walletCatalogue';

export interface FundingRequest {
  id: string; currency: string; amount: number; status: string; createdAt: string; method?: string;
}
interface Onchain { address: string; explorerUrl: string }

export default function FundBalanceModal({ isLight, initialCurrency, onClose, onCreated }: {
  isLight: boolean; initialCurrency?: string; onClose: () => void; onCreated: (r: FundingRequest) => void;
}) {
  const [currency, setCurrency] = useState(initialCurrency && WALLET_CATALOGUE.some(w => w.code === initialCurrency) ? initialCurrency : 'KES');
  const [method, setMethod] = useState<'mobile_money' | 'bank_transfer'>('mobile_money');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('');
  const [onchain, setOnchain] = useState<Onchain | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const entry = WALLET_CATALOGUE.find(w => w.code === currency)!;
  const market = MOBILE_MONEY_MARKETS[currency];
  const isCrypto = !!entry.crypto;
  const hasCeloAddress = CELO_DEPOSIT_ASSETS.includes(currency);
  const activeMethod = market ? method : 'bank_transfer';

  useEffect(() => {
    getOtcWallet().then(res => setOnchain(res.data.onchain || null)).catch(() => {});
  }, []);
  useEffect(() => { setProvider(market?.providers[0] || ''); }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

  const input = `w-full rounded-lg px-3.5 py-2.5 text-sm outline-none border ${isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-[#0A0D14] border-[#1E2D3D] text-white focus:border-emerald-500'}`;
  const label = `block text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`;
  const note = `rounded-lg border p-3 text-[11.5px] leading-relaxed flex gap-2 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#0A0D14] border-[#1E2D3D] text-gray-400'}`;
  const tab = (on: boolean) => `flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors ${on ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : isLight ? 'border-slate-200 text-slate-600 hover:border-slate-300' : 'border-[#1E2D3D] text-gray-400 hover:border-[#2A3F55]'}`;

  const copy = () => {
    if (!onchain?.address) return;
    navigator.clipboard?.writeText(onchain.address).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const submit = async () => {
    setError('');
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError('Enter a valid amount.');
    if (activeMethod === 'mobile_money' && !phone.trim()) return setError('Enter the mobile money number you will pay from.');
    setSaving(true);
    try {
      const res = await createOtcFundingRequest({
        currency, amount: amt, method: activeMethod,
        ...(activeMethod === 'mobile_money' ? { country: market.country, phoneNumber: phone.trim(), provider } : {}),
      });
      onCreated(res.data.request);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not submit funding request.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-md rounded-2xl border p-5 my-8 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Fund balance</h2>
          <button onClick={onClose} className={isLight ? 'text-slate-400' : 'text-gray-500'}><X className="w-4 h-4" /></button>
        </div>

        <label className="block mb-4">
          <span className={label}>Select currency</span>
          <select value={currency} onChange={e => { setCurrency(e.target.value); setError(''); }} className={input}>
            <optgroup label="Stablecoins">
              {WALLET_CATALOGUE.filter(w => w.crypto).map(w => <option key={w.code} value={w.code}>{w.code} - {w.name}</option>)}
            </optgroup>
            <optgroup label="Fiat">
              {WALLET_CATALOGUE.filter(w => !w.crypto).map(w => <option key={w.code} value={w.code}>{w.code} - {w.name}</option>)}
            </optgroup>
          </select>
        </label>

        {isCrypto ? (
          hasCeloAddress ? (
            <div className="space-y-3">
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>Send <b>{currency}</b> on the <b>Celo</b> network to your deposit address. It is detected on-chain and credited to your wallet automatically -- no request needed.</p>
              {onchain ? (
                <div className="flex items-center gap-2">
                  <span className={`flex-1 font-mono text-[11px] px-3 py-2.5 rounded-lg border overflow-hidden text-ellipsis whitespace-nowrap ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#0A0D14] border-[#1E2D3D] text-gray-200'}`}>{onchain.address}</span>
                  <button onClick={copy} title="Copy address" className={`p-2.5 rounded-lg border shrink-0 ${isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-[#1E2D3D] hover:bg-[#111827]'}`}>
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className={`w-4 h-4 ${isLight ? 'text-slate-500' : 'text-gray-400'}`} />}
                  </button>
                  <a href={onchain.explorerUrl} target="_blank" rel="noreferrer" title="View on Celoscan" className={`p-2.5 rounded-lg border shrink-0 ${isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-[#1E2D3D] hover:bg-[#111827]'}`}>
                    <ExternalLink className={`w-4 h-4 ${isLight ? 'text-slate-500' : 'text-gray-400'}`} />
                  </a>
                </div>
              ) : <p className="text-xs text-amber-500">Loading your deposit address...</p>}
              <div className={note}><Info className="w-4 h-4 shrink-0 mt-0.5" /><span>Only send {currency} on Celo. Tokens sent on another network cannot be recovered. Large transfers: send a small test amount first.</span></div>
            </div>
          ) : (
            <div className={note}><Info className="w-4 h-4 shrink-0 mt-0.5" /><span>{currency} deposits are coming soon{currency === 'USDA' ? ' (USDA settles on Cardano)' : ''}. In the meantime, fund USDT, USDC or cUSD on Celo and convert with New Conversion.</span></div>
          )
        ) : (
          <div className="space-y-4">
            <div>
              <span className={label}>Payment method</span>
              <div className="flex gap-2">
                <button type="button" disabled={!market} onClick={() => setMethod('mobile_money')} className={`${tab(activeMethod === 'mobile_money')} ${!market ? 'opacity-40 cursor-not-allowed' : ''}`}><Smartphone className="w-3.5 h-3.5" /> Mobile Money</button>
                <button type="button" onClick={() => setMethod('bank_transfer')} className={tab(activeMethod === 'bank_transfer')}><Landmark className="w-3.5 h-3.5" /> Bank Transfer</button>
              </div>
              {!market && <p className={`text-[10.5px] mt-1.5 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Mobile money isn't available for {currency}.</p>}
            </div>

            {activeMethod === 'mobile_money' && market && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={label}>Country</span>
                    <input value={market.country} readOnly className={`${input} opacity-70`} />
                  </label>
                  <label className="block">
                    <span className={label}>Provider</span>
                    <select value={provider} onChange={e => setProvider(e.target.value)} className={input}>
                      {market.providers.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className={label}>Mobile money number</span>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className={input} placeholder="+254..." />
                </label>
              </>
            )}

            <label className="block">
              <span className={label}>Amount ({currency})</span>
              <input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} className={input} placeholder="0.00" />
            </label>

            <div className={note}>
              <Link2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {activeMethod === 'mobile_money'
                  ? 'Treasury sends a payment prompt to this number and credits your wallet once the funds land. Large amounts may be split across transactions.'
                  : `Treasury replies with wire instructions for ${currency} and credits your wallet when the transfer is received. For large or urgent flows, you can also fund a stablecoin on-chain and convert it with New Conversion.`}
              </span>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            <button onClick={submit} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg">
              {saving ? 'Submitting...' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
