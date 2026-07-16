import { useState } from 'react';
import { Shield, Smartphone, Globe, Upload, CheckCircle, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [kycLevel, setKycLevel] = useState<1 | 2 | 3>(1);

    const activeUser = user || { name: 'Retail User', email: 'user@meshex.com', phone: '+254712345678', kycLevel: 1 };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">

            {/* Left Column: Account Settings */}
            <div className="lg:col-span-7 space-y-6">
                <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-base font-bold text-white tracking-wide">Personal Information</h2>
                        <button onClick={() => setIsEditing(!isEditing)} className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-all">
                            {isEditing ? 'Save Changes' : 'Edit Profile'}
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase">Full Name</label>
                            <input type="text" disabled={!isEditing} defaultValue={activeUser.name} className="w-full bg-[#0F1520] border border-[#1E2533] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl py-2.5 px-4 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase">Email Address</label>
                            <input type="email" disabled={!isEditing} defaultValue={activeUser.email} className="w-full bg-[#0F1520] border border-[#1E2533] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl py-2.5 px-4 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase">Verified Mobile Phone</label>
                            <input type="text" disabled={!isEditing} defaultValue={activeUser.phone || "+254712345678"} className="w-full bg-[#0F1520] border border-[#1E2533] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl py-2.5 px-4 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none transition-all" />
                        </div>
                    </div>
                </div>

                {/* Linked Integrations */}
                <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 shadow-xl">
                    <h2 className="text-base font-bold text-white tracking-wide mb-6">Linked Wallets</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-[#0F1520] border border-[#1E2533] rounded-xl">
                            <div className="flex items-center gap-3">
                                <Smartphone className="w-5 h-5 text-emerald-500" />
                                <div>
                                    <p className="text-xs font-bold text-white">M-Pesa Express</p>
                                    <p className="text-[10px] text-gray-500">Connected to phone number +254712345678</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">Linked</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-[#0F1520] border border-[#1E2533] rounded-xl">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-amber-500" />
                                <div>
                                    <p className="text-xs font-bold text-white">Valora Wallet Mapping</p>
                                    <p className="text-[10px] text-gray-500">Mapped to internal Celo exit treasury rules</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">Linked</span>
                        </div>
                        <button className="w-full py-3 border border-dashed border-[#1E2533] hover:border-gray-600 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-all">
                            <Plus className="w-4 h-4 text-blue-500" /> Connect Cardano Nami Wallet
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: KYC Center */}
            <div className="lg:col-span-5 space-y-6">
                <div className="bg-[#0B0E14] border border-[#1E2533] rounded-2xl p-8 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-xl" />

                    <div className="flex items-center gap-2 mb-6">
                        <Shield className="w-5 h-5 text-amber-500" />
                        <h2 className="text-base font-bold text-white tracking-wide">KYC Compliance Center</h2>
                    </div>

                    <div className="space-y-6">
                        {/* Level 1 */}
                        <div className="flex gap-4 p-4 bg-[#0F1520] border border-[#1E2533] rounded-xl relative">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <div>
                                <h3 className="text-xs font-bold text-white">Level 1 — Basic Verified</h3>
                                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">Email verification and local phone mapping complete. Limits locked at 50,000 KES.</p>
                            </div>
                        </div>

                        {/* Level 2 */}
                        <div className={`flex gap-4 p-4 rounded-xl border relative transition-all ${kycLevel >= 2 ? 'bg-[#0F1520] border-[#1E2533]' : 'bg-[#0F1520]/50 border-dashed border-[#1E2533]'}`}>
                            <div className="shrink-0 mt-0.5">
                                {kycLevel >= 2 ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center text-xs font-bold font-mono text-gray-500">2</div>}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-white">Level 2 — National Identity</h3>
                                    <span className="text-[8px] bg-amber-500/10 text-amber-500 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Required for Web3</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">Required to execute Cardano-Celo bridge integrations. Unlimited daily volume.</p>
                                {kycLevel < 2 && (
                                    <div className="mt-4 pt-4 border-t border-[#1E2533] space-y-3">
                                        <div className="border border-dashed border-[#1E2533] rounded-lg p-4 flex flex-col items-center justify-center hover:bg-[#172130] cursor-pointer transition-all">
                                            <Upload className="w-6 h-6 text-gray-500 mb-2" />
                                            <p className="text-[10px] text-gray-400 font-bold">Upload National ID Card or Passport</p>
                                            <p className="text-[8px] text-gray-600 mt-1">Acceptable types: PNG, JPEG, PDF up to 10MB</p>
                                        </div>
                                        <button onClick={() => setKycLevel(2)} className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-lg transition-all">Submit & Screen</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Level 3 */}
                        <div className={`flex gap-4 p-4 rounded-xl border relative transition-all ${kycLevel >= 3 ? 'bg-[#0F1520] border-[#1E2533]' : 'bg-[#0F1520]/30 border-dashed border-[#1E2533] opacity-60'}`}>
                            <div className="shrink-0 mt-0.5">
                                {kycLevel >= 3 ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-700 flex items-center justify-center text-xs font-bold font-mono text-gray-600">3</div>}
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-white">Level 3 — Enterprise Compliance</h3>
                                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">Merchant verification, proof of address, and corporate registration validation.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};