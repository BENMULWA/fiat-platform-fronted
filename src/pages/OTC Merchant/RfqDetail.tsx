import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, RefreshCw, CheckCircle2, Copy, Landmark,
  Clock3, MessageCircle, X, AlertCircle,
} from 'lucide-react';
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
  const [chatOpen, setChatOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!rfqId) return;
    Promise.all([getOtcRfq(rfqId), getOtcRfqMessages(rfqId)])
      .then(([rRes, mRes]) => { setRfq(rRes.data.rfq); setMessages(mRes.data.messages || []); })
      .catch(() => setError('Unable to load this request.'));
  };

  useEffect(() => { load(); }, [rfqId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

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
  const countdown = quote.expiresAt ? Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - now) / 1000)) : null;
  const countdownDisplay = countdown != null ? `${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')}` : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate('/otc/overview')} className={`text-xs flex items-center gap-1 ${isLight ? 'text-slate-500 hover:text-slate-700' : 'text-gray-500 hover:text-gray-300'}`}>
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </button>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs ${isLight ? 'text-slate-400' : 'text-gray-400'}`}>{rfq.id}</span>
          <button
            onClick={() => setChatOpen(true)}
            className={`lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#1E2D3D] text-gray-300'}`}
          >
            <MessageCircle className="w-3.5 h-3.5" /> Chat
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Quote + Payment */}
        <div className="lg:col-span-7 space-y-4">
          {/* Request Summary */}
          <div className={`rounded-xl border p-5 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Request</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                rfq.status === 'quoted' ? 'bg-emerald-500/10 text-emerald-500' :
                rfq.status === 'accepted' ? 'bg-blue-500/10 text-blue-400' :
                rfq.status === 'executed' ? 'bg-amber-500/10 text-amber-400' :
                rfq.status === 'blocked' ? 'bg-red-500/10 text-red-400' :
                isLight ? 'bg-slate-100 text-slate-500' : 'bg-[#1E2D3D] text-gray-500'
              }`}>{String(rfq.status).replace(/_/g, ' ')}</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {Number(rfq.amount).toLocaleString()} {rfq.fromAsset}
              <span className="text-gray-500 mx-2">→</span>
              {rfq.toAsset}
            </p>
          </div>

          {/* Blocked State */}
          {rfq.status === 'blocked' && (() => {
            const failed = [...(rfq.analysis?.customer || []), ...(rfq.analysis?.compliance || [])].filter((c: any) => !c.passed);
            return (
              <div className={`rounded-xl border-2 p-5 ${isLight ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <p className={`text-xs font-semibold uppercase tracking-widest ${isLight ? 'text-red-700' : 'text-red-400'}`}>Pre-trade check failed</p>
                </div>
                {failed.length > 0 ? (
                  <ul className="space-y-1 text-xs">
                    {failed.map((c: any) => (
                      <li key={c.key} className={isLight ? 'text-red-800' : 'text-red-200'}>
                        <span className="font-semibold">{c.label}:</span> {c.value}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`text-xs ${isLight ? 'text-red-800' : 'text-red-200'}`}>Held by an internal desk check -- message your dealer for details.</p>
                )}
              </div>
            );
          })()}

          {/* Quote Card */}
          {quote.sent && (
            <div className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
              <div className={`px-5 py-3 border-b flex items-center justify-between ${isLight ? 'border-slate-100 bg-slate-50' : 'border-[#1E2D3D] bg-[#0A0D14]'}`}>
                <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>Quote</span>
                {countdownDisplay && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-full">
                    <Clock3 className="w-3.5 h-3.5" /> {countdownDisplay}
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Base Rate</p>
                    <p className={`text-sm font-mono font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{quote.market_rate ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Desk Margin</p>
                    <p className={`text-sm font-mono font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{quote.spread_bps != null ? `${quote.spread_bps} bps` : 'N/A'}</p>
                  </div>
                </div>
                <div className={`rounded-lg p-4 mb-4 ${isLight ? 'bg-emerald-50 border border-emerald-200' : 'bg-emerald-500/5 border border-emerald-500/20'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Execution Rate</p>
                  <p className={`text-xl font-bold font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{quote.execution_rate ?? 'N/A'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>You Receive</p>
                    <p className={`text-lg font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {quote.receive_amount ? Number(quote.receive_amount).toLocaleString() : 'N/A'} {rfq.toAsset}
                    </p>
                  </div>
                  {quote.quotedBy && (
                    <div className="text-right">
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Quoted By</p>
                      <p className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{quote.quotedBy}</p>
                    </div>
                  )}
                </div>
                {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
                {canAccept && (
                  <button onClick={accept} disabled={accepting} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                    <CheckCircle2 className="w-4 h-4" /> {accepting ? 'Accepting...' : 'Accept Quote'}
                  </button>
                )}
                {rfq.status === 'accepted' && (
                  <div className={`mt-4 rounded-lg p-3 ${isLight ? 'bg-blue-50 border border-blue-200' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                    <p className="text-xs text-blue-400 font-semibold">Accepted -- your dealer is preparing settlement instructions.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Instructions */}
          {rfq.status === 'executed' && rfq.paymentInstructions && (
            <div className={`rounded-xl border-2 overflow-hidden ${isLight ? 'bg-amber-50 border-amber-300' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <div className={`px-5 py-3 border-b flex items-center gap-2 ${isLight ? 'border-amber-200 bg-amber-100/50' : 'border-amber-500/20 bg-amber-500/5'}`}>
                <Landmark className="w-4 h-4 text-amber-500" />
                <p className={`text-xs font-semibold uppercase tracking-widest ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Send payment to complete settlement</p>
              </div>
              <div className="p-5">
                <p className={`text-xs mb-4 ${isLight ? 'text-amber-800' : 'text-amber-200'}`}>
                  Your quote is locked in. Send exactly <span className="font-mono font-bold">{Number(rfq.paymentInstructions.amount).toLocaleString()} {rfq.paymentInstructions.asset}</span> using the details below.
                </p>
                {rfq.paymentInstructions.kind === 'crypto' ? (
                  <div className="space-y-3">
                    <div className={`rounded-lg p-3 ${isLight ? 'bg-white/80 border border-amber-200' : 'bg-[#0A0D14]/60 border-amber-500/20'}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>Network</p>
                      <p className={`font-mono uppercase text-sm font-bold ${isLight ? 'text-amber-900' : 'text-white'}`}>{rfq.paymentInstructions.network}</p>
                    </div>
                    <div className={`rounded-lg p-3 ${isLight ? 'bg-white/80 border border-amber-200' : 'bg-[#0A0D14]/60 border-amber-500/20'}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>Address</p>
                      <button onClick={() => copyToClipboard(rfq.paymentInstructions.address)} className={`font-mono text-sm flex items-center gap-2 hover:underline ${isLight ? 'text-amber-900' : 'text-white'}`}>
                        {rfq.paymentInstructions.address} <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {rfq.paymentInstructions.memo && (
                      <div className={`rounded-lg p-3 ${isLight ? 'bg-white/80 border border-amber-200' : 'bg-[#0A0D14]/60 border-amber-500/20'}`}>
                        <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>Memo (required)</p>
                        <button onClick={() => copyToClipboard(rfq.paymentInstructions.memo)} className={`font-mono text-sm flex items-center gap-2 hover:underline ${isLight ? 'text-amber-900' : 'text-white'}`}>
                          {rfq.paymentInstructions.memo} <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`rounded-lg p-3 ${isLight ? 'bg-white/80 border border-amber-200' : 'bg-[#0A0D14]/60 border-amber-500/20'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>Reference</p>
                    <p className={`font-mono text-sm font-bold ${isLight ? 'text-amber-900' : 'text-white'}`}>{rfq.paymentInstructions.reference}</p>
                    <p className={`text-xs mt-1 ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>{rfq.paymentInstructions.note}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Chat (Desktop) */}
        <div className={`hidden lg:flex lg:col-span-5 rounded-xl flex-col h-[500px] border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
          <div className={`px-4 py-3 border-b flex items-center gap-2 ${isLight ? 'border-slate-200' : 'border-[#1E2D3D]'}`}>
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span className={`text-xs font-semibold uppercase tracking-wide ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>Chat with your dealer</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && <p className={`text-xs text-center mt-8 ${isLight ? 'text-slate-400' : 'text-gray-600'}`}>No messages yet. Ask about rate, timing, or settlement details.</p>}
            {messages.map((m: any) => (
              <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${m.fromRole === 'merchant' ? 'ml-auto bg-emerald-600/20 text-emerald-900 dark:text-emerald-100' : isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#1E2D3D] text-gray-200'}`}>
                {m.text}
                <div className="text-[9px] text-gray-500 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {chatError && <p className="text-[10.5px] text-red-400 px-2.5 pb-1">{chatError}</p>}
          <form onSubmit={send} className={`p-2.5 border-t flex gap-2 ${isLight ? 'border-slate-200' : 'border-[#1E2D3D]'}`}>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Message..." className={`flex-1 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500 border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0A0D14] border-[#1E2D3D] text-white'}`} />
            <button type="submit" disabled={sending || !text.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 rounded-lg">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Chat Drawer */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setChatOpen(false)} />
          <div className={`absolute right-0 top-0 h-full w-full max-w-sm flex flex-col ${isLight ? 'bg-white' : 'bg-[#0F1520]'}`}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-[#1E2D3D]'}`}>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-500" />
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>Chat with dealer</span>
              </div>
              <button onClick={() => setChatOpen(false)} className={`p-1 rounded ${isLight ? 'hover:bg-slate-100' : 'hover:bg-[#1E2D3D]'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && <p className={`text-xs text-center mt-8 ${isLight ? 'text-slate-400' : 'text-gray-600'}`}>No messages yet.</p>}
              {messages.map((m: any) => (
                <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${m.fromRole === 'merchant' ? 'ml-auto bg-emerald-600/20 text-emerald-900' : isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#1E2D3D] text-gray-200'}`}>
                  {m.text}
                  <div className="text-[9px] text-gray-500 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={send} className={`p-2.5 border-t flex gap-2 ${isLight ? 'border-slate-200' : 'border-[#1E2D3D]'}`}>
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Message..." className={`flex-1 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500 border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0A0D14] border-[#1E2D3D] text-white'}`} />
              <button type="submit" disabled={sending || !text.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 rounded-lg">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
