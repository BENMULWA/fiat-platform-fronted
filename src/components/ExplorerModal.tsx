// Blockchain explorer scans to view transactions on chain

//@ts-nocheck
import React, { useState } from 'react';
import { X, ExternalLink, ShieldCheck, Loader2 } from 'lucide-react';

interface ExplorerModalProps {
    isOpen: boolean;
    onClose: () => void;
    txHash: string;
    network: string;
}

export default function ExplorerModal({ isOpen, onClose, txHash, network }: ExplorerModalProps) {
    const [iframeFailed, setIframeFailed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    if (!isOpen) return null;

    // Determine the correct block explorer URL based on the network
    const getExplorerUrl = () => {
        switch (network.toLowerCase()) {
            case 'stellar': return `https://stellar.expert/explorer/public/tx/${txHash}`;
            case 'celo': return `https://celoscan.io/tx/${txHash}`;
            case 'polygon': return `https://polygonscan.com/tx/${txHash}`;
            case 'tron': return `https://tronscan.org/#/transaction/${txHash}`;
            case 'ethereum': return `https://etherscan.io/tx/${txHash}`;
            case 'cardano': return `https://preprod.cardanoscan.io/transaction/${txHash}`;
            default: return `https://celoscan.io/tx/${txHash}`;
        }
    };

    const url = getExplorerUrl();

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#070f19]/80 backdrop-blur-md px-4 animate-in fade-in">
            <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[80vh] animate-in zoom-in-95">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#1e2d3d] bg-[#111827]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <ShieldCheck className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm tracking-wide">Blockchain Explorer</h3>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{txHash.slice(0, 12)}...{txHash.slice(-8)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer" 
                        className="px-3 py-1.5 bg-[#1e2d3d] hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
                        Open Native <ExternalLink className="w-3 h-3" />
                    </a>
                    <button onClick={onClose} className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-gray-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Body (Iframe) */}
            <div className="flex-1 bg-white relative">
                {isLoading && !iframeFailed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0f19] z-10">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                        <p className="text-sm text-gray-400 font-medium">Loading ledger data...</p>
                    </div>
                )}

                {iframeFailed ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0f19] p-8 text-center">
                        <ShieldCheck className="w-12 h-12 text-gray-600 mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">Secure Explorer</h3>
                        <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                            The {network} blockchain explorer prevents itself from being embedded for security reasons. Please open it in a new secure tab.
                        </p>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2"
                        >
                            View on {network} Explorer <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                ) : (
                    <iframe
                        src={url}
                        className="w-full h-full border-none"
                        onLoad={() => setIsLoading(false)}
                        onError={() => { setIframeFailed(true); setIsLoading(false); }}
                    />
                )}
            </div>
        </div>
    </div >
  );
}