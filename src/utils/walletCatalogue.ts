export interface WalletCurrency { code: string; name: string; iso?: string; crypto?: boolean }

export const WALLET_CATALOGUE: WalletCurrency[] = [
  { code: 'KES', name: 'Kenyan Shilling', iso: 'ke' },
  { code: 'USDT', crypto: true, name: 'Tether (USDT)' },
  { code: 'USDC', crypto: true, name: 'USD Coin (USDC)' },
  { code: 'USDA', crypto: true, name: 'USDA Stablecoin' },
  { code: 'cUSD', crypto: true, name: 'Celo Dollar (cUSD)' },
  { code: 'USD', name: 'US Dollar', iso: 'us' },
  { code: 'UGX', name: 'Ugandan Shilling', iso: 'ug' },
  { code: 'TZS', name: 'Tanzanian Shilling', iso: 'tz' },
  { code: 'RWF', name: 'Rwandan Franc', iso: 'rw' },
  { code: 'BIF', name: 'Burundian Franc', iso: 'bi' },
  { code: 'XOF', name: 'West African CFA', iso: 'sn' },
  { code: 'NGN', name: 'Nigerian Naira', iso: 'ng' },
  { code: 'GHS', name: 'Ghanaian Cedi', iso: 'gh' },
  { code: 'ZAR', name: 'South African Rand', iso: 'za' },
  { code: 'ETB', name: 'Ethiopian Birr', iso: 'et' },
  { code: 'MWK', name: 'Malawian Kwacha', iso: 'mw' },
  { code: 'ZMW', name: 'Zambian Kwacha', iso: 'zm' },
  { code: 'EUR', name: 'Euro', iso: 'eu' },
  { code: 'GBP', name: 'British Pound', iso: 'gb' },
  { code: 'CNY', name: 'Chinese Yuan', iso: 'cn' },
  { code: 'CNH', name: 'Chinese Yuan (Offshore)', iso: 'cn' },
  { code: 'CNGN', crypto: true, name: 'Compliant Naira' },
  { code: 'XAF', name: 'Cameroon CFA Franc (XAF)', iso: 'cm' },
];

// Markets where the desk can take a mobile-money top-up, and the wallets
// people there actually use. Everything else funds by bank wire or on-chain.
export const MOBILE_MONEY_MARKETS: Record<string, { country: string; providers: string[] }> = {
  KES: { country: 'Kenya', providers: ['M-Pesa', 'Airtel Money'] },
  UGX: { country: 'Uganda', providers: ['MTN MoMo', 'Airtel Money'] },
  TZS: { country: 'Tanzania', providers: ['M-Pesa', 'Tigo Pesa', 'Airtel Money'] },
  RWF: { country: 'Rwanda', providers: ['MTN MoMo', 'Airtel Money'] },
  GHS: { country: 'Ghana', providers: ['MTN MoMo', 'Vodafone Cash', 'AirtelTigo Money'] },
  XOF: { country: "Senegal / Cote d'Ivoire", providers: ['Orange Money', 'Wave', 'MTN MoMo'] },
  XAF: { country: 'Cameroon', providers: ['MTN MoMo', 'Orange Money'] },
  ZMW: { country: 'Zambia', providers: ['MTN MoMo', 'Airtel Money'] },
  MWK: { country: 'Malawi', providers: ['Airtel Money', 'TNM Mpamba'] },
  ETB: { country: 'Ethiopia', providers: ['Telebirr'] },
  BIF: { country: 'Burundi', providers: ['Lumicash', 'EcoCash'] },
};

// Stablecoins with a live deposit address today (Celo). USDA is Cardano-native
// and CNGN has no watcher yet, so they are shown as coming soon.
export const CELO_DEPOSIT_ASSETS = ['USDT', 'USDC', 'cUSD'];
