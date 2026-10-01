import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Landmark, FileText, Check, RefreshCw, Plus, X,
  ArrowRight, ArrowLeft, Globe2, Radio, CloudUpload, Loader2,
  ShieldCheck, AlertCircle, Eye,
} from 'lucide-react';
import {
  updateOtcBusinessOverview, updateOtcDirectors, updateOtcShareholders,
  updateOtcPeps, updateOtcDocuments, submitOtcOnboarding,
} from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { useInstitutional } from '../../contexts/InstitutionalContext';
import { AFRICAN_COUNTRIES, OTC_LIVE_MARKET_COUNT } from '../../data/africanCountries';
import { Field } from '../../components/onboarding/FormField';
import FileUploadField, { UploadedFile } from '../../components/onboarding/FileUploadField';
import OnboardingHero from '../../components/onboarding/OnboardingHero';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';

// --- Types -------------------------------------------------------------

interface OverviewForm {
  legalName: string; companyType: string; businessModel: string;
  incorporationNumber: string; dateOfIncorporation: string; countryOfIncorporation: string;
  taxNumber: string; companyAddress: string; zipCode: string; state: string; city: string;
  businessDescription: string; companyWebsite: string;
  usePayIns: string[]; usePayOuts: string[]; useConversions: string[];
  linkedin: string; facebook: string; twitter: string; instagram: string;
}

interface Director {
  firstName: string; lastName: string; position: string; dateOfBirth: string;
  nationality: string; idType: string; idNumber: string; issuedCountry: string;
  residentialAddress: string; isShareholder: boolean;
  idProof: UploadedFile | null; addressProof: UploadedFile | null;
}

interface Shareholder {
  entityType: 'individual' | 'legal';
  firstName: string; lastName: string; legalEntityName: string; dateOfBirth: string;
  nationality: string; idType: string; idNumber: string; issuedCountry: string;
  residentialAddress: string; percentageOwned: string;
  validId: UploadedFile | null; proofOfAddress: UploadedFile | null;
}

interface Pep {
  name: string; position: string; country: string; relationship: string;
}

interface DocumentItem {
  name: string; type: string; file: UploadedFile | null;
}

const emptyOverview: OverviewForm = {
  legalName: '', companyType: '', businessModel: '', incorporationNumber: '',
  dateOfIncorporation: '', countryOfIncorporation: '', taxNumber: '', companyAddress: '',
  zipCode: '', state: '', city: '', businessDescription: '', companyWebsite: '',
  usePayIns: [], usePayOuts: [], useConversions: [], linkedin: '', facebook: '', twitter: '', instagram: '',
};

const emptyDirector = (): Director => ({
  firstName: '', lastName: '', position: '', dateOfBirth: '', nationality: '',
  idType: '', idNumber: '', issuedCountry: '', residentialAddress: '', isShareholder: false,
  idProof: null, addressProof: null,
});

const emptyShareholder = (): Shareholder => ({
  entityType: 'individual', firstName: '', lastName: '', legalEntityName: '', dateOfBirth: '',
  nationality: '', idType: '', idNumber: '', issuedCountry: '', residentialAddress: '',
  percentageOwned: '', validId: null, proofOfAddress: null,
});

const emptyPep = (): Pep => ({ name: '', position: '', country: '', relationship: '' });

const COMPANY_TYPES = ['Sole Proprietorship', 'Partnership', 'Private Limited Company', 'Public Limited Company', 'NGO / Trust', 'Government Entity'];
const BUSINESS_MODELS = ['Payment Service Provider', 'Remittance / MTO', 'Fintech / Digital Bank', 'Exchange / Broker', 'E-commerce', 'Other Regulated Entity'];
const ID_TYPES = ['National ID', 'International Passport', "Driver's License", 'Voter ID'];

const STEPS = [
  { key: 'overview', label: 'Business Overview', icon: Building2 },
  { key: 'directors', label: 'Directors', icon: Users },
  { key: 'shareholders', label: 'Shareholders', icon: Landmark },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'review', label: 'Review & Submit', icon: Eye },
] as const;

type SaveState = 'idle' | 'saving' | 'synced' | 'error';

export default function OtcOnboarding() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { profile, onboardingStatus, isApproved, loading, refetch } = useInstitutional();

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  const hasSetInitialStep = useRef(false);

  const [overview, setOverview] = useState<OverviewForm>(emptyOverview);
  const [directors, setDirectors] = useState<Director[]>([]);
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [peps, setPeps] = useState<Pep[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const businessName = profile?.legalName || profile?.businessName || '';

  useEffect(() => {
    if (!profile) return;
    const p = profile;
    setOverview({
      ...emptyOverview,
      legalName: p.legalName || p.businessName || '',
      companyType: p.companyType || '', businessModel: p.businessModel || '',
      incorporationNumber: p.incorporationNumber || '', dateOfIncorporation: p.dateOfIncorporation || '',
      countryOfIncorporation: p.countryOfIncorporation || '', taxNumber: p.taxNumber || '',
      companyAddress: p.companyAddress || '', zipCode: p.zipCode || '', state: p.state || '',
      city: p.city || '', businessDescription: p.businessDescription || '', companyWebsite: p.companyWebsite || '',
      usePayIns: p.usePayIns || [], usePayOuts: p.usePayOuts || [], useConversions: p.useConversions || [],
      linkedin: p.linkedin || '', facebook: p.facebook || '', twitter: p.twitter || '', instagram: p.instagram || '',
    });
    setDirectors(p.directors || []);
    setShareholders(p.shareholders || []);
    setPeps(p.peps || []);
    setDocuments(p.documents || []);
    if (!hasSetInitialStep.current) {
      hasSetInitialStep.current = true;
      // Skip to the first incomplete step
      if (p.legalName && p.directors?.length && p.shareholders?.length && p.documents?.length) {
        setCurrentStep(4); // All complete, go to review
      } else if (p.legalName && p.directors?.length && p.shareholders?.length) {
        setCurrentStep(3);
      } else if (p.legalName && p.directors?.length) {
        setCurrentStep(2);
      } else if (p.legalName) {
        setCurrentStep(1);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (isApproved) {
      navigate('/otc/overview', { replace: true });
    }
  }, [isApproved, navigate]);

  const isComplete = (key: string): boolean => {
    if (key === 'overview') return !!overview.legalName;
    if (key === 'directors') return directors.length > 0;
    if (key === 'shareholders') return shareholders.length > 0;
    if (key === 'documents') return documents.length > 0 && documents.every(d => d.name?.trim() && d.file);
    return false;
  };
  const requiredKeys = ['overview', 'directors', 'shareholders', 'documents'];
  const progress = Math.round((requiredKeys.filter(isComplete).length / requiredKeys.length) * 100);

  const withSaveIndicator = async (fn: () => Promise<void>) => {
    setSaving(true); setSaveState('saving'); setError('');
    try {
      await fn();
      setSaveState('synced');
      window.setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setError('Failed to save. Check your connection and try again.');
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = `w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors border ${isLight
    ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
    : 'bg-[#0A0D14] border-[#1E2D3D] text-white placeholder:text-slate-600 focus:border-emerald-500'}`;
  const selectClass = inputClass + ' appearance-none';
  const inputRowClass = `grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 rounded-xl p-4 border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14]/60 border-[#1E2D3D]'}`;

  const overviewField = (key: keyof OverviewForm, label: string, opts: { type?: string; required?: boolean; placeholder?: string } = {}) => (
    <Field label={label} required={opts.required} isLight={isLight}>
      <input
        type={opts.type || 'text'}
        value={overview[key] as string}
        placeholder={opts.placeholder}
        onChange={e => setOverview({ ...overview, [key]: e.target.value })}
        className={inputClass}
      />
    </Field>
  );

  const saveOverview = () => withSaveIndicator(async () => { await updateOtcBusinessOverview(overview as unknown as Record<string, unknown>); });

  if (loading) return (
    <div className="p-16 text-center">
      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
    </div>
  );

  if (isApproved) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-40 mb-4"><OnboardingHero isLight={isLight} /></div>
        <h1 className={`text-lg font-semibold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Onboarding approved</h1>
        <p className={`text-xs mb-6 max-w-xs ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Taking you to the OTC desk...</p>
        <button onClick={() => navigate('/otc/overview', { replace: true })} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all">
          Continue to OTC Desk <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (onboardingStatus === 'under_review') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-40 mb-4"><OnboardingHero isLight={isLight} /></div>
        <h1 className={`text-lg font-semibold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Submitted for review</h1>
        <p className={`text-xs mb-6 max-w-xs ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Our compliance desk reviews KYB submissions in real time -- we'll notify you the moment a decision is made.</p>
      </div>
    );
  }

  // --- Landing / KYB overview -------------------------------------------
  if (currentStep === -1) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-1 sm:px-0">
        <div className={`rounded-2xl border overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 sm:gap-8 p-5 sm:p-8">
            <div className="flex flex-col justify-center items-center text-center md:items-start md:text-left">
              <div className={`inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide mb-4 ${isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-400'}`}>
                <Radio className="w-3 h-3" /> Live compliance desk
              </div>
              <h1 className={`text-2xl font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Hi{businessName ? `, ${businessName}` : ''} -- let's verify your business
              </h1>
              <p className={`text-sm mb-6 max-w-md ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                Complete Know Your Business (KYB) verification to unlock institutional OTC settlement, pay-ins, pay-outs and multi-currency conversion across the Jasiri network.
              </p>
              <div className={`flex items-center gap-2 text-xs mb-6 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                <Globe2 className="w-4 h-4 text-emerald-500" />
                Real-time settlement infrastructure live in {OTC_LIVE_MARKET_COUNT}+ African markets
              </div>
              <button onClick={() => setCurrentStep(0)} className="inline-flex items-center gap-2 w-fit bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20">
                Start Onboarding <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-center">
              <OnboardingHero isLight={isLight} />
            </div>
          </div>

          <div className={`px-5 sm:px-8 py-5 border-t ${isLight ? 'border-slate-100 bg-slate-50/60' : 'border-[#1E2D3D] bg-[#0A0D14]/60'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{progress}% of required sections complete</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{requiredKeys.filter(isComplete).length} of {requiredKeys.length}</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-[#1E2D3D]'}`}>
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STEPS.filter(s => s.key !== 'review').map(s => {
            const done = isComplete(s.key);
            return (
              <div key={s.key} className={`rounded-xl border p-4 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-3 ${done ? 'bg-emerald-500/15 text-emerald-500' : isLight ? 'bg-slate-100 text-slate-400' : 'bg-[#1E2D3D] text-gray-500'}`}>
                  {done ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                </div>
                <p className={`text-xs font-semibold mb-0.5 ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{s.label}</p>
                <p className={`text-[10px] uppercase font-semibold ${done ? 'text-emerald-500' : isLight ? 'text-slate-400' : 'text-gray-500'}`}>{done ? 'Complete' : 'Not started'}</p>
              </div>
            );
          })}
        </div>

        <div className={`rounded-xl border p-5 sm:p-6 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
          <h2 className={`text-sm font-semibold mb-3 ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>Documentation you'll need for a fast review</h2>
          <ul className="space-y-2">
            {[
              'Incorporation certificate and company registration documents',
              'Company directors -- proof of identity and residential address',
              'Shareholders (individuals and legal entities) -- proof of identity',
              'Politically exposed persons, if applicable (optional)',
            ].map(item => (
              <li key={item} className={`flex items-start gap-2 text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // --- Save status pill ---------------------------------------------------
  const SaveStatusPill = () => {
    if (saveState === 'idle') return null;
    const config = {
      saving: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: 'Syncing...', cls: isLight ? 'bg-slate-100 text-slate-500' : 'bg-[#1E2D3D] text-gray-400' },
      synced: { icon: <CloudUpload className="w-3 h-3" />, text: 'Synced', cls: 'bg-emerald-500/10 text-emerald-500' },
      error: { icon: <X className="w-3 h-3" />, text: 'Sync failed', cls: 'bg-red-500/10 text-red-400' },
    }[saveState as Exclude<SaveState, 'idle'>];
    return (
      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${config.cls}`}>
        {config.icon} {config.text}
      </span>
    );
  };

  // --- Step Content ------------------------------------------------------
  const renderStepContent = () => {
    const stepKey = STEPS[currentStep]?.key;

    if (stepKey === 'overview') {
      return (
        <div className="space-y-6">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Know your business</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {overviewField('legalName', 'Legal business name', { required: true })}
              <Field label="Company type" required isLight={isLight}>
                <select value={overview.companyType} onChange={e => setOverview({ ...overview, companyType: e.target.value })} className={selectClass}>
                  <option value="">What type of company are you?</option>
                  {COMPANY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Business model" required isLight={isLight}>
                <select value={overview.businessModel} onChange={e => setOverview({ ...overview, businessModel: e.target.value })} className={selectClass}>
                  <option value="">Select business model</option>
                  {BUSINESS_MODELS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              {overviewField('incorporationNumber', 'Incorporation number', { required: true })}
              {overviewField('dateOfIncorporation', 'Date of incorporation', { type: 'date', required: true })}
              <Field label="Country of incorporation" required isLight={isLight}>
                <select value={overview.countryOfIncorporation} onChange={e => setOverview({ ...overview, countryOfIncorporation: e.target.value })} className={selectClass}>
                  <option value="">Select country</option>
                  {AFRICAN_COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
              {overviewField('taxNumber', 'Tax number', { required: true })}
              {overviewField('companyWebsite', 'Company website', { placeholder: 'www.yourbusiness.com' })}
              {overviewField('companyAddress', 'Company address', { required: true, placeholder: 'No, Street name' })}
              {overviewField('city', 'City', { required: true })}
              {overviewField('state', 'State / Province', { required: true })}
              {overviewField('zipCode', 'Zip code', { required: true })}
            </div>
            <div className="mt-4">
              <Field label="What does your business do?" required isLight={isLight}>
                <textarea value={overview.businessDescription} onChange={e => setOverview({ ...overview, businessDescription: e.target.value })} rows={3} placeholder="Brief description" className={inputClass} />
              </Field>
            </div>
          </div>

          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>How will you use Jasiri?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <UsageCard isLight={isLight} title="Pay-Ins" desc="Receive payments directly from businesses and individuals"
                options={['Crypto Wallet', 'Checkout (Cards)', 'Checkout (Bank Transfer)', 'Checkout (Mobile Money)']}
                selected={overview.usePayIns} onToggle={v => setOverview(o => ({ ...o, usePayIns: toggleValue(o.usePayIns, v) }))} />
              <UsageCard isLight={isLight} title="Pay-Outs" desc="Send money directly into beneficiary accounts"
                options={['Local Pay-Outs', 'International Pay-Outs']}
                selected={overview.usePayOuts} onToggle={v => setOverview(o => ({ ...o, usePayOuts: toggleValue(o.usePayOuts, v) }))} />
              <UsageCard isLight={isLight} title="Conversions" desc="Move money from one currency to another within the system"
                options={['Multi-Currency Conversion']}
                selected={overview.useConversions} onToggle={v => setOverview(o => ({ ...o, useConversions: toggleValue(o.useConversions, v) }))} />
            </div>
          </div>

          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Additional information (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {overviewField('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' })}
              {overviewField('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' })}
              {overviewField('twitter', 'Twitter / X', { placeholder: 'https://x.com/...' })}
              {overviewField('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' })}
            </div>
          </div>
        </div>
      );
    }

    if (stepKey === 'directors') {
      return (
        <DirectorList
          isLight={isLight} items={directors} setItems={setDirectors}
          inputClass={inputClass} selectClass={selectClass} rowClass={inputRowClass}
          saving={saving}
          onSave={() => withSaveIndicator(async () => { await updateOtcDirectors(directors); })}
        />
      );
    }

    if (stepKey === 'shareholders') {
      return (
        <ShareholderList
          isLight={isLight} items={shareholders} setItems={setShareholders}
          inputClass={inputClass} selectClass={selectClass} rowClass={inputRowClass}
          saving={saving}
          onSave={() => withSaveIndicator(async () => { await updateOtcShareholders(shareholders); })}
        />
      );
    }

    if (stepKey === 'documents') {
      return (
        <div className="space-y-6">
          <div>
            <h3 className={`text-sm font-semibold mb-1 ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>Company Documents</h3>
            <p className={`text-xs mb-4 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Upload your incorporation certificate, proof of company address, and any other relevant business documents.</p>
            <div className="space-y-3">
              {documents.map((d, i) => (
                <div key={i} className={inputRowClass}>
                  <Field label="Document name" required isLight={isLight}>
                    <input value={d.name} onChange={e => setDocuments(documents.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))} className={inputClass} placeholder="e.g. Certificate of Incorporation" />
                  </Field>
                  <Field label="Document type" required isLight={isLight}>
                    <input value={d.type} onChange={e => setDocuments(documents.map((it, idx) => idx === i ? { ...it, type: e.target.value } : it))} className={inputClass} placeholder="e.g. Incorporation certificate" />
                  </Field>
                  <div className="sm:col-span-2 flex items-end gap-2">
                    <div className="flex-1">
                      <FileUploadField label="Upload document" required isLight={isLight} value={d.file} onChange={file => setDocuments(documents.map((it, idx) => idx === i ? { ...it, file } : it))} />
                    </div>
                    <button onClick={() => setDocuments(documents.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 mb-3"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => setDocuments([...documents, { name: '', type: '', file: null }])} className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add document
              </button>
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14]/60 border-[#1E2D3D]'}`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>Politically Exposed Persons (Optional)</h3>
            </div>
            <p className={`text-xs mb-3 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>List any politically exposed persons associated with this business, if applicable.</p>
            <PepList
              isLight={isLight} items={peps} setItems={setPeps}
              inputClass={inputClass} rowClass={inputRowClass}
              saving={saving}
              onSave={() => withSaveIndicator(async () => { await updateOtcPeps(peps); })}
            />
          </div>
        </div>
      );
    }

    if (stepKey === 'review') {
      return (
        <div className="space-y-6">
          <div className={`rounded-xl border p-5 ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className={`text-sm font-semibold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>Ready to submit</h3>
            </div>
            <p className={`text-xs ${isLight ? 'text-emerald-700' : 'text-emerald-300/80'}`}>
              Please review your information below. Once submitted, our compliance team will review your application and notify you of the decision.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReviewCard isLight={isLight} title="Business Overview" complete={isComplete('overview')}
              items={[
                { label: 'Legal Name', value: overview.legalName },
                { label: 'Company Type', value: overview.companyType },
                { label: 'Business Model', value: overview.businessModel },
                { label: 'Country', value: overview.countryOfIncorporation },
                { label: 'Tax Number', value: overview.taxNumber },
              ]} />
            <ReviewCard isLight={isLight} title="Directors" complete={isComplete('directors')}
              items={directors.map((d, i) => ({ label: `Director ${i + 1}`, value: `${d.firstName} ${d.lastName} (${d.position})` }))} />
            <ReviewCard isLight={isLight} title="Shareholders" complete={isComplete('shareholders')}
              items={shareholders.map((s, i) => ({ label: `Shareholder ${i + 1}`, value: s.entityType === 'legal' ? s.legalEntityName : `${s.firstName} ${s.lastName} (${s.percentageOwned}%)` }))} />
            <ReviewCard isLight={isLight} title="Documents" complete={isComplete('documents')}
              items={documents.map((d, i) => ({ label: `Document ${i + 1}`, value: d.name || 'Unnamed' }))} />
          </div>

          {onboardingStatus === 'rejected' && (
            <div className={`rounded-lg border p-4 ${isLight ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className={`text-xs font-semibold ${isLight ? 'text-red-700' : 'text-red-400'}`}>Your last submission was rejected</p>
              </div>
              <p className={`text-xs ${isLight ? 'text-red-600/90' : 'text-red-300/80'}`}>{profile?.reviewNotes || 'Please review the sections below and resubmit.'}</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // --- Wizard ---------------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6">
        <div>
          <h1 className={`text-lg sm:text-xl font-semibold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Institutional Onboarding (KYB)</h1>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Deep business verification required before OTC settlement access. Fields marked <span className="text-red-500">*</span> are required.</p>
        </div>
        <SaveStatusPill />
      </div>

      {/* Stepper */}
      <div className={`rounded-xl border p-4 mb-6 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const done = isComplete(step.key);
            const active = idx === currentStep;
            const past = idx < currentStep;
            return (
              <div key={step.key} className="flex items-center flex-1">
                <button
                  onClick={() => idx < currentStep ? setCurrentStep(idx) : undefined}
                  className={`flex items-center gap-2 ${idx < currentStep ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    done ? 'bg-emerald-500 text-white' :
                    active ? 'bg-emerald-500/15 text-emerald-500 ring-2 ring-emerald-500/30' :
                    isLight ? 'bg-slate-100 text-slate-400' : 'bg-[#1E2D3D] text-gray-500'
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block ${
                    active ? 'text-emerald-500' :
                    done ? isLight ? 'text-slate-700' : 'text-gray-300' :
                    isLight ? 'text-slate-400' : 'text-gray-500'
                  }`}>{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded ${past || done ? 'bg-emerald-500' : isLight ? 'bg-slate-200' : 'bg-[#1E2D3D]'}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{progress}% complete</span>
          <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{requiredKeys.filter(isComplete).length} of {requiredKeys.length} required sections</span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden mt-2 ${isLight ? 'bg-slate-100' : 'bg-[#1E2D3D]'}`}>
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

      {/* Step Content */}
      <div className={`rounded-xl border p-5 sm:p-6 mb-6 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => currentStep === 0 ? setCurrentStep(-1) : setCurrentStep(currentStep - 1)}
          className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors ${
            isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:bg-[#1A2533]'
          }`}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={async () => {
              if (currentStep === 0) await saveOverview();
              setCurrentStep(currentStep + 1);
            }}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-all"
          >
            {saving ? 'Saving...' : 'Save & Continue'} <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={async () => {
              setSaving(true); setSaveState('saving'); setError('');
              try {
                await updateOtcDocuments(documents);
                await submitOtcOnboarding();
                setSaveState('synced');
                await refetch();
              } catch (e: any) {
                setError(getFriendlyErrorMessage(e, { fallback: 'Failed to submit.' }));
                setSaveState('error');
              } finally { setSaving(false); }
            }}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-all"
          >
            {saving ? 'Submitting...' : 'Submit for Review'} <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// --- Shared helpers -------------------------------------------------------

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

function UsageCard({ isLight, title, desc, options, selected, onToggle }: {
  isLight: boolean; title: string; desc: string; options: string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div className={`rounded-xl border p-4 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14]/60 border-[#1E2D3D]'}`}>
      <p className={`text-sm font-semibold mb-1 ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{title}</p>
      <p className={`text-[11px] mb-3 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{desc}</p>
      <div className="space-y-2">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} className="w-3.5 h-3.5 accent-emerald-500" />
            <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ isLight, title, complete, items }: {
  isLight: boolean; title: string; complete: boolean; items: { label: string; value: string }[];
}) {
  return (
    <div className={`rounded-xl border p-4 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A0D14]/60 border-[#1E2D3D]'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{title}</h4>
        {complete ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Complete</span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Incomplete</span>
        )}
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{item.label}</span>
            <span className={`text-xs font-medium ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{item.value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectorList({ isLight, items, setItems, inputClass, selectClass, rowClass, onSave, saving }: {
  isLight: boolean; items: Director[]; setItems: (v: Director[]) => void;
  inputClass: string; selectClass: string; rowClass: string; onSave: () => void; saving: boolean;
}) {
  const update = (i: number, patch: Partial<Director>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div className="space-y-4">
      {items.map((d, i) => (
        <div key={i} className={rowClass + ' relative'}>
          <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
          <Field label="First name" required isLight={isLight}><input value={d.firstName} onChange={e => update(i, { firstName: e.target.value })} className={inputClass} /></Field>
          <Field label="Last name" required isLight={isLight}><input value={d.lastName} onChange={e => update(i, { lastName: e.target.value })} className={inputClass} /></Field>
          <Field label="Position" required isLight={isLight}><input value={d.position} onChange={e => update(i, { position: e.target.value })} className={inputClass} placeholder="e.g. Chief Executive Officer" /></Field>
          <Field label="Date of birth" required isLight={isLight}><input type="date" value={d.dateOfBirth} onChange={e => update(i, { dateOfBirth: e.target.value })} className={inputClass} /></Field>
          <Field label="Nationality" required isLight={isLight}>
            <select value={d.nationality} onChange={e => update(i, { nationality: e.target.value })} className={selectClass}>
              <option value="">Select country</option>
              {AFRICAN_COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Identification document" required isLight={isLight}>
            <select value={d.idType} onChange={e => update(i, { idType: e.target.value })} className={selectClass}>
              <option value="">Select ID type</option>
              {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="ID number" required isLight={isLight}><input value={d.idNumber} onChange={e => update(i, { idNumber: e.target.value })} className={inputClass} /></Field>
          <Field label="Issued country" required isLight={isLight}>
            <select value={d.issuedCountry} onChange={e => update(i, { issuedCountry: e.target.value })} className={selectClass}>
              <option value="">Select country</option>
              {AFRICAN_COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Residential address" required isLight={isLight} className="sm:col-span-2"><input value={d.residentialAddress} onChange={e => update(i, { residentialAddress: e.target.value })} className={inputClass} /></Field>
          <FileUploadField label="Identification document proof" required isLight={isLight} value={d.idProof} onChange={file => update(i, { idProof: file })} />
          <FileUploadField label="Residential address proof" required isLight={isLight} value={d.addressProof} onChange={file => update(i, { addressProof: file })} />
          <label className="flex items-center gap-2 cursor-pointer sm:col-span-2">
            <input type="checkbox" checked={d.isShareholder} onChange={e => update(i, { isShareholder: e.target.checked })} className="w-3.5 h-3.5 accent-emerald-500" />
            <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>This director is also a shareholder</span>
          </label>
        </div>
      ))}
      <button onClick={() => setItems([...items, emptyDirector()])} className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> Add director
      </button>
      <div className="flex justify-end pt-2">
        <button onClick={onSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg">
          {saving ? 'Saving...' : 'Save & continue'}
        </button>
      </div>
    </div>
  );
}

function ShareholderList({ isLight, items, setItems, inputClass, selectClass, rowClass, onSave, saving }: {
  isLight: boolean; items: Shareholder[]; setItems: (v: Shareholder[]) => void;
  inputClass: string; selectClass: string; rowClass: string; onSave: () => void; saving: boolean;
}) {
  const update = (i: number, patch: Partial<Shareholder>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div className="space-y-4">
      {items.map((s, i) => (
        <div key={i} className={rowClass + ' relative'}>
          <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>

          <div className="sm:col-span-2 flex items-center gap-4 mb-1">
            {(['individual', 'legal'] as const).map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={s.entityType === t} onChange={() => update(i, { entityType: t })} className="w-3.5 h-3.5 accent-emerald-500" />
                <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>{t === 'individual' ? 'Natural Person / UBO' : 'Legal Entity'}</span>
              </label>
            ))}
          </div>

          {s.entityType === 'legal' ? (
            <Field label="Legal entity name" required isLight={isLight} className="sm:col-span-2">
              <input value={s.legalEntityName} onChange={e => update(i, { legalEntityName: e.target.value })} className={inputClass} />
            </Field>
          ) : (
            <>
              <Field label="First name" required isLight={isLight}><input value={s.firstName} onChange={e => update(i, { firstName: e.target.value })} className={inputClass} /></Field>
              <Field label="Last name" required isLight={isLight}><input value={s.lastName} onChange={e => update(i, { lastName: e.target.value })} className={inputClass} /></Field>
              <Field label="Date of birth" required isLight={isLight}><input type="date" value={s.dateOfBirth} onChange={e => update(i, { dateOfBirth: e.target.value })} className={inputClass} /></Field>
            </>
          )}

          <Field label="Nationality" required isLight={isLight}>
            <select value={s.nationality} onChange={e => update(i, { nationality: e.target.value })} className={selectClass}>
              <option value="">Select country</option>
              {AFRICAN_COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Identification document" required isLight={isLight}>
            <select value={s.idType} onChange={e => update(i, { idType: e.target.value })} className={selectClass}>
              <option value="">ID type</option>
              {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="ID / passport number" required isLight={isLight}><input value={s.idNumber} onChange={e => update(i, { idNumber: e.target.value })} className={inputClass} /></Field>
          <Field label="Issued country" required isLight={isLight}>
            <select value={s.issuedCountry} onChange={e => update(i, { issuedCountry: e.target.value })} className={selectClass}>
              <option value="">Select country</option>
              {AFRICAN_COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Residential address" required isLight={isLight}><input value={s.residentialAddress} onChange={e => update(i, { residentialAddress: e.target.value })} className={inputClass} /></Field>
          <Field label="Percentage of shares owned" required isLight={isLight}>
            <input type="number" min={0} max={100} value={s.percentageOwned} onChange={e => update(i, { percentageOwned: e.target.value })} className={inputClass} placeholder="%" />
          </Field>
          <FileUploadField label="Valid ID for shareholder" required isLight={isLight} value={s.validId} onChange={file => update(i, { validId: file })} />
          <FileUploadField label="Proof of address" required isLight={isLight} value={s.proofOfAddress} onChange={file => update(i, { proofOfAddress: file })} />
        </div>
      ))}
      <button onClick={() => setItems([...items, emptyShareholder()])} className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> Add shareholder
      </button>
      <div className="flex justify-end pt-2">
        <button onClick={onSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg">
          {saving ? 'Saving...' : 'Save & continue'}
        </button>
      </div>
    </div>
  );
}

function PepList({ isLight, items, setItems, inputClass, rowClass, onSave, saving }: {
  isLight: boolean; items: Pep[]; setItems: (v: Pep[]) => void; inputClass: string; rowClass: string; onSave: () => void; saving: boolean;
}) {
  const update = (i: number, patch: Partial<Pep>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div className="space-y-3">
      <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Optional -- list any politically exposed persons associated with this business.</p>
      {items.map((p, i) => (
        <div key={i} className={rowClass + ' relative'}>
          <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
          <Field label="Full name" isLight={isLight}><input value={p.name} onChange={e => update(i, { name: e.target.value })} className={inputClass} /></Field>
          <Field label="Political position" isLight={isLight}><input value={p.position} onChange={e => update(i, { position: e.target.value })} className={inputClass} /></Field>
          <Field label="Country" isLight={isLight}><input value={p.country} onChange={e => update(i, { country: e.target.value })} className={inputClass} /></Field>
          <Field label="Relationship to business" isLight={isLight}><input value={p.relationship} onChange={e => update(i, { relationship: e.target.value })} className={inputClass} /></Field>
        </div>
      ))}
      <button onClick={() => setItems([...items, emptyPep()])} className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> Add PEP
      </button>
      <div className="flex justify-end pt-2">
        <button onClick={onSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg">
          {saving ? 'Saving...' : 'Save & continue'}
        </button>
      </div>
    </div>
  );
}
