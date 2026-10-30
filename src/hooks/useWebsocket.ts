
//@ts-nocheck
import { useEffect, useRef } from 'react';

export default function useWebsocket(path: string, userId: string | null, onMessage: (msg: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number>(0);

  useEffect(() => {
    if (!path) return;

    // The backend now authenticates /ws/dashboard with the same JWT the REST
    // calls use, and takes the user identity from the token itself. No token
    // (logged out) means nothing to subscribe to, so don't open a socket.
    let token: string | null = null;
    try { token = localStorage.getItem('meshex_token'); } catch (e) { /* storage blocked */ }
    if (!token) return;

    let disposed = false;
    let reconnectTimer: number | undefined;

    const buildUrl = () => {
      const envUrl = (import.meta as any).env?.VITE_API_URL || '';
      let base = envUrl || window.location.origin;
      // ensure no trailing slash
      base = base.replace(/\/$/, '');
      const wsProto = base.startsWith('https') ? 'wss' : 'ws';
      // strip protocol
      base = base.replace(/^https?:\/\//, '');
      return `${wsProto}://${base}${path}?token=${encodeURIComponent(token)}`;
    };

    const wsUrl = buildUrl();

    const connect = () => {
      if (disposed) return;
      try {
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.onopen = () => {
          reconnectRef.current = 0;
        };
        wsRef.current.onmessage = (ev) => {
          try { onMessage(JSON.parse(ev.data)); } catch (e) { onMessage(ev.data); }
        };
        wsRef.current.onclose = (ev) => {
          // 4401 = the server rejected our token. Retrying with the same
          // token can never succeed, so stop instead of hammering the server.
          if (disposed || ev.code === 4401) return;
          reconnectTimer = window.setTimeout(connect, Math.min(30000, 1000 * (reconnectRef.current + 1)));
          reconnectRef.current += 1;
        };
        wsRef.current.onerror = () => {
          // noop
        };
      } catch (e) {
        // ignore
      }
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
      }
    };
  }, [path, userId, onMessage]);
}
