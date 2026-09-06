//@ts-nocheck
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Smartphone, Globe, Link, AlertCircle, Clock, Lock, Copy, Check, Camera, KeyRound, Monitor, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
    updateProfile, getKycStatus, getDepositDetails, getTwoFactorStatus, setupTotp, verifyTotpSetup, disableTotp,
    getAntiPhishingCode, setAntiPhishingCode, uploadAvatar, deleteAvatar, listSessions, revokeSession, revokeOtherSessions,
} from '../../api/client';
import { useNavigate, useLocation } from 'react-router-dom';

// One row per chain this platform actually derives a permanent per-user
// deposit address for (see backend/routes/treasury.py get_deposit_info).
// M-Pesa/Valora aren't "linked accounts" in this platform — M-Pesa is
// paybill-based and Valora is just a wallet app for Celo — so there's
// nothing real to show for those; these three are.
const DEPOSIT_NETWORKS = [
    { network: 'celo', asset: 'cUSD', label: 'Celo', icon: Globe, color: 'text-emerald-500' },
    { network: 'cardano', asset: 'USDA', label: 'Cardano', icon: Link, color: 'text-blue-500' },
    { network: 'stellar', asset: 'USDC', label: 'Stellar', icon: Smartphone, color: 'text-indigo-400' },
];

export const ProfilePage = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    // Local state for the editable fields
    const [fullName, setFullName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [kycStatus, setKycStatus] = useState<'pending' | 'verified' | 'unverified'>(user?.kycStatus as any || 'unverified');

    const [depositAddresses, setDepositAddresses] = useState<Record<string, string>>({});
    const [addressesLoading, setAddressesLoading] = useState(false);
    const [copiedNetwork, setCopiedNetwork] = useState<string | null>(null);

    // Avatar — stored as a base64 data URI (see backend/routes/auth.py
    // upload_avatar), same pattern already used for KYC documents.
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState('');

    // Anti-phishing code — echoed back in every real security email so a
    // spoofed phishing email (which won't know it) is detectable at a glance.
    const [antiPhishingCode, setAntiPhishingCodeState] = useState('');
    const [antiPhishingInput, setAntiPhishingInput] = useState('');
    const [antiPhishingSaving, setAntiPhishingSaving] = useState(false);
    const [antiPhishingError, setAntiPhishingError] = useState('');
    const [antiPhishingSaved, setAntiPhishingSaved] = useState(false);

    // Active sessions / device management.
    const [sessions, setSessions] = useState<any[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const loadSessions = () => {
        setSessionsLoading(true);
        listSessions()
            .then(res => setSessions(res.data?.sessions || []))
            .catch(() => {})
            .finally(() => setSessionsLoading(false));
    };

    useEffect(() => {
        getAntiPhishingCode().then(res => {
            const code = res.data?.antiPhishingCode || '';
            setAntiPhishingCodeState(code);
            setAntiPhishingInput(code);
        }).catch(() => {});
        loadSessions();
    }, []);

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarError('');
        if (file.size > 1_500_000) {
            setAvatarError('Image is too large (max 1.5MB).');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            setAvatarUploading(true);
            try {
                await uploadAvatar(dataUrl);
                setAvatarUrl(dataUrl);
                updateUser({ avatarUrl: dataUrl });
            } catch (err: any) {
                setAvatarError(err.response?.data?.detail || 'Failed to upload avatar.');
            } finally {
                setAvatarUploading(false);
                e.target.value = '';
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAvatarRemove = async () => {
        setAvatarUploading(true);
        setAvatarError('');
        try {
            await deleteAvatar();
            setAvatarUrl('');
            updateUser({ avatarUrl: '' });
        } catch (err: any) {
            setAvatarError(err.response?.data?.detail || 'Failed to remove avatar.');
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleSaveAntiPhishingCode = async () => {
        setAntiPhishingError(''); setAntiPhishingSaved(false);
        if (!antiPhishingInput.trim()) { setAntiPhishingError('Enter a code.'); return; }
        setAntiPhishingSaving(true);
        try {
            const res = await setAntiPhishingCode(antiPhishingInput.trim());
            setAntiPhishingCodeState(res.data?.antiPhishingCode || antiPhishingInput.trim());
            setAntiPhishingSaved(true);
            setTimeout(() => setAntiPhishingSaved(false), 3000);
        } catch (err: any) {
            setAntiPhishingError(err.response?.data?.detail || 'Failed to save code.');
        } finally {
            setAntiPhishingSaving(false);
        }
    };

    const handleRevokeSession = async (sessionId: string, isCurrent: boolean) => {
        if (isCurrent && !window.confirm('This will sign you out of this device too. Continue?')) return;
        setRevokingId(sessionId);
        try {
            await revokeSession(sessionId);
            if (isCurrent) {
                window.location.href = '/login';
                return;
            }
            loadSessions();
        } catch (err) {
            // best-effort; leave the list as-is on failure
        } finally {
            setRevokingId(null);
        }
    };

    const handleRevokeOthers = async () => {
        setRevokingId('__others__');
        try {
            await revokeOtherSessions();
            loadSessions();
        } catch (err) {
            // best-effort
        } finally {
            setRevokingId(null);
        }
    };

    const describeSession = (userAgent: string) => {
        if (!userAgent) return 'Unknown device';
        const ua = userAgent.toLowerCase();
        const browser = ua.includes('edg/') ? 'Edge' : ua.includes('chrome') ? 'Chrome' : ua.includes('firefox') ? 'Firefox' : ua.includes('safari') ? 'Safari' : 'Browser';
        const os = ua.includes('android') ? 'Android' : ua.includes('iphone') || ua.includes('ipad') ? 'iOS' : ua.includes('mac os') ? 'macOS' : ua.includes('windows') ? 'Windows' : ua.includes('linux') ? 'Linux' : '';
        return [browser, os].filter(Boolean).join(' on ');
    };

    // The deposit-info endpoint requires approved KYC (get_verified_current_user),
    // so there's nothing real to show until then — fetch only once verified.
    useEffect(() => {
        if (kycStatus !== 'verified') return;
        let cancelled = false;
        setAddressesLoading(true);
        Promise.allSettled(
            DEPOSIT_NETWORKS.map(n => getDepositDetails(n.asset, n.network))
        ).then(results => {
            if (cancelled) return;
            const next: Record<string, string> = {};
            results.forEach((r, i) => {
                if (r.status === 'fulfilled' && r.value.data?.data?.address) {
                    next[DEPOSIT_NETWORKS[i].network] = r.value.data.data.address;
                }
            });
            setDepositAddresses(next);
        }).finally(() => {
            if (!cancelled) setAddressesLoading(false);
        });
        return () => { cancelled = true; };
    }, [kycStatus]);

    const copyAddress = (network: string, address: string) => {
        navigator.clipboard.writeText(address).then(() => {
            setCopiedNetwork(network);
            setTimeout(() => setCopiedNetwork(null), 2000);
        }).catch(() => {});
    };

    // TOTP authenticator app enrollment — see backend/two_factor.py. Required
    // (alongside the always-on emailed code) before a withdrawal completes,
    // once enabled here.
    const [totpEnabled, setTotpEnabled] = useState(false);
    const [totpPanelOpen, setTotpPanelOpen] = useState(false);
    const [totpMode, setTotpMode] = useState<'setup' | 'disable' | null>(null);
    const [totpQrCode, setTotpQrCode] = useState('');
    const [totpSecret, setTotpSecret] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [totpBusy, setTotpBusy] = useState(false);
    const [totpError, setTotpError] = useState('');

    useEffect(() => {
        getTwoFactorStatus().then(res => setTotpEnabled(!!res.data?.totpEnabled)).catch(() => {});
    }, []);

    // Landed here from WithdrawPage's mandatory-2FA redirect — jump straight
    // into setup instead of making the user find the Security box themselves.
    const location = useLocation();
    const redirectedForWithdrawal2fa = location.state?.reason === 'withdrawal_requires_2fa';
    useEffect(() => {
        if (redirectedForWithdrawal2fa && !totpEnabled && !totpPanelOpen) {
            startTotpSetup();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [redirectedForWithdrawal2fa, totpEnabled]);

    const startTotpSetup = async () => {
        setTotpError(''); setTotpBusy(true);
        try {
            const res = await setupTotp();
            setTotpQrCode(res.data?.qrCode || '');
            setTotpSecret(res.data?.secret || '');
            setTotpCode('');
            setTotpMode('setup');
            setTotpPanelOpen(true);
        } catch (err: any) {
            setTotpError(err.response?.data?.detail || 'Failed to start authenticator setup.');
        } finally {
            setTotpBusy(false);
        }
    };

    const confirmTotpSetup = async () => {
        if (!totpCode) { setTotpError('Enter the 6-digit code from your authenticator app.'); return; }
        setTotpError(''); setTotpBusy(true);
        try {
            await verifyTotpSetup(totpCode);
            setTotpEnabled(true);
            setTotpPanelOpen(false);
            setTotpMode(null);
        } catch (err: any) {
            setTotpError(err.response?.data?.detail || 'Invalid code. Please try again.');
        } finally {
            setTotpBusy(false);
        }
    };

    const startTotpDisable = () => {
        setTotpError(''); setTotpCode('');
        setTotpMode('disable');
        setTotpPanelOpen(true);
    };

    const confirmTotpDisable = async () => {
        if (!totpCode) { setTotpError('Enter your current authenticator app code.'); return; }
        setTotpError(''); setTotpBusy(true);
        try {
            await disableTotp(totpCode);
            setTotpEnabled(false);
            setTotpPanelOpen(false);
            setTotpMode(null);
        } catch (err: any) {
            setTotpError(err.response?.data?.detail || 'Invalid code. Please try again.');
        } finally {
            setTotpBusy(false);
        }
    };

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await getKycStatus();
                if (res.data?.kycStatus) {
                    setKycStatus(res.data.kycStatus);
                }
                const details = res.data?.kycDetails || {};
                if (details.fullName) setFullName(details.fullName);
                if (details.email) setEmail(details.email);
                if (details.phone) setPhone(details.phone);
                if (res.data?.kycStatus || details.fullName || details.email) {
                    updateUser({
                        kycStatus: res.data?.kycStatus || user?.kycStatus,
                        name: details.fullName || user?.name,
                        email: details.email || user?.email,
                    });
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

                {redirectedForWithdrawal2fa && !totpEnabled && (
                    <div className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Set up an authenticator app below to unlock withdrawals.
                    </div>
                )}
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

                        {/* Avatar */}
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#1E2533]">
                            <div className="relative shrink-0">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border border-[#1E2533]" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-[#00d282] text-[#06090F] flex items-center justify-center font-bold text-xl uppercase">
                                        {fullName?.[0] || 'U'}
                                    </div>
                                )}
                                <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#111827] border border-[#1E2533] flex items-center justify-center cursor-pointer hover:bg-[#1E2533] transition-colors">
                                    <Camera className="w-3 h-3 text-gray-300" />
                                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleAvatarSelect} disabled={avatarUploading} />
                                </label>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-white">Profile photo</p>
                                <p className="text-xs text-gray-500 mt-0.5">PNG, JPEG, WEBP, or GIF — max 1.5MB</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                    {avatarUploading && <span className="text-xs text-gray-500">Uploading...</span>}
                                    {avatarUrl && !avatarUploading && (
                                        <button type="button" onClick={handleAvatarRemove} className="text-xs font-bold text-red-400 hover:text-red-300">Remove photo</button>
                                    )}
                                </div>
                                {avatarError && <p className="text-xs text-red-400 mt-1">{avatarError}</p>}
                            </div>
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
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        disabled
                                        readOnly
                                        className="w-full bg-[#0B0E14] border border-[#1E2533] rounded-xl py-3 px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <Lock className="absolute right-4 top-3.5 w-4 h-4 text-gray-600" />
                                </div>
                                {/* Login here is email/OTP-based, and changing it requires the
                                    admin-only recovery flow (collision check + re-verification) —
                                    a plain self-service field can't safely repoint it. */}
                                <p className="text-[11px] text-gray-600 mt-1.5">This is your login email. Contact support to change it.</p>
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
                    {/* Two-Factor Auth is now real — an authenticator app (TOTP)
                        checked on every withdrawal alongside the always-on emailed
                        code (see backend/two_factor.py). Login Notifications sends
                        an email on every successful login (auth.py's
                        send_login_notification_email), unconditionally on. */}
                    <div className="bg-[#0F1520] border border-[#1E2533] rounded-2xl p-6 shadow-lg">
                        <h2 className="text-sm font-bold text-white tracking-wide mb-4">Security</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-[#1E2533]/50">
                                <div>
                                    <span className="text-xs text-gray-300 font-medium block">Two-Factor Auth</span>
                                    <span className="text-[10px] text-gray-600">Required on withdrawals when enabled</span>
                                </div>
                                {totpEnabled ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Enabled</span>
                                        <button onClick={startTotpDisable} className="text-[10px] font-bold text-red-400 hover:text-red-300">Disable</button>
                                    </div>
                                ) : (
                                    // Hidden once the QR panel is already open — clicking it again
                                    // would silently generate a brand-new secret on the server and
                                    // orphan whatever the user already scanned into their app,
                                    // producing "Invalid code" for a code that's actually correct
                                    // for the (now discarded) previous secret.
                                    !totpPanelOpen && (
                                        <button
                                            onClick={startTotpSetup}
                                            disabled={totpBusy}
                                            className="text-[10px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1 rounded transition-colors border border-blue-500/20 disabled:opacity-50"
                                        >
                                            {totpBusy ? 'Loading...' : 'Enable'}
                                        </button>
                                    )
                                )}
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-[#1E2533]/50">
                                <span className="text-xs text-gray-300 font-medium">Login Notifications</span>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Enabled</span>
                            </div>

                            {/* Anti-phishing code — echoed back in every real security email
                                (OTP, login alert, password reset) so a spoofed phishing email,
                                which won't know it, is detectable at a glance. */}
                            <div className="py-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                                    <span className="text-xs text-gray-300 font-medium">Anti-Phishing Code</span>
                                    {antiPhishingCode && (
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded ml-auto">Set</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-600 mb-2">Shown in every real Jasiri security email — verify it matches before trusting one.</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={antiPhishingInput}
                                        onChange={(e) => setAntiPhishingInput(e.target.value)}
                                        placeholder="e.g. BlueTiger42"
                                        maxLength={20}
                                        className="flex-1 bg-[#0B0E14] border border-[#1E2533] focus:border-emerald-500 focus:outline-none rounded-lg py-2 px-3 text-xs text-white font-mono"
                                    />
                                    <button
                                        onClick={handleSaveAntiPhishingCode}
                                        disabled={antiPhishingSaving || antiPhishingInput.trim() === antiPhishingCode}
                                        className="text-[10px] font-bold text-black bg-emerald-500 hover:bg-emerald-400 px-3 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                    >
                                        {antiPhishingSaving ? 'Saving...' : antiPhishingSaved ? 'Saved!' : 'Save'}
                                    </button>
                                </div>
                                {antiPhishingError && <p className="text-[10px] text-red-400 mt-1.5">{antiPhishingError}</p>}
                            </div>
                        </div>

                        {totpPanelOpen && (
                            <div className="mt-5 pt-5 border-t border-[#1E2533] space-y-4">
                                {totpMode === 'setup' ? (
                                    <>
                                        <p className="text-xs text-gray-400">Scan this QR code with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code it shows.</p>
                                        {totpQrCode && (
                                            <img src={totpQrCode} alt="Authenticator QR code" className="w-40 h-40 rounded-xl border border-[#1E2533] mx-auto bg-white p-2" />
                                        )}
                                        {totpSecret && (
                                            <p className="text-[10px] text-gray-500 text-center font-mono break-all">Can't scan? Enter manually: {totpSecret}</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-xs text-gray-400">Enter your current authenticator app code to disable Two-Factor Auth.</p>
                                )}

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="6-digit code"
                                    className="w-full bg-[#0B0E14] border border-[#1E2533] focus:border-emerald-500 focus:outline-none rounded-xl py-3 px-4 text-lg tracking-widest text-white font-mono text-center"
                                />

                                {totpError && (
                                    <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {totpError}</p>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setTotpPanelOpen(false); setTotpMode(null); setTotpError(''); }}
                                        className="flex-1 py-2.5 rounded-lg border border-[#1E2533] text-gray-400 text-xs font-bold hover:bg-[#1E2533] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={totpMode === 'setup' ? confirmTotpSetup : confirmTotpDisable}
                                        disabled={totpBusy}
                                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${totpMode === 'setup' ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 'bg-red-500 hover:bg-red-400 text-black'}`}
                                    >
                                        {totpBusy ? 'Verifying...' : totpMode === 'setup' ? 'Enable' : 'Disable'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Active Sessions Box — previously impossible: JWT auth was fully
                        stateless with no server-side record of who was logged in where.
                        See backend/routes/auth.py create_session/_check_session_not_revoked. */}
                    <div className="bg-[#0F1520] border border-[#1E2533] rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-white tracking-wide">Active Sessions</h2>
                            {sessions.length > 1 && (
                                <button
                                    onClick={handleRevokeOthers}
                                    disabled={revokingId === '__others__'}
                                    className="text-[10px] font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
                                >
                                    {revokingId === '__others__' ? 'Signing out...' : 'Sign out all other devices'}
                                </button>
                            )}
                        </div>

                        {sessionsLoading ? (
                            <p className="text-xs text-gray-500">Loading sessions...</p>
                        ) : sessions.length === 0 ? (
                            <p className="text-xs text-gray-500">No active sessions found.</p>
                        ) : (
                            <div className="space-y-2">
                                {sessions.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-[#1E2533]/50 last:border-b-0 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Monitor className="w-4 h-4 text-gray-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                                                    {describeSession(s.userAgent)}
                                                    {s.current && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">This device</span>}
                                                </p>
                                                <p className="text-[10px] text-gray-600 truncate">{s.ip || 'Unknown IP'} · Last active {s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : 'unknown'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRevokeSession(s.id, s.current)}
                                            disabled={revokingId === s.id}
                                            className="shrink-0 p-1.5 rounded-lg bg-[#0B0E14] border border-[#1E2533] text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-50"
                                            title={s.current ? 'Sign out this device' : 'Revoke this session'}
                                        >
                                            <LogOut className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Deposit Addresses Box */}
                    {/* Replaces the old fake "Linked Wallets" (M-Pesa/Valora "Connected",
                        a dead Cardano "Connect" button). M-Pesa/Valora were never real
                        linked-account concepts here. What IS real: this platform derives
                        a permanent, unique deposit address per user on Celo, Cardano and
                        Stellar (see treasury.py's get_deposit_info) — shown below instead. */}
                    <div className="bg-[#0F1520] border border-[#1E2533] rounded-2xl p-6 shadow-lg">
                        <h2 className="text-sm font-bold text-white tracking-wide mb-4">Deposit Addresses</h2>
                        {kycStatus !== 'verified' ? (
                            <p className="text-xs text-gray-500">
                                Complete KYC to generate your deposit addresses.{' '}
                                <button onClick={() => navigate('/kyc')} className="text-blue-400 hover:text-blue-300 underline font-medium">
                                    Complete KYC
                                </button>
                            </p>
                        ) : addressesLoading ? (
                            <p className="text-xs text-gray-500">Loading addresses...</p>
                        ) : (
                            <div className="space-y-2">
                                {DEPOSIT_NETWORKS.map(({ network, label, icon: Icon, color }) => {
                                    const address = depositAddresses[network];
                                    return (
                                        <div key={network} className="flex items-center justify-between py-3 border-b border-[#1E2533]/50 last:border-b-0 gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                                                <div className="min-w-0">
                                                    <span className="text-xs text-gray-300 font-medium block">{label}</span>
                                                    {address ? (
                                                        <span className="text-[10px] text-gray-500 font-mono truncate block max-w-[160px]">{address}</span>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-600">Unavailable</span>
                                                    )}
                                                </div>
                                            </div>
                                            {address && (
                                                <button
                                                    onClick={() => copyAddress(network, address)}
                                                    className="shrink-0 p-1.5 rounded-lg bg-[#0B0E14] border border-[#1E2533] text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                                                    title="Copy address"
                                                >
                                                    {copiedNetwork === network ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
