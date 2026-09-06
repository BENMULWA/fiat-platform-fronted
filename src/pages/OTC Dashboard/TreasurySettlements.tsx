//@ts-nocheck

import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react';
import { actOnDealerSettlement, getDealerSettlements } from '../../api/client';

export const TreasurySettlementsPage = () => {
    const [settlements, setSettlements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionError, setActionError] = useState('');
    const [actionId, setActionId] = useState('');
    const [filter, setFilter] = useState('all');
    const [expanded, setExpanded] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentProvider, setPaymentProvider] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [txHash, setTxHash] = useState('');

    const fetchSettlements = async () => {
        try {
            const response = await getDealerSettlements();
            setSettlements(response.data.settlements || []);
            setActionError('');
        } catch {
            setActionError('Unable to load settlement queue.');
        } finally {
            setIsLoading(false);
        }
    };

    const runSettlementAction = async (settlementId: string, action: string) => {
        setActionId(`${settlementId}:${action}`);
        setActionError('');
        try {
            await actOnDealerSettlement(settlementId, action, {
                payment_provider: paymentProvider || undefined,
                payment_reference: paymentReference || undefined,
                payment_amount: paymentAmount ? Number(paymentAmount) : undefined,
                tx_hash: txHash || undefined,
            });
            await fetchSettlements();
        } catch (err: any) {
            setActionError(err?.response?.data?.detail || 'Settlement action could not be completed.');
        } finally {
            setActionId('');
        }
    };

    const visibleSettlements = settlements.filter(settlement => {
        const status = String(settlement.status || 'pending').toLowerCase();
        if (filter === 'pending') return !['completed', 'reconciled', 'failed', 'reservation_released'].includes(status);
        if (filter === 'reconciled') return ['reconciled', 'completed'].includes(status);
        return filter === 'all' || status === filter;
    });

    useEffect(() => {
        fetchSettlements();
        const timer = window.setInterval(fetchSettlements, 10000);
        return () => window.clearInterval(timer);
    }, []);

    const actionsFor = (status: string): [string, string, string][] => {
        if (status === 'pending' || status === 'executed') return [['Review', 'review', 'border-sky-400/30 text-sky-300'], ['Fail settlement', 'fail_settlement', 'border-red-400/30 text-red-300']];
        if (status === 'treasury_review') return [['Confirm customer funds', 'confirm_customer_funds', 'border-emerald-400/30 text-emerald-300'], ['Release reservation', 'release_reservation', 'border-amber-400/30 text-amber-300'], ['Fail settlement', 'fail_settlement', 'border-red-400/30 text-red-300']];
        if (status === 'funds_confirmed') return [['Approve crypto transfer', 'approve_crypto_transfer', 'border-emerald-400/30 text-emerald-300'], ['Fail settlement', 'fail_settlement', 'border-red-400/30 text-red-300']];
        if (status === 'transfer_approved') return [['Submit transfer', 'submit_transfer', 'border-blue-400/30 text-blue-300'], ['Fail settlement', 'fail_settlement', 'border-red-400/30 text-red-300']];
        if (status === 'transfer_pending') return [['Confirm fiat receipt', 'confirm_fiat_receipt', 'border-emerald-400/30 text-emerald-300'], ['Fail settlement', 'fail_settlement', 'border-red-400/30 text-red-300']];
        if (status === 'fiat_confirmed' || status === 'crypto_confirmed') return [['Mark reconciled', 'mark_reconciled', 'border-emerald-400/30 text-emerald-300']];
        return [];
    };

    return <div className="max-w-[1600px] mx-auto p-3 sm:p-5 lg:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-xl font-semibold text-white">Treasury Settlements</h1><p className="mt-1 text-xs text-gray-500">Review, authorize and reconcile institutional settlement obligations.</p></div><button type="button" onClick={fetchSettlements} disabled={isLoading} className="inline-flex items-center gap-2 self-start rounded border border-[#1E2D3D] px-3 py-2 text-xs text-gray-300 hover:text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh</button></div>
        <section className="overflow-hidden rounded-md border border-[#182536] bg-[#0F1520] shadow-lg">
            <div className="flex items-center justify-between border-b border-[#182536] bg-[#111827]/60 px-5 py-4"><div><h2 className="text-sm font-bold text-white">Settlement Queue</h2><p className="mt-1 text-[11px] text-gray-500">Treasury-controlled workflow and audit actions.</p></div><span className="text-[10px] uppercase tracking-widest text-gray-500">{settlements.length} settlements</span></div>
            {actionError && <div className="border-b border-amber-500/30 bg-amber-500/10 px-5 py-3 text-xs text-amber-300">{actionError}</div>}
            <div className="flex flex-wrap gap-2 border-b border-[#182536] px-5 py-3">
                {['all', 'pending', 'failed', 'reconciled'].map(option => <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${filter === option ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-[#26364B] text-gray-500 hover:text-gray-300'}`}>{option}</button>)}
            </div>
            <div className="divide-y divide-[#182536]">
                {isLoading ? <div className="px-5 py-16 text-center"><RefreshCw className="mx-auto h-5 w-5 animate-spin text-emerald-400" /></div> : visibleSettlements.length ? visibleSettlements.map(settlement => {
                    const status = String(settlement.status || 'pending').toLowerCase();
                    const isExpanded = expanded === settlement.id;
                    return <div key={settlement.id} className="px-5 py-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><button type="button" onClick={() => setExpanded(isExpanded ? '' : settlement.id)} className="flex items-start gap-3 text-left"><span className="mt-0.5 text-gray-500">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span><span><p className="font-mono text-xs font-bold text-white">{settlement.id}</p><p className="mt-1 text-[11px] text-gray-500">RFQ {settlement.rfqId} · {settlement.legs?.crypto?.amount || 0} {settlement.legs?.crypto?.asset || 'asset'} → {settlement.legs?.fiat?.amount || 0} {settlement.legs?.fiat?.asset || 'fiat'}</p></span></button><div className="flex flex-wrap items-center gap-2"><span className="rounded border border-[#26364B] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-300">{status.replaceAll('_', ' ')}</span>{actionsFor(status).map(([label, action, style]) => <button key={action} type="button" disabled={!!actionId} onClick={() => runSettlementAction(settlement.id, action)} className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-[10px] font-bold transition-colors hover:bg-white/5 disabled:opacity-50 ${style}`}>{action === 'fail_settlement' ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}{actionId === `${settlement.id}:${action}` ? 'Working...' : label}</button>)}</div></div>{isExpanded && <div className="mt-4 grid gap-4 border-t border-[#182536] pt-4 text-xs text-gray-300 lg:grid-cols-3"><div><p className="mb-2 font-bold uppercase tracking-wider text-gray-500">Customer</p><p>{settlement.customer?.name || 'Unknown'}</p><p className="text-gray-500">{settlement.customer?.email || settlement.customer?.id || 'No customer ID'}</p></div><div><p className="mb-2 font-bold uppercase tracking-wider text-gray-500">Wallet and blockchain</p><p className="break-all">{settlement.destinationWallet || 'Wallet not provided'}</p><p className="mt-1 text-gray-500">{settlement.blockchain?.network || 'Network unavailable'} · {settlement.blockchain?.status || 'not submitted'}</p><p className="break-all text-gray-500">TX: {settlement.blockchain?.txHash || 'Not submitted'}</p></div><div><p className="mb-2 font-bold uppercase tracking-wider text-gray-500">Provider confirmation</p><p>{settlement.providerStatus || 'Awaiting provider status'}</p><p className="text-gray-500">Payment: {settlement.paymentEvidence?.status || 'pending'} {settlement.paymentEvidence?.reference ? `· ${settlement.paymentEvidence.reference}` : ''}</p></div><div className="lg:col-span-3"><p className="mb-2 font-bold uppercase tracking-wider text-gray-500">Settlement Confirmations</p><div className="grid gap-2 sm:grid-cols-4"><input value={paymentProvider} onChange={event => setPaymentProvider(event.target.value)} placeholder="Payment provider" className="rounded border border-[#26364B] bg-[#080d13] px-2 py-2 text-xs text-white" /><input value={paymentReference} onChange={event => setPaymentReference(event.target.value)} placeholder="Payment reference" className="rounded border border-[#26364B] bg-[#080d13] px-2 py-2 text-xs text-white" /><input value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} placeholder="Payment amount" type="number" className="rounded border border-[#26364B] bg-[#080d13] px-2 py-2 text-xs text-white" /><input value={txHash} onChange={event => setTxHash(event.target.value)} placeholder="Blockchain TX hash" className="rounded border border-[#26364B] bg-[#080d13] px-2 py-2 text-xs text-white" /></div></div><div className="lg:col-span-3"><p className="mb-2 font-bold uppercase tracking-wider text-gray-500">Action history</p>{settlement.audit?.length ? <div className="space-y-1">{settlement.audit.map((entry: any, index: number) => <p key={`${entry.action}-${index}`}><span className="text-emerald-300">{String(entry.action).replaceAll('_', ' ')}</span> · {entry.fromStatus} → {entry.toStatus} · {entry.performedBy || 'unknown'} · {entry.performedAt ? new Date(entry.performedAt).toLocaleString() : ''}</p>)}</div> : <p className="text-gray-500">No actions recorded.</p>}</div></div>}</div>;
                }) : <p className="px-5 py-16 text-center text-xs text-gray-500">No settlements match this filter.</p>}
            </div>
        </section>
    </div>;
};
