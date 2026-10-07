import React, { useEffect, useState } from 'react'
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, Download, Eye, Info, Lock, Monitor, Moon, RefreshCw, Sun, XCircle,
} from 'lucide-react'
import { useImm } from './store'
import type { Check as CheckT, Decision } from './derive'
import type { OppNode } from './types'

export const I = { Check, ChevronDown, ChevronRight, Download, Eye, Info, Lock, Monitor, Moon, RefreshCw, Sun, AlertTriangle, XCircle }

export function Card({ title, sub, actions, children, cls = '' }: {
  title?: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; cls?: string
}) {
  return (
    <section className={`card ${cls}`}>
      {(title || actions) && (
        <header className="card-h">
          <div>{title && <h2>{title}</h2>}{sub && <p className="sub">{sub}</p>}</div>
          {actions && <div className="row">{actions}</div>}
        </header>
      )}
      <div className="card-b">{children}</div>
    </section>
  )
}

export function Pill({ tone, children }: { tone: 'pos' | 'warn' | 'neg' | 'neutral' | 'gold'; children: React.ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

const DEC: Record<Decision, ['pos' | 'warn' | 'neg', string, React.ReactNode]> = {
  EXECUTE: ['pos', 'Ready', <Check size={12} key="i" />],
  REVIEW: ['warn', 'Review', <AlertTriangle size={12} key="i" />],
  BLOCK: ['neg', 'Blocked', <XCircle size={12} key="i" />],
}
export const DecisionPill = ({ d }: { d: Decision }) => (
  <span className={`pill ${DEC[d][0]}`}>{DEC[d][2]}{DEC[d][1]}</span>
)

const COLOR: Record<string, string> = {
  blue: 'var(--k-air)', orange: 'var(--k-mob)', emerald: 'var(--k-stable)', purple: 'var(--k-trea)', slate: 'var(--k-res)', red: 'var(--neg)',
}

export function Flow({ nodes, big }: { nodes: OppNode[]; big?: boolean }) {
  return (
    <div className={'flow' + (big ? ' big' : '')}>
      {nodes.map((n, i) => (
        <React.Fragment key={n.id + i}>
          {i > 0 && <span className="fa" aria-hidden="true">→</span>}
          <span className="fn" title={`${n.name} · ${n.tag}`}>
            <i style={{ background: COLOR[n.color] || 'var(--muted)' }} />
            <b>{n.id}</b>{n.name}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

export function ChecksView({ checks }: { checks: CheckT[] }) {
  return (
    <div className="checks">
      {checks.map((c) => (
        <div key={c.id} className={'ck ' + c.status}>
          <span className={c.status === 'PASS' ? 'pos' : c.status === 'WARN' ? 'warn' : 'neg'}>
            {c.status === 'PASS' ? <Check size={14} /> : c.status === 'WARN' ? <AlertTriangle size={14} /> : <XCircle size={14} />}
          </span>
          <div><b>{c.label}.</b> {c.message}</div>
        </div>
      ))}
    </div>
  )
}

export function Meter({ label, value, display, mark, markLabel, good = true }: {
  label: string; value: number; display: string; mark?: number; markLabel?: string; good?: boolean
}) {
  const w = Math.max(0, Math.min(100, value * 100))
  return (
    <div className="meter">
      <div className="between sm"><span>{label}</span><b className={'num ' + (good ? 'pos' : 'neg')}>{display}</b></div>
      <div className="track">
        <span className={good ? 'ok' : 'bad'} style={{ width: w + '%' }} />
        {mark != null && <i style={{ left: Math.min(100, mark * 100) + '%' }} title={markLabel} />}
      </div>
      {markLabel && <div className="xs muted">{markLabel}</div>}
    </div>
  )
}

/** Shown wherever the backend has no endpoint yet. Never filled with sample data. */
export function Unavailable({ title, endpoint, children, status }: {
  title: string; endpoint: string; children?: React.ReactNode; status?: number | null
}) {
  return (
    <div className="unavail" role="note">
      <b>{title}</b>
      <span className="sm muted">
        {children || 'This view shows live data only. The backend does not provide it yet.'}
        {status === 403 || status === 401 ? ' This account is not allowed to read it.' : ''}
      </span>
      <div><code className="ep">{endpoint}</code></div>
    </div>
  )
}

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className="toggle" onClick={() => onChange(!on)} />
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Loading({ what }: { what: string }) {
  return <div className="empty">Loading {what}…</div>
}

export function Modal() {
  const { modal, closeModal } = useImm()
  const [vals, setVals] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (modal) {
      const v: Record<string, string> = {}
      ;(modal.fields || []).forEach((f) => { v[f.id] = f.value ?? '' })
      setVals(v); setErr(''); setBusy(false)
    }
  }, [modal])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [closeModal])
  if (!modal) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    for (const f of modal.fields || []) if (f.required && !String(vals[f.id] ?? '').trim()) return setErr(`${f.label} is required.`)
    setBusy(true)
    try {
      const r = await modal.onConfirm?.(vals)
      setBusy(false)
      if (typeof r === 'string') return setErr(r)
      if (r !== false) closeModal()
    } catch (x: any) {
      setBusy(false)
      setErr(x?.message || 'Something went wrong.')
    }
  }
  const set = (id: string, v: string) => setVals((p) => ({ ...p, [id]: v }))

  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal() }}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="imm-mh" onSubmit={submit}>
        <header><h3 id="imm-mh">{modal.title}</h3><button type="button" className="x" onClick={closeModal} aria-label="Close"><XCircle size={18} /></button></header>
        <div className="mb">
          {modal.body}
          {(modal.fields || []).length > 0 && (
            <div className="form">
              {modal.fields!.map((f) => (
                <label key={f.id} className="field" htmlFor={'imm-f-' + f.id}>
                  <span>{f.label}</span>
                  {f.type === 'select' ? (
                    <select id={'imm-f-' + f.id} value={vals[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)}>
                      {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input id={'imm-f-' + f.id} className={f.type === 'number' ? 'num' : ''} inputMode={f.type === 'number' ? 'decimal' : undefined}
                      value={vals[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)} autoComplete="off" />
                  )}
                  {f.hint && <small>{f.hint}</small>}
                </label>
              ))}
            </div>
          )}
          {err && <p className="err">{err}</p>}
        </div>
        <footer>
          <button type="button" className="btn" onClick={closeModal}>{modal.onConfirm ? 'Cancel' : 'Close'}</button>
          {modal.onConfirm && <button type="submit" className={'btn ' + (modal.danger ? 'danger' : 'primary')} disabled={busy}>{busy ? 'Working…' : modal.confirm || 'Save'}</button>}
        </footer>
      </form>
    </div>
  )
}

export function Toasts() {
  const { toasts } = useImm()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={'toast ' + (t.kind === 'bad' ? 'neg' : '')}>{t.msg}</div>)}
    </div>
  )
}

export function Spinner() {
  return <RefreshCw size={14} className="animate-spin" />
}
