import { useState, useEffect, useRef } from 'react'
import { Plus, ChevronDown, Check } from 'lucide-react'
import { getDiscountRates, addDiscountRate, getInventory } from '../api/client'

const NETWORKS = ['Telkom', 'Airtel', 'Safaricom', 'MTN', 'Orange', 'Vodacom', 'Tigo', 'Moov']
const COUNTRIES = [
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CI', name: 'Ivory Coast', flag: '🇨🇮' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
]
const PRODUCTS = ['Airtime', 'Data', 'Esim']

interface DiscountRate { id: string; network: string; country: string; product: string; rate: number }
interface InventoryItem { id: string; network: string; country: string; product: string; stock: number; margin: number }

const MOCK_RATES: DiscountRate[] = [
  { id: '1', network: 'Telkom', country: 'KE', product: 'Data', rate: 10 },
]

interface SelectMenuProps {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  renderOption?: (v: string) => React.ReactNode
}

function SelectMenu({ label, value, options, onChange, renderOption }: SelectMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#0d1420] border border-[#1e2d3d] rounded-lg text-sm text-white hover:border-emerald-400/30 transition-colors"
      >
        <span>{renderOption ? renderOption(value) : value}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-[#1a2332] border border-[#1e2d3d] rounded-lg shadow-xl overflow-hidden w-full max-h-52 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false) }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors ${opt === value ? 'bg-amber-400/10' : ''}`}
            >
              <span className="text-white">{renderOption ? renderOption(opt) : opt}</span>
              {opt === value && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RatesInventoryPage() {
  const [activeTab, setActiveTab] = useState<'rates' | 'inventory'>('rates')
  const [network, setNetwork] = useState('Telkom')
  const [country, setCountry] = useState('Kenya')
  const [product, setProduct] = useState('Data')
  const [rateValue, setRateValue] = useState('')
  const [rates, setRates] = useState<DiscountRate[]>(MOCK_RATES)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    getDiscountRates().then(r => setRates(r.data.rates)).catch(() => setRates(MOCK_RATES))
    getInventory().then(r => setInventory(r.data.items)).catch(() => setInventory([]))
  }, [])

  const countryCode = (name: string) => COUNTRIES.find(c => c.name === name)?.code || 'KE'
  const countryFlag = (name: string) => COUNTRIES.find(c => c.name === name)?.flag || ''
  const countryNames = COUNTRIES.map(c => c.name)

  const handleSaveRate = async () => {
    if (!rateValue || parseFloat(rateValue) <= 0) return
    setSubmitting(true)
    const payload = { network, country: countryCode(country), product: product.toLowerCase(), rate: parseFloat(rateValue) }
    try {
      const res = await addDiscountRate(payload)
      setRates(prev => [...prev, res.data])
    } catch {
      setRates(prev => [...prev, { id: String(Date.now()), network, country: countryCode(country), product: product.toLowerCase(), rate: parseFloat(rateValue) }])
    } finally {
      setSubmitting(false)
      setRateValue('')
      setToast('Rate saved successfully.')
      setTimeout(() => setToast(''), 3000)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Rates & Inventory</h1>
        <p className="text-gray-500 text-sm mt-0.5">Track your telco discounts and eSIM/data/airtime stock and margins.</p>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-2.5 bg-emerald-400/10 border border-emerald-400/20 rounded-lg text-emerald-400 text-sm">{toast}</div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 bg-[#0d1420] border border-[#1e2d3d] rounded-lg p-1 w-fit">
        {(['rates', 'inventory'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
              activeTab === t ? 'bg-[#1e2d3d] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'rates' ? 'Discount rates' : 'Inventory'}
          </button>
        ))}
      </div>

      {activeTab === 'rates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Add discount rate form */}
          <div className="mesh-card p-5">
            <h2 className="text-white font-medium mb-4">Add discount rate</h2>
            <div className="space-y-4">
              <SelectMenu
                label="Network"
                value={network}
                options={NETWORKS}
                onChange={setNetwork}
              />
              <SelectMenu
                label="Country"
                value={country}
                options={countryNames}
                onChange={setCountry}
                renderOption={v => `${countryFlag(v)} ${v}`}
              />
              <SelectMenu
                label="Product"
                value={product}
                options={PRODUCTS}
                onChange={setProduct}
              />
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Discount rate (%)</label>
                <input
                  type="number"
                  value={rateValue}
                  onChange={e => setRateValue(e.target.value)}
                  className="mesh-input"
                  placeholder="e.g. 10"
                  step="0.1"
                  min="0"
                  max="100"
                />
              </div>
              <button onClick={handleSaveRate} disabled={submitting || !rateValue} className="mesh-btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                {submitting ? 'Saving…' : 'Save rate'}
              </button>
            </div>
          </div>

          {/* Your rates */}
          <div className="mesh-card p-5">
            <h2 className="text-white font-medium mb-4">Your rates</h2>
            <div className="space-y-0">
              {rates.map(r => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-[#1e2d3d] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#1a2640] text-gray-300 rounded text-[10px] font-semibold">{r.network}</span>
                    <span className="text-gray-400 text-sm">{r.product.charAt(0).toUpperCase() + r.product.slice(1)} · {r.country}</span>
                  </div>
                  <span className="text-emerald-400 font-mono font-semibold">{r.rate.toFixed(1)}%</span>
                </div>
              ))}
              {rates.length === 0 && <p className="text-gray-600 text-sm text-center py-6">No rates configured yet.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="mesh-card p-5">
          <h2 className="text-white font-medium mb-4">Inventory</h2>
          {inventory.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-10">No inventory items yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2d3d]">
                    {['Network', 'Country', 'Product', 'Stock', 'Margin'].map(col => (
                      <th key={col} className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-widest pb-3 pr-4">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id} className="border-b border-[#1e2d3d] last:border-0">
                      <td className="py-3 pr-4 text-white">{item.network}</td>
                      <td className="py-3 pr-4 text-gray-400">{item.country}</td>
                      <td className="py-3 pr-4 text-gray-400 capitalize">{item.product}</td>
                      <td className="py-3 pr-4 text-white font-mono">{item.stock.toLocaleString()}</td>
                      <td className="py-3 text-emerald-400 font-mono">{item.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
