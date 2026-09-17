// Minimal pub/sub so any part of the app (retail's AppLayout websocket
// handler, the OTC merchant portal's InstitutionalRoute websocket handler)
// can push a toast onto a single, app-wide <NotificationToastHost/> without
// each page owning its own toast state.
export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

export interface ToastEvent {
    id: string;
    title: string;
    message: string;
    severity: ToastSeverity;
}

type Listener = (toast: ToastEvent) => void;

const listeners = new Set<Listener>();

export function subscribeToasts(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function emitToast(toast: Omit<ToastEvent, 'id'>): void {
    const event: ToastEvent = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...toast };
    listeners.forEach(listener => listener(event));
}
