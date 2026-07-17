import React, { useState, useEffect } from 'react';
import { CheckCircle2, Smartphone, Globe, Link, AlertCircle, Clock, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile, getKycStatus } from '../../api/client';
import { useNavigate } from 'react-router-dom';

export const ProfilePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Local state for the editable fields
    const [fullName, setFullName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [kycStatus, setKycStatus] = useState<'pending' | 'verified' | 'unverified'>(user?.kycStatus as any || 'unverified');

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await getKycStatus();
                if (res.data?.kycStatus) {
                    setKycStatus(res.data.kycStatus);
                }
            } catch (err) {
                console.warn('KYC status unavailable', err);
            }
        };
        fetchStatus();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setToastMessage(null);

        try {
            await updateProfile({ name: fullName, email, phone });
            setToastMessage({ type: 'success', text: 'Profile saved securely!' });
        } catch (err) {
            console.error(err);
            setToastMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setToastMessage(null), 4000);
        }
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500 text-gray-200 p-4 md:p-6">

            { }
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Profile</h1>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        Retail
                    </span>
                </div>

                {toastMessage && (
                    <div className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg animate-in slide-in-from-right-4 ${toastMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {toastMessage.text}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                { }
                <div className="space-y-6">
                    <div className="bg-[#0F1520] border border-[#1E2533] rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-bold text-white tracking-wide">Personal Information</h2>
                            {kycStatus === 'verified' && (
                                <span className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                                    <Lock className="w-3 h-3" /> Identity Locked
                                </span>
                            )}
                        </div>

                        <form onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">
                                    {kycStatus === 'verified' ? 'Full Name (Legal)' : 'Full Name'}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        disabled={kycStatus === 'verified'}
                                        className="w-full bg-[#0B0E14] border border-[#1E2533] focus:border-emerald-500 focus:outline-none rounded-xl py-3 px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    {kycStatus === 'verified' && <Lock className="absolute right-4 top-3.5 w-4 h-4 text-gray-600" />}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#0B0E14] border border-[#1E2533] focus:border-emerald-500 focus:outline-none rounded-xl py-3 px-4 text-sm font-semibold text-white transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">Phone</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-[#0B0E14] border border-[#1E2533] focus:border-emerald-500 focus:outline-none rounded-xl py-3 px-4 text-sm font-semibold text-white transition-colors font-mono"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-[#EAB308] hover:bg-[#D97706] text-black font-bold text-xs px-6 py-2.5 rounded-lg transition-colors shadow-lg disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                { }
                <div className="space-y-6">

                    {/* DYNAMIC KYC Box */}
                    <div className="bg-[#0F1520] border border-[#1E2533] rounded-2xl p-6 shadow-lg">
                        <h2 className="text-sm font-bold text-white tracking-wide mb-4">KYC Status</h2>
                        <div className="flex items-center gap-3">
                            {kycStatus === 'verified' ? (
                                <>
                                    <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded text-xs font-bold">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                    </span>
                                    <span className="text-xs text-gray-400 font-medium">
                                        Identity linked to: <span className="text-white font-bold">{user?.name || 'Account'}</span>
                                    </span>
                                </>
                            ) : kycStatus === 'pending' ? (
                                <>
                                    <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded text-xs font-bold">
                                        <Clock className="w-3.5 h-3.5" /> Pending
                                    </span>
                                    <span className="text-xs text-gray-400 font-medium">Documents under review</span>
                                </>
                            ) : (
                                <>
                                    <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded text-xs font-bold">
                                        <AlertCircle className="w-3.5 h-3.5" /> Unverified
                                    </span>
                                    <button onClick={() => navigate('/kyc')} className="text-xs text-blue-400 hover:text-blue-300 underline font-medium">
                                        Complete KYC to unlock trading
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Security Box */}
                    <div className="bg-[#0F1520] border border-[#1E2533] rounded-2xl p-6 shadow-lg">
                        <h2 className="text-sm font-bold text-white tracking-wide mb-4">Security</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-[#1E2533]/50">
                                <span className="text-xs text-gray-300 font-medium">Two-Factor Auth</span>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Enabled</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-xs text-gray-300 font-medium">Login Notifications</span>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">On</span>
                            </div>
                        </div>
                    </div>

                    {/* Linked Wallets Box */}
                    <div className="bg-[#0F1520] border border-[#1E2533] rounded-2xl p-6 shadow-lg">
                        <h2 className="text-sm font-bold text-white tracking-wide mb-4">Linked Wallets</h2>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between py-3 border-b border-[#1E2533]/50">
                                <div className="flex items-center gap-3">
                                    <Smartphone className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs text-gray-300 font-medium">M-Pesa</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400">Connected</span>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-[#1E2533]/50">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-4 h-4 text-orange-500" />
                                    <span className="text-xs text-gray-300 font-medium">Valora</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400">Connected</span>
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <Link className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs text-gray-300 font-medium">Cardano</span>
                                </div>
                                <button className="text-[10px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1 rounded transition-colors border border-blue-500/20">
                                    Connect
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};