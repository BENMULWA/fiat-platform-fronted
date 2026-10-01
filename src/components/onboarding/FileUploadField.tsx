import { useRef, useState } from 'react';
import { UploadCloud, FileCheck2, X, Loader2 } from 'lucide-react';
import { FieldLabel } from './FormField';

export interface UploadedFile {
  fileName: string;
  fileDataUrl: string;
  fileType: string;
  fileSize: number;
}

// Capped well under Mongo's 16MB document limit -- a KYB profile can carry
// a dozen+ of these (director ID, address proof, shareholder docs, company
// docs) inline as base64, same storage pattern as the retail KYC upload.
const MAX_BYTES = 3 * 1024 * 1024; // 3MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

interface FileUploadFieldProps {
  label: string;
  required?: boolean;
  isLight?: boolean;
  value?: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  error?: string;
}

export default function FileUploadField({ label, required, isLight = true, value, onChange, error }: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleFile = (file?: File) => {
    setLocalError('');
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError('Use JPEG, PNG or PDF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError('Max file size is 3MB.');
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        fileName: file.name,
        fileDataUrl: String(reader.result || ''),
        fileType: file.type,
        fileSize: file.size,
      });
      setReading(false);
    };
    reader.onerror = () => {
      setLocalError('Could not read that file -- try again.');
      setReading(false);
    };
    reader.readAsDataURL(file);
  };

  const formattedSize = (bytes: number) => bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;

  return (
    <label className="block">
      <FieldLabel required={required} isLight={isLight}>{label}</FieldLabel>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
      {value ? (
        <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 border ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/5 border-emerald-500/25'}`}>
          <FileCheck2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-medium truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{value.fileName}</p>
            <p className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{formattedSize(value.fileSize)}</p>
          </div>
          <button type="button" onClick={() => onChange(null)} className="text-red-400 hover:text-red-300 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={reading}
          className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 border border-dashed text-left transition-colors ${isLight
            ? 'bg-slate-50 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50'
            : 'bg-[#0A0D14] border-[#1E2D3D] hover:border-emerald-500/50 hover:bg-emerald-500/5'}`}
        >
          {reading ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500 shrink-0" />
          ) : (
            <UploadCloud className={`w-4 h-4 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
          )}
          <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {reading ? 'Reading file...' : 'Choose file to upload'}
          </span>
        </button>
      )}
      <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>JPEG, PNG or PDF. Max file size 3MB.</p>
      {(localError || error) && <p className="text-[10px] text-red-400 mt-1">{localError || error}</p>}
    </label>
  );
}
