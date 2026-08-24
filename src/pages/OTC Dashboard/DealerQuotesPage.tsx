import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, RefreshCw, Search, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDealerRfqs } from '../../api/client';

const filters = ['all', 'pending', 'quoted', 'executed'] as const;
type Filter = typeof filters[number];

function StatusBadge({ status }: { status: string }) {
    const normalized = status.toLowerCase();
    const styles = normalized === 'executed'
        ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400'
        : normalized === 'quoted'
            ? 'border-blue-400/20 bg-blue-400/10 text-blue-400'
            : normalized === 'failed' || normalized === 'blocked'
                ? 'border-red-400/20 bg-red-400/10 text-red-400'
                : 'border-amber-400/20 bg-amber-400/10 text-amber-400';
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles}`}>
        {normalized === 'executed' ? <CheckCircle2 className="h-3 w-3" /> : normalized === 'failed' || normalized === 'blocked' ? <XCircle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
        {status}
    </span>;
}

export default function DealerQuotesPage() {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState<any[]>([]);
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchQuotes = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await getDealerRfqs();
            setQuotes((response.data.rfqs || []).filter((rfq: any) => rfq.quote && typeof rfq.quote === 'object'));
        } catch (err) {
            console.error('Failed to load dealer quotes', err);
            setError('Unable to load dealer quotes.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
        const interval = window.setInterval(fetchQuotes, 10000);
        return () => window.clearInterval(interval);
    }, []);

    const visibleQuotes = quotes.filter(quote => {
        const status = String(quote.status || '').toLowerCase();
        const matchesFilter = filter === 'all'
            || (filter === 'pending' && status === 'quoted')
            || status === filter;
        const query = search.trim().toLowerCase();
        const searchable = [quote.id, quote.customerName, quote.fromAsset, quote.toAsset, quote.quote?.quoteId].join(' ').toLowerCase();
        return matchesFilter && (!query || searchable.includes(query));
    });

    return (
        <div className="min-h-full animate-in fade-in duration-300">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Dealer Quotes</h1>
                        <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Execution view</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Review quotes created by the dealing desk and track their execution status.</p>
                </div>
                <button type="button" onClick={fetchQuotes} disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-md border border-[#2b3948] bg-[#111827] px-3.5 py-2.5 text-xs font-semibold text-gray-300 transition-colors hover:border-emerald-400/40 hover:text-white disabled:opacity-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh quotes
                </button>
            </div>

            <section className="overflow-hidden rounded-xl border border-[#263545] bg-[#111820] shadow-xl">
                <div className="flex flex-col gap-3 border-b border-[#263545] bg-[#0d141c] p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        Created quotes <span className="text-xs font-normal text-gray-500">{quotes.length}</span>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Filter quotes" className="w-full rounded-md border border-[#2b3948] bg-[#080d13] py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-emerald-400 sm:w-56" />
                        </div>
                        <div className="flex items-center gap-1 rounded-md border border-[#263545] bg-[#080d13] p-1">
                            {filters.map(option => <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${filter === option ? 'bg-[#213247] text-white' : 'text-gray-500 hover:text-gray-300'}`}>{option}</button>)}
                        </div>
                    </div>
                </div>

                {error && <p className="border-b border-red-400/20 bg-red-400/5 px-4 py-3 text-xs text-red-400">{error}</p>}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left">
                        <thead className="bg-[#080d13] text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            <tr><th className="px-5 py-3">Quote</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Trade</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Quote rate</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3" /></tr>
                        </thead>
                        <tbody className="divide-y divide-[#263545]/70 text-sm">
                            {isLoading ? <tr><td colSpan={8} className="py-16 text-center"><RefreshCw className="mx-auto h-5 w-5 animate-spin text-emerald-400" /></td></tr>
                                : visibleQuotes.length ? visibleQuotes.map(quote => <tr key={quote.id} className="transition-colors hover:bg-[#172332]/50">
                                    <td className="px-5 py-4 font-mono text-xs text-gray-300">{quote.quote?.quoteId || quote.id}</td>
                                    <td className="px-5 py-4"><div className="font-semibold text-white">{quote.customerName || 'Unknown customer'}</div><div className="text-[11px] text-gray-500">{quote.channel || 'DEALER'}</div></td>
                                    <td className="px-5 py-4 font-semibold text-gray-200">{quote.fromAsset} <ArrowRight className="mx-1 inline h-3 w-3 text-gray-500" /> {quote.toAsset}</td>
                                    <td className="px-5 py-4 font-mono text-gray-300">{Number(quote.amount || 0).toLocaleString()} <span className="text-[10px] text-gray-500">{quote.fromAsset}</span></td>
                                    <td className="px-5 py-4 font-mono text-gray-300">{quote.quote?.executionRate ?? quote.quote?.rate ?? 'N/A'}</td>
                                    <td className="px-5 py-4"><StatusBadge status={quote.status || 'pending'} /></td>
                                    <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">{quote.createdAt ? new Date(quote.createdAt).toLocaleString() : 'N/A'}</td>
                                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => navigate(`/admin/dealer-workspace?rfqId=${encodeURIComponent(quote.id)}`)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300">Open <ArrowRight className="h-3.5 w-3.5" /></button></td>
                                </tr>)
                                : <tr><td colSpan={8} className="py-16 text-center text-xs text-gray-500">No created quotes match this filter.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
