
//@ts-nocheck

import { useEffect } from 'react';

type Toast = {
  id: string | number;
  message: string;
  type?: 'info' | 'success' | 'error';
  duration?: number;
};

interface Props {
  toasts: Toast[];
  onRemove: (id: Toast['id']) => void;
}

export default function SimpleToast({ toasts, onRemove }: Props) {
  useEffect(() => {
    const timers: Record<string, number> = {};
    toasts.forEach((t) => {
      if (!timers[t.id]) {
        timers[t.id] = window.setTimeout(() => onRemove(t.id), t.duration ?? 5000);
      }
    });
    return () => {
      Object.values(timers).forEach((id) => clearTimeout(id));
    };
  }, [toasts, onRemove]);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`max-w-sm w-full px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm border border-[rgba(255,255,255,0.04)] text-sm font-medium ${
            t.type === 'success' ? 'bg-emerald-900/60 text-emerald-300' : t.type === 'error' ? 'bg-rose-900/60 text-rose-300' : 'bg-slate-900/60 text-slate-200'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
