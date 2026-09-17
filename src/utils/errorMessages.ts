// Turns whatever the backend/axios throws into a message a retail user can
// actually read. Backends sometimes bubble up raw upstream provider errors
// (stack traces, "402 Client Error ... for url: https://...", exception
// class names) straight into `detail`/`message` — those are fine for us to
// read in logs but meaningless (and unprofessional-looking) to a customer.
// Anything that looks like that gets swapped for a plain-English fallback;
// short, human-authored validation messages (e.g. "Insufficient balance")
// are left alone since the backend wrote those for the user in the first place.

const DEV_LEAK_PATTERNS = [
  /https?:\/\//i,
  /traceback/i,
  /\.py\b/i,
  /\bexception\b/i,
  /client error/i,
  /server error/i,
  /status_code/i,
  /stack trace/i,
  /at 0x[0-9a-f]+/i,
  /\b\d{3}\s+(client|server)\s+error\b/i,
];

function looksLikeDevMessage(msg: string): boolean {
  if (!msg) return true;
  if (msg.length > 160) return true;
  return DEV_LEAK_PATTERNS.some((re) => re.test(msg));
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "We couldn't process that request — please check the details and try again.",
  402: 'This service is temporarily unavailable due to a provider issue on our end. Please try again shortly.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: 'That conflicts with something already on file — please refresh and try again.',
  422: "We couldn't process that request — please check the details and try again.",
  429: 'Too many attempts — please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again in a few minutes.',
  502: 'Something went wrong on our end. Please try again in a few minutes.',
  503: 'Our systems are temporarily unavailable. Please try again shortly.',
  504: 'That took too long to process. Please try again.',
};

export interface FriendlyErrorOptions {
  // Shown when we have nothing better — tailor per flow, e.g.
  // "We couldn't complete your withdrawal. Please try again or contact support."
  fallback?: string;
}

const DEFAULT_FALLBACK = 'Something went wrong. Please try again, or contact support if it continues.';

export function getFriendlyErrorMessage(err: any, options: FriendlyErrorOptions = {}): string {
  const fallback = options.fallback || DEFAULT_FALLBACK;
  if (!err) return fallback;

  if (err.code === 'ECONNABORTED') {
    return 'That took too long to respond. Please check your connection and try again.';
  }
  if (!err.response) {
    return "We couldn't reach our servers. Check your connection and try again.";
  }

  const status = err.response.status;
  const raw: unknown = err.response.data?.detail || err.response.data?.message || err.response.data?.error;
  const rawStr = typeof raw === 'string' ? raw : '';
  const wasRefunded = /refund/i.test(rawStr);

  let message = !looksLikeDevMessage(rawStr) && rawStr ? rawStr : (STATUS_MESSAGES[status] || fallback);

  if (wasRefunded && !/refund/i.test(message)) {
    message += ' Any funds used have been automatically refunded to your balance.';
  }

  return message;
}
