import { Lock } from 'lucide-react';
import { CROSS_BORDER_MOMO_NETWORKS, getFlagUrl } from '../data/crossBorderMomo';

// Shown when a user picks the "Cross-Border" tab on Deposit/Withdraw — every
// card here is inert (no onClick) since none of these rails have a real
// backend integration yet. Kept visible rather than hidden so the roadmap is
// clear, matching the "coming soon" pattern used elsewhere (TradePage assets,
// WithdrawPage's crypto-network picker).
export default function CrossBorderMomoGrid() {
    return (
        <div className="space-y-3">
            <p className="text-xs text-gray-500">More corridors are on the way — these aren't live yet.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CROSS_BORDER_MOMO_NETWORKS.map(n => (
                    <div
                        key={n.id}
                        className="relative p-3 rounded-xl border border-[#1E2533]/60 bg-[#0B0E14]/40 flex items-center gap-2.5 opacity-70 cursor-not-allowed"
                    >
                        <img src={getFlagUrl(n.iso)} alt="" className="w-6 h-[18px] object-cover rounded shadow shrink-0" />
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-400 truncate">{n.name}</p>
                            <p className="text-[10px] text-gray-600 truncate">{n.country}</p>
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded font-bold tracking-wider border border-cyan-500/20 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> SOON
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
