import { useState, useEffect } from 'react'
import { ArrowDown, CheckCircle2, AlertCircle, Copy, RefreshCw, Smartphone, Hexagon, ShieldCheck, Building2, CreditCard, Lock, ExternalLink, Wallet } from 'lucide-react'
import { verifyCardanoDeposit, verifyValoraDeposit, getCardanoWallet, executeRamp } from '../../api/client'

const CHANNELS = [
    { id: 'Mobile Money', name: 'Mobile Money (M-Pesa)', icon: Smartphone, active: true, color: 'text-emerald-400', bg: 'bg-emerald-500/20', activeBorder: 'border-emerald-500' },
    { id: 'Cardano Blockchain', name: 'Cardano Native Wallet', icon: Hexagon, active: true, color: 'text-blue-400', bg: 'bg-blue-500/20', activeBorder: 'border-blue-500' },
    { id: 'Valora Wallet', name: 'Valora (Celo cUSD)', icon: Wallet, active: true, color: 'text-orange-400', bg: 'bg-orange-500/20', activeBorder: 'border-orange-500' },
    { id: 'Bank Transfer', name: 'Bank Transfer', icon: Building2, active: false, color: 'text-gray-500', bg: 'bg-[#1e2d3d]/50', activeBorder: '' },
    { id: 'Card', name: 'Debit/Credit Card', icon: CreditCard, active: false, color: 'text-gray-500', bg: 'bg-[#1e2d3d]/50', activeBorder: '' }
]

export default function DepositPage() {
    const [channel, setChannel] = useState('Mobile Money')
    const [amount, setAmount] = useState('')
    const [counterparty, setCounterparty] = useState('')
    const [txHashInput, setTxHashInput] = useState('')

    const [cardanoAddress, setCardanoAddress] = useState('')
    const [loading, setLoading] = useState(false)
    const [toastError, setToastError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    const activeAsset = channel === 'Cardano Blockchain' ? 'USDA' : channel === 'Valora Wallet' ? 'cUSD' : 'KES'

    // Auto-fetch the Cardano deposit address when the user selects the Cardano channel
    useEffect(() => {
        if (channel === 'Cardano Blockchain') {
            setLoading(true)
            getCardanoWallet().then((res: any) => {
                setCardanoAddress(res?.data?.data?.address || res?.data?.address || res?.address || 'addr_standby_placeholder')
            }).catch(() => setToastError('Failed to fetch deposit address.')).finally(() => setLoading(false))
        }
    }, [channel])

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault()
        setToastError(''); setSuccessMsg(''); setLoading(true)
        const numAmt = parseFloat(amount)

        try {
            if (channel === 'Mobile Money') {
                if (!counterparty) throw new Error("M-Pesa Phone Number required.")
                // Webhook handles the background update for M-Pesa
                await executeRamp({ direction: 'on', channel, from_asset: 'KES', to_asset: 'KES', amount: numAmt, rate: 1, fee: 0, counterparty })
                setSuccessMsg("STK Push initiated! Please check your phone to enter your M-Pesa PIN.")
            } else if (channel === 'Cardano Blockchain') {
                if (!txHashInput || txHashInput.length < 10) throw new Error("Please paste a valid Cardano Transaction Hash.")
                await verifyCardanoDeposit({ amount: numAmt, tx_hash: txHashInput, counterparty: 'Cardano On Chain' })
                setSuccessMsg("Blockchain deposit verified successfully!")
            } else if (channel === 'Valora Wallet') {
                if (!txHashInput || txHashInput.length < 10) throw new Error("Please paste a valid Celo Transaction Hash.")
                await verifyValoraDeposit({ amount: numAmt, tx_hash: txHashInput, counterparty: 'Valora On Chain' })
                setSuccessMsg("cUSD deposit verified successfully!")
            }
            setAmount(''); setTxHashInput(''); setCounterparty('');
        } catch (err: any) {
            setToastError(err.message || err.response?.data?.detail || "Transaction failed.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <div className="mesh-card p-8">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <ArrowDown className="w-5 h-5 text-emerald-400" /> Fund Your Wallet
                </h2>

                {/* ALARMS */}
                {toastError && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2 animate-in slide-in-from-top-2"><AlertCircle className="w-4 h-4 shrink-0" />{toastError}</div>}
                {successMsg && <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2 animate-in slide-in-from-top-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}</div>}

                <form onSubmit={handleDeposit} className="space-y-6">

                    {/* Dynamic Channel Grid with Colored Icons */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {CHANNELS.map(c => (
                            <button
                                type="button"
                                key={c.id}
                                disabled={!c.active}
                                onClick={() => setChannel(c.id)}
                                className={`pt-5 pb-4 px-3 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all relative ${!c.active ? 'bg-[#06090F]/50 border-dashed border-[#1e2d3d] text-gray-600 cursor-not-allowed' :
                                        channel === c.id ? `bg-[#172130] ${c.activeBorder} text-white shadow-md` :
                                            'bg-[#111827] border-[#1e2d3d] text-gray-400 hover:border-gray-500'
                                    }`}
                            >
                                <div className={`p-3 rounded-2xl ${c.bg}`}>
                                    <c.icon className={`w-6 h-6 ${!c.active ? 'opacity-50 text-gray-500' : c.color}`} />
                                </div>
                                <span className="text-[11px] font-semibold text-center leading-tight">{c.name}</span>
                                {!c.active && (
                                    <span className="absolute top-2 right-2 text-[8px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold flex items-center gap-0.5">
                                        <Lock className="w-2 h-2" /> Soon
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="bg-[#111827] border border-[#1e2d3d] rounded-xl p-6 space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Amount to Deposit</label>
                            <div className="relative">
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="mesh-input text-xl font-mono py-4" required />
                                <span className="absolute right-4 top-4 font-bold text-emerald-400">{activeAsset}</span>
                            </div>
                        </div>

                        {/* DYNAMIC INPUTS BASED ON SELECTED CHANNEL */}
                        {channel === 'Mobile Money' ? (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">M-Pesa Phone Number</label>
                                <input type="text" value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="2547XXXXXXXX" className="mesh-input font-mono" required />
                            </div>
                        ) : (
                            <div className="space-y-5">

                                {/* Valora Helper Box */}
                                {channel === 'Valora Wallet' && (
                                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                                        <p className="text-xs text-blue-400 font-bold mb-1 flex items-center gap-2">
                                            <Smartphone className="w-4 h-4" /> Best Experience: Use the Valora App
                                        </p>
                                        <p className="text-[11px] text-gray-400 mb-3">For instant, low-fee stablecoin transfers, we recommend using the Valora mobile wallet.</p>
                                        <a href="https://valoraapp.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                            Download Valora <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}

                                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                    <p className="text-xs text-orange-400 font-bold mb-2 uppercase tracking-wider">1. Send {activeAsset} to Treasury Vault</p>
                                    <p className="text-[10px] text-gray-400 mb-3">Please send your funds on-chain to the platform's secure vault address below.</p>
                                    <div className="flex gap-2">
                                        <input readOnly value={channel === 'Cardano Blockchain' ? cardanoAddress : '0x6f7BeAb48EAfC47B89041899a35a0525a6A60F59'} className="mesh-input bg-[#0d1420] text-gray-300 font-mono text-[10px]" />
                                        <button type="button" onClick={() => navigator.clipboard.writeText(channel === 'Cardano Blockchain' ? cardanoAddress : '0x6f7BeAb48EAfC47B89041899a35a0525a6A60F59')} className="px-4 bg-[#1e2d3d] rounded-xl hover:bg-gray-700 transition-colors"><Copy className="w-4 h-4 text-white" /></button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-blue-400 font-bold mb-2 uppercase tracking-wider">2. Verify Transaction Hash</p>
                                    <input type="text" value={txHashInput} onChange={e => setTxHashInput(e.target.value)} placeholder="Paste TxHash from your wallet here..." className="mesh-input font-mono" required />
                                </div>
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-4 rounded-xl transition-all duration-300 text-sm tracking-wide shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 active:scale-[0.98]">
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                        Confirm Secure Deposit
                    </button>
                </form>
            </div>
        </div>
    )
}