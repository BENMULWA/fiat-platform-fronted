// @ts-nocheck
import React, { useEffect, useState } from 'react';
import SimpleToast from '../../components/ui/SimpleToast';
import { getCompanyRevenue, postCompanyWithdraw, getCompanyWithdrawals } from '../../api/client';

export default function CompanyRevenue() {
  const [revenue, setRevenue] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [asset, setAsset] = useState('KES');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('internal');
  const [destination, setDestination] = useState('');
  const [toasts, setToasts] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await getCompanyRevenue();
      setRevenue(res.data.revenue || {});
      if (Object.keys(res.data.revenue || {}).length > 0) setAsset(Object.keys(res.data.revenue || {})[0]);
    } catch (err) {
      addToast('Failed to load company revenue', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await getCompanyWithdrawals({ limit: 20 });
      setWithdrawals(res.data.items || []);
    } catch (err) {
      // ignore silently
    }
  };

  useEffect(() => { fetch(); }, []);
  useEffect(() => { fetchWithdrawals(); }, []);

  function addToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const id = Date.now() + Math.random();
    setToasts((s) => [...s, { id, message, type }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), 6000);
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!asset || !amt || amt <= 0) return addToast('Enter valid asset and amount', 'error');

    const payload: any = { asset, amount: amt, method, destination: {} };
    if (method === 'internal') payload.destination.userId = destination;
    if (method === 'airtel') payload.destination.phone = destination;

    try {
      const res = await postCompanyWithdraw(payload);
      addToast(res.data?.message || 'Withdrawal requested', 'success');
      setAmount(''); setDestination('');
      fetch();
      fetchWithdrawals();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Withdrawal failed';
      addToast(msg, 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-xl font-bold text-white mb-4">Company Revenue & Withdrawals</h2>

      <div className="bg-[#0f1724] border border-[#1e2d3d] rounded-xl p-4 mb-6">
        <h3 className="text-sm text-gray-300 font-semibold mb-2">Balances</h3>
        <div className="flex gap-3 flex-wrap">
          {Object.keys(revenue).length === 0 && <div className="text-sm text-gray-500">No balances</div>}
          {Object.entries(revenue).map(([k, v]) => (
            <div key={k} className="p-3 bg-[#081025] rounded-lg border border-[#1e2d3d] w-44">
              <div className="text-xs text-gray-400">{k}</div>
              <div className="text-lg font-bold text-white">{Number(v).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#0f1724] border border-[#1e2d3d] rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select value={asset} onChange={(e) => setAsset(e.target.value)} className="bg-transparent border border-[#1e2d3d] p-2 rounded">
            {Object.keys(revenue).length ? Object.keys(revenue).map((k) => <option key={k} value={k}>{k}</option>) : <option>KES</option>}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="bg-transparent border border-[#1e2d3d] p-2 rounded" />
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="bg-transparent border border-[#1e2d3d] p-2 rounded">
            <option value="internal">Internal Ledger Move</option>
            <option value="airtel">Airtel Disburse</option>
          </select>
        </div>

        <div className="mb-4">
          <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={method === 'airtel' ? 'Recipient phone (07...)' : 'Destination userId'} className="bg-transparent border border-[#1e2d3d] p-2 rounded w-full" />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-emerald-500 text-black rounded font-bold">Withdraw</button>
          <button type="button" onClick={fetch} className="px-4 py-2 bg-[#1e2d3d] text-gray-300 rounded">Refresh</button>
        </div>
      </form>

      <SimpleToast toasts={toasts} onRemove={(id: any) => setToasts((s) => s.filter((t) => t.id !== id))} />

      <div className="mt-6 bg-[#0f1724] border border-[#1e2d3d] rounded-xl p-4">
        <h3 className="text-sm text-gray-300 font-semibold mb-3">Recent Withdrawals</h3>
        {withdrawals.length === 0 ? (
          <div className="text-sm text-gray-500">No recent withdrawals</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400">
                  <th className="px-2 py-1">ID</th>
                  <th className="px-2 py-1">Asset</th>
                  <th className="px-2 py-1">Amount</th>
                  <th className="px-2 py-1">Method</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Created</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-t border-[#1e2533]">
                    <td className="px-2 py-2 text-xs text-gray-300">{w.id}</td>
                    <td className="px-2 py-2">{w.asset}</td>
                    <td className="px-2 py-2">{Number(w.amount).toLocaleString()}</td>
                    <td className="px-2 py-2">{w.method}</td>
                    <td className="px-2 py-2">{w.status}</td>
                    <td className="px-2 py-2 text-xs text-gray-400">{w.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
