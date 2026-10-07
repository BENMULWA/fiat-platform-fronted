import ImmConsole from '../imm/ImmConsole'

// The Internal Market Maker console. It replaces the earlier simulation-era page
// (kept for reference in ./legacy/MarketMakerPageLegacy.tsx); everything shown
// here is read from the running backend.
export default function MarketMakerPage() {
  return <ImmConsole audience="operator" />
}
