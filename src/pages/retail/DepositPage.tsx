// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  ArrowDown, CheckCircle2, AlertCircle, Copy, QrCode,
  Smartphone, Hexagon, Building2, CreditCard,
  Lock, Loader2, AlertTriangle, Store, Users,
  ArrowLeft, Info, ExternalLink, ShieldCheck,
  Clock, ChevronRight, BadgeCheck, Shield, Wallet,
  Radio, Search as SearchIcon, Eye, ChevronDown, Globe2
} from 'lucide-react';
import {
  verifyCardanoDeposit,
  verifyValoraDeposit,
  executeRamp,
  getDepositDetails,
  initiateValoraDeposit,
  checkValoraDepositStatus,
  initiateCryptoDeposit,
  checkDepositStatus,
  activateStellarDeposit
} from '../../api/client';
import ExplorerModal from '../../components/ExplorerModal';
import CrossBorderMomoGrid from '../../components/CrossBorderMomoGrid';
import QRCode from 'react-qr-code';
import useWebsocket from '../../hooks/useWebsocket';

const EXPLORER_URLS: Record<string, { address: string, tx: string, name: string }> = {
  stellar: { address: 'https://stellar.expert/explorer/public/account/', tx: 'https://stellar.expert/explorer/public/tx/', name: 'Stellar.expert' },
  celo: { address: 'https://celoscan.io/address/', tx: 'https://celoscan.io/tx/', name: 'CeloScan' },
  tron: { address: 'https://tronscan.org/#/address/', tx: 'https://tronscan.org/#/transaction/', name: 'Tronscan' },
  polygon: { address: 'https://polygonscan.com/address/', tx: 'https://polygonscan.com/tx/', name: 'Polygonscan' },
  ethereum: { address: 'https://etherscan.io/address/', tx: 'https://etherscan.io/tx/', name: 'Etherscan' },
  cardano: { address: 'https://cardanoscan.io/address/', tx: 'https://cardanoscan.io/transaction/', name: 'Cardanoscan' },
  bitcoin: { address: 'https://mempool.space/address/', tx: 'https://mempool.space/tx/', name: 'Mempool.space' }
};

const CHANNELS = [
  { id: 'Mobile Money', name: 'Mobile Money', subtitle: 'M-Pesa & Airtel', description: 'Direct fiat deposit from your phone', icon: Smartphone, active: true, color: 'text-emerald-400' },
  { id: 'Crypto Wallet', name: 'Crypto Wallet', subtitle: 'Web3', description: 'Deposit stablecoins via blockchain', icon: Hexagon, active: true, color: 'text-emerald-400' },
 // { id: 'Till/Paybill', name: 'Till / Paybill', subtitle: 'Business', description: 'Business collection channels', icon: Store, active: false, color: 'text-gray-500' },
  //{ id: 'Bulk Payments', name: 'Bulk Payments', subtitle: 'Enterprise', description: 'Mass deposit integrations', icon: Users, active: false, color: 'text-gray-500' },
  { id: 'Bank Transfer', name: 'Bank Transfer', subtitle: 'EFT/RTGS', description: 'Wire transfer from local banks', icon: Building2, active: false, color: 'text-gray-500' },
  { id: 'Card', name: 'Debit / Credit Card', subtitle: 'Visa/MC', description: 'Fund via Visa/Mastercard', icon: CreditCard, active: false, color: 'text-gray-500' }
];

const ASSET_CONTRACTS: Record<string, Record<string, string>> = {
  USDC: {
    celo: '0xcebA9300f2b9487105111920b83211e8cB9a246c'
  },
  cUSD: {
    celo: '0x765DE816845861e75A25fCA122bb6898B8B1282a'
  }
};

// Authoritative Celo mainnet contract addresses — must match backend/routes/valora.py
// and backend/workers/celo_deposit_watcher.py exactly, since a wrong address here would
// build a real, signable transaction to the wrong contract. (Note: the ASSET_CONTRACTS
// map above has a stale/incorrect USDC address left over from old dead code — don't use it.)
const CELO_CHAIN_ID_HEX = '0xa4ec'; // 42220
const CELO_ASSET_CONTRACTS: Record<string, string> = {
  cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
};
const CELO_ASSET_DECIMALS: Record<string, number> = { cUSD: 18, USDC: 6, USDT: 6 };

function encodeErc20Transfer(to: string, amount: number, decimals: number): string {
  const selector = 'a9059cbb'; // transfer(address,uint256)
  const cleanTo = to.replace(/^0x/i, '').toLowerCase().padStart(64, '0');
  const amountUnits = BigInt(Math.round(amount * 10 ** decimals));
  const amountHex = amountUnits.toString(16).padStart(64, '0');
  return `0x${selector}${cleanTo}${amountHex}`;
}

async function ensureCeloNetwork(ethereum: any) {
  const chainId = await ethereum.request({ method: 'eth_chainId' });
  if (chainId === CELO_CHAIN_ID_HEX) return;
  try {
    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CELO_CHAIN_ID_HEX }] });
  } catch (switchError: any) {
    if (switchError?.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: CELO_CHAIN_ID_HEX,
          chainName: 'Celo Mainnet',
          nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
          rpcUrls: ['https://forno.celo.org'],
          blockExplorerUrls: ['https://celoscan.io'],
        }],
      });
    } else {
      throw switchError;
    }
  }
}

// Real connect (MetaMask, via window.ethereum) vs. simple shortcuts for wallets/exchanges
// we can't yet connect to programmatically. Trust Wallet and Binance Wallet both support
// WalletConnect, but that needs a Project ID from cloud.reown.com that isn't configured
// yet — flip `connectable: true` for them once VITE_WALLETCONNECT_PROJECT_ID is set up.
const WALLET_OPTIONS = [
  { id: 'metamask', name: 'MetaMask', kind: 'connect', connectable: true },
  { id: 'trustwallet', name: 'Trust Wallet', kind: 'connect', connectable: false },
  { id: 'binancewallet', name: 'Binance Wallet', kind: 'connect', connectable: false },
  { id: 'valora', name: 'Valora', kind: 'shortcut', url: 'https://valoraapp.com/' },
  { id: 'minipay', name: 'MiniPay', kind: 'shortcut', url: 'https://www.opera.com/products/minipay' },
  { id: 'binance', name: 'Binance', kind: 'exchange' },
  { id: 'coinstore', name: 'Coinstore', kind: 'exchange' },
];

// `active: false` networks have no real backend deposit-detection or verification endpoint yet
// (see RETAIL_GO_LIVE_CHECKLIST.md) — they're shown so users can see what's coming, but are not
// selectable. Do not flip one to active until a real detection/verify endpoint backs it.
const ASSET_NETWORKS: Record<string, any[]> = {
  USDT: [
    { id: 'celo', name: 'Celo', time: '~ 5 Secs', active: true },
    { id: 'stellar', name: 'Stellar', time: '~ 5 Secs', active: false },
    { id: 'tron', name: 'Tron (TRC20)', time: '~ 3 Mins', active: false },
    { id: 'polygon', name: 'Polygon', time: '~ 3 Mins', active: false },
    { id: 'ethereum', name: 'Ethereum (ERC20)', time: '~ 5 Mins', active: false },
  ],
  USDC: [
    { id: 'celo', name: 'Celo', time: '~ 5 Secs', active: true },
    { id: 'stellar', name: 'Stellar', time: '~ 5 Secs', active: true },
    { id: 'polygon', name: 'Polygon', time: '~ 3 Mins', active: false },
    { id: 'tron', name: 'Tron (TRC20)', time: '~ 3 Mins', active: false },
  ],
  USDA: [{ id: 'cardano', name: 'Cardano', time: '~ 30-60 Secs', active: true }],
  cUSD: [{ id: 'celo', name: 'Celo', time: '~ 5 Secs', active: true }],
  BTC: [{ id: 'bitcoin', name: 'Bitcoin', time: '~ 30 Mins', active: false }],
};

type DepositPhase = 'idle' | 'listening' | 'detected' | 'confirming' | 'credited' | 'failed';

export default function DepositPage() {
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [channel, setChannel] = useState('Mobile Money');
  const [momoProvider, setMomoProvider] = useState<'MPESA' | 'AIRTEL' | 'CROSS_BORDER'>('AIRTEL');
  // Cross-Border is a third tab alongside M-Pesa/Airtel Money — those two stay
  // exactly as they were; this just reveals CrossBorderMomoGrid instead of the
  // amount/phone fields, since none of those rails are wired up yet.
  const isCrossBorderTab = momoProvider === 'CROSS_BORDER';

  const [amount, setAmount] = useState('');
  const [counterparty, setCounterparty] = useState('');

  const [cryptoAsset, setCryptoAsset] = useState('USDC');
  const [cryptoNetwork, setCryptoNetwork] = useState('celo');

  const [dynamicAddress, setDynamicAddress] = useState('');
  const [dynamicMemo, setDynamicMemo] = useState('');
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  // Stellar-only: showing the address is free, but actually creating the
  // account + USDC trustline costs real, locked XLM — so unlike Celo/Cardano
  // it isn't provisioned just because this page loaded. This tracks whether
  // the currently-shown Stellar address has actually been activated on-chain.
  const [stellarProvisioned, setStellarProvisioned] = useState(false);
  const [isActivatingStellar, setIsActivatingStellar] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toastError, setToastError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [copied, setCopied] = useState<'address' | 'memo' | null>(null);

  // AUTO-DETECTION STATES
  const [depositPhase, setDepositPhase] = useState<DepositPhase>('idle');
  const [depositId, setDepositId] = useState('');
  const [detectedTxHash, setDetectedTxHash] = useState('');
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [manualTxHash, setManualTxHash] = useState('');

  // Explorer Modal State
  const [showExplorer, setShowExplorer] = useState(false);

  // Connect-wallet-and-send state (currently MetaMask only — see WALLET_OPTIONS)
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<{ provider: string; address: string } | null>(null);
  const [walletSendAmount, setWalletSendAmount] = useState('');
  const [walletSendStatus, setWalletSendStatus] = useState<'idle' | 'connecting' | 'ready' | 'sending' | 'sent'>('idle');
  const [walletSendError, setWalletSendError] = useState('');
  const [copiedShortcut, setCopiedShortcut] = useState<string | null>(null);

  const activeAsset = channel === 'Mobile Money' ? 'KES' : cryptoAsset;
  const selectedNetworkDetails = channel === 'Crypto Wallet'
    ? ASSET_NETWORKS[cryptoAsset]?.find(n => n.id === cryptoNetwork)
    : null;
  const currentExplorer = EXPLORER_URLS[cryptoNetwork];
  const [paymentUri, setPaymentUri] = useState('');

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    setDynamicAddress('');
    setDynamicMemo('');
    setDepositPhase('idle');
    setDepositId('');
    setDetectedTxHash('');
    setShowManualFallback(false);
    setShowWalletPicker(false);
    setConnectedWallet(null);
    setWalletSendAmount('');
    setWalletSendStatus('idle');
    setWalletSendError('');
    setStellarProvisioned(false);

    // Don't fetch or fabricate a deposit address for a network that isn't live yet —
    // showing one would wrongly imply deposits on it are actually being watched.
    if (channel === 'Crypto Wallet' && selectedNetworkDetails?.active) {
      setIsFetchingAddress(true);

      getDepositDetails(cryptoAsset, cryptoNetwork)
        .then((res: any) => {
          const payload = res.data?.data || res.data;
          setDynamicAddress(payload?.address || payload?.treasury_address || '');
          setDynamicMemo(payload?.memo || '');
          if (cryptoNetwork === 'stellar') setStellarProvisioned(Boolean(payload?.provisioned));
        })
        .catch(() => {
          // NEVER fall back to a hardcoded shared address for Celo, Cardano, or
          // Stellar: none of them are a real per-user deposit address anymore, so
          // the watcher wouldn't be watching it for this user and anything sent
          // there would go uncredited. Fail loudly instead.
          setToastError('Could not load your deposit address. Please refresh and try again — do not send funds until an address loads.');
        })
        .finally(() => setIsFetchingAddress(false));
    }
  }, [channel, cryptoAsset, cryptoNetwork]);

  // Celo and Cardano have permanent per-user addresses with no "start
  // listening" step — the backend watches every registered address
  // continuously, so as soon as the address loads we're already listening.
  // Stellar is the exception: it's only actually being watched once the user
  // has explicitly activated it (see stellarProvisioned / handleActivateStellar) —
  // activation is what triggers the real on-chain provisioning below.
  useEffect(() => {
    if (channel === 'Crypto Wallet' && dynamicAddress && !isFetchingAddress) {
      if (cryptoNetwork === 'celo' || cryptoNetwork === 'cardano') {
        setDepositPhase('listening');
      } else if (cryptoNetwork === 'stellar' && stellarProvisioned) {
        setDepositPhase('listening');
      }
    }
  }, [channel, cryptoNetwork, dynamicAddress, isFetchingAddress, stellarProvisioned]);

  const handleActivateStellar = async () => {
    setIsActivatingStellar(true);
    setToastError('');
    try {
      const res = await activateStellarDeposit();
      const payload = res?.data?.data || res?.data;
      if (payload?.address) setDynamicAddress(payload.address);
      setStellarProvisioned(true);
      setDepositPhase('listening');
    } catch (err: any) {
      setToastError(err.response?.data?.detail || err.message || 'Could not activate this address. Please try again.');
    } finally {
      setIsActivatingStellar(false);
    }
  };

  useEffect(() => {
    if (!['listening', 'detected', 'confirming'].includes(depositPhase) || !depositId) return;

    const pollStatus = async () => {
      try {
        if (cryptoNetwork === 'celo') {
          const res = await checkValoraDepositStatus(depositId);
          const currentStatus = res.data.status;

          if (currentStatus === 'credited') {
            setDepositPhase('credited');
            setDetectedTxHash(res.data.tx_hash);
            setSuccessMsg(`${amount} ${activeAsset} successfully verified on-chain and credited!`);
          } else if (currentStatus === 'failed') {
            setDepositPhase('failed');
            setToastError(res.data.message || 'Deposit verification failed.');
          }
        } else if (cryptoNetwork === 'stellar') {
          const res = await checkDepositStatus(depositId);
          const currentStatus = res.data.status;

          if (currentStatus === 'credited') {
            setDepositPhase('credited');
            setDetectedTxHash(res.data.tx_hash);
            setSuccessMsg(`${amount} ${activeAsset} successfully verified on Stellar and credited!`);
          } else if (currentStatus === 'failed') {
            setDepositPhase('failed');
            setToastError(res.data.message || 'Deposit verification failed.');
          }
        }
        // No other network reaches 'listening' with a depositId — automatic detection
        // only exists for Celo and Stellar (see initiate handler).
      } catch (err) {
        console.error("Poll error:", err);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 4000);
    return () => clearInterval(interval);
  }, [depositPhase, depositId, cryptoNetwork, activeAsset, amount]);

  // Real-time push: the backend watcher (workers/celo_deposit_watcher.py) broadcasts
  // a `deposit_credited` event the instant it sees the on-chain transfer, so the UI
  // doesn't have to wait for its next 4s poll — this is what makes it feel instant.
  const currentUserId = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('meshex_user') || 'null');
      return stored ? (stored._id || stored.id || null) : null;
    } catch { return null; }
  })();

  useWebsocket('/ws/dashboard', currentUserId, (msg: any) => {
    if (!msg || msg.type !== 'deposit_credited') return;

    if (msg.network === 'celo' || msg.network === 'cardano' || msg.network === 'stellar') {
      // Celo/Cardano/Stellar addresses are permanent, not one-off sessions — only
      // react if we're actually looking at the asset that was just credited, and
      // stay "listening" afterward since more deposits can arrive at the same address.
      if (msg.network !== cryptoNetwork || msg.asset !== cryptoAsset) return;
      setDetectedTxHash(msg.txHash);
      setSuccessMsg(`${msg.amount} ${msg.asset} received and credited!`);
      return;
    }

    if (msg.depositId && msg.depositId !== depositId) return;
    setDepositPhase('credited');
    setDetectedTxHash(msg.txHash);
    setSuccessMsg(`${msg.amount} ${msg.asset} successfully verified on-chain and credited!`);
  });

  const handleCopy = (text: string, type: 'address' | 'memo') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConnectMetaMask = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setWalletSendError('MetaMask was not detected. Install the MetaMask browser extension to use this option.');
      return;
    }
    if (walletSendStatus === 'connecting') return; // already have a request in flight — don't queue a duplicate
    setWalletSendStatus('connecting');
    setWalletSendError('');
    try {
      // MetaMask's popup can end up hidden behind the browser window with nothing
      // visibly wrong — if it doesn't resolve in 20s, stop waiting and say so instead
      // of leaving the button stuck on "Connecting..." forever.
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'CONNECT_TIMEOUT' })), 20000)
      );
      const accounts = await Promise.race([
        ethereum.request({ method: 'eth_requestAccounts' }),
        timeout,
      ]) as string[];
      await ensureCeloNetwork(ethereum);
      setConnectedWallet({ provider: 'MetaMask', address: accounts[0] });
      setWalletSendStatus('ready');
    } catch (err: any) {
      if (err?.code === -32002) {
        setWalletSendError('MetaMask already has a connection request open. Click the MetaMask icon in your browser toolbar (top-right) — the popup is waiting there, possibly hidden behind this window. Approve or reject it, then click Connect again.');
      } else if (err?.code === 'CONNECT_TIMEOUT') {
        setWalletSendError('MetaMask didn\'t respond in time. Click the MetaMask icon in your browser toolbar to check for a stuck popup and close it, then try again.');
      } else if (err?.code === 4001) {
        setWalletSendError('Connection request was rejected in MetaMask.');
      } else {
        setWalletSendError(err?.message || 'Could not connect to MetaMask.');
      }
      setWalletSendStatus('idle');
    }
  };

  const handleSendFromConnectedWallet = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum || !connectedWallet || !dynamicAddress) return;
    const numAmount = parseFloat(walletSendAmount);
    if (!numAmount || numAmount <= 0) {
      setWalletSendError('Enter a valid amount to send.');
      return;
    }
    setWalletSendStatus('sending');
    setWalletSendError('');
    try {
      const contract = CELO_ASSET_CONTRACTS[cryptoAsset];
      const decimals = CELO_ASSET_DECIMALS[cryptoAsset];
      if (!contract || decimals === undefined) {
        throw new Error(`${cryptoAsset} is not supported for direct wallet transfer yet.`);
      }
      const data = encodeErc20Transfer(dynamicAddress, numAmount, decimals);
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: connectedWallet.address, to: contract, data }],
      });
      setWalletSendStatus('sent');
      setDetectedTxHash(txHash);
      setSuccessMsg(`Transfer submitted from ${connectedWallet.provider} — it'll be credited automatically within seconds of confirmation.`);
    } catch (err: any) {
      setWalletSendError(err?.message || 'Transaction was rejected or failed.');
      setWalletSendStatus('ready');
    }
  };

  const handleWalletShortcut = (option: typeof WALLET_OPTIONS[number]) => {
    setWalletSendError(''); // a shortcut click isn't a MetaMask attempt — don't show a stale connect error
    if (option.kind === 'shortcut' && option.url) {
      window.open(option.url, '_blank', 'noopener,noreferrer');
    }
    if (dynamicAddress) {
      navigator.clipboard.writeText(dynamicAddress);
      setCopiedShortcut(option.id);
      setTimeout(() => setCopiedShortcut(null), 2500);
    }
  };

  const handleChannelSelect = (selectedChannelId: string) => {
    setChannel(selectedChannelId);
    setToastError(''); setSuccessMsg('');
    setAmount(''); setCounterparty('');
    setDepositPhase('idle'); setDepositId('');
    setStep('form');
  };

  // NOTE: now that Celo, Cardano, and Stellar all use the permanent-address
  // model (no amount/button gating — see the ['celo','cardano','stellar']
  // check around the "Always Watching This Address" panel below), this whole
  // handler is unreachable through the UI: only active networks can be
  // selected, and every active network renders the permanent-address panel
  // instead of this form. Left in place rather than deleted alongside an
  // otherwise-unrelated change — safe to remove in a dedicated cleanup pass,
  // along with initiateCryptoDeposit/checkValoraDepositStatus/checkDepositStatus.
  const handleInitiateCryptoDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setLoading(true); setToastError('');

    try {
      let depositResponse;
      if (cryptoNetwork === 'celo') {
        depositResponse = await initiateValoraDeposit({ asset: cryptoAsset, amount: numAmount });
      } else if (cryptoNetwork === 'stellar') {
        depositResponse = await initiateCryptoDeposit({ asset: cryptoAsset, amount: numAmount });
      } else {
        // No automatic on-chain detection exists for this network yet. Send the user
        // straight to manual tx-hash verification instead of fabricating a deposit.
        setLoading(false);
        setShowManualFallback(true);
        setToastError('Automatic detection is not available for this network yet. Send the funds, then verify with your transaction hash below.');
        return;
      }

      const newDepositId = depositResponse.data.deposit_id;
      setDepositId(newDepositId);
      if (depositResponse.data.memo) setDynamicMemo(depositResponse.data.memo);

      // --- DEEP LINK / QR CODE GENERATION ---
      let uri = '';
      const address = dynamicAddress;
      const memo = depositResponse.data.memo || dynamicMemo;

      if (cryptoNetwork === 'celo') {
        const tokenAddress = ASSET_CONTRACTS[cryptoAsset]?.[cryptoNetwork];
        uri = `celo://wallet/pay?address=${address}&amount=${numAmount}&tokenAddress=${tokenAddress}&displayName=Jasiri+Capital&comment=Deposit+${newDepositId}`;
      } else if (cryptoNetwork === 'stellar') {
        uri = `web+stellar:pay?destination=${address}&amount=${numAmount}&memo=${memo}&memo_type=text`;
      } else if (cryptoNetwork === 'cardano') {
        uri = `web+cardano:${address}?amount=${numAmount * 1000000}`; // Assuming 6 decimal places for USDA
      } else {
        uri = `${cryptoNetwork}:${address}?amount=${numAmount}`; // Generic fallback
      }
      setPaymentUri(uri);
      setDepositPhase('listening');

    } catch (err: any) {
      setToastError(err.response?.data?.detail || err.message || "Failed to start deposit listener.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTxHash || manualTxHash.length < 10) return;
    if (!amount || parseFloat(amount) <= 0) {
      setToastError("Please enter the amount you deposited before verifying.");
      return;
    }
    setLoading(true); setToastError('');

    try {
      const numAmt = parseFloat(amount);
      if (cryptoNetwork === 'cardano') {
        await verifyCardanoDeposit({ amount: numAmt, tx_hash: manualTxHash, counterparty: 'Cardano On Chain' });
      } else if (cryptoNetwork === 'celo') {
        await verifyValoraDeposit({ amount: numAmt, tx_hash: manualTxHash, asset: cryptoAsset, counterparty: 'Valora On Chain' });
      } else {
        // Stellar (and any other network without a manual-verify endpoint) relies on
        // real automatic detection instead — never credit a balance without a backend check.
        setToastError('Manual verification is not available for this network. Please wait for automatic detection to confirm your deposit.');
        setLoading(false);
        return;
      }
      setDepositPhase('credited');
      setDetectedTxHash(manualTxHash);
      setSuccessMsg("Transaction manually verified and credited!");
    } catch (err: any) {
      setToastError(err.response?.data?.detail || err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const validateKenyanPhone = (phone: string, provider: 'MPESA' | 'AIRTEL') => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10 && cleanPhone.length !== 12) {
        return { valid: false, msg: "Kenyan phone numbers must be 10 or 12 digits (e.g., 07... or 2547...).", formatted: "" };
    }
    const normalized = cleanPhone.length === 12 ? '0' + cleanPhone.slice(3) : cleanPhone;
    const apiFormatted = cleanPhone.length === 10 ? '254' + cleanPhone.slice(1) : cleanPhone;

    const safaricomRegex = /^0(7([01249][0-9]|5[7-9]|6[8-9])|11[0-5])[0-9]{6}$/;
    const airtelRegex = /^0(7(3[0-9]|5[0-6]|8[0-9])|10[0-2])[0-9]{6}$/;

    if (provider === 'MPESA' && !safaricomRegex.test(normalized)) {
        return { valid: false, msg: "This is not a valid Safaricom M-Pesa number prefix.", formatted: "" };
    }
    if (provider === 'AIRTEL' && !airtelRegex.test(normalized)) {
        return { valid: false, msg: "This is not a valid Airtel Money number prefix.", formatted: "" };
    }
    return { valid: true, msg: "", formatted: apiFormatted };
  };

  const handleMpesaDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (momoProvider === 'CROSS_BORDER') return; // no real rail to submit to yet
    setToastError(''); setSuccessMsg(''); setLoading(true);
    try {
      if (!counterparty) throw new Error("Mobile Money phone number is required.");
      if (!amount || Number(amount) <= 0) throw new Error("Please enter a valid deposit amount.");
      const validation = validateKenyanPhone(counterparty, momoProvider);
      if (!validation.valid) throw new Error(validation.msg);

      const res = await executeRamp({ direction: 'on', channel, from_asset: 'KES', to_asset: 'KES', amount: parseFloat(amount), rate: 1, fee: 0, counterparty, momo_provider: momoProvider === 'MPESA' ? 'M-Pesa' : 'Airtel' });
      const payload = res?.data || {};
      const recipient = payload?.recipient ? ` to ${payload.recipient}` : '';
      const providerRef = payload?.providerReference ? ` Ref: ${payload.providerReference}.` : '';
      const ackId = payload?.gatewayAckId ? ` Ack: ${payload.gatewayAckId}.` : '';
      const nextStep = payload?.nextStep ? ` ${payload.nextStep}` : '';
      setSuccessMsg(`STK request sent${recipient}.${providerRef}${ackId}${nextStep}`.replace(/\.\./g, '.'));
      setAmount(''); setCounterparty('');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const backendText = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : '';
      setToastError(backendText || err.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-3 mb-8">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30`}>
        {step === 'select' ? <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px]">1</span> : <CheckCircle2 className="w-4 h-4" />}
        Channel
      </div>
      <div className={`w-8 h-px ${step === 'form' ? 'bg-emerald-500/50' : 'bg-[#1E2533]'}`} />
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${step === 'form' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-[#111827] text-gray-600 border border-[#1E2533]'}`}>
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'form' ? 'bg-emerald-500 text-black' : 'bg-[#1E2533] text-gray-500'}`}>2</span>
        Details
      </div>
    </div>
  );

  const StatusTracker = () => {
    const steps = [
      { id: 'listening' as DepositPhase, label: 'Waiting for deposit', Icon: Radio },
      { id: 'detected' as DepositPhase, label: 'Detected on chain', Icon: SearchIcon },
      { id: 'confirming' as DepositPhase, label: 'Confirming blocks', Icon: Loader2 },
      { id: 'credited' as DepositPhase, label: 'Funds credited', Icon: CheckCircle2 },
    ];

    const currentIdx = steps.findIndex(s => s.id === depositPhase);

    return (
      <div className="space-y-2 mt-4 animate-in fade-in duration-300">
        {steps.map((step, i) => {
          const isCompleted = currentIdx > i || depositPhase === 'credited';
          const is_active = currentIdx === i && depositPhase !== 'credited';

          return (
            <div key={step.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${is_active ? 'bg-[#0F1520] border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]' :
              isCompleted ? 'bg-transparent border-emerald-500/10' :
                'border-[#1E2533]/30 opacity-40'
              }`}>
              <div className={`p-1.5 rounded-lg ${is_active ? 'bg-[#111827]' : isCompleted ? 'bg-emerald-500/5' : 'bg-[#1E2533]'}`}>
                <step.Icon className={`w-4 h-4 ${is_active ? 'text-emerald-400 animate-pulse' : isCompleted ? 'text-emerald-500/50' : 'text-gray-600'} ${is_active && step.id === 'confirming' ? 'animate-spin' : ''}`} />
              </div>
              <span className={`text-sm font-medium flex-1 ${is_active ? 'text-white' : isCompleted ? 'text-emerald-500/50' : 'text-gray-500'}`}>
                {step.label}
              </span>

              {(is_active || isCompleted) && (step.id === 'detected' || step.id === 'confirming' || step.id === 'credited') && detectedTxHash && currentExplorer && (
                <button
                  type="button"
                  onClick={() => setShowExplorer(true)}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-lg"
                >
                  <Eye className="w-3.5 h-3.5" /> View Tx
                </button>
              )}

              {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />}
            </div>
          );
        })}
      </div>
    );
  };

  if (step === 'select') {
    return (
      <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300 pt-4 px-4 md:px-0">
        <StepIndicator />
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
              <ArrowDown className="w-7 h-7 text-emerald-500" />
            </div>
            Deposit Funds
          </h2>
          <p className="text-gray-400 mt-3 text-[15px]">Choose how you'd like to fund your account</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHANNELS.map((c, index) => (
            <button type="button" key={c.id} disabled={!c.active} onClick={() => handleChannelSelect(c.id)}
              className={`group relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-start gap-4 text-left overflow-hidden ${!c.active ? 'bg-[#0B0E14]/30 border-[#1E2533]/30 text-gray-600 cursor-not-allowed opacity-60 hover:opacity-70' : 'bg-[#111827] border-[#1E2533] hover:border-emerald-500/30 hover:shadow-lg hover:-translate-y-0.5'}`}
              style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-start justify-between w-full relative z-10">
                <div className={`p-3 rounded-xl border transition-colors ${c.active ? 'bg-white/5 border-white/10' : 'bg-[#1e2d3d]'}`}><c.icon className={`w-6 h-6 ${c.active ? c.color : 'text-gray-500'}`} /></div>
                {c.active && <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />}
              </div>
              <div className="relative z-10 mt-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-lg font-bold ${c.active ? 'text-white' : 'text-gray-500'}`}>{c.name}</span>
                </div>
                <span className="text-xs text-gray-500 leading-relaxed">{c.description}</span>
              </div>
              {!c.active && (
                <span className="absolute top-4 right-4 text-[9px] bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-lg font-bold tracking-wider flex items-center gap-1.5 border border-cyan-500/20">
                  <Lock className="w-3 h-3" /> SOON
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in slide-in-from-right-8 duration-300 pt-4 px-4 md:px-0">
      <StepIndicator />
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('select')} className="p-2.5 bg-[#111827] border border-[#1E2533] rounded-xl hover:bg-[#1a2638] hover:text-white hover:border-gray-500 transition-all text-gray-400 group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Deposit via {CHANNELS.find(c => c.id === channel)?.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{CHANNELS.find(c => c.id === channel)?.description}</p>
          </div>
        </div>
      </div>

      {toastError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{toastError}</span>
          <button onClick={() => setToastError('')} className="text-red-400/50 hover:text-red-400 transition-colors">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400/50 hover:text-emerald-400 transition-colors">✕</button>
        </div>
      )}

      { }
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-7 bg-[#0b0f17] border border-[#1E2533] rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden h-fit">

          {channel === 'Mobile Money' ? (
            <form onSubmit={handleMpesaDeposit} className="space-y-6">
              <div className="space-y-3 pb-6 border-b border-[#1E2533]">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                  Select Mobile Money Provider
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setMomoProvider('MPESA')}
                    className={`relative p-3.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${momoProvider === 'MPESA' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-[#0B0E14] border-[#1E2533] text-gray-400 hover:border-gray-500'}`}
                  >
                    <Smartphone className="w-4 h-4" /> M-Pesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setMomoProvider('AIRTEL')}
                    className={`p-3.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      momoProvider === 'AIRTEL'
                        ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                        : 'bg-[#0B0E14] border-[#1E2533] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> Airtel Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setMomoProvider('CROSS_BORDER')}
                    className={`p-3.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      isCrossBorderTab
                        ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                        : 'bg-[#0B0E14] border-[#1E2533] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <Globe2 className="w-4 h-4" /> Cross-Border
                  </button>
                </div>
              </div>

              {isCrossBorderTab ? (
                <CrossBorderMomoGrid />
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Amount to Deposit</label>
                    <div className={`relative transition-all duration-200 rounded-xl ${focusedField === 'amount' ? 'ring-2 ring-emerald-500/20' : ''}`}>
                      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} onFocus={() => setFocusedField('amount')} onBlur={() => setFocusedField(null)} placeholder="0.00" className="w-full bg-[#111827] border border-[#1E2533] focus:border-emerald-500/50 outline-none rounded-xl py-4 pl-5 pr-20 text-xl font-bold text-white transition-all font-mono placeholder-gray-600" required />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2"><span className="font-bold text-emerald-400">{activeAsset}</span></div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      {momoProvider === 'MPESA' ? 'M-Pesa' : 'Airtel Money'} Phone Number
                    </label>
                    <input type="text" value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="07XXXXXXXX" className="w-full bg-[#111827] border border-[#1E2533] focus:border-emerald-500/50 outline-none rounded-xl py-3.5 px-5 text-sm text-white transition-all font-mono placeholder-gray-600" required />
                  </div>
                  <button type="submit" disabled={loading || !amount || !counterparty} className="w-full py-4 px-4 rounded-xl font-extrabold text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 bg-[#00d282] hover:bg-[#00e68e] text-black shadow-[0_0_20px_rgba(0,210,130,0.2)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    Request STK Push
                  </button>
                </>
              )}
            </form>
          )
          : (
            <form onSubmit={handleInitiateCryptoDeposit} className="space-y-6">
              <div className="space-y-6 pb-6 border-b border-[#1E2533]/50">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                    <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold flex items-center justify-center border border-emerald-500/20">1</span> Select Asset</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(ASSET_NETWORKS).map(asset => {
                      const hasActiveNetwork = ASSET_NETWORKS[asset].some((n: any) => n.active);
                      return (
                        <button
                          key={asset}
                          type="button"
                          onClick={() => {
                            setCryptoAsset(asset);
                            const defaultNet = ASSET_NETWORKS[asset].find((n: any) => n.active) || ASSET_NETWORKS[asset][0];
                            setCryptoNetwork(defaultNet.id);
                          }}
                          className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border ${cryptoAsset === asset ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/30' : 'bg-[#111827] text-gray-400 border-[#1E2533] hover:border-gray-500 hover:text-gray-300'} ${!hasActiveNetwork ? 'opacity-60' : ''}`}
                        >
                          {asset}
                          {!hasActiveNetwork && (
                            <span className="absolute -top-2 -right-2 text-[8px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-lg font-bold tracking-wider flex items-center gap-1 border border-cyan-500/20">
                              <Lock className="w-2.5 h-2.5" /> SOON
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                    <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold flex items-center justify-center border border-emerald-500/20">2</span> Select Network</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(ASSET_NETWORKS[cryptoAsset] || []).map(net => (
                      <button
                        key={net.id}
                        type="button"
                        disabled={!net.active}
                        title={!net.active ? 'Coming soon — not available for deposits yet' : undefined}
                        onClick={() => net.active && setCryptoNetwork(net.id)}
                        className={`relative p-4 rounded-xl text-left transition-all duration-200 border overflow-hidden ${!net.active ? 'bg-[#0B0E14]/30 border-[#1E2533]/30 opacity-50 cursor-not-allowed' : cryptoNetwork === net.id ? 'bg-blue-500/5 border-blue-500/30' : 'bg-[#111827] border-[#1E2533] hover:border-gray-500'}`}
                      >
                        {!net.active && (
                          <span className="absolute top-2 right-2 text-[8px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-lg font-bold tracking-wider flex items-center gap-1 border border-cyan-500/20 z-10">
                            <Lock className="w-2.5 h-2.5" /> SOON
                          </span>
                        )}
                        <div className="flex justify-between items-start mb-2 relative z-0">
                          <span className={`text-sm font-bold ${!net.active ? 'text-gray-500' : cryptoNetwork === net.id ? 'text-white' : 'text-gray-300'}`}>{net.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs relative z-0">
                          <span className="text-gray-500">Est. Arrival</span>
                          <div className="flex items-center gap-1.5 text-gray-400"><Clock className="w-3 h-3" /><span className="font-mono">{net.time}</span></div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {cryptoNetwork === 'stellar' && !stellarProvisioned ? (
                // Unlike Celo/Cardano, a Stellar address costs real, locked XLM to
                // actually bring into existence — so it's not auto-provisioned just
                // because this page loaded. One explicit tap triggers the real
                // on-chain account + USDC trustline creation (see
                // POST /api/treasury/stellar/activate-deposit).
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-400 font-bold mb-1">Activation Needed</p>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">
                      This address needs a one-time on-chain activation before it can receive USDC. Tap below to activate it — this only needs to happen once.
                    </p>
                    <button
                      type="button"
                      onClick={handleActivateStellar}
                      disabled={isActivatingStellar || !dynamicAddress}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isActivatingStellar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                      {isActivatingStellar ? 'Activating...' : 'Activate This Address'}
                    </button>
                  </div>
                </div>
              ) : ['celo', 'cardano', 'stellar'].includes(cryptoNetwork) ? (
                // Celo, Cardano, and an activated Stellar address all use a
                // permanent, always-on address per user — no amount to pre-commit
                // and nothing to "start": send anytime, any amount, and the
                // background watcher credits it automatically.
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                  <Radio className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="text-sm text-emerald-400 font-bold mb-1">Always Watching This Address</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      This address is permanently yours — send any amount of {cryptoAsset} to it anytime and it's credited automatically within {cryptoNetwork === 'cardano' ? 'under a minute of' : 'seconds of'} on-chain confirmation. No need to enter an amount first.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Amount to Deposit</label>
                    <div className={`relative transition-all duration-200 rounded-xl ${focusedField === 'amount' ? 'ring-2 ring-emerald-500/20' : ''}`}>
                      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} onFocus={() => setFocusedField('amount')} onBlur={() => setFocusedField(null)} placeholder="0.00" className="w-full bg-[#0a0d14] border border-[#1E2533] focus:border-emerald-500/50 outline-none rounded-xl py-4 pl-5 pr-20 text-xl font-bold text-white transition-all font-mono placeholder-gray-600 shadow-inner" required />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2"><span className="font-bold text-emerald-400">{activeAsset}</span></div>
                    </div>
                  </div>

                  <button type="submit" disabled={loading || !amount || depositPhase !== 'idle' || !selectedNetworkDetails?.active} className="w-full py-4 px-4 rounded-xl font-extrabold text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 bg-[#0b6e4f] hover:bg-[#0e8a64] text-white shadow-[0_0_20px_rgba(11,110,79,0.2)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
                    {!selectedNetworkDetails?.active ? 'Not Available Yet' : depositPhase !== 'idle' ? 'Listening for Deposit...' : 'Get Deposit Instructions'}
                  </button>
                </>
              )}

              {cryptoNetwork === 'celo' && (
                <div className="border-t border-[#1E2533]/50 pt-4">
                  <button type="button" onClick={() => setShowWalletPicker(!showWalletPicker)} className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors py-2">
                    <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Connect an External Wallet</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showWalletPicker ? 'rotate-180' : ''}`} />
                  </button>

                  {showWalletPicker && (
                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {WALLET_OPTIONS.map(option => {
                          const isLocked = option.kind === 'connect' && !option.connectable;
                          const isConnectedHere = connectedWallet?.provider === option.name;
                          const isConnectingHere = option.kind === 'connect' && option.connectable && walletSendStatus === 'connecting';
                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={isLocked || isConnectingHere}
                              title={isLocked ? 'Coming soon — needs WalletConnect setup' : undefined}
                              onClick={() => {
                                if (isLocked || isConnectingHere) return;
                                if (option.kind === 'connect') { handleConnectMetaMask(); return; }
                                handleWalletShortcut(option);
                              }}
                              className={`relative px-3 py-2.5 rounded-lg text-xs font-bold border transition-all ${isLocked ? 'bg-[#0B0E14]/30 border-[#1E2533]/30 text-gray-600 cursor-not-allowed opacity-60' : isConnectedHere ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-[#111827] border-[#1E2533] text-gray-300 hover:border-gray-500'} ${isConnectingHere ? 'opacity-60 cursor-wait' : ''}`}
                            >
                              {isConnectingHere ? 'Connecting...' : option.name}
                              {isLocked && (
                                <span className="absolute -top-2 -right-2 text-[7px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded-md font-bold tracking-wider flex items-center gap-0.5 border border-cyan-500/20">
                                  <Lock className="w-2 h-2" /> SOON
                                </span>
                              )}
                              {copiedShortcut === option.id && (
                                <span className="absolute -top-2 -right-2 text-[7px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md font-bold border border-emerald-500/30">
                                  COPIED
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {['binance', 'coinstore'].some(id => copiedShortcut === id) && (
                        <p className="text-[11px] text-gray-500 leading-relaxed">Address copied. Open the app, choose Withdraw, paste this address, and select the Celo network.</p>
                      )}

                      {walletSendError && (
                        <p className="text-[11px] text-red-400 leading-relaxed">{walletSendError}</p>
                      )}

                      {connectedWallet && (walletSendStatus === 'ready' || walletSendStatus === 'sending' || walletSendStatus === 'sent') && (
                        <div className="p-3 bg-[#0a0d14] border border-[#1E2533] rounded-xl space-y-2">
                          <p className="text-[11px] text-gray-400">
                            Connected: <span className="text-white font-mono">{connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)}</span> ({connectedWallet.provider})
                          </p>
                          <div className="relative">
                            <input type="number" value={walletSendAmount} onChange={e => setWalletSendAmount(e.target.value)} placeholder="0.00" className="w-full bg-[#111827] border border-[#1E2533] focus:border-emerald-500/50 outline-none rounded-lg py-2.5 pl-3 pr-16 text-sm text-white font-mono placeholder-gray-600" />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2"><span className="font-bold text-emerald-400 text-xs">{cryptoAsset}</span></div>
                          </div>
                          <button
                            type="button"
                            onClick={handleSendFromConnectedWallet}
                            disabled={walletSendStatus === 'sending' || !walletSendAmount}
                            className="w-full py-2.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {walletSendStatus === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                            {walletSendStatus === 'sent' ? 'Sent — send another' : `Send from ${connectedWallet.provider}`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {['cardano', 'celo'].includes(cryptoNetwork) && (
                <div className="border-t border-[#1E2533]/50 pt-4">
                  <button type="button" onClick={() => setShowManualFallback(!showManualFallback)} className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors py-2">
                    <span>Having issues? Verify with Tx Hash manually</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showManualFallback ? 'rotate-180' : ''}`} />
                  </button>

                  {showManualFallback && (
                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      {['celo', 'cardano'].includes(cryptoNetwork) && (
                        <div className="relative">
                          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount sent" className="w-full bg-[#0a0d14] border border-[#1E2533] focus:border-blue-500/50 outline-none rounded-xl py-3 pl-5 pr-16 text-sm text-white transition-all font-mono placeholder-gray-600 shadow-inner" required />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2"><span className="font-bold text-gray-500 text-xs">{cryptoAsset}</span></div>
                        </div>
                      )}
                      <div className="relative">
                        <input type="text" value={manualTxHash} onChange={e => setManualTxHash(e.target.value)} placeholder="Paste TxHash from your wallet here..." className="w-full bg-[#0a0d14] border border-[#1E2533] focus:border-blue-500/50 outline-none rounded-xl py-3.5 pl-5 pr-12 text-sm text-white transition-all font-mono placeholder-gray-600 shadow-inner" required />
                      </div>
                      <button type="button" onClick={handleManualVerify} disabled={loading || !manualTxHash} className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Submit Hash Manually
                      </button>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}
        </div>

        { }
        <div className="lg:col-span-5 space-y-5">
          {channel === 'Crypto Wallet' && (
            <div className="bg-[#0b0f17] border border-[#1E2533] rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3 border-b border-[#1E2533] flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" /> Deposit Details
                </h3>
              </div>

              <div className="p-5 space-y-5">
                {!selectedNetworkDetails?.active ? (
                  <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl flex items-start gap-3">
                    <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-cyan-400 font-bold mb-1">Coming Soon</p>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Deposits over the {selectedNetworkDetails?.name || cryptoNetwork} network aren't live yet — we're still building real-time deposit detection for it. Use Celo, Stellar, or Cardano in the meantime.
                      </p>
                    </div>
                  </div>
                ) : (
                <>
                {depositPhase === 'listening' && paymentUri && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl animate-in fade-in duration-300 space-y-4">
                    <p className="text-sm text-emerald-400 font-bold flex items-center gap-2"><Wallet className="w-4 h-4" /> Pay From Your Wallet</p>
                    <p className="text-xs text-gray-400 leading-relaxed">Use the button to open your wallet app, or scan the QR code. The system is now listening for your deposit.</p>
                    <div className="flex gap-3">
                      <a
                        href={paymentUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/10"
                      >
                        <Wallet className="w-4 h-4" /> Open Wallet
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowExplorer(true)}
                        className="p-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-emerald-500/20 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Rendered here (not nested in the "listening" block above) so Celo's
                    "View Last Deposit" button can open it even when there's no paymentUri. */}
                <ExplorerModal
                  isOpen={showExplorer}
                  onClose={() => setShowExplorer(false)}
                  txHash={detectedTxHash}
                  network={cryptoNetwork}
                  paymentUri={depositPhase === 'listening' ? paymentUri : ''}
                  depositAddress={dynamicAddress}
                  depositMemo={dynamicMemo}
                />

                {cryptoNetwork === 'celo' && (
                  <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                    <p className="text-sm text-blue-400 font-bold mb-1 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Best Experience: Use Valora</p>
                    <p className="text-xs text-gray-400 mb-3 leading-relaxed">For instant, low-fee transfers.</p>
                    <a href="https://valoraapp.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">Download Valora <ExternalLink className="w-3 h-3" /></a>
                  </div>
                )}

                {(depositPhase !== 'listening' || ['celo', 'cardano', 'stellar'].includes(cryptoNetwork)) && <div className="space-y-3">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Send {activeAsset} to this address:</p>
                  <div className="flex gap-2">
                    {isFetchingAddress ? (
                      <div className="flex-1 bg-[#111827] border border-[#1E2533] rounded-lg py-3 px-3 flex items-center justify-center"><Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /></div>
                    ) : (
                      <>
                        <input readOnly value={dynamicAddress || ''} className="flex-1 bg-[#111827] border border-[#1E2533] rounded-lg py-3 px-3 text-gray-400 text-xs font-mono outline-none shadow-inner" />
                        <button type="button" onClick={() => handleCopy(dynamicAddress, 'address')} className={`px-4 rounded-lg transition-all border border-[#1E2533] ${copied === 'address' ? 'bg-[#00d282] text-black border-[#00d282]' : 'bg-[#111827] hover:bg-gray-700 text-gray-300'}`}>
                          {copied === 'address' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>}

                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                  <p className="text-xs text-red-400/80 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Only send <strong className="text-white">{activeAsset}</strong> over the <strong className="text-white">{selectedNetworkDetails?.name}</strong> network.</span>
                  </p>
                </div>

                {/* STATUS TRACKER RENDERS HERE WHEN ACTIVE */}
                {depositPhase !== 'idle' && <StatusTracker />}

                {/* Celo/Cardano/Stellar addresses stay permanently "listening", so the stepn tacker never reaches "credited" — surface the most recent tx separately. */}
                {['celo', 'cardano', 'stellar'].includes(cryptoNetwork) && detectedTxHash && currentExplorer && (
                  <button
                    type="button"
                    onClick={() => setShowExplorer(true)}
                    className="w-full flex items-center justify-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 px-3 py-2.5 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Last Deposit on {currentExplorer.name}
                  </button>
                )}
                </>
                )}

              </div>
            </div>
          )}

          {channel === 'Mobile Money' && !isCrossBorderTab && (
            <div className="bg-[#111827] border border-[#1E2533] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1E2533] bg-[#0B0E14]/50">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-emerald-500" /> {momoProvider === 'MPESA' ? 'M-Pesa' : 'Airtel Money'} Procedure</h3>
              </div>
              <div className="p-5">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5 text-xs text-gray-400"><CheckCircle2 className="w-4 h-4 text-emerald-500/50 shrink-0 mt-0.5" /><span>Use an active {momoProvider === 'MPESA' ? 'Safaricom M-Pesa' : 'Airtel Money'} line on this phone.</span></li>
                  <li className="flex items-start gap-2.5 text-xs text-gray-400"><CheckCircle2 className="w-4 h-4 text-emerald-500/50 shrink-0 mt-0.5" /><span>Deposits reflect within <strong className="text-white">seconds</strong> of entering your PIN.</span></li>
                  <li className="flex items-start gap-2.5 text-xs text-gray-400"><AlertCircle className="w-4 h-4 text-amber-500/50 shrink-0 mt-0.5" /><span>If STK Push fails, ensure you aren't blocking promotional messages.</span></li>
                </ul>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* RENDER THE BLOCKCHAIN EXPLORER MODAL */}
      {/* This is now conditionally rendered inside the crypto wallet panel when a payment URI is generated */}
      {/* Keeping a fallback here in case it's needed elsewhere */}
      {/* <ExplorerModal
        isOpen={showExplorer}
        onClose={() => setShowExplorer(false)}
        txHash={detectedTxHash}
        network={cryptoNetwork}
      /> */}

    </div>
  );
}