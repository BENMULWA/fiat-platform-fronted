type Kind = 'person' | 'building' | 'globe';

const PALETTES: [string, string][] = [
  ['#10b981', '#0f766e'], ['#6366f1', '#4338ca'], ['#f59e0b', '#ea580c'], ['#0ea5e9', '#1d4ed8'],
];
const KINDS: Kind[] = ['person', 'building', 'globe'];

export const PRESET_COUNT = PALETTES.length * KINDS.length;

function presetSvg(index: number): string {
  const i = ((index % PRESET_COUNT) + PRESET_COUNT) % PRESET_COUNT;
  const [c1, c2] = PALETTES[i % PALETTES.length];
  const kind = KINDS[Math.floor(i / PALETTES.length)];
  const glyph = kind === 'person'
    ? `<circle cx="50" cy="38" r="15" fill="#fff" opacity="0.95"/><path d="M20 88c2-18 15-28 30-28s28 10 30 28z" fill="#fff" opacity="0.9"/>`
    : kind === 'building'
      ? `<rect x="28" y="30" width="22" height="50" rx="2" fill="#fff" opacity="0.95"/><rect x="54" y="44" width="20" height="36" rx="2" fill="#fff" opacity="0.8"/><g fill="${c2}" opacity="0.7"><rect x="33" y="38" width="4" height="4"/><rect x="41" y="38" width="4" height="4"/><rect x="33" y="48" width="4" height="4"/><rect x="41" y="48" width="4" height="4"/><rect x="33" y="58" width="4" height="4"/><rect x="41" y="58" width="4" height="4"/><rect x="59" y="52" width="4" height="4"/><rect x="59" y="62" width="4" height="4"/></g>`
      : `<circle cx="50" cy="50" r="24" fill="none" stroke="#fff" stroke-width="4" opacity="0.95"/><ellipse cx="50" cy="50" rx="10" ry="24" fill="none" stroke="#fff" stroke-width="3" opacity="0.85"/><path d="M26 50h48M31 37h38M31 63h38" stroke="#fff" stroke-width="3" opacity="0.8" fill="none"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/>${glyph}</svg>`;
}

const svgUri = (index: number) => `data:image/svg+xml;utf8,${encodeURIComponent(presetSvg(index))}`;

export function presetToPngDataUrl(index: number, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas unavailable'));
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Could not render avatar'));
    img.src = svgUri(index);
  });
}

const hash = (s: string) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function PresetAvatar({ index, className = 'w-10 h-10' }: { index: number; className?: string }) {
  return <img src={svgUri(index)} alt="" className={`${className} rounded-full object-cover`} />;
}

export default function MerchantAvatar({ src, seed = 'merchant', className = 'w-8 h-8' }: { src?: string | null; seed?: string; className?: string }) {
  if (src) return <img src={src} alt="" className={`${className} rounded-full object-cover`} />;
  return <PresetAvatar index={hash(seed)} className={className} />;
}
