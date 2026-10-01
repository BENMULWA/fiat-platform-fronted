import { useEffect, useRef } from 'react';

// InstitutionalLayout owns the single /ws/dashboard connection for the whole
// portal session (see its own comment -- consolidated from one-per-route to
// avoid duplicate sockets). Any page below it that wants to react live to a
// pushed event (a settlement progressing, a new quote) can't open its own
// socket without reintroducing that duplication, so InstitutionalLayout
// rebroadcasts every message it receives as a window CustomEvent instead --
// this hook is just the subscribe/unsubscribe boilerplate around that.
export const OTC_LIVE_EVENT = 'jasiri:otc-live';

export default function useOtcLiveEvent(handler: (msg: any) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (e: Event) => handlerRef.current((e as CustomEvent).detail);
    window.addEventListener(OTC_LIVE_EVENT, listener);
    return () => window.removeEventListener(OTC_LIVE_EVENT, listener);
  }, []);
}
