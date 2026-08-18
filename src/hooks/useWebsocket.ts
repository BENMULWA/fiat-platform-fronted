
//@ts-nocheck
import { useEffect, useRef } from 'react';

export default function useWebsocket(path: string, userId: string | null, onMessage: (msg: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number>(0);

  useEffect(() => {
    if (!path) return;

    const buildUrl = () => {
      const envUrl = (import.meta as any).env?.VITE_API_URL || '';
      let base = envUrl || window.location.origin;
      // ensure no trailing slash
      base = base.replace(/\/$/, '');
      const wsProto = base.startsWith('https') ? 'wss' : 'ws';
      // strip protocol
      base = base.replace(/^https?:\/\//, '');
      return `${wsProto}://${base}${path}?userId=${encodeURIComponent(userId || '')}`;
    };

    let wsUrl = buildUrl();

    const connect = () => {
      try {
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.onopen = () => {
          // console.log('WS connected', wsUrl);
        };
        wsRef.current.onmessage = (ev) => {
          try { onMessage(JSON.parse(ev.data)); } catch (e) { onMessage(ev.data); }
        };
        wsRef.current.onclose = () => {
          // attempt reconnect
          const id = window.setTimeout(() => connect(), Math.min(30000, 1000 * (reconnectRef.current + 1)));
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
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
      }
    };
  }, [path, userId, onMessage]);
}
