// Fires an in-app toast (always) plus a native OS-level notification popup
// (when the browser has granted permission) whenever a real-time event
// arrives over /ws/dashboard — deposit landed, withdrawal completed/failed,
// swap finished, RFQ/settlement update, etc. This is the "MiniPay-style"
// system-tray popup the user asked for: the OS/browser shows it even if the
// Jasiri tab is backgrounded (it still requires the tab/app to be open in
// some browser, since there's no push-service/service-worker subscription
// wired up yet — see PUSH_NOTIFICATIONS.md-equivalent note in this file).



//@ts-nocheck
import { emitToast, ToastSeverity } from './notificationBus';

const PERMISSION_ASKED_KEY = 'jasiri_notif_permission_asked';

export function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission;
}

export function hasAskedForPermission(): boolean {
    try {
        return localStorage.getItem(PERMISSION_ASKED_KEY) === '1';
    } catch {
        return false;
    }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!isNotificationSupported()) return 'unsupported';
    try {
        localStorage.setItem(PERMISSION_ASKED_KEY, '1');
    } catch {
        // ignore
    }
    try {
        return await Notification.requestPermission();
    } catch {
        return Notification.permission;
    }
}

interface NotifyEventInput {
    title: string;
    message: string;
    severity?: ToastSeverity;
}

const severityFromCategory = (category?: string, backendSeverity?: string): ToastSeverity => {
    const s = (backendSeverity || '').toLowerCase();
    if (s === 'error' || s === 'high') return 'error';
    if (s === 'medium' || s === 'warning') return 'warning';
    if (s === 'success') return 'success';
    return 'info';
};

/** Call this from a websocket `{type: 'notification', ...}` handler. */
export function fireEventNotification(payload: { title: string; message: string; category?: string; severity?: string }): void {
    const severity = severityFromCategory(payload.category, payload.severity);
    emitToast({ title: payload.title, message: payload.message, severity });

    if (isNotificationSupported() && Notification.permission === 'granted') {
        try {
            new Notification(payload.title, {
                body: payload.message,
                icon: '/favicon.png',
                tag: `jasiri-${payload.category || 'event'}-${Date.now()}`,
            });
        } catch {
            // Some browsers throw if called outside a user-gesture-adjacent
            // context or when the page isn't fully controlling a service
            // worker registration — the in-app toast above already covers
            // the user either way, so this is silently ignored.
        }
    }
}

export function notify(input: NotifyEventInput): void {
    fireEventNotification({ title: input.title, message: input.message, severity: input.severity });
}
