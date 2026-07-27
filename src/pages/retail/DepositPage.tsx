//@ts-nocheck
import React, { useState, useEffect } from 'react'
import { ArrowDown, CheckCircle2, AlertCircle, Copy, RefreshCw, Smartphone, Hexagon, ShieldCheck, Globe, Wallet, Building2, CreditCard, Lock, ExternalLink } from 'lucide-react'
import { verifyCardanoDeposit, verifyValoraDeposit, getCardanoWallet, executeRamp } from '../../api/client'

const CHANNELS = [
  { id: 'Mobile Money', name: 'Mobile Money (M-Pesa)', icon: Smartphone, active: true, color: 'text-emerald-400', activeBorder: 'border-emerald-500', activeBg: 'bg-emerald-500/10' },
  { id: 'Cardano Blockchain', name: 'Cardano Native Wallet', icon: Hexagon, active: true, color: 'text-blue-400', activeBorder: 'border-blue-500', activeBg: 'bg-blue-500/10' },
  { id: 'MiniPay', name: 'Valora (Opera MiniPay)', icon: Wallet, active: true, color: 'text-orange-400', activeBorder: 'border-orange-500', activeBg: 'bg-orange-500/10' },
  { id: 'Bank Transfer', name: 'Bank Transfer', icon: Building2, active: false, color: 'text-gray-500', activeBorder: '', activeBg: '' },
  { id: 'Card', name: 'Debit/Credit Card', icon: CreditCard, active: false, color: 'text-gray-500', activeBorder: '', activeBg: '' }
]

export default function DepositPage() {
  const [channel, setChannel] = useState('Mobile Money')
  const [amount, setAmount] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [txHashInput, setTxHashInput] = useState('')
  
  // State for multi-asset Celo selector
  const [celoAsset, setCeloAsset] = useState<'USDC' | 'USDT' | 'cUSD'>('USDC')

  const [cardanoAddress, setCardanoAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [toastError, setToastError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Dynamically determine the active asset text based on the selected channel and dropdown
  let activeAsset = 'KES';
  if (channel === 'Cardano Blockchain') activeAsset = 'USDA';
  if (channel === 'MiniPay') activeAsset = celoAsset;

  // Dynamic Deep Link for MiniPay using standard intent format
  const CELO_TREASURY_WALLET = "0x6f7BeAb48EAfC47B89041899a35a0525a6A60F59"; 
  const miniPayLink = `celo://wallet/pay?address=${CELO_TREASURY_WALLET}&amount=${amount}&currencyCode=${celoAsset}`;

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
        await executeRamp({ direction: 'on', channel, from_asset: 'KES', to_asset: 'KES', amount: numAmt, rate: 1, fee: 0, counterparty })
        setSuccessMsg("STK Push initiated! Please check your phone to enter your M-Pesa PIN.")
      } else if (channel === 'Cardano Blockchain') {
        if (!txHashInput || txHashInput.length < 10) throw new Error("Please paste a valid Cardano Transaction Hash.")
        await verifyCardanoDeposit({ amount: numAmt, tx_hash: txHashInput, counterparty: 'Cardano On Chain' })
        setSuccessMsg("Blockchain deposit verified successfully!")
      } else if (channel === 'MiniPay') {
        if (!txHashInput || txHashInput.length < 10) throw new Error("Please paste a valid Transaction Hash.")
        await verifyValoraDeposit({ amount: numAmt, tx_hash: txHashInput, asset: celoAsset, counterparty: 'Opera MiniPay' })
        setSuccessMsg(`${celoAsset} deposit verified successfully!`)
      }
      setAmount(''); setTxHashInput(''); setCounterparty('');
    } catch (err: any) {
      setToastError(err.message || err.response?.data?.detail || "Transaction failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pt-4 px-4 md:px-0">
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
          <ArrowDown className="w-6 h-6 text-emerald-500" /> Fund Your Wallet
        </h2>
      </div>

      {toastError && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2"><AlertCircle className="w-5 h-5 shrink-0"/>{toastError}</div>}
      {successMsg && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2"><CheckCircle2 className="w-5 h-5 shrink-0"/>{successMsg}</div>}

      <div className="bg-[#0F1520] border border-[#1E2533] shadow-2xl p-6 md:p-8 rounded-3xl">
        <form onSubmit={handleDeposit} className="space-y-8">
          
          {/* Channel Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {CHANNELS.map(c => (
              <button 
                type="button" 
                key={c.id} 
                disabled={!c.active}
                onClick={() => setChannel(c.id)} 
                className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 relative ${
                  !c.active ? 'bg-[#0B0E14]/50 border-dashed border-[#1E2533] text-gray-600 cursor-not-allowed' :
                  channel === c.id ? `${c.activeBg} ${c.activeBorder} shadow-lg` : 
                  'bg-[#111827] border-[#1E2533] text-gray-400 hover:border-gray-500 hover:bg-[#1a2638]'
                }`}
              >
                <div className={`p-3 rounded-xl ${channel === c.id ? c.color.replace('text', 'bg').replace('400', '500/20') : 'bg-[#1e2d3d]'}`}>
                  <c.icon className={`w-6 h-6 ${channel === c.id ? c.color : 'text-gray-500'}`} />
                </div>
                <span className={`text-[12px] font-bold text-center leading-tight ${channel === c.id ? 'text-white' : 'text-gray-400'}`}>
                  {c.name}
                </span>
                {!c.active && (
                  <span className="absolute top-2 right-2 text-[9px] bg-orange-500/10 text-orange-500 border border-orange-500/20 px-1.5 py-0.5 rounded font-bold tracking-wider flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> SOON
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-[#111827] border border-[#1E2533] rounded-2xl p-6 md:p-8 space-y-6 shadow-inner">
            
            {/* Amount & Asset Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Amount to Deposit</label>
                
                {channel === 'MiniPay' && (
                  <div className="flex bg-[#0B0E14] border border-[#1E2533] rounded-lg overflow-hidden p-0.5 shadow-inner">
                    {['USDC', 'USDT', 'cUSD'].map(asset => (
                      <button
                        key={asset}
                        type="button"
                        onClick={() => setCeloAsset(asset as any)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-md ${
                          celoAsset === asset ? 'bg-[#1e2d3d] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {asset}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <input 
                  type="number" 
                  value={amount} 
                  onChange={e=>setAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="w-full bg-[#0B0E14] border border-[#1E2533] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none rounded-xl py-4 pl-5 pr-16 text-2xl font-bold text-white transition-all font-mono placeholder-gray-700" 
                  required 
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-emerald-400">{activeAsset}</span>
              </div>
            </div>

            {/* DYNAMIC INPUTS BASED ON SELECTED CHANNEL */}
            {channel === 'Mobile Money' ? (
              <div className="space-y-2 pt-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">M-Pesa Phone Number</label>
                <input 
                  type="text" 
                  value={counterparty} 
                  onChange={e=>setCounterparty(e.target.value)} 
                  placeholder="2547XXXXXXXX" 
                  className="w-full bg-[#0B0E14] border border-[#1E2533] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none rounded-xl py-3.5 px-5 text-sm font-semibold text-white transition-all font-mono placeholder-gray-700" 
                  required 
                />
              </div>
            ) : (
              <div className="space-y-6 pt-4 border-t border-[#1E2533]">
                
                {/* MiniPay Helper Box */}
                {channel === 'MiniPay' && (
                   <div className="p-5 bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div>
                       <p className="text-sm text-blue-400 font-bold mb-1 flex items-center gap-2">
                         <Smartphone className="w-4 h-4" /> Best Experience: Use the Valora App
                       </p>
                       <p className="text-xs text-gray-400 leading-relaxed">
                         For instant, low-fee stablecoin transfers, we recommend using the Valora mobile wallet.
                       </p>
                     </div>
                     <a href={miniPayLink} className="shrink-0 inline-flex items-center justify-center gap-2 text-xs font-bold transition-all bg-[#0B0E14] text-emerald-400 border border-[#1E2533] hover:border-emerald-500 px-4 py-2.5 rounded-lg shadow-sm">
                       Download Valora <ExternalLink className="w-3.5 h-3.5" />
                     </a>
                   </div>
                )}

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-orange-400 uppercase tracking-widest">1. Send {activeAsset} to Treasury Vault</label>
                  <p className="text-[11px] text-gray-500 mb-2">Please send your funds on-chain to the platform's secure vault address below.</p>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={channel === 'Cardano Blockchain' ? cardanoAddress : CELO_TREASURY_WALLET} 
                      className="flex-1 bg-[#0B0E14] border border-[#1E2533] focus:outline-none rounded-xl py-3 px-4 text-gray-400 font-mono text-[11px] md:text-xs" 
                    />
                    <button 
                      type="button" 
                      onClick={() => navigator.clipboard.writeText(channel === 'Cardano Blockchain' ? cardanoAddress : CELO_TREASURY_WALLET)} 
                      className="px-5 bg-[#1E2533] rounded-xl hover:bg-gray-700 transition-colors text-white font-medium text-sm flex items-center justify-center"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-[11px] font-bold text-blue-400 uppercase tracking-widest">2. Verify Transaction Hash</label>
                  <input 
                    type="text" 
                    value={txHashInput} 
                    onChange={e=>setTxHashInput(e.target.value)} 
                    placeholder="Paste TxHash from your wallet here..." 
                    className="w-full bg-[#0B0E14] border border-[#1E2533] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none rounded-xl py-3.5 px-5 text-sm font-semibold text-white transition-all font-mono placeholder-gray-700" 
                    required 
                  />
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#00d282] hover:bg-[#00e691] text-[#0a1510] font-extrabold py-4 rounded-xl transition-all duration-300 text-[15px] tracking-wide shadow-[0_0_20px_rgba(0,210,130,0.15)] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            Confirm Secure Deposit
          </button>
        </form>
      </div>
    </div>
  )
}