// dealer Rfqs conversation request called. The merchant sees the request, the dealer's quote and a chat with the dealer on this page. 
// It is reached through the route parameter rfqId. 

import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, RefreshCw, CheckCircle2, Copy, Landmark } from 'lucide-react';
import { getOtcRfq, getOtcRfqMessages, postOtcRfqMessage, acceptOtcRfq } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import useWebsocket from '../../hooks/useWebsocket';
import useRequireOnboarding from '../../hooks/useRequireOnboarding';

export default function OtcRfqDetail() {
    const { rfqId } = useParams<{ rfqId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const requireOnboarding = useRequireOnboarding();
    const [rfq, setRfq] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState('');
    const [chatError, setChatError] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const load = () => {
        if (!rfqId) return;
        Promise.all([getOtcRfq(rfqId), getOtcRfqMessages(rfqId)])
            .then(([rRes, mRes]) => { setRfq(rRes.data.rfq); setMessages(mRes.data.messages || []); })
            .catch(() => setError('Unable to load this request.'));
    };

    useEffect(() => { load(); }, [rfqId]);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

    // Live delivery over the same WS channel already used elsewhere in the
    // app (see broadcast_manager.send_user in routes/otc_merchant.py::
    // post_rfq_message) -- falls back to the poll on `load()` above/refresh
    // if a message arrives while this filter misses it for any reason.
    useWebsocket('/ws/dashboard', user?.id || null, (msg: any) => {
        if (msg?.type === 'rfq_message' && msg.rfqId === rfqId) {
            setMessages(prev => [...prev, msg.message]);
        }
    });

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !rfqId) return;
        setSending(true);
        setChatError('');
        try {
            const res = await postOtcRfqMessage(rfqId, text.trim());
            setMessages(prev => [...prev, res.data.message]);
            setText('');
        } catch (err: any) {
            // Previously vanished silently -- looked identical to the
            // message just not sending at all.
            setChatError(err?.response?.data?.detail || 'Could not send. Try again.');
        } finally { setSending(false); }
    };

    const accept = async () => {
        if (!rfqId) return;
        if (!requireOnboarding('accept a quote')) return;
        setAccepting(true);
        setError('');
        try {
            const res = await acceptOtcRfq(rfqId);
            if (res.data?.status === 'pending_compliance_review') {
                setError('Held for compliance review. Your dealer has been notified.');
            }
            load();
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Could not accept.');
        } finally {
            setAccepting(false);
        }
    };

    if (!rfq) {
        return <div className="p-10 text-center"><RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto" /></div>;
    }

    const quote = rfq.quote || {};
    const canAccept = rfq.status === 'quoted' && quote.sent;

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => navigate('/otc/overview')} className={`text-xs flex items-center gap-1 ${isLight ? 'text-slate-500 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300'}`}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
                </button>
                <span className={`font-mono text-xs ${isLight ? 'text-slate-400' : 'text-gray-400'}`}>{rfq.id}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 space-y-4">
                    <div className={`rounded-md p-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
                        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Request</p>
                        <p className={`text-lg font-semibold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{Number(rfq.amount).toLocaleString()} {rfq.fromAsset} <span className="text-gray-500">&rarr;</span> {rfq.toAsset}</p>
                        <p className={`text-[10px] mt-1 uppercase ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{String(rfq.status).replace(/_/g, ' ')}</p>
                    </div>

                    {rfq.status === 'blocked' && (() => {
                        // Only the customer/compliance groups -- treasury
                        // inventory and risk-exposure numbers are desk-
                        // internal and shouldn't be shown to a merchant.
                        const failed = [...(rfq.analysis?.customer || []), ...(rfq.analysis?.compliance || [])].filter((c: any) => !c.passed);
                        return (
                            <div className={`rounded-md p-4 border-2 ${isLight ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/30'}`}>
                                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${isLight ? 'text-red-700' : 'text-red-400'}`}>This request didn't clear pre-trade checks</p>
                                {failed.length > 0 ? (
                                    <ul className="space-y-1 text-xs">
                                        {failed.map((c: any) => (
                                            <li key={c.key} className={isLight ? 'text-red-800' : 'text-red-200'}>
                                                <span className="font-semibold">{c.label}:</span> {c.value}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className={`text-xs ${isLight ? 'text-red-800' : 'text-red-200'}`}>Held by an internal desk check -- message your dealer below for details.</p>
                                )}
                                <p className={`text-xs mt-3 ${isLight ? 'text-red-700' : 'text-red-300'}`}>Message the desk below, or start a new conversion once resolved.</p>
                            </div>
                        );
                    })()}

                    {quote.sent && (
                        <div className={`rounded-md p-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
                            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Quote</p>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between"><span className="text-gray-500">Base rate</span><span className={`font-mono ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>{quote.market_rate ?? 'N/A'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Desk margin</span><span className={`font-mono ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>{quote.spread_bps != null ? `${quote.spread_bps} bps` : 'N/A'}</span></div>
                                <div className={`flex justify-between pt-1.5 mt-1 border-t ${isLight ? 'border-slate-100' : 'border-[#1E2D3D]'}`}><span className="text-gray-500 font-semibold">Execution rate</span><span className={`font-mono font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{quote.execution_rate ?? 'N/A'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">You receive</span><span className="text-emerald-500 font-mono">{quote.receive_amount ? Number(quote.receive_amount).toLocaleString() : 'N/A'} {rfq.toAsset}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Quote expires</span><span className="text-amber-500 font-mono">{quote.expiresAt ? new Date(quote.expiresAt).toLocaleTimeString() : 'N/A'}</span></div>
                            </div>
                            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
                            {canAccept && (
                                <button onClick={accept} disabled={accepting} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> {accepting ? 'Accepting...' : 'Accept quote'}
                                </button>
                            )}
                            {rfq.status === 'accepted' && <p className="text-xs text-cyan-500 mt-3">Accepted -- your dealer is preparing settlement instructions.</p>}
                        </div>
                    )}

                    {rfq.status === 'executed' && rfq.paymentInstructions && (
                        <div className={`rounded-md p-4 border-2 ${isLight ? 'bg-amber-50 border-amber-300' : 'bg-amber-500/10 border-amber-500/30'}`}>
                            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                                <Landmark className="w-3.5 h-3.5" /> Send payment to complete this settlement
                            </p>
                            <p className={`text-xs mb-3 ${isLight ? 'text-amber-800' : 'text-amber-200'}`}>
                                Your quote is locked in. Send exactly <span className="font-mono font-bold">{Number(rfq.paymentInstructions.amount).toLocaleString()} {rfq.paymentInstructions.asset}</span> using the details below -- your dealer will confirm receipt and release your {rfq.toAsset}.
                            </p>
                            {rfq.paymentInstructions.kind === 'crypto' ? (
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className={isLight ? 'text-amber-700' : 'text-amber-400'}>Network</span>
                                        <span className={`font-mono uppercase ${isLight ? 'text-amber-900' : 'text-white'}`}>{rfq.paymentInstructions.network}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <span className={isLight ? 'text-amber-700' : 'text-amber-400'}>Address</span>
                                        <button onClick={() => navigator.clipboard?.writeText(rfq.paymentInstructions.address)} className={`font-mono flex items-center gap-1 hover:underline ${isLight ? 'text-amber-900' : 'text-white'}`}>
                                            {rfq.paymentInstructions.address} <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                    {rfq.paymentInstructions.memo && (
                                        <div className="flex justify-between items-center gap-2">
                                            <span className={isLight ? 'text-amber-700' : 'text-amber-400'}>Memo (required)</span>
                                            <button onClick={() => navigator.clipboard?.writeText(rfq.paymentInstructions.memo)} className={`font-mono flex items-center gap-1 hover:underline ${isLight ? 'text-amber-900' : 'text-white'}`}>
                                                {rfq.paymentInstructions.memo} <Copy className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className={`text-xs ${isLight ? 'text-amber-800' : 'text-amber-200'}`}>
                                    Reference <span className="font-mono font-bold">{rfq.paymentInstructions.reference}</span> -- {rfq.paymentInstructions.note}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className={`lg:col-span-5 rounded-md flex flex-col h-[420px] border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
                    <div className={`px-4 py-2.5 border-b text-[11px] font-semibold uppercase tracking-wide ${isLight ? 'border-slate-200 text-slate-600' : 'border-[#1E2D3D] text-gray-300'}`}>Chat with your dealer</div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {messages.length === 0 && <p className={`text-xs text-center mt-8 ${isLight ? 'text-slate-400' : 'text-gray-600'}`}>No messages yet. Ask about rate, timing, or settlement details.</p>}
                        {messages.map((m: any) => (
                            <div key={m.id} className={`max-w-[85%] rounded px-3 py-2 text-xs ${m.fromRole === 'merchant' ? 'ml-auto bg-emerald-600/20 text-emerald-900 dark:text-emerald-100' : isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#1E2D3D] text-gray-200'}`}>
                                {m.text}
                                <div className="text-[9px] text-gray-500 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                    {chatError && <p className="text-[10.5px] text-red-400 px-2.5 pb-1">{chatError}</p>}
                    <form onSubmit={send} className={`p-2.5 border-t flex gap-2 ${isLight ? 'border-slate-200' : 'border-[#1E2D3D]'}`}>
                        <input value={text} onChange={e => setText(e.target.value)} placeholder="Message..." className={`flex-1 rounded px-3 py-2 text-xs outline-none focus:border-emerald-500 border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0A0D14] border-[#1E2D3D] text-white'}`} />
                        <button type="submit" disabled={sending || !text.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 rounded">
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
