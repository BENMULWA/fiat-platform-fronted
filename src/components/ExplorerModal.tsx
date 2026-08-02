// Blockchain explorer scans to view transactions on chain
// @ts-nocheck
import React, { useState } from 'react';
import { X, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

interface ExplorerModalProps {
    isOpen: boolean;
    onClose: () => void;
    txHash: string;
    network: string;
}

export default function ExplorerModal({ isOpen, onClose, txHash, network }: ExplorerModalProps) {
    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#070f19]/90 backdrop-blur-sm px-4 animate-in fade-in">
            <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#1e2d3d] bg-[#111827]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm tracking-wide">Blockchain Receipt</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-8 flex flex-col items-center text-center">
                    <AlertCircle className="w-16 h-16 text-emerald-500/50 mb-6" />
                    <h3 className="text-xl font-bold text-white mb-3">Transaction Confirmed</h3>
                    <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-xs">
                        Your transaction is live on the {network} network. Due to security policies, we cannot embed the explorer directly.
                    </p>

                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                    >
                        View Official Receipt <ExternalLink className="w-4 h-4" />
                    </a>

                    <div className="mt-6 w-full p-3 bg-[#111827] rounded-lg border border-[#1e2d3d]">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Transaction Hash</p>
                        <p className="text-[11px] text-gray-400 font-mono break-all">{txHash}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}