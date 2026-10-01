import { useState } from 'react';
import {
    X, RefreshCw, Building2, Users, Landmark, ShieldAlert, FileText,
    FileWarning, ExternalLink, CheckCircle2, Clock,
} from 'lucide-react';

// Admin-side reviewer for a merchant's KYB submission -- mirrors the section
// structure of the merchant-facing onboarding wizard (Onboarding.tsx) one
// tab per section instead of a single long scroll, so a compliance reviewer
// can jump straight to "Documents" without scrolling past 6 directors.
// Renders the actual uploaded files (base64 data URIs, same storage
// convention as retail KYC) instead of the old `document.reference` URL
// field, which the new upload flow no longer produces.

interface UploadedFileLike {
    fileName?: string;
    fileDataUrl?: string;
    fileType?: string;
    fileSize?: number;
}

const TABS = [
    { key: 'overview', label: 'Business Overview', icon: Building2 },
    { key: 'directors', label: 'Directors', icon: Users },
    { key: 'shareholders', label: 'Shareholders', icon: Landmark },
    { key: 'peps', label: 'Political Persons', icon: ShieldAlert },
    { key: 'documents', label: 'Documents', icon: FileText },
] as const;

function formatBytes(bytes?: number) {
    if (!bytes || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes; let index = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDateTime(value?: string) {
    if (!value) return 'N/A';
    try { return new Date(value).toLocaleString(); } catch { return value; }
}

function DataField({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-white mt-0.5 break-words">{value || value === 0 ? value : 'N/A'}</p>
        </div>
    );
}

function FilePreview({ label, file }: { label: string; file?: UploadedFileLike | null }) {
    if (!file?.fileDataUrl) {
        return (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                    <p className="text-[10px] text-red-400 uppercase tracking-wide">{label}</p>
                    <p className="text-xs text-red-300/80">Not uploaded</p>
                </div>
            </div>
        );
    }
    const isImage = (file.fileType || '').startsWith('image/');
    return (
        <a
            href={file.fileDataUrl}
            target="_blank"
            rel="noreferrer"
            className="group block p-3 rounded-lg bg-[#111827] border border-[#1e2d3d] hover:border-emerald-500/40 transition-colors"
        >
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2 flex items-center justify-between">
                {label}
                <span className="inline-flex items-center gap-1 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ExternalLink className="w-3 h-3" />
                </span>
            </p>
            {isImage ? (
                <img src={file.fileDataUrl} alt={label} className="w-full h-32 object-cover rounded-md border border-[#1e2d3d]" />
            ) : (
                <div className="w-full h-32 rounded-md border border-[#1e2d3d] bg-[#0a0e17] flex flex-col items-center justify-center gap-1.5">
                    <FileText className="w-7 h-7 text-gray-500" />
                    <span className="text-[10px] text-gray-500">PDF document</span>
                </div>
            )}
            <p className="text-xs text-gray-300 mt-2 truncate">{file.fileName || 'Uploaded file'}</p>
            {!!file.fileSize && <p className="text-[10px] text-gray-500">{formatBytes(file.fileSize)}</p>}
        </a>
    );
}

const STATUS_STYLES: Record<string, string> = {
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    under_review: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
    not_started: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

interface InstitutionalReviewModalProps {
    profile: any;
    loading: boolean;
    actionLoading: boolean;
    onClose: () => void;
    onApprove: () => void;
    onReject: () => void;
}

export default function InstitutionalReviewModal({ profile, loading, actionLoading, onClose, onApprove, onReject }: InstitutionalReviewModalProps) {
    const [tab, setTab] = useState<typeof TABS[number]['key']>('overview');

    const directors: any[] = profile?.directors || [];
    const shareholders: any[] = profile?.shareholders || [];
    const peps: any[] = profile?.peps || [];
    const documents: any[] = profile?.documents || [];
    const usage = [
        ...(profile?.usePayIns || []), ...(profile?.usePayOuts || []), ...(profile?.useConversions || []),
    ];

    const countFor = (key: string) => key === 'directors' ? directors.length : key === 'shareholders' ? shareholders.length : key === 'peps' ? peps.length : key === 'documents' ? documents.length : null;

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[90vh] bg-[#0f1724] border border-[#1e2d3d] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d3d] shrink-0">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white truncate">{profile?.legalName || profile?.businessName || 'Institutional Onboarding Review'}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            {profile?.onboardingStatus && (
                                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLES[profile.onboardingStatus] || STATUS_STYLES.not_started}`}>
                                    {String(profile.onboardingStatus).replace(/_/g, ' ')}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                                <Clock className="w-3 h-3" /> Submitted {formatDateTime(profile?.submittedAt)}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg bg-[#1e2d3d] text-gray-300 hover:bg-[#2a3a4f] shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <div className="py-16 flex items-center justify-center">
                        <RefreshCw className="w-7 h-7 animate-spin text-cyan-500" />
                    </div>
                ) : profile ? (
                    <div className="flex flex-1 min-h-0">
                        {/* Section rail */}
                        <div className="w-48 shrink-0 border-r border-[#1e2d3d] py-3 px-2 overflow-y-auto hidden sm:block">
                            {TABS.map(t => {
                                const count = countFor(t.key);
                                const active = tab === t.key;
                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => setTab(t.key)}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold mb-1 transition-colors ${active ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-[#1a2a40]/60 hover:text-gray-200'}`}
                                    >
                                        <span className="flex items-center gap-2"><t.icon className="w-3.5 h-3.5" /> {t.label}</span>
                                        {count !== null && <span className="text-[10px] text-gray-500">{count}</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Mobile tab bar */}
                        <div className="sm:hidden" />

                        {/* Content */}
                        <div className="flex-1 min-w-0 overflow-y-auto p-6">
                            <div className="sm:hidden flex gap-2 overflow-x-auto pb-4 mb-4 border-b border-[#1e2d3d]">
                                {TABS.map(t => (
                                    <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold ${tab === t.key ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#1e2d3d] text-gray-400'}`}>
                                        {t.label}{countFor(t.key) !== null ? ` (${countFor(t.key)})` : ''}
                                    </button>
                                ))}
                            </div>

                            {tab === 'overview' && (
                                <div className="space-y-5">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-2">Know your business</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <DataField label="Legal name" value={profile.legalName || profile.businessName} />
                                            <DataField label="Company type" value={profile.companyType} />
                                            <DataField label="Business model" value={profile.businessModel} />
                                            <DataField label="Incorporation number" value={profile.incorporationNumber} />
                                            <DataField label="Date of incorporation" value={profile.dateOfIncorporation} />
                                            <DataField label="Country of incorporation" value={profile.countryOfIncorporation} />
                                            <DataField label="Tax number" value={profile.taxNumber} />
                                            <DataField label="Website" value={profile.companyWebsite} />
                                            <DataField label="Address" value={[profile.companyAddress, profile.city, profile.state, profile.zipCode].filter(Boolean).join(', ')} />
                                        </div>
                                        {profile.businessDescription && (
                                            <p className="text-sm text-gray-400 mt-3 leading-relaxed">{profile.businessDescription}</p>
                                        )}
                                    </div>

                                    {usage.length > 0 && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-2">Intended use</p>
                                            <div className="flex flex-wrap gap-2">
                                                {usage.map((u: string) => (
                                                    <span key={u} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#111827] border border-[#1e2d3d] text-gray-300">{u}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(profile.linkedin || profile.facebook || profile.twitter || profile.instagram) && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-2">Social / web presence</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {profile.linkedin && <DataField label="LinkedIn" value={profile.linkedin} />}
                                                {profile.facebook && <DataField label="Facebook" value={profile.facebook} />}
                                                {profile.twitter && <DataField label="Twitter / X" value={profile.twitter} />}
                                                {profile.instagram && <DataField label="Instagram" value={profile.instagram} />}
                                            </div>
                                        </div>
                                    )}

                                    {(profile.contactName || profile.contactPhone) && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-2">Primary contact</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <DataField label="Contact name" value={profile.contactName} />
                                                <DataField label="Contact phone" value={profile.contactPhone} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {tab === 'directors' && (
                                directors.length > 0 ? (
                                    <div className="space-y-4">
                                        {directors.map((d: any, i: number) => (
                                            <div key={i} className="rounded-xl border border-[#1e2d3d] bg-[#0a0e17] p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-sm font-bold text-white">{[d.firstName, d.lastName].filter(Boolean).join(' ') || d.name || `Director ${i + 1}`}</p>
                                                    {d.isShareholder && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Also a shareholder</span>}
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                                    <DataField label="Position" value={d.position} />
                                                    <DataField label="Date of birth" value={d.dateOfBirth} />
                                                    <DataField label="Nationality" value={d.nationality} />
                                                    <DataField label="ID type" value={d.idType} />
                                                    <DataField label="ID number" value={d.idNumber || d.name} />
                                                    <DataField label="Issued country" value={d.issuedCountry} />
                                                    <DataField label="Residential address" value={d.residentialAddress} />
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    <FilePreview label="ID document proof" file={d.idProof} />
                                                    <FilePreview label="Address proof" file={d.addressProof} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-500">No directors listed.</p>
                            )}

                            {tab === 'shareholders' && (
                                shareholders.length > 0 ? (
                                    <div className="space-y-4">
                                        {shareholders.map((s: any, i: number) => (
                                            <div key={i} className="rounded-xl border border-[#1e2d3d] bg-[#0a0e17] p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-sm font-bold text-white">
                                                        {s.entityType === 'legal' ? (s.legalEntityName || 'Legal entity') : ([s.firstName, s.lastName].filter(Boolean).join(' ') || s.name || `Shareholder ${i + 1}`)}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        {s.percentageOwned && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">{s.percentageOwned}% owned</span>}
                                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#1e2d3d] text-gray-400">{s.entityType === 'legal' ? 'Legal entity' : 'Individual'}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                                    {s.entityType !== 'legal' && <DataField label="Date of birth" value={s.dateOfBirth} />}
                                                    <DataField label="Nationality" value={s.nationality} />
                                                    <DataField label="ID type" value={s.idType} />
                                                    <DataField label="ID / passport number" value={s.idNumber || s.name} />
                                                    <DataField label="Issued country" value={s.issuedCountry} />
                                                    <DataField label="Residential address" value={s.residentialAddress} />
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                    <FilePreview label="Valid ID" file={s.validId} />
                                                    <FilePreview label="Proof of address" file={s.proofOfAddress} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-500">No shareholders listed.</p>
                            )}

                            {tab === 'peps' && (
                                peps.length > 0 ? (
                                    <div className="space-y-2">
                                        {peps.map((p: any, i: number) => (
                                            <div key={i} className="p-3 rounded-lg bg-[#111827] border border-[#1e2d3d] grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <DataField label="Name" value={p.name} />
                                                <DataField label="Position" value={p.position} />
                                                <DataField label="Country" value={p.country} />
                                                <DataField label="Relationship" value={p.relationship || p.idNumber} />
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-500">None listed.</p>
                            )}

                            {tab === 'documents' && (
                                documents.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {documents.map((d: any, i: number) => (
                                            <div key={i}>
                                                <FilePreview label={d.name || d.type || `Document ${i + 1}`} file={d.file} />
                                                {d.type && <p className="text-[10px] text-gray-500 mt-1">{d.type}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-500">No documents submitted.</p>
                            )}
                        </div>
                    </div>
                ) : null}

                {/* Footer actions */}
                {!loading && profile && profile.onboardingStatus !== 'approved' && (
                    <div className="flex items-center gap-3 px-6 py-4 border-t border-[#1e2d3d] shrink-0">
                        <button
                            onClick={onApprove}
                            disabled={actionLoading}
                            className="flex-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black px-4 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                        <button
                            onClick={onReject}
                            disabled={actionLoading}
                            className="flex-1 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                            Reject
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
