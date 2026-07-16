import React, { useState } from 'react';
import { Smartphone, Wallet, CheckCircle, ShieldAlert, ArrowUp, Loader2, Sparkles } from 'lucide-react';
import { executeRamp, withdrawUsda, executeValoraWithdraw } from '../../api/client';

export const WithdrawPage = () => {
    const [method, setMethod] = useState<'mpesa' | 'cardano' | 'valora'>('mpesa');
    const [amount, setAmount] = useState('');
    const [counterparty, setCounterparty] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!counterparty) { setMessage({ type: 'error', text: 'Destination required' }); return; }
        setIsSubmitting(true); setMessage(null);
        try {
            if (method === 'cardano') {
                const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                await withdrawUsda({ amount: Number(amount), to_address: counterparty, asset: 'USDA', idempotency_key: idempotencyKey, counterparty: 'Cardano off-ramp' });
            } else if (method === 'valora') {
                await executeValoraWithdraw({ amount: Number(amount), identifier: counterparty });
            } else {
                await executeRamp({ direction: 'off', channel: 'Mobile Money', from_asset: 'KES', to_asset: 'KES', amount: Number(amount), rate: 1, fee: 0, counterparty });
            }
            setMessage({ type: 'success', text: "Withdrawal processed successfully." });
            setAmount(''); setCounterparty('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.detail || "Withdrawal failed." });
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
            <div className="lg:col-span-7 bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 flex flex-col justify-between min-h-[580px]">
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="w-5 h-5 text-orange-500" />
                        <h2 className="text-xl font-extrabold text-white tracking-wide">Withdraw Gateway</h2>
                    </div>

                    <div className="space-y-3 mb-6">
                        <button onClick={() => { setMethod('mpesa'); setMessage(null); }} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${method === 'mpesa' ? 'bg-orange-500/10 border-orange-500 text-white' : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-600'}`}>
                            <div className="flex items-center gap-3">
                                <Smartphone className="w-5 h-5 text-emerald-500" />
                                <div className="text-left">
                                    <p className="font-bold text-sm text-white">Mobile Money (M-Pesa)</p>
                                    <p className="text-[11px] text-gray-500">Direct fiat payout to your phone</p>
                                </div>
                            </div>
                        </button>
                        <button onClick={() => { setMethod('valora'); setMessage(null); }} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${method === 'valora' ? 'bg-orange-500/10 border-orange-500 text-white' : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-600'}`}>
                            <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-orange-500" />
                                <div className="text-left">
                                    <p className="font-bold text-sm text-white">Valora Wallet (cUSD)</p>
                                    <p className="text-[11px] text-gray-500">Stablecoin withdrawal via Celo</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    <form onSubmit={handleWithdraw} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-2">AMOUNT TO WITHDRAW</label>
                            <div className="relative">
                                <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-[#0F1520] border border-[#1E2533] focus:border-orange-500 focus:outline-none rounded-xl py-3 pl-4 pr-16 text-sm font-semibold text-white" required />
                                <span className="absolute right-4 top-3 text-xs font-bold text-orange-500">
                                    {method === 'mpesa' ? 'KES' : method === 'valora' ? 'cUSD' : 'USDA'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase">
                                {method === 'mpesa' ? 'DESTINATION PHONE NUMBER' : 'DESTINATION WALLET ADDRESS'}
                            </label>
                            <input type="text" placeholder={method === 'mpesa' ? '2547XXXXXXXX' : '0x...'} value={counterparty} onChange={(e) => setCounterparty(e.target.value)} className="w-full bg-[#0F1520] border border-[#1E2533] focus:border-orange-500 focus:outline-none rounded-xl py-3 px-4 text-sm font-semibold text-white font-mono" required />
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl border flex items-start gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                {message.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <ShieldAlert className="w-4 h-4 mt-0.5" />}
                                <p className="text-xs font-medium leading-relaxed">{message.text}</p>
                            </div>
                        )}

                        <button type="submit" disabled={isSubmitting} className="w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 mt-2">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowUp className="w-4 h-4" /> Confirm Withdrawal</>}
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-5 bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-bold text-white mb-4">Security Notice</h3>
                    <div className="space-y-4 p-4 bg-[#0F1520] border border-[#1E2533] rounded-xl">
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            Withdrawals are processed instantly but blockchain network confirmations may take up to 5 minutes depending on congestion.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};