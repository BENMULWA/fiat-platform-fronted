//@ts-nocheck
import React, { useState } from 'react';
import { Smartphone, Wallet, CheckCircle, ShieldAlert, ArrowUp, Loader2, Hexagon, Clock, Globe } from 'lucide-react';
import { executeRamp, withdrawUsda, executeValoraWithdraw } from '../../api/client';

export const WithdrawPage = () => {
    const [method, setMethod] = useState<'mpesa' | 'minipay' | 'cardano'>('mpesa');
    const [amount, setAmount] = useState('');
    const [counterparty, setCounterparty] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // State for multi-asset Celo selector
    const [celoAsset, setCeloAsset] = useState<'USDC' | 'USDT' | 'cUSD'>('USDC')

    const activeAsset = method === 'mpesa' ? 'KES' : method === 'minipay' ? celoAsset : 'USDA';
    const themeColor = method === 'mpesa' ? 'emerald' : method === 'minipay' ? 'orange' : 'blue';

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
            } else if (method === 'minipay') {
                await executeValoraWithdraw({
                    amount: Number(amount),
                    identifier: counterparty,
                    //asset: celoAsset
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
            setMessage({ type: 'success', text: "Withdrawal broadcasted successfully." });
            setAmount('');
            setCounterparty('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.detail || "Withdrawal failed." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto animate-in fade-in duration-500 pt-4 px-4 md:px-0">

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">Withdraw Funds</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                {/* LEFT COLUMN: WITHDRAWAL GATEWAY */}
                <div className="lg:col-span-7 bg-[#0F1520] border border-[#1E2533] rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-2xl">
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className={`p-2 rounded-lg bg-${themeColor}-500/10 border border-${themeColor}-500/20`}>
                                <ArrowUp className={`w-5 h-5 text-${themeColor}-400`} />
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-wide">Withdraw Gateway</h2>
                        </div>

                        <div className="space-y-3 mb-8">
                            <button
                                onClick={() => { setMethod('mpesa'); setMessage(null); }}
                                className={`w-full flex items-center p-4 rounded-2xl border transition-all duration-300 ${method === 'mpesa' ? 'bg-[#172130] border-[#00d282] shadow-[0_0_15px_rgba(0,210,130,0.1)]' : 'bg-[#0B0E14] border-[#1E2533] text-gray-400 hover:border-gray-500'}`}
                            >
                                <div className={`p-2.5 rounded-xl shrink-0 mr-4 ${method === 'mpesa' ? 'bg-[#00d282]/20 text-[#00d282]' : 'bg-[#1E2533] text-gray-500'}`}>
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className={`font-bold text-sm ${method === 'mpesa' ? 'text-white' : 'text-gray-300'}`}>Mobile Money (M-Pesa)</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Direct fiat payout to your phone</p>
                                </div>
                            </button>

                            <button
                                onClick={() => { setMethod('minipay'); setMessage(null); }}
                                className={`w-full flex items-center p-4 rounded-2xl border transition-all duration-300 ${method === 'minipay' ? 'bg-[#172130] border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-[#0B0E14] border-[#1E2533] text-gray-400 hover:border-gray-500'}`}
                            >
                                <div className={`p-2.5 rounded-xl shrink-0 mr-4 ${method === 'minipay' ? 'bg-orange-500/20 text-orange-400' : 'bg-[#1E2533] text-gray-500'}`}>
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className={`font-bold text-sm ${method === 'minipay' ? 'text-white' : 'text-gray-300'}`}>Valora Wallet (cUSD)</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Stablecoin withdrawal via Celo</p>
                                </div>
                            </button>

                            <button
                                onClick={() => { setMethod('cardano'); setMessage(null); }}
                                className={`w-full flex items-center p-4 rounded-2xl border transition-all duration-300 ${method === 'cardano' ? 'bg-[#172130] border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-[#0B0E14] border-[#1E2533] text-gray-400 hover:border-gray-500'}`}
                            >
                                <div className={`p-2.5 rounded-xl shrink-0 mr-4 ${method === 'cardano' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#1E2533] text-gray-500'}`}>
                                    <Hexagon className="w-5 h-5" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className={`font-bold text-sm ${method === 'cardano' ? 'text-white' : 'text-gray-300'}`}>Cardano Wallet</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Native blockchain withdrawals</p>
                                </div>
                            </button>
                        </div>

                        <form onSubmit={handleWithdraw} className="space-y-6">

                            {/* Amount & Asset Selector */}
                            <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-5 focus-within:border-emerald-500/50 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Amount to Withdraw</label>

                                    {method === 'minipay' && (
                                        <div className="flex bg-[#111827] border border-[#1e2d3d] rounded-lg overflow-hidden p-0.5">
                                            {['USDC', 'USDT', 'cUSD'].map(asset => (
                                                <button
                                                    key={asset}
                                                    type="button"
                                                    onClick={() => setCeloAsset(asset as any)}
                                                    className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-md ${celoAsset === asset ? 'bg-[#1e2d3d] text-white shadow-sm' : 'text-gray-500 hover:text-gray-400'
                                                        }`}
                                                >
                                                    {asset}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-transparent outline-none text-3xl font-bold text-white font-mono placeholder-gray-700"
                                        required
                                    />
                                    <span className={`font-bold text-${themeColor}-400 text-lg`}>
                                        {activeAsset}
                                    </span>
                                </div>
                            </div>

                            {/* Destination Input */}
                            <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-5 focus-within:border-emerald-500/50 transition-colors">
                                <label className="block text-[11px] font-bold text-gray-500 mb-3 uppercase tracking-widest">
                                    {method === 'mpesa' ? 'Destination Phone Number' : 'Destination Wallet Address'}
                                </label>
                                <input
                                    type="text"
                                    placeholder={method === 'mpesa' ? '2547XXXXXXXX' : '0x...'}
                                    value={counterparty}
                                    onChange={(e) => setCounterparty(e.target.value)}
                                    className="w-full bg-transparent outline-none text-base font-semibold text-white font-mono placeholder-gray-700"
                                    required
                                />
                            </div>

                            {message && (
                                <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 font-medium text-sm ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                    {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
                                    <p>{message.text}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 px-4 rounded-xl font-extrabold text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2 mt-2 bg-[#00d282] hover:bg-[#00e691] text-[#0a1510] shadow-[0_0_20px_rgba(0,210,130,0.15)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowUp className="w-5 h-5" /> Confirm Withdrawal</>}
                            </button>
                        </form>
                    </div>
                </div>

                {/* RIGHT COLUMN: DYNAMIC WITHDRAWAL PROCEDURE */}
                <div className="lg:col-span-5 bg-[#0F1520] border border-[#1E2533] rounded-3xl p-6 md:p-8 flex flex-col shadow-2xl h-fit">
                    <h3 className="text-[11px] font-bold text-gray-500 mb-8 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" /> Withdrawal Procedure
                    </h3>

                    <div className="space-y-8 flex-1 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-800 before:via-gray-800 before:to-transparent">
                        {method === 'mpesa' ? (
                            <>
                                <div className="relative flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[#00d282]/10 border border-[#00d282]/30 flex items-center justify-center font-mono text-[11px] font-bold text-[#00d282] shrink-0 z-10 shadow-[0_0_10px_rgba(0,210,130,0.2)]">1</div>
                                    <div className="pt-1">
                                        <h4 className="text-sm font-bold text-white mb-1.5">Enter Details</h4>
                                        <p className="text-[13px] text-gray-500 leading-relaxed">Specify the amount of KES you wish to withdraw and your receiving Safaricom M-Pesa number.</p>
                                    </div>
                                </div>
                                <div className="relative flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[#111827] border border-[#1E2533] flex items-center justify-center font-mono text-[11px] font-bold text-gray-500 shrink-0 z-10">2</div>
                                    <div className="pt-1">
                                        <h4 className="text-sm font-bold text-white mb-1.5">Treasury Authorization</h4>
                                        <p className="text-[13px] text-gray-500 leading-relaxed">The platform instantly verifies your balance and authorizes a B2C (Business-to-Customer) payout.</p>
                                    </div>
                                </div>
                                <div className="relative flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[#111827] border border-[#1E2533] flex items-center justify-center font-mono text-[11px] font-bold text-gray-500 shrink-0 z-10">3</div>
                                    <div className="pt-1">
                                        <h4 className="text-sm font-bold text-white mb-1.5">Instant Settlement</h4>
                                        <p className="text-[13px] text-gray-500 leading-relaxed">Funds arrive directly in your M-Pesa account via a Safaricom confirmation message.</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="relative flex items-start gap-4">
                                    <div className={`w-8 h-8 rounded-full bg-${themeColor}-500/10 border border-${themeColor}-500/30 flex items-center justify-center font-mono text-[11px] font-bold text-${themeColor === 'orange' ? 'orange-400' : 'blue-400'} shrink-0 z-10 shadow-[0_0_10px_rgba(0,0,0,0.2)]`}>1</div>
                                    <div className="pt-1">
                                        <h4 className="text-sm font-bold text-white mb-1.5">Select Asset & Destination</h4>
                                        <p className="text-[13px] text-gray-500 leading-relaxed">Ensure you have selected the correct stablecoin token before pasting your receiving address.</p>
                                    </div>
                                </div>
                                <div className="relative flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[#111827] border border-[#1E2533] flex items-center justify-center font-mono text-[11px] font-bold text-gray-500 shrink-0 z-10">2</div>
                                    <div className="pt-1">
                                        <h4 className="text-sm font-bold text-white mb-1.5">Network Broadcasting</h4>
                                        <p className="text-[13px] text-gray-500 leading-relaxed">The Treasury Hub signs the transaction and routes the {activeAsset} directly to the blockchain network.</p>
                                    </div>
                                </div>
                                <div className="relative flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-[#111827] border border-[#1E2533] flex items-center justify-center font-mono text-[11px] font-bold text-gray-500 shrink-0 z-10">3</div>
                                    <div className="pt-1">
                                        <h4 className="text-sm font-bold text-white mb-1.5">On-Chain Finality</h4>
                                        <p className="text-[13px] text-gray-500 leading-relaxed">Wait 5-10 seconds for the network validators to confirm your transaction block.</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-10 p-5 bg-[#0B0E14] border border-[#1E2533] rounded-xl flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-gray-500 shrink-0" />
                        <p className="text-xs text-gray-400 leading-relaxed">
                            For security purposes, large withdrawals may require additional manual approval from the Treasury Desk. Ensure your destination details are absolutely correct, as blockchain transactions cannot be reversed.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};