# Quick Reference: Dealer Workspace RFQ Flow & Spread Calculation

## 🚀 Quick Start: New Quote Workflow

```
DEALER CLICKS "NEW RFQ"
  ↓
[Select Customer] → "Savanna Payments Ltd"
  ↓
[Set Amount] → "50,000 KES"
  ↓
[Set Pair] → "KES / USDA (BUY)"
  ↓
[Select Channel] → "BANK_TO_WALLET"
  ↓
POST /api/admin/dealer/rfqs → ✅ RFQ CREATED (quote_ready)
  ↓
[System Runs Pre-Trade Checks] ← Takes 0.5-2 seconds
  ├─ KYC Status ✅
  ├─ Account Active ✅
  ├─ Inventory Available ✅
  └─ Compliance Clear ✅
  ↓
DEALER CLICKS "GENERATE QUOTE"
  ↓
[Dealer Sets Spread] → "50 bps" (or 0.50%)
  ↓
POST /api/admin/dealer/rfqs/{id}/quote (spread_bps: 50)
  ↓
💡 QUOTE GENERATED:
   ├─ What Customer Pays: 50,000 KES
   ├─ What Customer Gets: 381.26 USDA
   ├─ Market Would Give: 383.14 USDA
   ├─ Jasiri's Profit: 1.88 USDA (≈ 245 KES)
   └─ Quote Valid For: 60 seconds
  ↓
CUSTOMER SEES OFFER (Notification)
  ↓
CUSTOMER ACCEPTS (or quote expires)
  ↓
DEALER CLICKS "EXECUTE"
  ↓
POST /api/admin/dealer/rfqs/{id}/execute
  ↓
🟢 SETTLEMENT STARTS:
   ├─ Fiat Leg: Airtel STK Push to merchant
   └─ Crypto Leg: Cardano USDA transfer
  ↓
MONITOR: GET /api/admin/dealer/settlements/{id}
  ├─ T+2s: Both legs initiated/submitted
  ├─ T+30s: Fiat confirmed (Airtel)
  ├─ T+45s: Crypto confirmed (Blockfrost)
  └─ Status: COMPLETED ✅
  ↓
💰 MONEY ARRIVED:
   ├─ Jasiri: +50,000 KES in collection account
   └─ Customer: +381.26 USDA in wallet
```

---

## 📐 Spread Calculation Formula

```
╔════════════════════════════════════════════════════════════════╗
║               SPREAD/MARKUP CALCULATION                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Base Market Rate (from CBK/Rate Book):     130.50 KES/USDA   ║
║                                                                ║
║  Dealer Selected Spread:                    50 basis points   ║
║                                             (50 bps = 0.50%)   ║
║                                                                ║
║  Execution Rate Calculation:                                  ║
║  ─────────────────────────────────────────────────────────    ║
║                                                                ║
║  For BUY (merchant buys crypto, pays fiat):                   ║
║    Execution Rate = Market Rate × (1 + spread/10000)          ║
║    Execution Rate = 130.50 × (1 + 50/10000)                   ║
║    Execution Rate = 130.50 × 1.005                            ║
║    Execution Rate = 131.155 KES/USDA                          ║
║                                                                ║
║    Customer pays MORE per unit (Jasiri profits)               ║
║                                                                ║
║  For SELL (merchant sells crypto, receives fiat):             ║
║    Execution Rate = Market Rate × (1 - spread/10000)          ║
║    Execution Rate = 130.50 × (1 - 50/10000)                   ║
║    Execution Rate = 130.50 × 0.995                            ║
║    Execution Rate = 129.845 KES/USDA                          ║
║                                                                ║
║    Customer receives LESS per unit (Jasiri profits)           ║
║                                                                ║
║  Customer Receives Calculation:                               ║
║  ──────────────────────────────────────────────────────────   ║
║                                                                ║
║  Amount In = 50,000 KES                                        ║
║  Receive = Amount In / Execution Rate                          ║
║  Receive = 50,000 / 131.155                                    ║
║  Receive = 381.26 USDA  ✅                                     ║
║                                                                ║
║  Jasiri's Profit Calculation:                                 ║
║  ──────────────────────────────────────────────────────────   ║
║                                                                ║
║  Market Amount = Amount In / Market Rate                       ║
║  Market Amount = 50,000 / 130.50                               ║
║  Market Amount = 383.14 USDA                                   ║
║                                                                ║
║  Profit = Market Amount - Execution Amount                     ║
║  Profit = 383.14 - 381.26                                      ║
║  Profit = 1.88 USDA  💰                                        ║
║                                                                ║
║  Profit % = (1.88 / 383.14) × 100                              ║
║  Profit % = 0.49% ≈ 50 bps ✅                                  ║
║                                                                ║
║  Profit in KES = 1.88 × 130.50 = 245.34 KES                    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 📊 Common Spread Levels & Use Cases

```
10 BPS (0.10%) - WHOLESALE/INSTITUTIONAL
┌─────────────────────────────────────────────────────┐
│ Use Case: Large fintech partners, 1M+ KES volumes   │
│ Profit per 50K: 0.0950 USDA ≈ 12 KES               │
│ Used in: Bulk/API trades, relationship pricing      │
└─────────────────────────────────────────────────────┘

20 BPS (0.20%) - LARGE MERCHANT
┌─────────────────────────────────────────────────────┐
│ Use Case: Established traders, consistent volumes   │
│ Profit per 50K: 0.1900 USDA ≈ 25 KES               │
│ Used in: Contract pricing, volume discounts         │
└─────────────────────────────────────────────────────┘

50 BPS (0.50%) - STANDARD/SMALL MERCHANT ◀─ DEFAULT
┌─────────────────────────────────────────────────────┐
│ Use Case: Mid-size merchants, 10K-100K KES trades   │
│ Profit per 50K: 1.88 USDA ≈ 245 KES               │
│ Used in: Regular institutional deals                │
└─────────────────────────────────────────────────────┘

100 BPS (1.00%) - HIGHER RISK
┌─────────────────────────────────────────────────────┐
│ Use Case: New customers, low credit history         │
│ Profit per 50K: 3.83 USDA ≈ 500 KES               │
│ Used in: Onboarding, first-time large trades       │
└─────────────────────────────────────────────────────┘

200 BPS (2.00%) - PREMIUM/URGENT
┌─────────────────────────────────────────────────────┐
│ Use Case: After-hours, rush execution, high risk    │
│ Profit per 50K: 7.83 USDA ≈ 1,020 KES             │
│ Used in: Emergency liquidity, premium service       │
└─────────────────────────────────────────────────────┘
```

---

## 💡 Spread Adjustment Matrix

```
SPREAD TUNING GUIDE (Dealer's Control Panel):
════════════════════════════════════════════════════════════════

VOLATILITY ADJUSTMENT:
┌──────────────────────────────────────────────────────────────┐
│ When rates move > 2% in 24h:    ADD +50-100 bps               │
│ Reason: Hedging costs increase, market risk rises            │
│                                                              │
│ When rates stable:              BASE spread                  │
│ Reason: Normal market conditions                             │
│                                                              │
│ When rates declining 2%+:       ADD +50 bps                   │
│ Reason: Margin compression, protect profit                   │
└──────────────────────────────────────────────────────────────┘

LIQUIDITY ADJUSTMENT:
┌──────────────────────────────────────────────────────────────┐
│ When USDA inventory > 200K:     BASE or -10 bps discount      │
│ Reason: Abundant supply, can afford lower margins            │
│                                                              │
│ When USDA inventory 50K-200K:   BASE spread (normal)          │
│ Reason: Balanced supply/demand                               │
│                                                              │
│ When USDA inventory < 50K:      ADD +25-50 bps                │
│ Reason: Inventory scarcity, protect balance sheet           │
└──────────────────────────────────────────────────────────────┘

TIME-OF-DAY ADJUSTMENT:
┌──────────────────────────────────────────────────────────────┐
│ 09:00-17:00 (Business Hours):   -10 bps discount              │
│ Reason: Peak confirmations, faster settlement                │
│                                                              │
│ 17:00-22:00 (Evening):          BASE spread (normal)          │
│ Reason: Standard processing                                  │
│                                                              │
│ 22:00-09:00 (Overnight):        +20-30 bps premium            │
│ Reason: Slower confirmations, manual oversight cost          │
└──────────────────────────────────────────────────────────────┘

CUSTOMER TIER ADJUSTMENT:
┌──────────────────────────────────────────────────────────────┐
│ Tier 4 (Institutional, 1M+):    10-20 bps                     │
│ Tier 3 (Large, 100K-1M):        20-50 bps                     │
│ Tier 2 (Medium, 10K-100K):      50-100 bps       ◀─ Our case  │
│ Tier 1 (Retail, <10K):          100-200 bps                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔢 Real Example: 50,000 KES Transaction Breakdown

```
╔════════════════════════════════════════════════════════════════╗
║             COMPLETE SETTLEMENT MATH                           ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║ INPUTS:                                                        ║
║ ────────                                                       ║
║  Customer: Savanna Payments Ltd                               ║
║  Amount: 50,000 KES                                            ║
║  Market Rate: 130.50 KES/USDA (CBK rate)                       ║
║  Dealer Spread: 50 bps (0.50%)                                 ║
║  Settlement Channel: BANK_TO_WALLET                            ║
║                                                                ║
║ CALCULATIONS:                                                  ║
║ ─────────────                                                  ║
║  Execution Rate = 130.50 × 1.005 = 131.155                     ║
║  Customer Receives = 50,000 / 131.155 = 381.26 USDA            ║
║  Market Amount = 50,000 / 130.50 = 383.14 USDA                 ║
║  Spread Profit = 383.14 - 381.26 = 1.88 USDA                   ║
║                                                                ║
║ JASIRI'S REVENUE STREAMS:                                      ║
║ ───────────────────────────────────────────────────────────   ║
║                                                                ║
║  1️⃣ Spread/Markup:                                             ║
║     Profit: 1.88 USDA                                          ║
║     In KES: 1.88 × 130.50 = 245.34 KES                        ║
║                                                                ║
║  2️⃣ Fiat Processing (Airtel):                                  ║
║     Airtel Fee: 150 KES (0.30% of 50,000)                      ║
║     Jasiri Keep Rate: 50%                                      ║
║     Jasiri Keeps: 75 KES                                       ║
║                                                                ║
║  3️⃣ Crypto Processing (Cardano):                               ║
║     Network Fee: ~0.2 ADA ≈ 50 KES                             ║
║     Jasiri Margin: Pass-through (no margin)                    ║
║                                                                ║
║  4️⃣ Treasury Processing Fee:                                   ║
║     Internal Processing: 500 KES (1.00%)                       ║
║     Absorbed as operating cost                                 ║
║                                                                ║
║ TOTAL JASIRI PROFIT:                                           ║
║ ────────────────────                                           ║
║  Spread Profit:             245.34 KES                         ║
║  Fiat Processing Margin:   + 75.00 KES                         ║
║  Crypto Network:           - 50.00 KES (pass-through)          ║
║  Treasury Processing:      - 250.00 KES (operational)          ║
║  ────────────────────────────────────                          ║
║  NET PROFIT:                 20.34 KES ≈ $0.16 USD             ║
║                                                                ║
║  Profit Margin %: (20.34 / 50,000) = 0.04%                     ║
║  Return on Capital (if using 10M in USDA inventory):           ║
║    10,000 transactions/month @ 20.34 KES = 203,400 KES/month   ║
║                                                                ║
║ ACCOUNTING LEDGER:                                             ║
║ ──────────────────                                             ║
║  Debit:  KES Received (Collection)       50,000 KES            ║
║  Credit: USDA Sent (Merchant Wallet)     381.26 USDA           ║
║  Credit: Spread Revenue (P&L)            245.34 KES            ║
║  Debit:  Processing Expenses             250.00 KES            ║
║  Debit:  Airtel Settlement Fees          150.00 KES            ║
║  Debit:  Cardano Network Fees             50.00 KES            ║
║                                                                ║
║ COMPANY_REVENUE TABLE UPDATE:                                  ║
║ ─────────────────────────────                                  ║
║  Before:  KES: 500,000    USDA: 10,000                         ║
║  After:   KES: 549,750    USDA:  9,618.74                      ║
║  Net:     KES: +49,750    USDA:   -381.26                      ║
║           (Profit captured as 1.88 USDA ≈ 245 KES)             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🎯 Decision Matrix: When to Adjust Spreads

```
┌──────────────────┬──────────────┬──────────────┬──────────────┐
│ CONDITION        │ ACTION       │ SPREAD DELTA │ REASON       │
├──────────────────┼──────────────┼──────────────┼──────────────┤
│ Customer is new  │ Increase     │ +50-100 bps  │ Risk premium │
│                  │              │              │              │
│ Customer is 1yr+ │ Decrease     │ -10-20 bps   │ Loyalty disc │
│ with 100+ trades │              │              │              │
│                  │              │              │              │
│ KES/USDA rate    │ Increase     │ +50-75 bps   │ Hedge cost   │
│ volatile (±2%)   │              │              │              │
│                  │              │              │              │
│ Rate stable      │ Base         │ 0 bps        │ Normal       │
│ > 3 days         │              │              │              │
│                  │              │              │              │
│ USDA inventory   │ Decrease     │ -10 bps      │ Abundant     │
│ > 250K           │              │              │              │
│                  │              │              │              │
│ USDA inventory   │ Increase     │ +25-50 bps   │ Scarcity     │
│ < 50K            │              │              │              │
│                  │              │              │              │
│ After hours      │ Increase     │ +20-30 bps   │ Manual work  │
│ (22:00-09:00)    │              │              │              │
│                  │              │              │              │
│ Peak hours       │ Decrease     │ -10 bps      │ Auto confirm │
│ (09:00-17:00)    │              │              │              │
│                  │              │              │              │
│ Airtel delays    │ Increase     │ +50 bps      │ Risk adjust  │
│ > 5 minutes      │              │              │              │
│                  │              │              │              │
│ Cardano network  │ Increase     │ +20 bps      │ Congestion   │
│ congestion       │              │              │              │
│                  │              │              │              │
│ Competitor       │ Decrease     │ -15-25 bps   │ Market share │
│ undercuts us     │              │              │              │
│                  │              │              │              │
│ Customer requests│ Usually      │ -10-50 bps   │ Case-by-case │
│ volume discount  │ grant        │              │ (negotiated) │
└──────────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 🔗 API Quick Reference

```bash
# CREATE RFQ (Step 1)
curl -X POST http://localhost:8000/api/admin/dealer/rfqs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "merchant_123",
    "from_asset": "KES",
    "to_asset": "USDA",
    "side": "BUY",
    "amount": 50000,
    "settlement_channel": "BANK_TO_WALLET"
  }'
# Returns: RFQ with status "quote_ready"


# GENERATE QUOTE (Step 2)
curl -X POST http://localhost:8000/api/admin/dealer/rfqs/RFQ-20260819-ABC123/quote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "spread_bps": 50 }'
# Returns: Quote with execution_rate, receive_amount, expected_pnl


# EXECUTE SETTLEMENT (Step 3)
curl -X POST http://localhost:8000/api/admin/dealer/rfqs/RFQ-20260819-ABC123/execute \
  -H "Authorization: Bearer $TOKEN"
# Returns: Settlement ID (async processing starts)


# MONITOR SETTLEMENT (Step 4 - Poll every 5s)
curl -X GET http://localhost:8000/api/admin/dealer/settlements/SET-A1B2C3D4 \
  -H "Authorization: Bearer $TOKEN"
# Returns: Leg status (fiat: initiated/confirmed, crypto: submitted/confirmed)


# UPDATE SETTLEMENT STATUS (Webhook)
curl -X POST http://localhost:8000/api/admin/dealer/settlements/SET-A1B2C3D4/update-status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "provider_report": {
      "legs": {
        "fiat": {"status": "confirmed", "transactionReference": "AIRTEL-TX-123"}
      }
    }
  }'


# RETRY FAILED SETTLEMENT
curl -X POST http://localhost:8000/api/admin/dealer/settlements/SET-A1B2C3D4/retry \
  -H "Authorization: Bearer $TOKEN"
# Retries failed leg(s)
```

---

## 💰 Monthly Profit Simulation

```
Assumptions:
─────────────
- 1,000 transactions per month
- Average transaction: 50,000 KES
- Average spread: 50 bps
- Total volume: 50,000,000 KES = 383,142 USDA
- Network uptime: 99%
- Customer churn: 5%

Calculation:
─────────────
Spread Revenue:
  50,000,000 KES × 50 bps / 10,000 = 250,000 KES

Fiat Processing (50% of Airtel fees):
  50,000,000 KES × 0.30% × 50% = 75,000 KES

Other Fees Collected:
  ≈ 25,000 KES (manual processing, rush premiums)

Total Revenue:                       350,000 KES

Operating Costs:
  Airtel Fees:                       25,000 KES
  Blockfrost:                        10,000 KES
  Payment Processing:                30,000 KES
  Staffing (0.5 FTE ops):            25,000 KES
  Infrastructure:                    10,000 KES

Total Costs:                        100,000 KES

NET PROFIT:                         250,000 KES
PROFIT MARGIN:                      71.4%

This scales linearly:
  - 10,000 txns/month = 2,500,000 KES profit
  - 100,000 txns/month = 25,000,000 KES profit
```

---

**Key Insight:** Jasiri's profitability scales with **volume** because:
1. Fixed costs (infrastructure, team) are amortized across more transactions
2. Unit margins improve as volume = lower per-tx operational costs
3. Spread negotiation room decreases customer churn at scale
