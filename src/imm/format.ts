export const num = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.replace(/[^0-9.\-eE]/g, '')))) {
    const n = Number(v.replace(/[^0-9.\-eE]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function fx(v: number | null | undefined, dp = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const rounded = Number(Math.abs(v).toFixed(dp))
  const s = rounded.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
  return (v < 0 && rounded !== 0 ? '−' : '') + s
}

export const usd = (v: number | null | undefined, dp = 2) => (v == null || !Number.isFinite(v) ? '—' : '$' + fx(v, dp))
export const sgnUsd = (v: number | null | undefined, dp = 2) => {
  if (v == null || !Number.isFinite(v)) return '—'
  const r = Number(v.toFixed(dp))
  return (r > 0 ? '+' : r < 0 ? '−' : '') + '$' + fx(Math.abs(v), dp)
}
export const pct = (ratio: number | null | undefined, dp = 2) => (ratio == null || !Number.isFinite(ratio) ? '—' : fx(ratio * 100, dp) + '%')
export const tone = (v: number | null | undefined) => (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '')

export function ago(when: string | number | null | undefined): string {
  if (when == null || when === '') return 'never'
  const t = typeof when === 'number' ? when : Date.parse(when)
  if (!Number.isFinite(t)) return 'unknown'
  const s = Math.max(0, (Date.now() - t) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

export function ageFromSeconds(sec: number | null | undefined): string {
  if (sec == null) return 'never'
  return ago(Date.now() - sec * 1000)
}

export const dt = (iso: string | undefined | null) => {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(t)
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
