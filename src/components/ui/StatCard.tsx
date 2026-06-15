import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  valueClass?: string
}

export default function StatCard({ label, value, sub, icon, valueClass = 'text-white' }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">{label}</span>
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className={`text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
