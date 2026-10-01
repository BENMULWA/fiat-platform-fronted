// A self-contained, original SVG "verification officer" avatar for the KYB
// landing screen -- built in-house (no third-party illustration/Lottie
// asset) so it renders instantly, themes with the rest of the portal, and
// carries the same emerald/mint identity as the sidebar and dashboard.
// Animation is plain CSS (Tailwind keyframes in tailwind.config.js) --
// float, orbiting compliance badges, and a checkmark that draws itself in.
interface OnboardingHeroProps {
  isLight?: boolean;
}

export default function OnboardingHero({ isLight = true }: OnboardingHeroProps) {
  return (
    <div className="relative w-full max-w-[260px] mx-auto aspect-square select-none" aria-hidden="true">
      {/* orbiting ring of market/compliance chips */}
      <div className="absolute inset-0 animate-spin-slow">
        {[0, 90, 180, 270].map(deg => (
          <div
            key={deg}
            className="absolute top-1/2 left-1/2 w-9 h-9"
            style={{ transform: `rotate(${deg}deg) translate(118px) rotate(-${deg}deg) translate(-50%, -50%)` }}
          >
            <div className={`w-9 h-9 rounded-xl border shadow-lg flex items-center justify-center ${isLight ? 'bg-white border-slate-200' : 'bg-[#0F1520] border-[#1E2D3D]'}`}>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
          </div>
        ))}
      </div>

      {/* pulse rings behind the avatar */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="absolute w-32 h-32 rounded-full border-2 border-emerald-400/40 animate-pulse-ring" />
        <span className="absolute w-32 h-32 rounded-full border-2 border-emerald-400/40 animate-pulse-ring [animation-delay:1.2s]" />
      </div>

      {/* floating avatar card */}
      <div className="absolute inset-0 flex items-center justify-center animate-orbit-float">
        <div className={`relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-900/40`}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            {/* head */}
            <circle cx="32" cy="24" r="11" fill="#06251c" />
            {/* shoulders / bust */}
            <path d="M12 56c0-12 9-19 20-19s20 7 20 19" fill="#06251c" />
          </svg>
          {/* verified badge */}
          <div className={`absolute -bottom-1.5 -right-1.5 w-11 h-11 rounded-full flex items-center justify-center border-4 ${isLight ? 'border-white' : 'border-[#0A0D14]'} bg-emerald-500`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4 10-10"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="24"
                className="animate-draw-check"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
