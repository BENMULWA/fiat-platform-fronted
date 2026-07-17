//@ts-nocheck

import React, { useState } from 'react';
import { Smartphone, Wallet, CheckCircle, ShieldAlert, ArrowUp, Loader2, Sparkles, Hexagon, Clock, ArrowRightLeft } from 'lucide-react';
import { executeRamp, withdrawUsda, executeValoraWithdraw } from '../../api/client';

export const WithdrawPage = () => {
    const [method, setMethod] = useState<'mpesa' | 'valora' | 'cardano'>('mpesa');
    const [amount, setAmount] = useState('');
    const [counterparty, setCounterparty] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const activeAsset = method === 'mpesa' ? 'KES' : method === 'valora' ? 'cUSD' : 'USDA';
    const themeColor = method === 'mpesa' ? 'emerald' : method === 'valora' ? 'orange' : 'blue';

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!counterparty) {
            setMessage({ type: 'error', text: 'Destination required' });
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            if (method === 'cardano') {
                const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                await withdrawUsda({
                    amount: Number(amount),
                    to_address: counterparty,
                    asset: 'USDA',
                    idempotency_key: idempotencyKey,
                    counterparty: 'Cardano off-ramp'
                });
            } else if (method === 'valora') {
                await executeValoraWithdraw({
                    amount: Number(amount),
                    identifier: counterparty
                });
            } else {
                await executeRamp({
                    direction: 'off',
                    channel: 'Mobile Money',
                    from_asset: 'KES',
                    to_asset: 'KES',
                    amount: Number(amount),
                    rate: 1,
                    fee: 0,
                    counterparty
                });
            }
            setMessage({ type: 'success', text: "Withdrawal processed successfully." });
            setAmount('');
            setCounterparty('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.detail || "Withdrawal failed." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto animate-in fade-in duration-500">

            {/* LEFT COLUMN: WITHDRAWAL GATEWAY */}
            <div className="lg:col-span-7 bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 flex flex-col justify-between min-h-[580px] shadow-xl">
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles className={`w-5 h-5 text-${themeColor}-500 transition-colors`} />
                        <h2 className="text-xl font-extrabold text-white tracking-wide">Withdraw Gateway</h2>
                    </div>

                    <div className="space-y-3 mb-6">
                        {/* M-Pesa Button */}
                        <button
                            onClick={() => { setMethod('mpesa'); setMessage(null); }}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${method === 'mpesa' ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md' : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-500'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${method === 'mpesa' ? 'bg-emerald-500/20' : 'bg-[#1E2533]'}`}>
                                    <Smartphone className={`w-5 h-5 ${method === 'mpesa' ? 'text-emerald-500' : 'text-gray-500'}`} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm text-white">Mobile Money (M-Pesa)</p>
                                    <p className="text-[11px] text-gray-500">Direct fiat payout to your phone</p>
                                </div>
                            </div>
                        </button>

                        {/* Valora Button */}
                        <button
                            onClick={() => { setMethod('valora'); setMessage(null); }}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${method === 'valora' ? 'bg-orange-500/10 border-orange-500 text-white shadow-md' : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-500'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${method === 'valora' ? 'bg-orange-500/20' : 'bg-[#1E2533]'}`}>
                                    <Wallet className={`w-5 h-5 ${method === 'valora' ? 'text-orange-500' : 'text-gray-500'}`} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm text-white">Valora Wallet (cUSD)</p>
                                    <p className="text-[11px] text-gray-500">Stablecoin withdrawal via Celo</p>
                                </div>
                            </div>
                        </button>

                        {/* Cardano Button */}
                        <button
                            onClick={() => { setMethod('cardano'); setMessage(null); }}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${method === 'cardano' ? 'bg-blue-500/10 border-blue-500 text-white shadow-md' : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-500'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${method === 'cardano' ? 'bg-blue-500/20' : 'bg-[#1E2533]'}`}>
                                    <Hexagon className={`w-5 h-5 ${method === 'cardano' ? 'text-blue-500' : 'text-gray-500'}`} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm text-white">Cardano Wallet</p>
                                    <p className="text-[11px] text-gray-500">Native blockchain withdrawals</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    <form onSubmit={handleWithdraw} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Amount to Withdraw</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={`w-full bg-[#0F1520] border border-[#1E2533] focus:border-${themeColor}-500 focus:outline-none rounded-xl py-3 pl-4 pr-16 text-sm font-semibold text-white transition-colors`}
                                    required
                                />
                                <span className={`absolute right-4 top-3 text-xs font-bold text-${themeColor}-500 transition-colors`}>
                                    {activeAsset}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wider">
                                {method === 'mpesa' ? 'Destination Phone Number' : 'Destination Wallet Address'}
                            </label>
                            <input
                                type="text"
                                placeholder={method === 'mpesa' ? '2547XXXXXXXX' : method === 'cardano' ? 'addr1...' : '0x...'}
                                value={counterparty}
                                onChange={(e) => setCounterparty(e.target.value)}
                                className={`w-full bg-[#0F1520] border border-[#1E2533] focus:border-${themeColor}-500 focus:outline-none rounded-xl py-3 px-4 text-sm font-semibold text-white font-mono transition-colors`}
                                required
                            />
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                {message.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <ShieldAlert className="w-4 h-4 mt-0.5" />}
                                <p className="text-xs font-medium leading-relaxed">{message.text}</p>
                            </div>
                        )}

                        {/* Dynamic Button Color */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-4 px-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 mt-2 shadow-lg active:scale-[0.98] ${method === 'mpesa' ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-900/20' :
                                    method === 'valora' ? 'bg-orange-500 hover:bg-orange-400 text-black shadow-orange-900/20' :
                                        'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                                }`}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowUp className="w-5 h-5" /> Confirm Withdrawal</>}
                        </button>
                    </form>
                </div>
            </div>

            {/* RIGHT COLUMN: DYNAMIC WITHDRAWAL PROCEDURE */}
            <div className="lg:col-span-5 bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 flex flex-col shadow-xl">
                <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" /> Withdrawal Procedure
                </h3>

                <div className="space-y-6 flex-1">
                    {method === 'mpesa' ? (
                        <>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono text-xs font-bold text-emerald-400 shrink-0">1</div>
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1">Enter Details</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">Specify the amount of KES you wish to withdraw and your receiving Safaricom M-Pesa number.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-[#0F1520] border border-[#1E2533] flex items-center justify-center font-mono text-xs font-bold text-gray-500 shrink-0">2</div>
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1">Treasury Authorization</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">The platform instantly verifies your balance and authorizes a B2C (Business-to-Customer) payout.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-[#0F1520] border border-[#1E2533] flex items-center justify-center font-mono text-xs font-bold text-gray-500 shrink-0">3</div>
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1">Instant Settlement</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">Funds arrive directly in your M-Pesa account via a Safaricom confirmation message.</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex gap-4">
                                <div className={`w-8 h-8 rounded-full bg-${themeColor}-500/10 border border-${themeColor}-500/30 flex items-center justify-center font-mono text-xs font-bold text-${themeColor}-400 shrink-0 transition-colors`}>1</div>
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1">Provide Destination</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">Enter your personal self-custody wallet address. Ensure it is on the correct network ({method === 'valora' ? 'Celo' : 'Cardano'}).</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-[#0F1520] border border-[#1E2533] flex items-center justify-center font-mono text-xs font-bold text-gray-500 shrink-0">2</div>
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1">Network Broadcasting</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">The Treasury Hub signs the transaction and broadcasts it to the global blockchain network.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-[#0F1520] border border-[#1E2533] flex items-center justify-center font-mono text-xs font-bold text-gray-500 shrink-0">3</div>
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-1">Block Confirmation</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">Depending on network congestion, the {activeAsset} will appear in your wallet within 1 to 5 minutes.</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Security Warning at bottom of right panel */}
                <div className="mt-8 p-4 bg-[#0F1520] border border-[#1E2533] rounded-xl flex items-start gap-3">
                    <ShieldAlert className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                        For security purposes, large withdrawals may require additional manual approval from the Treasury Desk. Ensure your destination details are absolutely correct, as blockchain transactions cannot be reversed.
                    </p>
                </div>
            </div>

        </div>
    );
};