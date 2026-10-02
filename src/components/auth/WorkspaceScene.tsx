import type { CSSProperties } from 'react';

// Flat "workspace" illustration for the light sign-in pages. Pure SVG, animated with CSS only.
// Props differ per audience: folders, briefcase and coins for the OTC desk; phone, wallet and plant for retail.
export type SceneVariant = 'retail' | 'otc';

const TONES: Record<SceneVariant, { accent: string; spark: string }> = {
  otc: { accent: '#0f9d8f', spark: '#f5b83d' },
  retail: { accent: '#16a36a', spark: '#f5b83d' },
};

const CSS = `
@keyframes wsPop { 0%,100% { transform: translateY(0) scale(1); } 45% { transform: translateY(-10px) scale(1.06); } }
@keyframes wsBlink { 0%,92% { opacity: 1; } 96% { opacity: 0; } }
@keyframes wsType { 0% { transform: scaleX(.05); } 55%,100% { transform: scaleX(1); } }
@keyframes wsTap { 50% { transform: rotate(-2.5deg); } }
@keyframes wsSway { 50% { transform: rotate(3deg); } }
.ws-fi { animation: wsPop 5.5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.ws-blink { animation: wsBlink 3.2s steps(1) infinite; }
.ws-type rect { animation: wsType 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: left center; }
.ws-arm { animation: wsTap 1.1s ease-in-out infinite; transform-box: fill-box; transform-origin: left center; }
.ws-sway { animation: wsSway 6s ease-in-out infinite; transform-box: fill-box; transform-origin: bottom center; }
@media (prefers-reduced-motion: reduce) { .ws-fi, .ws-blink, .ws-type rect, .ws-arm, .ws-sway { animation: none; } }
`;

export default function WorkspaceScene({ variant, title, subtitle, dark = false }: { variant: SceneVariant; title: string; subtitle: string; dark?: boolean }) {
  const t = TONES[variant];
  const style = { '--ws-accent': t.accent, '--ws-spark': t.spark } as CSSProperties;
  const otc = variant === 'otc';
  return (
    <div className="relative h-full min-h-[460px] w-full" style={style} aria-hidden="true">
      <style>{CSS}</style>
      <svg viewBox="30 55 520 430" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="wsDesk" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8fb3c4" /><stop offset="1" stopColor="#6c93a6" /></linearGradient>
          <linearGradient id="wsScreen" x1="0" x2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#eef6f8" /></linearGradient>
        </defs>
        {dark && (
          <g>
            <circle cx="290" cy="270" r="215" fill="#ffffff" opacity=".07" />
            <circle cx="290" cy="270" r="150" fill="#ffffff" opacity=".06" />
          </g>
        )}
        <ellipse cx="290" cy="446" rx="230" ry="26" fill={dark ? '#000' : '#0a2a3a'} opacity={dark ? '.28' : '.1'} />

        <g>
          <g className="ws-fi" style={{ animationDelay: '-.5s' }}><circle cx="300" cy="104" r="19" fill="var(--ws-spark)" /><g transform="translate(290 94)" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="9" width="16" height="11" rx="2.5" /><path d="M5 9V6a5 5 0 0110 0v3" /></g></g>
          <g className="ws-fi" style={{ animationDelay: '-1.6s' }}><circle cx="352" cy="82" r="19" fill="#d9f3ee" stroke="var(--ws-accent)" strokeWidth="2" /><g transform="translate(341 73)" fill="none" stroke="var(--ws-accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="20" height="14" rx="2.5" /><path d="M2 5l9 7 9-7" /></g></g>
          <g className="ws-fi" style={{ animationDelay: '-2.7s' }}><circle cx="406" cy="92" r="17" fill="#27b46b" /><path d="M398 92l6 6 11-12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></g>
          <g className="ws-fi" style={{ animationDelay: '-3.8s' }}><circle cx="452" cy="118" r="17" fill="#3b82d9" /><g fill="#fff"><circle cx="452" cy="113" r="5" /><path d="M443 127c1-6 5-8 9-8s8 2 9 8z" /></g></g>
          <circle cx="330" cy="130" r="2.5" fill="var(--ws-accent)" /><circle cx="376" cy="124" r="2.5" fill="var(--ws-spark)" /><circle cx="428" cy="140" r="2.5" fill="#3b82d9" />
        </g>

        <path d="M170 292 L150 440" stroke="url(#wsDesk)" strokeWidth="12" strokeLinecap="round" />
        <path d="M470 292 L492 440" stroke="url(#wsDesk)" strokeWidth="12" strokeLinecap="round" />
        <rect x="140" y="278" width="372" height="16" rx="7" fill="url(#wsDesk)" />

        <rect x="326" y="150" width="168" height="120" rx="12" fill="#d6e4ea" stroke="var(--ws-accent)" strokeWidth="2" />
        <rect x="336" y="160" width="148" height="100" rx="7" fill="url(#wsScreen)" />
        <rect x="388" y="270" width="24" height="12" fill="#b9cdd6" />
        <rect x="364" y="280" width="72" height="7" rx="3.5" fill="#a9c0cb" />
        <g transform="translate(410 206)">
          <rect x="-42" y="-34" width="84" height="68" rx="9" fill="#f3f8fa" stroke="#dbe7ec" />
          <circle cx="0" cy="-14" r="11" fill="var(--ws-accent)" /><circle cx="0" cy="-17" r="4" fill="#fff" /><path d="M-7 -8c1-5 4-6 7-6s6 1 7 6z" fill="#fff" />
          <g className="ws-type"><rect x="-30" y="6" width="60" height="5" rx="2.5" fill="#cfdde4" /><rect x="-30" y="16" width="60" height="5" rx="2.5" fill="#dfe9ee" style={{ animationDelay: '.5s' }} /></g>
          <rect x="-16" y="25" width="32" height="6" rx="3" fill="var(--ws-spark)" opacity=".9" />
          <rect className="ws-blink" x="22" y="6" width="2" height="5" fill="var(--ws-accent)" />
        </g>

        <g transform="translate(228 262)"><rect x="0" y="0" width="22" height="16" rx="3" fill="#e8f1f4" stroke="#c4d5dd" /><path d="M22 4h5a3 3 0 010 8h-5" fill="none" stroke="#c4d5dd" strokeWidth="2" /></g>

        {otc ? (
          <g>
            <g transform="translate(452 252)"><rect x="0" y="0" width="14" height="28" rx="2" fill="var(--ws-spark)" /><rect x="16" y="-6" width="14" height="34" rx="2" fill="var(--ws-accent)" /><rect x="32" y="2" width="14" height="26" rx="2" fill="#fff" stroke="#c9d9e0" /></g>
            <g transform="translate(462 414)"><rect x="0" y="0" width="78" height="40" rx="6" fill="#4b7fb5" /><rect x="26" y="-10" width="26" height="12" rx="5" fill="none" stroke="#2f5a87" strokeWidth="3" /><rect x="0" y="16" width="78" height="4" fill="#2f5a87" /></g>
            <g transform="translate(60 380)"><ellipse cx="22" cy="56" rx="26" ry="7" fill="#c98e1c" /><ellipse cx="22" cy="48" rx="26" ry="7" fill="var(--ws-spark)" /><ellipse cx="22" cy="40" rx="26" ry="7" fill="#c98e1c" /><ellipse cx="22" cy="32" rx="26" ry="7" fill="var(--ws-spark)" /><circle cx="22" cy="32" r="3.5" fill="#fff6d8" /></g>
          </g>
        ) : (
          <g>
            <g transform="translate(452 244)"><rect x="0" y="0" width="24" height="34" rx="5" fill="#24313d" /><rect x="3" y="4" width="18" height="26" rx="3" fill="#dff6ea" /><path d="M6 22l4-5 4 3 5-8" fill="none" stroke="var(--ws-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
            <g transform="translate(486 372)">
              <g className="ws-sway"><path d="M30 60 C 10 40, 4 14, 24 0 C 36 18, 38 40, 30 60z" fill="#35b27a" /><path d="M34 60 C 46 38, 60 24, 76 26 C 70 46, 54 58, 34 60z" fill="#1d8a5b" /></g>
              <path d="M14 58h34l-5 36H19z" fill="#9a5b3d" />
            </g>
            <g transform="translate(56 392)"><rect x="0" y="0" width="64" height="44" rx="8" fill="var(--ws-accent)" /><rect x="8" y="10" width="48" height="8" rx="4" fill="#ffffff55" /><circle cx="48" cy="30" r="6" fill="var(--ws-spark)" /></g>
          </g>
        )}

        <path d="M176 306 L170 440" stroke="#9fb7c4" strokeWidth="9" strokeLinecap="round" />
        <rect x="146" y="222" width="20" height="92" rx="10" fill="#b8cbd4" transform="rotate(-6 156 268)" />
        <path d="M154 312 H252 Q258 312 256 320 H158 Q150 320 154 312Z" fill="#a9c0cb" />

        <path d="M204 188 C 172 196, 170 262, 190 294 L 216 288 C 206 252, 214 222, 226 206Z" fill={dark ? '#3a5d70' : '#17313d'} />
        <path d="M200 232 Q236 214 266 238 L268 304 H204Z" fill="var(--ws-accent)" />
        <g className="ws-arm"><path d="M262 244 L330 270" stroke="var(--ws-accent)" strokeWidth="15" strokeLinecap="round" /><circle cx="334" cy="271" r="8" fill="#f0c7a2" /></g>
        <path d="M222 304 L300 322" stroke="#24415a" strokeWidth="24" strokeLinecap="round" />
        <path d="M300 322 L296 424" stroke="#24415a" strokeWidth="20" strokeLinecap="round" />
        <ellipse cx="304" cy="432" rx="22" ry="9" fill="#10202c" />
        <circle cx="238" cy="186" r="22" fill="#f0c7a2" />
        <path d="M214 178 C 218 154, 254 150, 262 176 C 252 168, 232 166, 218 192Z" fill={dark ? '#3a5d70' : '#17313d'} />
      </svg>
      <div className="absolute inset-x-0 bottom-4 px-6 text-center">
        <p className={`text-lg font-extrabold leading-snug [text-wrap:balance] ${dark ? 'text-white' : 'text-[#0b2a3b]'}`}>{title}</p>
        <p className={`mt-1 text-[13px] ${dark ? 'text-teal-100/70' : 'text-[#5b7183]'}`}>{subtitle}</p>
      </div>
    </div>
  );
}
