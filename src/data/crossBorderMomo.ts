// Cross-border mobile money rails this platform can eventually settle to.
// Only Kenya (M-Pesa, Airtel Money — see each page's own provider tabs) has a
// real backend integration today (resolve_momo_provider_and_validate in
// backend/routes/ramp.py). Everything here is shown so the roadmap is
// visible, but none of it is wired to anything real yet. Country grouping
// mirrors the fiat currencies this platform already models (KES/UGX/TZS/RWF/
// BIF/XAF/XOF) plus South Africa.
export const CROSS_BORDER_MOMO_NETWORKS = [
    { id: 'MTN_UG', country: 'Uganda', iso: 'ug', name: 'MTN MoMo' },
    { id: 'AIRTEL_UG', country: 'Uganda', iso: 'ug', name: 'Airtel Money' },
    { id: 'VODACOM_TZ', country: 'Tanzania', iso: 'tz', name: 'M-Pesa (Vodacom)' },
    { id: 'TIGO_TZ', country: 'Tanzania', iso: 'tz', name: 'Tigo Pesa' },
    { id: 'AIRTEL_TZ', country: 'Tanzania', iso: 'tz', name: 'Airtel Money' },
    { id: 'MTN_RW', country: 'Rwanda', iso: 'rw', name: 'MTN MoMo' },
    { id: 'LUMICASH_BI', country: 'Burundi', iso: 'bi', name: 'Lumicash' },
    { id: 'ORANGE_XOF', country: 'West Africa (XOF)', iso: 'sn', name: 'Orange Money' },
    { id: 'MTN_XOF', country: 'West Africa (XOF)', iso: 'ci', name: 'MTN MoMo' },
    { id: 'ORANGE_XAF', country: 'Central Africa (XAF)', iso: 'cm', name: 'Orange Money' },
    { id: 'MTN_XAF', country: 'Central Africa (XAF)', iso: 'cm', name: 'MTN MoMo' },
    { id: 'MTN_GH', country: 'Ghana', iso: 'gh', name: 'MTN MoMo' },
    { id: 'VODAFONE_GH', country: 'Ghana', iso: 'gh', name: 'Vodafone Cash' },
    { id: 'MOMO_ZA', country: 'South Africa', iso: 'za', name: 'Mobile Money' },
] as const;

export const getFlagUrl = (iso: string) => `https://flagcdn.com/w40/${iso}.png`;
