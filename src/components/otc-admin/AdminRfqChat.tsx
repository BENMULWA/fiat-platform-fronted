import { useEffect, useRef, useState } from 'react';
import { Send, RefreshCw } from 'lucide-react';
import { getOtcRfqMessages, postOtcRfqMessage } from '../../api/client';

// Admin side of the same thread routes/otc_merchant.py's chat endpoints
// already power on the merchant's RfqDetail.tsx -- _assert_rfq_participant
// already allows any admin, this was purely a missing frontend. No
// dedicated websocket push here: AppLayout connects admins with
// userId=null (see its own useWebsocket call), so a targeted
// broadcast_manager.send_user(adminId, ...) can't reach anyone yet -- polls
// instead, same as the rest of this workspace already does for the queue.
export default function AdminRfqChat({ rfqId }: { rfqId: string }) {
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const load = () => {
            getOtcRfqMessages(rfqId)
                .then(res => { if (!cancelled) setMessages(res.data.messages || []); })
                .catch(() => {})
                .finally(() => { if (!cancelled) setLoading(false); });
        };
        load();
        const poll = setInterval(load, 4000);
        return () => { cancelled = true; clearInterval(poll); };
    }, [rfqId]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        setSending(true);
        setError('');
        try {
            const res = await postOtcRfqMessage(rfqId, text.trim());
            setMessages(prev => [...prev, res.data.message]);
            setText('');
        } catch (err: any) {
            // A failure here previously vanished silently -- looked
            // identical to "nothing happened" instead of a visible error.
            setError(err?.response?.data?.detail || 'Could not send. Try again.');
        } finally { setSending(false); }
    };

    return (
        <div>
            <h3 className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-2">Messages</h3>
            <div className="bg-[#0A0D14] border border-[#1E2D3D] rounded-md flex flex-col h-64">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-gray-600 mx-auto mt-6" />
                    ) : messages.length === 0 ? (
                        <p className="text-xs text-gray-600 text-center mt-6">No messages on this RFQ yet.</p>
                    ) : messages.map((m: any) => (
                        <div key={m.id} className={`max-w-[85%] rounded px-3 py-2 text-xs ${m.fromRole === 'dealer' ? 'ml-auto bg-blue-600/20 text-blue-100' : 'bg-[#1E2D3D] text-gray-200'}`}>
                            {m.text}
                            <div className="text-[9px] text-gray-500 mt-1">{m.fromRole === 'dealer' ? 'You' : 'Merchant'} &middot; {new Date(m.createdAt).toLocaleTimeString()}</div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
                {error && <p className="text-[10.5px] text-red-400 px-2 pb-1">{error}</p>}
                <form onSubmit={send} className="p-2 border-t border-[#1E2D3D] flex gap-2 shrink-0">
                    <input
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Reply to merchant..."
                        className="flex-1 bg-[#070B14] border border-[#232D39] rounded px-3 py-2 text-xs text-gray-200 outline-none focus:border-blue-500"
                    />
                    <button type="submit" disabled={sending || !text.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 rounded shrink-0">
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
