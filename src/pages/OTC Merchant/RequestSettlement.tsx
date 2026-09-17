import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import { createOtcRfq } from '../../api/client';

const ASSETS = ['KES', 'USDA', 'USDC', 'USDT', 'USD', 'BTC', 'ETH'];
const CHANNELS: [string, string][] = [
    ['WALLET_TO_BANK', 'I send crypto, receive fiat (bank/mobile money)'],
    ['BANK_TO_WALLET', 'I send fiat, receive crypto to a wallet'],
];

export default function OtcRequestSettlement() {
    const navigate = useNavigate();
    const [fromAsset, setFromAsset] = useState('USDA');
    const [toAsset, setToAsset] = useState('KES');
    const [amount, setAmount] = useState('');
    const [channel, setChannel] = useState('WALLET_TO_BANK');
    const [phone, setPhone] = useState('');
    const [wallet, setWallet] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) return setError('Enter a valid amount.');
        setSaving(true);
        try {
            const res = await createOtcRfq({
                from_asset: fromAsset, to_asset: toAsset, side: 'SELL', amount: amt,
                settlement_channel: channel, collection_phone: phone || undefined, destination_wallet: wallet || undefined,
            });
            navigate(`/otc/rfqs/${res.data.rfq.id}`);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Could not create request.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#070B14] text-gray-200 p-4 sm:p-8">
            <div className="max-w-xl mx-auto">
                <button onClick={() => navigate('/otc/overview')} className="text-gray-500 hover:text-gray-300 text-xs flex items-center gap-1 mb-4">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to overview
                </button>
                <h1 className="text-xl font-semibold text-white mb-1">Request a settlement</h1>
                <p className="text-xs text-gray-500 mb-6">Your dealer will review and send a live quote.</p>

                {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

                <form onSubmit={submit} className="bg-[#0F1520] border border-[#1E2D3D] rounded-lg p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                            <span className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">You sell</span>
                            <select value={fromAsset} onChange={e => setFromAsset(e.target.value)} className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                                {ASSETS.map(a => <option key={a}>{a}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">You receive</span>
                            <select value={toAsset} onChange={e => setToAsset(e.target.value)} className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                                {ASSETS.map(a => <option key={a}>{a}</option>)}
                            </select>
                        </label>
                    </div>
                    <label className="block">
                        <span className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Amount ({fromAsset})</span>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                    </label>
                    <label className="block">
                        <span className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Settlement direction</span>
                        <select value={channel} onChange={e => setChannel(e.target.value)} className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                            {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </label>
                    {channel === 'WALLET_TO_BANK' ? (
                        <label className="block">
                            <span className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Mobile money number to receive fiat</span>
                            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="2547..." className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                        </label>
                    ) : (
                        <label className="block">
                            <span className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Wallet address to receive crypto</span>
                            <input value={wallet} onChange={e => setWallet(e.target.value)} className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
                        </label>
                    )}
                    <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm flex items-center justify-center gap-2">
                        <Zap className="w-4 h-4" /> {saving ? 'Submitting...' : 'Submit request'}
                    </button>
                </form>
            </div>
        </div>
    );
}
