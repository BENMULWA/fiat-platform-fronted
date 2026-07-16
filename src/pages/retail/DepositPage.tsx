import React, { useState } from 'react';
import { Smartphone, Wallet, CheckCircle, ShieldAlert, ArrowDown, Copy, Loader2, Sparkles, Hexagon } from 'lucide-react';
import { executeRamp, verifyCardanoDeposit } from '../../api/client';

export const DepositPage = () => {
    const [method, setMethod] = useState<'mpesa' | 'cardano' | 'valora'>('mpesa');
    const [amount, setAmount] = useState('');
    const [txHash, setTxHash] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const CAR_MASTER_WALLET = "addr1q9y92wzk5t3p0eun3869269uncy...real_master_wallet";
    const CELO_TREASURY_WALLET = "0x4A848...real_celo_address";

    const handleMpesaDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone) { setMessage({ type: 'error', text: 'Phone number required' }); return; }
        setIsSubmitting(true); setMessage(null);
        try {
            await executeRamp({ direction: 'on', channel: 'Mobile Money', from_asset: 'KES', to_asset: 'KES', amount: Number(amount), rate: 1, fee: 0, counterparty: phone });
            setMessage({ type: 'success', text: "STK Push sent successfully. Please complete PIN confirmation." });
            setAmount(''); setPhone('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.detail || "M-Pesa STK Push failed." });
        } finally { setIsSubmitting(false); }
    };

    const handleCryptoDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txHash) { setMessage({ type: 'error', text: "Transaction hash required." }); return; }
        setIsSubmitting(true); setMessage(null);
        try {
            await verifyCardanoDeposit({ amount: Number(amount), tx_hash: txHash, counterparty: 'On Chain Deposit' });
            setMessage({ type: 'success', text: "Blockchain ledger updated. Deposit synchronized." });
            setAmount(''); setTxHash('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.detail || "Verification failed." });
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
            <div className="lg:col-span-7 bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 flex flex-col justify-between min-h-[580px]">
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-xl font-extrabold text-white tracking-wide">Deposit Gateway</h2>
                    </div>

                    <div className="space-y-3 mb-6">
                        <button onClick={() => { setMethod('mpesa'); setMessage(null); }} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${method === 'mpesa' ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-600'}`}>
                            <div className="flex items-center gap-3">
                                <Smartphone className="w-5 h-5 text-emerald-500" />
                                <div className="text-left">
                                    <p className="font-bold text-sm text-white">Mobile Money</p>
                                    <p className="text-[11px] text-gray-500">Instant Safaricom M-Pesa STK Push</p>
                                </div>
                            </div>
                        </button>
                        <button onClick={() => { setMethod('valora'); setMessage(null); }} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${method === 'valora' ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-600'}`}>
                            <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-orange-500" />
                                <div className="text-left">
                                    <p className="font-bold text-sm text-white">Valora Wallet (Celo)</p>
                                    <p className="text-[11px] text-gray-500">Bridge real-time cUSD Stablecoins</p>
                                </div>
                            </div>
                        </button>
                        <button onClick={() => { setMethod('cardano'); setMessage(null); }} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${method === 'cardano' ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-600'}`}>
                            <div className="flex items-center gap-3">
                                <Hexagon className="w-5 h-5 text-blue-500" />
                                <div className="text-left">
                                    <p className="font-bold text-sm text-white">Cardano Wallet</p>
                                    <p className="text-[11px] text-gray-500">Native blockchain deposits</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    <form onSubmit={method === 'mpesa' ? handleMpesaDeposit : handleCryptoDeposit} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-2">AMOUNT TO DEPOSIT</label>
                            <div className="relative">
                                <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-[#0F1520] border border-[#1E2533] focus:border-emerald-500 focus:outline-none rounded-xl py-3 pl-4 pr-16 text-sm font-semibold text-white" required />
                                <span className="absolute right-4 top-3 text-xs font-bold text-emerald-500">
                                    {method === 'mpesa' ? 'KES' : method === 'valora' ? 'cUSD' : 'USDA'}
                                </span>
                            </div>
                        </div>

                        {method === 'mpesa' && (
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 mb-2">M-PESA PHONE NUMBER</label>
                                <input type="text" placeholder="2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#0F1520] border border-[#1E2533] focus:border-emerald-500 focus:outline-none rounded-xl py-3 px-4 text-sm font-semibold text-white font-mono" required />
                            </div>
                        )}

                        {method !== 'mpesa' && (
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 mb-2">TRANSACTION HASH</label>
                                <input type="text" placeholder="Paste verified TxHash" value={txHash} onChange={(e) => setTxHash(e.target.value)} className="w-full bg-[#0F1520] border border-[#1E2533] focus:border-emerald-500 focus:outline-none rounded-xl py-3 px-4 text-sm font-semibold text-white font-mono" required />
                            </div>
                        )}

                        {message && (
                            <div className={`p-4 rounded-xl border flex items-start gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                {message.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <ShieldAlert className="w-4 h-4 mt-0.5" />}
                                <p className="text-xs font-medium leading-relaxed">{message.text}</p>
                            </div>
                        )}

                        <button type="submit" disabled={isSubmitting} className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 mt-2">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowDown className="w-4 h-4" /> Confirm & Deposit</>}
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-5 bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 flex flex-col justify-between">
                {method === 'mpesa' ? (
                    <div>
                        <h3 className="text-sm font-bold text-white mb-4">Mobile Money Verification Flow</h3>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center font-mono text-xs text-emerald-500 shrink-0">1</div>
                                <div><h4 className="text-xs font-bold text-white">Enter Details</h4><p className="text-[11px] text-gray-500 mt-1">Specify deposit amount and Safaricom number.</p></div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-[#0F1520] border border-[#1E2533] flex items-center justify-center font-mono text-xs text-gray-400 shrink-0">2</div>
                                <div><h4 className="text-xs font-bold text-white">STK Prompt</h4><p className="text-[11px] text-gray-500 mt-1">Accept the Lipa Na M-Pesa push on your phone.</p></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h3 className="text-sm font-bold text-white mb-4">Manual Verification Steps</h3>
                        <div className="space-y-4 p-4 bg-[#0F1520] border border-[#1E2533] rounded-xl">
                            <p className="text-[11px] text-gray-400 leading-relaxed">Send your funds on-chain using your external wallet to the address below. Once complete, paste the transaction hash.</p>
                            <div>
                                <label className="block text-[9px] font-bold text-gray-500 mb-1">RECIPIENT ADDRESS</label>
                                <div className="flex items-center gap-2 bg-[#0B0E14] border border-[#1E2533] rounded-lg p-2">
                                    <p className="text-[10px] text-emerald-500 font-mono truncate">{method === 'cardano' ? CAR_MASTER_WALLET : CELO_TREASURY_WALLET}</p>
                                    <button onClick={() => navigator.clipboard.writeText(method === 'cardano' ? CAR_MASTER_WALLET : CELO_TREASURY_WALLET)} className="p-1 rounded bg-[#172130] text-gray-400 hover:text-white">
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};