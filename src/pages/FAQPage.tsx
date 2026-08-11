// @ts-nocheck
import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Phone, Mail, MessageCircle, ShieldCheck, Clock3 } from 'lucide-react'
import logo from '../pages/assets/jasiri-icon.png'

type FAQItem = {
  question: string
  answer: string
}

type FAQGroup = {
  title: string
  items: FAQItem[]
}

const FAQ_GROUPS: FAQGroup[] = [
  {
    title: 'Account & Access',
    items: [
      {
        question: 'What is Jasiri Capital?',
        answer:
          'Jasiri Capital is a digital asset and payments platform focused on regulated cross-rail value movement across African fiat and global stablecoin networks. We provide institutional-grade onboarding, settlement transparency, and risk controls for both retail and OTC operations. We also proovide Airtel Disbusrment and Tokenization across different swap rails.',
      },
      {
        question: 'How do I create a Jasiri account?',
        answer:
          'Select Get Started, complete your details, then verify your email. Your account is provisioned for retail access immediately after signup, with limits expanded after KYC review.',
      },
      {
        question: 'Why is KYC required?',
        answer:
          'KYC is required to protect customers, prevent fraud, and comply with regulated payment and settlement obligations across mobile money and stablecoin rails.',
      },
      {
        question: 'Can I use Jasiri as both retail and OTC?',
        answer:
          'Yes. Eligible users can access retail swap workflows and institutional dealer tools based on assigned permissions and workspace role.',
      },
    ],
  },
  {
    title: 'Deposits, Swaps & Withdrawals',
    items: [
      {
        question: 'Which rails are currently supported?',
        answer:
          'Jasiri supports M-Pesa and stablecoin rails across Celo and Cardano. Availability can vary during maintenance windows, and rail health is shown on the landing page status module.',
      },
      {
        question: 'How are rates and fees calculated?',
        answer:
          'Before confirmation, Jasiri displays your execution rate, quoted receive amount, and fee line-item. Current retail platform fee is 0.5% unless a specific product schedule is shown.',
      },
      {
        question: 'How long does settlement take?',
        answer:
          'Most swaps settle within seconds to minutes depending on rail traffic, network conditions, and compliance checks for high-risk or high-value transactions.',
      },
    ],
  },
  {
    title: 'Security, Compliance & Risk',
    items: [
      {
        question: 'How does Jasiri protect customer funds and data?',
        answer:
          'Jasiri uses encryption in transit and at rest, role-based access controls, audit trails for sensitive actions, and operational segregation aligned with institutional security practices.',
      },
      {
        question: 'Is Jasiri custodial?',
        answer:
          'Jasiri provides a managed platform experience for regulated conversion and settlement workflows. Product custody and withdrawal conditions are governed by account type and service terms.',
      },
      {
        question: 'What happens when a rail is unavailable?',
        answer:
          'The system flags affected rails and may temporarily block new instructions while preserving transaction integrity. Support can provide ETA and alternatives when this occurs.',
      },
    ],
  },
]

export default function FAQPage() {
  const [activeIndex, setActiveIndex] = useState<number>(0)

  const flattened = useMemo(() => {
    const all: { id: number; group: string; question: string; answer: string }[] = []
    let i = 0
    for (const group of FAQ_GROUPS) {
      for (const item of group.items) {
        all.push({ id: i, group: group.title, question: item.question, answer: item.answer })
        i += 1
      }
    }
    return all
  }, [])

  return (
    <div className="min-h-screen bg-[#150a29] text-[#f3ebff]">
      <header className="sticky top-0 z-30 border-b border-white/10 backdrop-blur-xl bg-[#1f123a]/85">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden">
              <img src={logo} alt="Jasiri logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#c9b0f8]">Trust & Support</p>
              <p className="text-lg font-bold leading-none">JASIRI FAQ</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 rounded-lg border border-white/20 text-sm font-semibold hover:bg-white/5 transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="px-4 py-2 rounded-lg bg-emerald-500 text-[#071b14] text-sm font-bold hover:bg-emerald-400 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <section className="grid lg:grid-cols-[1fr_1.5fr] gap-10 lg:gap-16 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#c9b0f8] mb-4">Support Desk</p>
            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.02] mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-[#d2c4ea] text-lg leading-relaxed mb-8 max-w-lg">
              Operational answers for new and existing customers across onboarding, settlement, and security.
            </p>

            <div className="space-y-4">
              <a href="tel:+254714073826" className="flex items-center gap-3 p-4 rounded-2xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                <Phone className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#c9b0f8]">Phone Support</p>
                  <p className="font-semibold">0714 073 826</p>
                </div>
              </a>

              <a href="https://wa.me/254714073826" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 rounded-2xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#c9b0f8]">WhatsApp</p>
                  <p className="font-semibold">Start secure chat</p>
                </div>
              </a>

              <a href="mailto:support@jasiricapital.com" className="flex items-center gap-3 p-4 rounded-2xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                <Mail className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#c9b0f8]">Email</p>
                  <p className="font-semibold">support@jasiricapital.com</p>
                </div>
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#220f43] shadow-[0_20px_80px_rgba(12,2,25,0.45)] p-4 sm:p-7">
            <div className="flex items-center justify-between px-3 pb-4 border-b border-white/10 mb-2">
              <p className="text-sm text-[#ceb9ef]">FQS</p>
        
            </div>

            <div className="space-y-2">
              {flattened.map((faq) => {
                const isOpen = activeIndex === faq.id
                return (
                  <div key={faq.id} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    <button
                      className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-6"
                      onClick={() => setActiveIndex(isOpen ? -1 : faq.id)}
                      aria-expanded={isOpen}
                    >
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#b99ae6] mb-2">{faq.group}</p>
                        <h2 className="text-lg sm:text-[1.35rem] leading-snug font-semibold text-[#f6f0ff]">{faq.question}</h2>
                      </div>
                      <ChevronDown className={`w-5 h-5 mt-1 text-[#d5c3f5] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-6">
                        <div className="h-px bg-white/10 mb-4" />
                        <p className="text-[#d7c8ef] leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
