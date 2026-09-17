import { useNavigate } from 'react-router-dom';
import { Construction } from 'lucide-react';

export default function ComingSoon({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto mt-24 flex flex-col items-center text-center px-6">
      <div className="w-14 h-14 rounded-full bg-[#111827] border border-[#1E2D3D] flex items-center justify-center mb-5">
        <Construction className="w-6 h-6 text-gray-500" />
      </div>
      <h1 className="text-lg font-semibold text-white mb-2">{title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        This section isn't built yet. Use Institutional RFQs for now to create, quote, and execute
        trades, and the Settlement Queue to run them through treasury.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/admin/institutional-rfqs')}
          className="px-4 py-2 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          Go to Institutional RFQs
        </button>
        <button
          onClick={() => navigate('/admin/settlements')}
          className="px-4 py-2 rounded-md text-xs font-semibold bg-[#1e2d3d] hover:bg-[#2a3a4f] text-gray-200"
        >
          Go to Settlement Queue
        </button>
      </div>
    </div>
  );
}
