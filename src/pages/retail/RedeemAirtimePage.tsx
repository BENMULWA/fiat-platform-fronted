import { useState } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import { redeemAirt } from '../../api/client';

export const RedeemAirtimePage = () => {
    const [selectedCountry, setSelectedCountry] = useState<'KE' | 'TZ' | 'UG' | 'RW'>('KE');
    const [selectedNetwork, setSelectedNetwork] = useState('Safaricom');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [airtimeAmount, setAirtimeAmount] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);

    const countries = [
        { code: 'KE', name: 'Kenya', active: true },
        { code: 'TZ', name: 'Tanzania', active: false },
        { code: 'UG', name: 'Uganda', active: false },
        { code: 'RW', name: 'Rwanda', active: false },
    ];

    const networks = [
        { id: 'Safaricom', name: 'Safaricom', active: true },
        { id: 'Airtel', name: 'Airtel', active: true },
        { id: 'MTN', name: 'MTN', active: false },
        { id: 'Vodafone', name: 'Vodafone', active: false },
        { id: 'Orange', name: 'Orange', active: false },
    ];

    const handleRedeemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsRedeeming(true);
        try {
            await redeemAirt({ amount: Number(airtimeAmount), phone: phoneNumber, provider: selectedNetwork.toUpperCase() });
            alert(`Redemption transaction processed successfully.`);
            setAirtimeAmount(''); setPhoneNumber('');
        } catch (err: any) {
            alert(err.response?.data?.detail || "Redemption failed.");
        } finally {
            setIsRedeeming(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 shadow-xl">
                <h2 className="text-xl font-extrabold text-white mb-6 flex items-center gap-3">
                    <Phone className="w-5 h-5 text-emerald-500" /> Convert Airtime to Digital Tokens
                </h2>

                {/* Dynamic Country Selector */}
                <div className="mb-6">
                    <label className="block text-[11px] font-bold text-gray-500 mb-3 uppercase tracking-wider">Target Jurisdiction</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {countries.map((c) => (
                            <button key={c.code} type="button" disabled={!c.active} onClick={() => setSelectedCountry(c.code as 'KE')}
                                className={`p-3 rounded-xl border flex flex-col items-center justify-center relative transition-all ${!c.active ? 'bg-[#0F1520] border-dashed border-[#1E2533] text-gray-600 cursor-not-allowed' : selectedCountry === c.code ? 'bg-emerald-500/10 border-emerald-500 text-white font-bold' : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-600'}`}
                            >
                                <span className="text-sm">{c.name}</span>
                                {!c.active && <span className="absolute top-1 right-1 text-[8px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded uppercase tracking-wider">Soon</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Network Selector */}
                <div className="mb-6">
                    <label className="block text-[11px] font-bold text-gray-500 mb-3 uppercase tracking-wider">Carrier Networks</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {networks.map((net) => (
                            <button key={net.id} type="button" disabled={!net.active} onClick={() => setSelectedNetwork(net.id as 'Safaricom')}
                                className={`p-3 rounded-xl border flex flex-col items-center justify-center relative transition-all ${!net.active ? 'bg-[#0F1520] border-dashed border-[#1E2533] text-gray-600 cursor-not-allowed' : selectedNetwork === net.id ? 'bg-emerald-500/10 border-emerald-500 text-white font-bold' : 'bg-[#0F1520] border-[#1E2533] text-gray-400 hover:border-gray-600'}`}
                            >
                                <span className="text-xs">{net.name}</span>
                                {!net.active && <span className="absolute top-1 right-1 text-[8px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded uppercase tracking-wider">Soon</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleRedeemSubmit} className="space-y-4 pt-4 border-t border-[#1E2533]">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-2">PHONE NUMBER</label>
                        <input type="text" placeholder="+254712345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full bg-[#0F1520] border border-[#1E2533] focus:border-emerald-500 focus:outline-none rounded-xl py-3 px-4 text-sm font-semibold text-white" required />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-2">AIRTIME QUANTITY (KES)</label>
                        <input type="number" placeholder="Min value: 100 KES" value={airtimeAmount} onChange={(e) => setAirtimeAmount(e.target.value)} className="w-full bg-[#0F1520] border border-[#1E2533] focus:border-emerald-500 focus:outline-none rounded-xl py-3 px-4 text-sm font-semibold text-white" required />
                    </div>

                    <button type="submit" disabled={isRedeeming} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm tracking-wide rounded-xl transition-all flex items-center justify-center gap-2">
                        {isRedeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Airtime Redemption"}
                    </button>
                </form>
            </div>
        </div>
    );
};