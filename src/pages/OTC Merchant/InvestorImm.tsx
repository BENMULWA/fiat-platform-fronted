import ImmConsole from '../../imm/ImmConsole'

// Investor surface of the IMM console, mounted inside the institutional layout.
// Viewing is open to institutional accounts; executing depends on what the
// backend allows for the signed-in investor.
export default function InvestorImm() {
  return <ImmConsole audience="investor" />
}
