import { useEffect, useState } from 'react';
import { Building2, Users, Landmark, ShieldAlert, FileText, Check, RefreshCw, Plus, X } from 'lucide-react';
import { getOtcOnboarding, updateOtcBusinessOverview, updateOtcDirectors, updateOtcShareholders, updateOtcPeps, updateOtcDocuments, submitOtcOnboarding } from '../../api/client';

const STEPS = [
    { key: 'overview', label: 'Business Overview', icon: Building2 },
    { key: 'directors', label: 'Directors', icon: Users },
    { key: 'shareholders', label: 'Shareholders', icon: Landmark },
    { key: 'peps', label: 'PEPs', icon: ShieldAlert },
    { key: 'documents', label: 'Documents', icon: FileText },
];

type Person = { name: string; nationality: string; idNumber: string };
type Document = { name: string; type: string; reference: string };

export default function OtcOnboarding() {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('not_started');

    const [overview, setOverview] = useState<Record<string, string>>({});
    const [directors, setDirectors] = useState<Person[]>([]);
    const [shareholders, setShareholders] = useState<Person[]>([]);
    const [peps, setPeps] = useState<Person[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);

    useEffect(() => {
        getOtcOnboarding()
            .then(res => {
                const p = res.data.profile || {};
                setStatus(p.onboardingStatus || 'not_started');
                setOverview({
                    legalName: p.legalName || p.businessName || '',
                    companyType: p.companyType || '', businessModel: p.businessModel || '',
                    incorporationNumber: p.incorporationNumber || '', dateOfIncorporation: p.dateOfIncorporation || '',
                    countryOfIncorporation: p.countryOfIncorporation || '', taxNumber: p.taxNumber || '',
                    companyAddress: p.companyAddress || '', zipCode: p.zipCode || '', state: p.state || '',
                    city: p.city || '', businessDescription: p.businessDescription || '', companyWebsite: p.companyWebsite || '',
                });
                setDirectors(p.directors || []);
                setShareholders(p.shareholders || []);
                setPeps(p.peps || []);
                setDocuments(p.documents || []);
            })
            .catch(() => setError('Unable to load onboarding profile.'))
            .finally(() => setLoading(false));
    }, []);

    const field = (key: string, label: string, type = 'text') => (
        <label className="block">
            <span className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</span>
            <input
                type={type}
                value={overview[key] || ''}
                onChange={e => setOverview({ ...overview, [key]: e.target.value })}
                className="w-full bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
            />
        </label>
    );

    const saveOverview = async () => { setSaving(true); try { await updateOtcBusinessOverview(overview); setStep(1); } catch { setError('Failed to save.'); } finally { setSaving(false); } };

    const PersonList = ({ items, setItems, onSave, label }: { items: Person[]; setItems: (v: Person[]) => void; onSave: () => Promise<void>; label: string }) => (
        <div className="space-y-3">
            {items.map((p, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#0A0D14] border border-[#1E2D3D] rounded p-3">
                    <input placeholder="Full name" value={p.name} onChange={e => setItems(items.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))} className="bg-transparent border-b border-[#1E2D3D] text-sm text-white outline-none pb-1" />
                    <input placeholder="Nationality" value={p.nationality} onChange={e => setItems(items.map((it, idx) => idx === i ? { ...it, nationality: e.target.value } : it))} className="bg-transparent border-b border-[#1E2D3D] text-sm text-white outline-none pb-1" />
                    <div className="flex gap-2">
                        <input placeholder="ID/Passport number" value={p.idNumber} onChange={e => setItems(items.map((it, idx) => idx === i ? { ...it, idNumber: e.target.value } : it))} className="flex-1 bg-transparent border-b border-[#1E2D3D] text-sm text-white outline-none pb-1" />
                        <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                    </div>
                </div>
            ))}
            <button onClick={() => setItems([...items, { name: '', nationality: '', idNumber: '' }])} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add {label}
            </button>
            <div className="flex justify-end pt-2">
                <button onClick={async () => { setSaving(true); try { await onSave(); setStep(step + 1); } catch { setError('Failed to save.'); } finally { setSaving(false); } }} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded">
                    {saving ? 'Saving...' : 'Save & continue'}
                </button>
            </div>
        </div>
    );

    if (loading) return <div className="min-h-screen bg-[#070B14] flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /></div>;

    if (status === 'under_review' || status === 'approved') {
        return (
            <div className="min-h-screen bg-[#070B14] flex items-center justify-center p-4 text-center">
                <div>
                    <Check className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <h1 className="text-white font-semibold mb-1">{status === 'approved' ? 'Onboarding approved' : 'Submitted for review'}</h1>
                    <p className="text-xs text-gray-500">{status === 'approved' ? 'You can now request OTC settlements.' : "We'll notify you once it's reviewed."}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070B14] text-gray-200 p-4 sm:p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-xl font-semibold text-white mb-1">Institutional Onboarding</h1>
                <p className="text-xs text-gray-500 mb-6">Deep KYB verification required before OTC settlement access.</p>
                {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

                <div className="flex items-center gap-1 border-b border-[#1E2D3D] mb-6 overflow-x-auto">
                    {STEPS.map((s, i) => (
                        <div key={s.key} className={`px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 flex items-center gap-1.5 ${i === step ? 'text-white border-emerald-400' : i < step ? 'text-emerald-400 border-transparent' : 'text-gray-600 border-transparent'}`}>
                            <s.icon className="w-3.5 h-3.5" /> {s.label}
                        </div>
                    ))}
                </div>

                <div className="bg-[#0F1520] border border-[#1E2D3D] rounded-lg p-5">
                    {step === 0 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {field('legalName', 'Legal business name')}
                                {field('companyType', 'Company type')}
                                {field('businessModel', 'Business model')}
                                {field('incorporationNumber', 'Incorporation number')}
                                {field('dateOfIncorporation', 'Date of incorporation', 'date')}
                                {field('countryOfIncorporation', 'Country of incorporation')}
                                {field('taxNumber', 'Tax number')}
                                {field('companyWebsite', 'Company website')}
                                {field('companyAddress', 'Company address')}
                                {field('city', 'City')}
                                {field('state', 'State')}
                                {field('zipCode', 'Zip code')}
                            </div>
                            {field('businessDescription', 'What does your business do?')}
                            <div className="flex justify-end pt-2">
                                <button onClick={saveOverview} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded">
                                    {saving ? 'Saving...' : 'Save & continue'}
                                </button>
                            </div>
                        </div>
                    )}
                    {step === 1 && <PersonList items={directors} setItems={setDirectors} onSave={async () => { await updateOtcDirectors(directors) }} label="director" />}
                    {step === 2 && <PersonList items={shareholders} setItems={setShareholders} onSave={async () => { await updateOtcShareholders(shareholders) }} label="shareholder" />}
                    {step === 3 && (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500">Optional -- list any politically exposed persons associated with this business.</p>
                            <PersonList items={peps} setItems={setPeps} onSave={async () => { await updateOtcPeps(peps) }} label="PEP" />
                        </div>
                    )}
                    {step === 4 && (
                        <div className="space-y-3">
                            {documents.map((d, i) => (
                                <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#0A0D14] border border-[#1E2D3D] rounded p-3">
                                    <input placeholder="Document name" value={d.name} onChange={e => setDocuments(documents.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))} className="bg-transparent border-b border-[#1E2D3D] text-sm text-white outline-none pb-1" />
                                    <input placeholder="Type (e.g. Incorporation cert)" value={d.type} onChange={e => setDocuments(documents.map((it, idx) => idx === i ? { ...it, type: e.target.value } : it))} className="bg-transparent border-b border-[#1E2D3D] text-sm text-white outline-none pb-1" />
                                    <div className="flex gap-2">
                                        <input placeholder="Reference/URL" value={d.reference} onChange={e => setDocuments(documents.map((it, idx) => idx === i ? { ...it, reference: e.target.value } : it))} className="flex-1 bg-transparent border-b border-[#1E2D3D] text-sm text-white outline-none pb-1" />
                                        <button onClick={() => setDocuments(documents.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setDocuments([...documents, { name: '', type: '', reference: '' }])} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Add document
                            </button>
                            <p className="text-[10px] text-gray-600">Needed: incorporation certificate, proof of company address, director/shareholder ID and proof of address.</p>
                            <div className="flex justify-end pt-2 gap-2">
                                <button
                                    onClick={async () => { setSaving(true); try { await updateOtcDocuments(documents); const res = await submitOtcOnboarding(); setStatus(res.data.onboardingStatus); } catch (e: any) { setError(e?.response?.data?.detail || 'Failed to submit.'); } finally { setSaving(false); } }}
                                    disabled={saving}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded"
                                >
                                    {saving ? 'Submitting...' : 'Submit for review'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
