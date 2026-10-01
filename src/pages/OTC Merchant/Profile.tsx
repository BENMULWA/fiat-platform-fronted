import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Save, Camera, Trash2, ShieldCheck, Copy, Check, Building2, UserRound } from 'lucide-react';
import { getOtcProfile, updateOtcProfile, uploadAvatar, deleteAvatar } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import MerchantAvatar, { PresetAvatar, PRESET_COUNT, presetToPngDataUrl } from '../../components/otc/MerchantAvatar';

const MAX_UPLOAD_BYTES = 1_500_000;

export default function OtcProfile() {
    const { theme } = useTheme();
    const { user, updateUser } = useAuth();
    const isLight = theme === 'light';
    const fileRef = useRef<HTMLInputElement>(null);
    const [profile, setProfile] = useState<Record<string, any>>({});
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [avatarError, setAvatarError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        getOtcProfile()
            .then(res => {
                const p = res.data.profile || {};
                setProfile(p);
                setContactName(p.contactName || '');
                setContactPhone(p.contactPhone || '');
                setAvatarUrl(p.avatarUrl || user?.avatarUrl || '');
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const save = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await updateOtcProfile({ contactName, contactPhone });
            setSaved(true);
        } finally {
            setSaving(false);
        }
    };

    const applyAvatar = async (dataUrl: string) => {
        setAvatarBusy(true); setAvatarError('');
        try {
            await uploadAvatar(dataUrl);
            setAvatarUrl(dataUrl);
            updateUser({ avatarUrl: dataUrl });
            setShowPicker(false);
        } catch (err: any) {
            setAvatarError(err?.response?.data?.detail || 'Could not update avatar.');
        } finally { setAvatarBusy(false); }
    };

    const pickPreset = async (i: number) => {
        try { await applyAvatar(await presetToPngDataUrl(i)); } catch { setAvatarError('Could not create avatar.'); }
    };

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES) return setAvatarError('Image is too large (max 1.5MB).');
        const reader = new FileReader();
        reader.onload = () => applyAvatar(String(reader.result));
        reader.readAsDataURL(file);
    };

    const removeAvatar = async () => {
        setAvatarBusy(true); setAvatarError('');
        try {
            await deleteAvatar();
            setAvatarUrl(''); updateUser({ avatarUrl: '' }); setShowPicker(false);
        } catch (err: any) {
            setAvatarError(err?.response?.data?.detail || 'Could not remove avatar.');
        } finally { setAvatarBusy(false); }
    };

    const copyId = () => {
        navigator.clipboard?.writeText(profile.accountId || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    };

    if (loading) return <div className="p-10 text-center"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto" /></div>;

    const card = `rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`;
    const strong = isLight ? 'text-slate-900' : 'text-white';
    const muted = isLight ? 'text-slate-500' : 'text-gray-500';
    const inputClass = `w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-500 border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0A0D14] border-[#1E2D3D] text-white'}`;
    const labelClass = `block text-[10px] font-semibold uppercase tracking-wide mb-1 ${muted}`;
    const approved = profile.onboardingStatus === 'approved';
    const name = profile.businessName || profile.legalName || 'Institutional Account';
    const memberSince = profile.memberSince ? new Date(profile.memberSince).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

    const kybRows: [string, any][] = [
        ['Legal name', profile.legalName],
        ['Company type', profile.companyType],
        ['Registration number', profile.incorporationNumber],
        ['Country of incorporation', profile.countryOfIncorporation],
        ['Date of incorporation', profile.dateOfIncorporation],
        ['Tax number', profile.taxNumber],
    ];

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className={`text-xl font-semibold ${strong}`}>Profile</h1>
                <p className={`text-xs mt-1 ${muted}`}>Your institutional account, business details and contact information.</p>
            </div>

            {/* Identity header */}
            <div className={`${card} p-5 bg-gradient-to-br ${isLight ? 'from-emerald-50 via-white to-white' : 'from-emerald-500/10 via-[#0B0E14] to-[#0B0E14]'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="relative shrink-0 w-fit">
                        <MerchantAvatar src={avatarUrl} seed={String(name)} className={`w-24 h-24 border-4 ${isLight ? 'border-white shadow-lg' : 'border-[#1E2533]'}`} />
                        <button onClick={() => setShowPicker(v => !v)} title="Change avatar" className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow">
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className={`text-lg font-bold truncate ${strong}`}>{name}</h2>
                        <p className={`text-xs truncate ${muted}`}>{profile.email || '—'}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${approved ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                <ShieldCheck className="w-3 h-3" /> {approved ? 'KYB verified' : String(profile.onboardingStatus || 'not started').replace(/_/g, ' ')}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${isLight ? 'border-slate-200 text-slate-500' : 'border-[#1E2533] text-gray-400'}`}>Institutional</span>
                        </div>
                    </div>
                    <div className={`text-xs space-y-1.5 sm:text-right ${muted}`}>
                        <p>Member since <span className={`font-semibold ${strong}`}>{memberSince}</span></p>
                        {profile.reviewedByName && <p>Account manager <span className={`font-semibold ${strong}`}>{profile.reviewedByName}</span></p>}
                        <button onClick={copyId} className="inline-flex items-center gap-1 font-mono text-[10.5px] hover:text-emerald-500">
                            ID {String(profile.accountId || '').slice(-8).toUpperCase()} {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                </div>

                {showPicker && (
                    <div className={`mt-5 pt-5 border-t ${isLight ? 'border-slate-200' : 'border-[#1E2533]'}`}>
                        <p className={`text-xs font-semibold mb-3 ${strong}`}>Choose an avatar</p>
                        <div className="flex flex-wrap gap-3">
                            {Array.from({ length: PRESET_COUNT }, (_, i) => (
                                <button key={i} disabled={avatarBusy} onClick={() => pickPreset(i)} className="rounded-full ring-2 ring-transparent hover:ring-emerald-500 transition disabled:opacity-50">
                                    <PresetAvatar index={i} className="w-14 h-14" />
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-4">
                            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFile} />
                            <button onClick={() => fileRef.current?.click()} disabled={avatarBusy} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border ${isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-[#111827] border-[#1E2533] text-gray-300 hover:bg-[#1A2533]'}`}>
                                <Camera className="w-3.5 h-3.5" /> Upload logo or photo
                            </button>
                            {avatarUrl && (
                                <button onClick={removeAvatar} disabled={avatarBusy} className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300">
                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
                            )}
                            {avatarBusy && <span className={`text-xs ${muted}`}>Saving...</span>}
                            <span className={`text-[10.5px] ${muted}`}>PNG, JPG, WEBP or GIF, up to 1.5MB.</span>
                        </div>
                        {avatarError && <p className="text-xs text-red-400 mt-2">{avatarError}</p>}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Business details */}
                <div className={`${card} p-5`}>
                    <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-4 h-4 text-emerald-500" />
                        <p className={`text-sm font-bold ${strong}`}>Business details</p>
                    </div>
                    <dl className="space-y-3">
                        {kybRows.map(([k, v]) => (
                            <div key={k} className="flex items-start justify-between gap-4">
                                <dt className={`text-[11px] ${muted}`}>{k}</dt>
                                <dd className={`text-xs font-semibold text-right ${strong}`}>{v || '—'}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className={`text-[10.5px] mt-4 ${muted}`}>These come from your verified KYB submission. To change them, contact your account manager.</p>
                </div>

                {/* Contact details */}
                <div className={`${card} p-5`}>
                    <div className="flex items-center gap-2 mb-4">
                        <UserRound className="w-4 h-4 text-emerald-500" />
                        <p className={`text-sm font-bold ${strong}`}>Contact details</p>
                    </div>
                    <div className="space-y-4">
                        <label className="block">
                            <span className={labelClass}>Login email</span>
                            <input value={profile.email || ''} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
                        </label>
                        <label className="block">
                            <span className={labelClass}>Contact name</span>
                            <input value={contactName} onChange={e => setContactName(e.target.value)} className={inputClass} />
                        </label>
                        <label className="block">
                            <span className={labelClass}>Contact phone</span>
                            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={inputClass} />
                        </label>
                        <div className="flex items-center justify-end gap-3 pt-1">
                            {saved && <span className="text-xs text-emerald-400">Saved</span>}
                            <button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
                                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
