import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CreditCard, Building2, Wallet } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const CURRENCIES = ['KES', 'USD', 'USDT', 'USDC', 'USDA', 'NGN', 'GHS', 'UGX', 'TZS', 'ZAR', 'EUR', 'GBP'];
const METHODS = [
  { id: 'crypto', label: 'Crypto Deposit', desc: 'Send crypto to your deposit address', icon: Wallet },
  { id: 'bank', label: 'Bank Transfer', desc: 'Transfer from your bank account', icon: Building2 },
  { id: 'mobile', label: 'Mobile Money', desc: 'M-Pesa, Airtel, etc.', icon: CreditCard },
];

export default function OtcFundBalance() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [currency, setCurrency] = useState('KES');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('crypto');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputClass = `w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors border ${isLight
    ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
    : 'bg-[#0A0D14] border-[#1E2D3D] text-white placeholder:text-slate-600 focus:border-emerald-500'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // TODO: Call API to initiate funding
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
    }, 1500);
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <div className={`rounded-2xl border p-8 text-center ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className={`text-lg font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>Funding Initiated</h2>
          <p className={`text-sm mb-6 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
            Your {currency} funding request for {amount} has been submitted. Your dealer will confirm and credit your balance.
          </p>
          <button
            onClick={() => navigate('/otc/wallet')}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/otc/wallet')} className={`text-xs flex items-center gap-1 mb-4 ${isLight ? 'text-slate-500 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300'}`}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to wallet
      </button>

      <div className="mb-6">
        <h1 className={`text-xl font-semibold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Fund Balance</h1>
        <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Deposit money into your balance to make payouts to beneficiaries.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className={`rounded-xl border p-5 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
          <label className={`block text-[10px] font-semibold uppercase tracking-wide mb-3 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Currency</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {CURRENCIES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
                  currency === c
                    ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500'
                    : isLight ? 'border-slate-200 text-slate-600 hover:border-slate-300' : 'border-[#1E2D3D] text-gray-400 hover:border-[#2A3F55]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className={`rounded-xl border p-5 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
          <label className={`block text-[10px] font-semibold uppercase tracking-wide mb-3 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputClass + ' pr-16 text-lg font-mono'}
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{currency}</span>
          </div>
        </div>

        <div className={`rounded-xl border p-5 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
          <label className={`block text-[10px] font-semibold uppercase tracking-wide mb-3 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Funding Method</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {METHODS.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`rounded-lg border p-4 text-left transition-all ${
                  method === m.id
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : isLight ? 'border-slate-200 hover:border-slate-300' : 'border-[#1E2D3D] hover:border-[#2A3F55]'
                }`}
              >
                <m.icon className={`w-5 h-5 mb-2 ${method === m.id ? 'text-emerald-500' : isLight ? 'text-slate-400' : 'text-gray-500'}`} />
                <p className={`text-sm font-semibold ${method === m.id ? 'text-emerald-500' : isLight ? 'text-slate-800' : 'text-gray-200'}`}>{m.label}</p>
                <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !amount}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> {submitting ? 'Processing...' : `Fund ${currency} ${amount || '0.00'}`}
        </button>
      </form>
    </div>
  );
}
