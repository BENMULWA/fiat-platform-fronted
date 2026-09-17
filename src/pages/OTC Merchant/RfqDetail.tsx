import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getOtcRfq, getOtcRfqMessages, postOtcRfqMessage, acceptOtcRfq } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import useWebsocket from '../../hooks/useWebsocket';

export default function OtcRfqDetail() {
    const { rfqId } = useParams<{ rfqId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [rfq, setRfq] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState('');
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
        try {
            const res = await postOtcRfqMessage(rfqId, text.trim());
            setMessages(prev => [...prev, res.data.message]);
            setText('');
        } catch { /* best-effort */ } finally { setSending(false); }
    };

    const accept = async () => {
        if (!rfqId) return;
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
        return <div className="min-h-screen bg-[#070B14] flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /></div>;
    }

    const quote = rfq.quote || {};
    const canAccept = rfq.status === 'quoted' && quote.sent;

    return (
        <div className="min-h-screen bg-[#070B14] text-gray-200 flex flex-col">
            <header className="px-4 sm:px-6 py-3 border-b border-[#1E2D3D] bg-[#0A0D14] flex items-center justify-between">
                <button onClick={() => navigate('/otc/overview')} className="text-gray-500 hover:text-gray-300 text-xs flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Overview
                </button>
                <span className="font-mono text-xs text-gray-400">{rfq.id}</span>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-5xl mx-auto w-full p-4 sm:p-6 gap-5">
                <div className="lg:col-span-7 space-y-4">
                    <div className="bg-[#0F1520] border border-[#1E2D3D] rounded-md p-4">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Request</p>
                        <p className="text-lg font-semibold text-white font-mono">{Number(rfq.amount).toLocaleString()} {rfq.fromAsset} <span className="text-gray-600">&rarr;</span> {rfq.toAsset}</p>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase">{String(rfq.status).replace(/_/g, ' ')}</p>
                    </div>

                    {quote.sent && (
                        <div className="bg-[#0F1520] border border-[#1E2D3D] rounded-md p-4">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Quote</p>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between"><span className="text-gray-500">Execution rate</span><span className="text-white font-mono">{quote.execution_rate ?? 'N/A'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">You receive</span><span className="text-emerald-400 font-mono">{quote.receive_amount ? Number(quote.receive_amount).toLocaleString() : 'N/A'} {rfq.toAsset}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Quote expires</span><span className="text-amber-400 font-mono">{quote.expiresAt ? new Date(quote.expiresAt).toLocaleTimeString() : 'N/A'}</span></div>
                            </div>
                            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
                            {canAccept && (
                                <button onClick={accept} disabled={accepting} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded text-sm flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> {accepting ? 'Accepting...' : 'Accept quote'}
                                </button>
                            )}
                            {rfq.status === 'accepted' && <p className="text-xs text-cyan-400 mt-3">Accepted -- your dealer is preparing settlement.</p>}
                            {rfq.status === 'executed' && <p className="text-xs text-blue-400 mt-3">In treasury review -- you'll be notified as it progresses.</p>}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-5 bg-[#0F1520] border border-[#1E2D3D] rounded-md flex flex-col h-[420px]">
                    <div className="px-4 py-2.5 border-b border-[#1E2D3D] text-[11px] font-semibold text-gray-300 uppercase tracking-wide">Chat with your dealer</div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {messages.length === 0 && <p className="text-xs text-gray-600 text-center mt-8">No messages yet. Ask about rate, timing, or settlement details.</p>}
                        {messages.map((m: any) => (
                            <div key={m.id} className={`max-w-[85%] rounded px-3 py-2 text-xs ${m.fromRole === 'merchant' ? 'ml-auto bg-emerald-600/20 text-emerald-100' : 'bg-[#1E2D3D] text-gray-200'}`}>
                                {m.text}
                                <div className="text-[9px] text-gray-500 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                    <form onSubmit={send} className="p-2.5 border-t border-[#1E2D3D] flex gap-2">
                        <input value={text} onChange={e => setText(e.target.value)} placeholder="Message..." className="flex-1 bg-[#0A0D14] border border-[#1E2D3D] rounded px-3 py-2 text-xs text-white outline-none focus:border-emerald-500" />
                        <button type="submit" disabled={sending || !text.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 rounded">
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
