// @ts-nocheck
import React from 'react';
import QRCode from 'react-qr-code';
import { X, ExternalLink, CheckCircle2, Copy } from 'lucide-react';

const EXPLORER_URLS: Record<string, { address: string, tx: string, name: string }> = {
  stellar: { address: 'https://stellar.expert/explorer/public/account/', tx: 'https://stellar.expert/explorer/public/tx/', name: 'Stellar.expert' },
  celo: { address: 'https://celoscan.io/address/', tx: 'https://celoscan.io/tx/', name: 'CeloScan' },
  tron: { address: 'https://tronscan.org/#/address/', tx: 'https://tronscan.org/#/transaction/', name: 'Tronscan' },
  polygon: { address: 'https://polygonscan.com/address/', tx: 'https://polygonscan.com/tx/', name: 'Polygonscan' },
  ethereum: { address: 'https://etherscan.io/address/', tx: 'https://etherscan.io/tx/', name: 'Etherscan' },
  cardano: { address: 'https://cardanoscan.io/address/', tx: 'https://cardanoscan.io/transaction/', name: 'Cardanoscan' },
  bitcoin: { address: 'https://mempool.space/address/', tx: 'https://mempool.space/tx/', name: 'Mempool.space' }
};

const ExplorerModal = ({ isOpen, onClose, txHash, network, paymentUri, depositAddress, depositMemo }) => {
    if (!isOpen) return null;

    const explorer = EXPLORER_URLS[network];
    const txUrl = explorer && txHash ? `${explorer.tx}${txHash}` : null;

  const [copied, setCopied] = React.useState<'address' | 'memo' | null>(null);
  const handleCopy = (text: string, type: 'address' | 'memo') => {
    navigator.clipboard.writeText(text).then(() => { setCopied(type); setTimeout(() => setCopied(null), 2000); });
  };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#070f19]/90 backdrop-blur-sm px-4 animate-in fade-in">
            <div className="bg-[#0b0f19] border border-[#1e2d3d] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#1e2d3d] bg-[#111827]">
                    <h3 className="text-lg font-bold text-white">{paymentUri ? 'Scan to Pay' : 'View Transaction'}</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-6 text-center">
          {paymentUri ? (
            <>
              <p className="text-sm text-gray-400 mb-6">
                Use your mobile wallet to scan this QR code. It contains the address, amount, and memo.
              </p>
              <div className="p-4 bg-white rounded-xl inline-block">
                <QRCode value={paymentUri} size={200} />
              </div>
              <div className="mt-6 space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Address</label>
                  <div className="flex gap-2">
                    <input readOnly value={depositAddress} className="flex-1 bg-[#0B0E14] border border-[#1E2533] rounded-lg py-2 px-3 text-gray-400 text-xs font-mono outline-none shadow-inner" />
                    <button type="button" onClick={() => handleCopy(depositAddress, 'address')} className={`px-3 rounded-lg transition-all border border-[#1E2533] ${copied === 'address' ? 'bg-[#00d282] text-black border-[#00d282]' : 'bg-[#111827] hover:bg-gray-700 text-gray-300'}`}>
                      {copied === 'address' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {depositMemo && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Memo</label>
                    <div className="flex gap-2">
                      <input readOnly value={depositMemo} className="flex-1 bg-[#0B0E14] border border-[#1E2533] rounded-lg py-2 px-3 text-white font-mono text-sm outline-none" />
                      <button type="button" onClick={() => handleCopy(depositMemo, 'memo')} className={`px-3 rounded-lg font-medium transition-all ${copied === 'memo' ? 'bg-amber-500 text-black' : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-500'}`}>
                        {copied === 'memo' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-6">
                Track your transaction on the {explorer?.name || 'blockchain'}.
              </p>

              <div className="bg-[#0B0E14] border border-[#1E2533] rounded-xl p-4 mb-6 text-left">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction Hash</label>
                <p className="text-white font-mono text-sm break-all mt-1">{txHash}</p>
              </div>

              {txUrl && (
                <a href={txUrl} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                  Open in {explorer.name} <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </>
          )}
                </div>
            </div>
        </div>
    );
}
export default ExplorerModal;