// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Search, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { getAuditEvents, getAuditStuck } from '../../api/client';

// "Needs attention" is the queue of things a human must act on; the rest are
// the raw, append-only trails. Keys match SOURCES in backend routes/admin_audit_view.py.
const TABS = [
    { key: 'attention', label: 'Needs attention' },
    { key: 'admin_actions', label: 'Admin actions' },
    { key: 'ramp_intents', label: 'Money requests' },
    { key: 'transfers', label: 'Internal transfers' },
    { key: 'payouts', label: 'Fiat payouts' },
    { key: 'celo', label: 'Celo' },
    { key: 'stellar', label: 'Stellar' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'callbacks', label: 'Provider callbacks' },
];

const ATTENTION_SECTIONS = [
    { key: 'stuckIntents', title: 'Requests that never finished', help: 'A money request started and never closed. The customer may be debited with nothing delivered. Reconcile before anything else.' },
    { key: 'unconfirmedPayouts', title: 'Withdrawals with no provider confirmation', help: 'Sent to the payment provider, outcome unknown. Funds are held. Confirm with the provider, then complete or refund.' },
    { key: 'transfersNeedingReconciliation', title: 'Internal transfers needing reconciliation', help: 'A debit may have happened without the matching credit or reversal.' },
    { key: 'complianceHolds', title: 'Held for compliance review', help: 'No funds have moved. Release or reject.' },
    { key: 'recentFailures', title: 'Failed money requests (last hour)', help: 'Server-side failures during a swap, deposit or withdrawal.' },
    { key: 'badCallbacks', title: 'Rejected or failed provider callbacks (last hour)', help: 'Forged, unsigned or unprocessable callbacks. A burst of these can mean someone is probing the deposit flow.' },
];

const SUMMARY_FIELDS = ['action', 'event', 'status', 'outcome', 'direction', 'resultStatus', 'asset', 'amount', 'fromAsset', 'toAsset'];
const WHO_FIELDS = ['actorEmail', 'actorId', 'userId', 'user_id', 'senderEmail', 'recipientEmail'];

const timeOf = (e: any) => e.createdAt || e.created_at || e.receivedAt || e.timestamp || e.at || '';
const fmtTime = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
};

function EventRow({ e }: { e: any }) {
    const [open, setOpen] = useState(false);
    const summary = SUMMARY_FIELDS.filter(f => e[f] !== undefined && e[f] !== null && e[f] !== '').map(f => `${f}: ${typeof e[f] === 'object' ? JSON.stringify(e[f]) : e[f]}`);
    const who = WHO_FIELDS.map(f => e[f]).filter(Boolean)[0];
    return (
        <>
            <tr onClick={() => setOpen(o => !o)} className="cursor-pointer hover:bg-white/[0.03] border-b border-[#1e2533]/60">
                <td className="py-2 pr-4 text-gray-500 font-mono text-xs whitespace-nowrap">{fmtTime(timeOf(e))}</td>
                <td className="py-2 pr-4 text-gray-300 text-xs">{summary.join(' · ') || '—'}</td>
                <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{who || '—'}</td>
                <td className="py-2 text-gray-600 font-mono text-[11px] whitespace-nowrap">{String(e._id || '').slice(-10)}</td>
            </tr>
            {open && (
                <tr className="border-b border-[#1e2533]/60">
                    <td colSpan={4} className="py-2">
                        <pre className="text-[11px] text-gray-400 bg-black/30 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(e, null, 2)}</pre>
                    </td>
                </tr>
            )}
        </>
    );
}

function EventTable({ events }: { events: any[] }) {
    if (!events.length) return <div className="py-8 text-center text-gray-500 text-sm">Nothing here.</div>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-[#1e2533]">
                        <th className="py-2 pr-4 font-semibold">Time</th>
                        <th className="py-2 pr-4 font-semibold">What happened</th>
                        <th className="py-2 pr-4 font-semibold">Who</th>
                        <th className="py-2 font-semibold">Ref</th>
                    </tr>
                </thead>
                <tbody>{events.map((e, i) => <EventRow key={`${e._id}-${i}`} e={e} />)}</tbody>
            </table>
        </div>
    );
}

export const AuditLogPage = () => {
    const [tab, setTab] = useState('attention');
    const [events, setEvents] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [stuck, setStuck] = useState<any | null>(null);
    const [q, setQ] = useState('');
    const [query, setQuery] = useState('');
    const [skip, setSkip] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const limit = 50;

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            if (tab === 'attention') {
                const res = await getAuditStuck();
                setStuck(res.data);
            } else {
                const res = await getAuditEvents({ source: tab, q: query || undefined, limit, skip });
                setEvents(res.data.events || []);
                setTotal(res.data.total || 0);
            }
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Could not load the audit data.');
        } finally {
            setLoading(false);
        }
    }, [tab, query, skip]);

    useEffect(() => { load(); }, [load]);
    // The attention queue is the one thing worth watching live.
    useEffect(() => {
        if (tab !== 'attention') return;
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
    }, [tab, load]);

    const switchTab = (key: string) => { setTab(key); setSkip(0); setQ(''); setQuery(''); };
    const attentionTotal = stuck ? Object.values(stuck.counts || {}).reduce((a: number, b: any) => a + Number(b), 0) : 0;

    return (
        <div className="p-6 text-white space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck size={20} className="text-emerald-400" /> Audit log &amp; alerts</h1>
                    <p className="text-sm text-gray-500 mt-1">Every privileged admin action, money request, payout, on-chain signing event, compliance check and provider callback.</p>
                </div>
                <button onClick={load} className="flex items-center gap-2 text-xs font-bold text-gray-300 border border-[#1e2533] rounded-lg px-3 py-2 hover:bg-white/5">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => switchTab(t.key)}
                        className={`text-xs font-bold px-3 py-2 rounded-lg border ${tab === t.key ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'border-[#1e2533] text-gray-400 hover:bg-white/5'}`}>
                        {t.label}
                        {t.key === 'attention' && stuck && attentionTotal > 0 && <span className="ml-2 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">{attentionTotal}</span>}
                    </button>
                ))}
            </div>

            {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</div>}

            {tab === 'attention' ? (
                <div className="space-y-6">
                    {stuck && attentionTotal === 0 && !loading && (
                        <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">Nothing needs attention right now.</div>
                    )}
                    {stuck && ATTENTION_SECTIONS.map(s => {
                        const items = stuck[s.key] || [];
                        if (!items.length) return null;
                        return (
                            <section key={s.key} className="bg-[#0b0f17] border border-[#1e2533] rounded-xl p-4">
                                <h2 className="text-sm font-bold flex items-center gap-2 text-amber-300"><AlertTriangle size={14} /> {s.title} <span className="text-gray-500 font-normal">({items.length})</span></h2>
                                <p className="text-xs text-gray-500 mt-1 mb-3">{s.help}</p>
                                <EventTable events={items} />
                            </section>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-[#0b0f17] border border-[#1e2533] rounded-xl p-4 space-y-4">
                    <form onSubmit={e => { e.preventDefault(); setSkip(0); setQuery(q); }} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search id, user, action, status, asset…"
                                className="w-full bg-black/30 border border-[#1e2533] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50" />
                        </div>
                        <button className="text-xs font-bold px-4 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Search</button>
                    </form>
                    <EventTable events={events} />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{total ? `${skip + 1}–${Math.min(skip + limit, total)} of ${total}` : '0 results'}</span>
                        <div className="flex gap-2">
                            <button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - limit))} className="p-2 border border-[#1e2533] rounded-lg disabled:opacity-30 hover:bg-white/5"><ChevronLeft size={14} /></button>
                            <button disabled={skip + limit >= total} onClick={() => setSkip(skip + limit)} className="p-2 border border-[#1e2533] rounded-lg disabled:opacity-30 hover:bg-white/5"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogPage;
