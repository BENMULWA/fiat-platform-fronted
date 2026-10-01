// Consistent per-asset color without hardcoding specific currencies -- an
// institutional wallet can hold anything treasury credits. Shared by the
// merchant Dashboard and Wallet Balances pages so the same asset always
// gets the same color across the portal.
const BADGE_PALETTE = [
    { bg: 'rgba(52,211,153,0.16)', text: '#34d399' },
    { bg: 'rgba(56,189,248,0.16)', text: '#38bdf8' },
    { bg: 'rgba(245,158,11,0.16)', text: '#f59e0b' },
    { bg: 'rgba(167,139,250,0.16)', text: '#a78bfa' },
    { bg: 'rgba(248,113,113,0.16)', text: '#f87171' },
];

export function badgeFor(asset: string): { bg: string; text: string } {
    let hash = 0;
    for (let i = 0; i < asset.length; i++) hash = (hash * 31 + asset.charCodeAt(i)) >>> 0;
    return BADGE_PALETTE[hash % BADGE_PALETTE.length];
}
