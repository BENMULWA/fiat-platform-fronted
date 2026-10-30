import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { getTwoFactorStatus, requestWithdrawalOtp } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';

export interface StepUpFields {
  otp_session_id: string;
  otp_code: string;
  totp_code?: string;
}

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onClose: () => void;
  /** Runs the protected action. Throw an Error(message) to show it inside the modal. */
  onConfirm: (fields: StepUpFields) => Promise<void>;
}

const errorText = (err: any): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d?.msg || String(d)).join('; ');
  return err?.message || 'Something went wrong. Please try again.';
};

/**
 * Same step-up as a withdrawal (emailed code + authenticator app). Moving money onto a card, or revealing one, is
 * money-out, so it must not be possible with a stolen session alone.
 */
export default function StepUpModal({ open, title, description, confirmLabel = 'Confirm', onClose, onConfirm }: Props) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [sessionId, setSessionId] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpEnabled, setTotpEnabled] = useState(true);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async () => {
    setError(''); setSending(true);
    try {
      const res = await requestWithdrawalOtp();
      setSessionId(res.data?.otp_session_id || '');
    } catch (err: any) {
      // 428: no authenticator app yet. The backend is the authority, so send the user to set one up.
      setError(err?.response?.status === 428
        ? 'Set up an authenticator app first (Profile > Security), then try again.'
        : errorText(err));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setEmailCode(''); setTotpCode(''); setError(''); setSessionId('');
    getTwoFactorStatus().then((r) => setTotpEnabled(!!r.data?.totpEnabled)).catch(() => {});
    void sendCode();
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (!emailCode) { setError('Enter the code we emailed you.'); return; }
    if (totpEnabled && !totpCode) { setError('Enter your authenticator app code.'); return; }
    setError(''); setBusy(true);
    try {
      await onConfirm({ otp_session_id: sessionId, otp_code: emailCode, totp_code: totpEnabled ? totpCode : undefined });
    } catch (err: any) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const panel = isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#111827] border-[#1E2533] text-white';
  const input = isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0B0E14] border-[#1E2533] text-white';
  const muted = isLight ? 'text-slate-500' : 'text-gray-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
      <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 ${panel}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className={`text-xs mt-0.5 ${muted}`}>{description}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className={muted} aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <label className="block text-xs font-semibold">
          Email code
          <input inputMode="numeric" autoComplete="one-time-code" value={emailCode}
            onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
            className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500 ${input}`} placeholder="6-digit code" />
        </label>
        {totpEnabled && (
          <label className="block text-xs font-semibold">
            Authenticator app code
            <input inputMode="numeric" autoComplete="one-time-code" value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-emerald-500 ${input}`} placeholder="6-digit code" />
          </label>
        )}
        <button type="button" onClick={sendCode} disabled={sending || busy} className="text-xs font-bold text-blue-500 disabled:opacity-50">
          {sending ? 'Sending...' : "Didn't get a code? Resend"}
        </button>

        {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">{error}</div>}

        <button type="button" onClick={submit} disabled={busy || sending || !sessionId}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
        </button>
      </div>
    </div>
  );
}
