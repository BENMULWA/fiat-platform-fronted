// Shared across every page that renders a dealer_settlements status
// (merchant Dashboard, merchant Settlements list, admin TreasurySettlements)
// so the step order/labels can't drift between them -- mirrors
// backend/routes/otc_admin.py::_SETTLEMENT_TRANSITIONS exactly.
export const SETTLEMENT_STEPS = [
    'pending', 'treasury_review', 'funds_confirmed', 'transfer_approved', 'transfer_pending', 'confirmed', 'reconciled',
];

export const SETTLEMENT_LABELS: Record<string, string> = {
    pending: 'Pending', treasury_review: 'Treasury review', funds_confirmed: 'Funds received',
    transfer_approved: 'Transfer approved', transfer_pending: 'Transfer submitted',
    fiat_confirmed: 'Confirming', crypto_confirmed: 'Confirming', reconciled: 'Completed',
    failed: 'Failed', reservation_released: 'Cancelled',
};

export const TERMINAL_SETTLEMENT_STATUSES = new Set(['reconciled', 'failed', 'reservation_released']);

export function settlementStepIndex(status: string): number {
    const normalized = status === 'fiat_confirmed' || status === 'crypto_confirmed' ? 'confirmed' : status;
    const idx = SETTLEMENT_STEPS.indexOf(normalized);
    return idx === -1 ? 0 : idx;
}

export function settlementProgressPct(status: string): number {
    return Math.round((settlementStepIndex(status) / (SETTLEMENT_STEPS.length - 1)) * 100);
}
