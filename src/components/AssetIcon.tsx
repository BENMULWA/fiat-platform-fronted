// Lightweight, self-contained asset badges (brand-colored circle + monogram)
// for the swap UIs — no external logo fetch/CDN dependency, so it never
// flickers/breaks on a slow network like <img> logo grids do.
const ASSET_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  USDT: { bg: '#26A17B', fg: '#FFFFFF', label: 'T' },
  USDC: { bg: '#2775CA', fg: '#FFFFFF', label: '$' },
  USDA: { bg: '#0033AD', fg: '#FFFFFF', label: '₳' },
  cUSD: { bg: '#FCFF52', fg: '#1E1E1E', label: 'c' },
  KES: { bg: '#0A5C36', fg: '#FFFFFF', label: 'KE' },
  AIRT: { bg: '#F59E0B', fg: '#1E1E1E', label: 'A' },
  IMP: { bg: '#8B5CF6', fg: '#FFFFFF', label: 'I' },
  BTC: { bg: '#F7931A', fg: '#FFFFFF', label: '₿' },
  ETH: { bg: '#627EEA', fg: '#FFFFFF', label: 'Ξ' },
  USD: { bg: '#4B5563', fg: '#FFFFFF', label: '$' },
  UGX: { bg: '#374151', fg: '#FFFFFF', label: 'UG' },
  TZS: { bg: '#374151', fg: '#FFFFFF', label: 'TZ' },
  RWF: { bg: '#374151', fg: '#FFFFFF', label: 'RW' },
  BIF: { bg: '#374151', fg: '#FFFFFF', label: 'BI' },
  XAF: { bg: '#374151', fg: '#FFFFFF', label: 'FR' },
  XOF: { bg: '#374151', fg: '#FFFFFF', label: 'FR' },
};

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-5 h-5 text-[9px]',
  md: 'w-6 h-6 text-[10px]',
  lg: 'w-9 h-9 text-sm',
};

export default function AssetIcon({ asset, size = 'md', className = '' }: { asset: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const style = ASSET_STYLES[asset?.toUpperCase()] || { bg: '#4B5563', fg: '#FFFFFF', label: asset?.slice(0, 2).toUpperCase() || '?' };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-black shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      style={{ backgroundColor: style.bg, color: style.fg }}
      aria-hidden="true"
    >
      {style.label}
    </span>
  );
}
