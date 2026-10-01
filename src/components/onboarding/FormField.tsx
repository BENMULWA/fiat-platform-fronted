import { ReactNode } from 'react';

// Shared label treatment for every KYB field: a small uppercase caption with
// a red asterisk when the field is mandatory, matching how the rest of the
// institutional portal marks required inputs (no ambiguity for compliance
// reviewers about what blocks submission).
export function FieldLabel({ children, required, isLight = true }: { children: ReactNode; required?: boolean; isLight?: boolean }) {
  return (
    <span className="flex items-center gap-1 mb-1.5">
      <span className={`text-[11px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
        {children}
      </span>
      {required && <span className="text-red-500 leading-none" aria-hidden="true">*</span>}
    </span>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  isLight?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, required, isLight = true, children, className = '' }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <FieldLabel required={required} isLight={isLight}>{label}</FieldLabel>
      {children}
    </label>
  );
}
