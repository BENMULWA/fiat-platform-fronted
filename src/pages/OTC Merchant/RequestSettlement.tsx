import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, ArrowRight, Wallet, Landmark, Link2, ChevronDown, Check, Info } from 'lucide-react';
import { createOtcRfq, getOtcSettlementOptions } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import useRequireOnboarding from '../../hooks/useRequireOnboarding';
import NetworkIcon from '../../components/otc/NetworkIcon';
import { WALLET_CATALOGUE } from '../../utils/walletCatalogue';

type Channel = 'WALLET_BALANCE' | 'TO_BANK' | 'TO_EXTERNAL_WALLET';
interface NetworkOpt { id: string; label: string; assets: string[]; automated: boolean; hint: string }
interface Country { code: string; name: string; currency: string }

const CHANNELS: { value: Channel; label: string; desc: string; icon: typeof Wallet }[] = [
  { value: 'WALLET_BALANCE', label: 'Jasiri wallet', desc: 'Proceeds land on your balance. Pay beneficiaries from it.', icon: Wallet },
  { value: 'TO_BANK', label: 'Bank account', desc: 'Treasury pays fiat to a bank account in your chosen country.', icon: Landmark },
  { value: 'TO_EXTERNAL_WALLET', label: 'External crypto wallet', desc: 'Send to your own wallet on a specific network.', icon: Link2 },
];

export default function OtcRequestSettlement() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const requireOnboarding = useRequireOnboarding();
  const [fromAsset, setFromAsset] = useState('USDT');
  const [toAsset, setToAsset] = useState('KES');
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState<Channel>('WALLET_BALANCE');
  const [networks, setNetworks] = useState<NetworkOpt[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [network, setNetwork] = useState('');
  const [showNetworks, setShowNetworks] = useState(false);
  const [wallet, setWallet] = useState('');
  const [country, setCountry] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [swift, setSwift] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getOtcSettlementOptions().then(res => { setNetworks(res.data.networks || []); setCountries(res.data.countries || []); }).catch(() => {});
  }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowNetworks(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const selectedNetwork = networks.find(n => n.id === network);
  const fiatCountries = useMemo(() => countries.filter(c => c.currency === toAsset), [countries, toAsset]);
  const fiatCodes = useMemo(() => new Set(countries.map(c => c.currency)), [countries]);

  // Keep the receive currency consistent with the chosen destination.
  useEffect(() => {
    if (channel === 'TO_BANK') {
      if (fiatCodes.size && !fiatCodes.has(toAsset)) setToAsset('KES');
      setCountry(prev => (fiatCountries.some(c => c.code === prev) ? prev : fiatCountries[0]?.code || ''));
    }
    if (channel === 'TO_EXTERNAL_WALLET' && selectedNetwork && !selectedNetwork.assets.includes(toAsset)) {
      setToAsset(selectedNetwork.assets[0]);
    }
  }, [channel, toAsset, network, fiatCodes.size]); // eslint-disable-line react-hooks/exhaustive-deps

  const receiveOptions = channel === 'TO_BANK'
    ? WALLET_CATALOGUE.filter(w => fiatCodes.has(w.code))
    : channel === 'TO_EXTERNAL_WALLET' && selectedNetwork
      ? WALLET_CATALOGUE.filter(w => selectedNetwork.assets.includes(w.code))
      : WALLET_CATALOGUE;

  const input = `w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors border ${isLight
    ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
    : 'bg-[#0A0D14] border-[#1E2D3D] text-white placeholder:text-slate-600 focus:border-emerald-500'}`;
  const panel = `rounded-xl border p-5 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`;
  const label = `block text-[10px] font-semibold uppercase tracking-wide mb-3 ${isLight ? 'text-slate-500' : 'text-gray-500'}`;
  const sub = `block text-[10px] font-medium uppercase tracking-wide mb-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!requireOnboarding('submit a settlement request')) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter a valid amount.');
    if (channel === 'TO_BANK' && !(country && bankName.trim() && accountNumber.trim() && accountName.trim())) return setError('Complete the bank account details.');
    if (channel === 'TO_EXTERNAL_WALLET' && !(network && wallet.trim())) return setError('Choose a network and enter the wallet address.');
    setSaving(true);
    try {
      const res = await createOtcRfq({
        from_asset: fromAsset, to_asset: toAsset, side: 'SELL', amount: amt, settlement_channel: channel,
        ...(channel === 'TO_BANK' ? { bank_details: { country, bankName: bankName.trim(), accountNumber: accountNumber.trim(), accountName: accountName.trim(), swift: swift.trim() || undefined } } : {}),
        ...(channel === 'TO_EXTERNAL_WALLET' ? { network, destination_wallet: wallet.trim() } : {}),
      });
      navigate(`/otc/rfqs/${res.data.rfq.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not create request.');
    } finally {
      setSaving(false);
    }
  };

  const pickChannel = (c: Channel) => { setChannel(c); setError(''); };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/otc/overview')} className={`text-xs flex items-center gap-1 mb-4 ${isLight ? 'text-slate-500 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300'}`}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </button>

      <div className="mb-6">
        <h1 className={`text-xl font-semibold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>New Conversion</h1>
        <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Your dealer will review and send a live quote within minutes.</p>
      </div>

      {error && (
        <div className={`rounded-lg border p-3 mb-4 ${isLight ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/20'}`}>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div className={panel}>
          <label className={label}>Currency Pair</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={sub}>You Sell</span>
              <select value={fromAsset} onChange={e => setFromAsset(e.target.value)} className={input}>
                {WALLET_CATALOGUE.map(a => <option key={a.code} value={a.code}>{a.code}</option>)}
              </select>
            </div>
            <div>
              <span className={sub}>You Receive</span>
              <select value={toAsset} onChange={e => setToAsset(e.target.value)} className={input}>
                {receiveOptions.map(a => <option key={a.code} value={a.code}>{a.code}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className={panel}>
          <label className={label}>Amount</label>
          <div className="relative">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={input + ' pr-16 text-lg font-mono'} />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{fromAsset}</span>
          </div>
        </div>

        <div className={panel}>
          <label className={label}>Where should the proceeds go?</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CHANNELS.map(ch => (
              <button
                key={ch.value}
                type="button"
                onClick={() => pickChannel(ch.value)}
                className={`rounded-lg border p-4 text-left transition-all ${channel === ch.value
                  ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                  : isLight ? 'border-slate-200 hover:border-slate-300' : 'border-[#1E2D3D] hover:border-[#2A3F55]'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ch.icon className={`w-4 h-4 ${channel === ch.value ? 'text-emerald-500' : isLight ? 'text-slate-400' : 'text-gray-500'}`} />
                  <span className={`text-sm font-semibold ${channel === ch.value ? 'text-emerald-500' : isLight ? 'text-slate-800' : 'text-gray-200'}`}>{ch.label}</span>
                </div>
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{ch.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {channel === 'WALLET_BALANCE' && (
          <div className={panel}>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
              When treasury completes the settlement, your {toAsset} proceeds are credited to Wallet Balances. From there you can pay your beneficiaries.
            </p>
          </div>
        )}

        {channel === 'TO_BANK' && (
          <div className={panel}>
            <label className={label}>Bank account</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <span className={sub}>Country</span>
                <select value={country} onChange={e => setCountry(e.target.value)} className={input}>
                  {fiatCountries.length === 0 && <option value="">No bank settlement country for {toAsset}</option>}
                  {fiatCountries.map(c => <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>)}
                </select>
              </div>
              <div>
                <span className={sub}>Bank name</span>
                <input value={bankName} onChange={e => setBankName(e.target.value)} className={input} placeholder="e.g. Equity Bank" />
              </div>
              <div>
                <span className={sub}>Account number / IBAN</span>
                <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className={input} />
              </div>
              <div>
                <span className={sub}>Account holder name</span>
                <input value={accountName} onChange={e => setAccountName(e.target.value)} className={input} />
              </div>
              <div>
                <span className={sub}>SWIFT / BIC (optional)</span>
                <input value={swift} onChange={e => setSwift(e.target.value)} className={input} />
              </div>
            </div>
            <p className={`text-[11px] mt-3 flex gap-1.5 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}><Info className="w-3.5 h-3.5 shrink-0 mt-px" /> Treasury settles fiat to bank accounts only, not mobile money.</p>
          </div>
        )}

        {channel === 'TO_EXTERNAL_WALLET' && (
          <div className={panel}>
            <label className={label}>Network and wallet</label>
            <div className="space-y-4">
              <div ref={dropRef} className="relative">
                <span className={sub}>Network</span>
                <button type="button" onClick={() => setShowNetworks(v => !v)} className={`${input} flex items-center justify-between text-left`}>
                  {selectedNetwork ? (
                    <span className="flex items-center gap-2"><NetworkIcon id={selectedNetwork.id} className="w-5 h-5" /> {selectedNetwork.label}</span>
                  ) : <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>Select a network</span>}
                  <ChevronDown className="w-4 h-4 opacity-60" />
                </button>
                {showNetworks && (
                  <div className={`absolute z-20 mt-1 w-full rounded-lg border shadow-xl overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
                    {networks.map(n => (
                      <button key={n.id} type="button" onClick={() => { setNetwork(n.id); setShowNetworks(false); setError(''); }} className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}>
                        <NetworkIcon id={n.id} className="w-6 h-6" />
                        <span className="flex-1">
                          <span className={`block text-sm font-medium ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{n.label}</span>
                          <span className={`block text-[10.5px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{n.assets.join(', ')}{n.automated ? '' : ' - settled manually by treasury'}</span>
                        </span>
                        {network === n.id && <Check className="w-4 h-4 text-emerald-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <span className={sub}>Wallet address</span>
                <input value={wallet} onChange={e => setWallet(e.target.value)} className={`${input} font-mono text-xs`} placeholder={selectedNetwork?.hint || 'Select a network first'} disabled={!selectedNetwork} />
              </div>
            </div>
            {selectedNetwork && (
              <p className={`text-[11px] mt-3 flex gap-1.5 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                Only {selectedNetwork.assets.join(' / ')} on {selectedNetwork.label}. Funds sent to a wrong or incompatible address cannot be recovered.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
        >
          <Zap className="w-4 h-4" /> {saving ? 'Submitting...' : 'Submit Request'} <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
