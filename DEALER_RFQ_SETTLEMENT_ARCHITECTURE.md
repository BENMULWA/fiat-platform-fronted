# Dealer Workspace RFQ → Settlement Architecture & Money Flow

## Complete Workflow Journey: New Quote → Settlement → Jasiri Receives Funds

## P & L statements

### Phase 1: DEALER INITIATES NEW RFQ
```
[Dealer Opens DealerWorkspaceLive]
  ↓
POST /api/admin/dealer/rfqs
{
  "customer_id": "5cf5e5e5e5e5e5e5e5e5e5",  # Institutional customer (Savanna Payments)
  "from_asset": "KES",
  "to_asset": "USDA",
  "side": "BUY",                              # Merchant wants to BUY USDA (pay in KES)
  "amount": 50000,                            # 50,000 KES
  "channel": "DEALER",
  "settlement_channel": "BANK_TO_WALLET"
}
  ↓
[Backend: DealerWorkflow.create()]
  ├─ Lookup Customer: Savanna Payments
  ├─ Run Pre-Trade Checks:
  │   ├─ KYC Status: ✅ VERIFIED
  │   ├─ Account Status: ✅ ACTIVE
  │   ├─ Single Limit: ✅ 50K KES < 10M KES max
  │   ├─ USDA Inventory: ✅ Treasury has 100K+ USDA
  │   └─ Compliance: ✅ NOT SANCTIONED
  ├─ Analysis Result: ✅ PASSED
  └─ RFQ Status: quote_ready
      └─ RFQ Record Created:
          {
            "_id": "RFQ-20260819-ABC123",
            "customerId": "5cf5e5e5e5e5e5e5e5e5e5",
            "customerName": "Savanna Payments Ltd",
            "fromAsset": "KES",
            "toAsset": "USDA",
            "amount": 50000,
            "status": "quote_ready",
            "analysis": {
              "passed": true,
              "customer": [✅, ✅, ✅, ✅],
              "treasury": [✅, ✅, ✅],
              "compliance": [✅, ✅, ✅, ✅]
            }
          }
```

---

### Phase 2: DEALER GENERATES FIRM QUOTE (WITH SPREAD CALCULATION)

```
[Dealer clicks "Generate Quote" and sets spread]

POST /api/admin/dealer/rfqs/{rfq_id}/quote
{
  "spread_bps": 50  # ← Dealer selects MARGIN/SPREAD in BASIS POINTS
}

[Backend: DealerWorkflow.quote()]
  ├─ Get Rate Book (Treasury):
  │   {
  │     "active": true,
  │     "spread_bps": 50,        # ← Platform DEFAULT spread (treasury-wide)
  │     "usd_base_rates": {
  │       "KES": 130.50,          # CBK Central Bank Rate
  │       "USDA": 1.0,
  │       "BTC": 1/64000,
  │       "ETH": 1/3500
  │     }
  │   }
  │
  ├─ Compute Quote:
  │   Market Rate = 130.50 KES/USDA (from CBK rate book)
  │   
  │   Side: BUY (customer buying USDA, paying KES)
  │   Spread: 50 bps = 0.50% = 0.005
  │   
  │   Execution Rate = Market Rate × (1 + spread/10000)
  │   Execution Rate = 130.50 × (1 + 50/10000)
  │   Execution Rate = 130.50 × 1.005
  │   Execution Rate = 131.155 KES/USDA
  │   
  │   ✅ This means customer pays MORE per USDA (dealer profit on BUY side)
  │
  │   Customer Pays (KES):    50,000 KES
  │   Customer Receives:      50,000 / 131.155 = 381.26 USDA
  │   Market Would Receive:   50,000 / 130.50 = 383.14 USDA
  │   
  │   💰 SPREAD PROFIT (Jasiri's margin):
  │   Spread Profit = Market Amount - Execution Amount
  │   Spread Profit = 383.14 - 381.26 = 1.88 USDA
  │   Spread % = (1.88 / 383.14) × 100 = 0.49% ≈ 50 bps
  │
  ├─ Quote Record:
  │   {
  │     "market_rate": 130.50,
  │     "execution_rate": 131.155,
  │     "receive_amount": 381.26,        # ← What customer gets
  │     "market_receive_amount": 383.14, # ← What they'd get at market rate
  │     "spread_bps": 50,
  │     "expected_pnl": 1.88,            # ← JASIRI'S MARGIN/PROFIT
  │     "blended_cost": 130.50,
  │   }
  │
  └─ RFQ Status Updated: quoted
      └─ Quote EXPIRES in 60 seconds (firm quote validity)
          └─ Notification sent to Savanna Payments:
              "New institutional quote available"
```

**Key Spread Levels:**
```
DEFAULT SPREADS (from rate_book):
- 50 bps = 0.50% margin for retail-sized institutional
- 100 bps = 1.00% margin for higher-risk profiles
- 200+ bps = Used for new/unverified customers

Dealer Can Override: Spread adjustable from 10 bps to 500 bps
```

---

### Phase 3: SETTLEMENT CHANNEL SELECTION

```
[Dealer Shows Quote to Savanna Payments]

Savanna Payments (Merchant) Sees:
┌─────────────────────────────────┐
│ FIRM QUOTE                       │
├─────────────────────────────────┤
│ Customer Request: 50,000 KES     │
│ Market Rate: 130.50 KES/USDA     │
│ Execution Rate: 131.155          │
│ YOU RECEIVE: 381.26 USDA ✅      │
│ Expires in: 58 seconds           │
│                                  │
│ Settlement Channel:              │
│ ├─ BANK_TO_WALLET ◀─ SELECTED   │
│ ├─ WALLET_TO_BANK                │
│ ├─ WALLET_TRANSFER               │
│ └─ EXCHANGE_SETTLEMENT           │
└─────────────────────────────────┘

Settlement Channel = BANK_TO_WALLET means:
├─ FIAT LEG: Merchant sends 50,000 KES via Airtel collection
└─ CRYPTO LEG: Jasiri sends 381.26 USDA to Merchant's Cardano wallet

Payment Flow:
  Merchant's Mobile → Airtel (STK Push) → Jasiri's Airtel Collection Account
                                              ↓
  Merchant's Cardano Wallet ← Blockfrost ← Jasiri's Master Vault (USDA)
```

---

### Phase 4: DEALER EXECUTES (TRIGGERS REAL SETTLEMENT)

```
[Dealer clicks "EXECUTE QUOTE"]

POST /api/admin/dealer/rfqs/{rfq_id}/execute
  │
  ├─ Verify RFQ status = "quoted" ✅
  ├─ Create Settlement Record:
  │   {
  │     "_id": "SET-A1B2C3D4",
  │     "rfqId": "RFQ-20260819-ABC123",
  │     "customerId": "5cf5e5e5e5e5e5e5e5e5e5",
  │     "status": "pending_settlement",
  │     "fromAsset": "KES",
  │     "toAsset": "USDA",
  │     "amount": 50000,
  │     "quote": { ...quote record above... },
  │     "legs": {
  │       "fiat": {"status": "pending"},
  │       "crypto": {"status": "pending"}
  │     }
  │   }
  │
  ├─ Update RFQ: status = "executed"
  │
  └─ 🚀 FIRE ASYNC SETTLEMENT PROCESSING (non-blocking):
      └─ asyncio.create_task(initiate_settlement())
         ├─ ✅ Returns immediately to dealer UI
         └─ Background: Execution starts in 0-100ms
```

---

### Phase 5: REAL-TIME SETTLEMENT LEGS EXECUTE IN PARALLEL

```
════════════════════════════════════════════════════════════════
                    SETTLEMENT SET-A1B2C3D4
════════════════════════════════════════════════════════════════

FIAT LEG (KES Collection)         CRYPTO LEG (USDA Transfer)
═══════════════════════════       ═══════════════════════════

T+0ms: pending                    T+0ms: pending

T+50ms:
┌──────────────────────┐         ┌──────────────────────┐
│ INITIATED            │         │ SUBMITTED            │
├──────────────────────┤         ├──────────────────────┤
│                      │         │                      │
│ Airtel STK Push      │         │ Cardano Tx Submitted │
│ initiated for        │         │                      │
│ Merchant's Phone:    │         │ From: Master Vault   │
│ +254712345678        │         │ addr1v84ywg...srqwrt│
│                      │         │                      │
│ Provider Ref:        │         │ To: Merchant Wallet  │
│ REQ-xyz-12345        │         │ addr1qyz1234...xyzab│
│                      │         │                      │
│ Amount: 50,000 KES   │         │ Amount: 381.26 USDA  │
│ ✅ Awaiting PIN     │         │ TxHash: a1b2c3d4e5f6│
│                      │         │ ✅ In mempool        │
└──────────────────────┘         └──────────────────────┘

T+30 seconds: [Merchant receives Airtel STK, enters PIN]

┌──────────────────────┐         
│ CONFIRMED            │         
├──────────────────────┤         
│                      │         
│ Airtel Confirms:     │         
│ Payment Successful   │         
│ TxRef: AIRTEL-TX-123 │         
│                      │         
│ 50,000 KES RECEIVED  │         
│ in Jasiri Collection │         
│ Account              │         
│                      │         
│ ✅ FIAT LEG COMPLETE │         
└──────────────────────┘         
                                 T+45 seconds: [Blockfrost confirms 3 blocks]
                                 ┌──────────────────────┐
                                 │ CONFIRMED            │
                                 ├──────────────────────┤
                                 │                      │
                                 │ Blockfrost Confirms: │
                                 │ Block Height: 8847654│
                                 │ Confirmations: 3     │
                                 │                      │
                                 │ 381.26 USDA          │
                                 │ NOW IN MERCHANT'S    │
                                 │ CARDANO WALLET       │
                                 │                      │
                                 │ ✅ CRYPTO LEG OK    │
                                 └──────────────────────┘
```

---

### Phase 6: OVERALL SETTLEMENT STATUS TRANSITIONS

```
Settlement Status Workflow:

pending_settlement
    ↓ [execute called]
processing
    ├─ [Fiat confirmed first]
    │  → partial_pending_crypto
    │     ↓ [Crypto confirmed]
    │     → completed ✅
    │
    └─ [Crypto confirmed first]
       → partial_pending_fiat
          ↓ [Fiat confirmed]
          → completed ✅

Error Cases:
processing
    ├─ [Fiat fails: invalid phone/network error]
    │  → failed ❌ [Retry available]
    │
    └─ [Crypto fails: insufficient USDA/wallet invalid]
       → failed ❌ [Retry available]
```

---

### Phase 7: MONEY FLOWS - WHERE JASIRI CAPTURES VALUE

```
🟢 COMPLETE MONEY FLOW DIAGRAM
════════════════════════════════════════════════════════════════

MERCHANT (Savanna Payments)
┌─────────────────────────────────┐
│ Wants: 381.26 USDA              │
│ Pays: 50,000 KES                │
└─────────────────────────────────┘
            ↓
     FIAT LEG FLOW                 CRYPTO LEG FLOW
            ↓                              ↓
     Airtel Collection           Cardano Blockchain
       Account                     (Blockfrost)
      (Jasiri's)                      ↓
            ↓                  JASIRI VAULT
     50,000 KES RECEIVED       (Master Wallet:
     ├─ → Company Revenue      addr1v84ywg...)
     │      (Treasury)               ↓
     │      "KES_INVENTORY"      381.26 USDA
     │      += 50,000            transferred out
     │                               ↓
     │                    MERCHANT'S CARDANO
     │                       WALLET
     │                    (addr1qyz1234...)
     │                         ↓
     │                      ✅ USDA RECEIVED
     │
     └─ FIAT READY FOR OUTFLOWS:
        ├─ Airtel fee: -150 KES (0.30%)
        ├─ Treasury expense: -500 KES (1.00% processing)
        └─ Net to Treasury: 49,350 KES


💰 JASIRI'S PROFIT BREAKDOWN (Per Transaction):
════════════════════════════════════════════════════════════════

1. SPREAD/MARKUP PROFIT:
   ───────────────────────
   Merchant receives: 381.26 USDA (at execution rate 131.155)
   Market amount:     383.14 USDA (at market rate 130.50)
   
   Spread Profit = 383.14 - 381.26 = 1.88 USDA
   
   Spread % = (1.88 / 383.14) × 100 = 0.49% ≈ 50 bps
   
   💵 In Value: 1.88 USDA × 130.50 = 245.34 KES equivalent


2. FIAT PROCESSING FEES:
   ────────────────────────
   Settlement Channel: BANK_TO_WALLET
   
   Collection Fee (Airtel): -150 KES
   Processing Fee (Jasiri): -500 KES
   ────────────────────────
   Gross Fiat Fees: -650 KES
   
   Keep Rate: 50% (Jasiri keeps, 50% to treasury ops)
   Jasiri Keeps: -325 KES


3. CRYPTO PROCESSING FEES:
   ────────────────────────
   Cardano Network Fee: ~0.2 ADA ≈ 50 KES
   Jasiri Margin: 0 (pass-through)


4. TOTAL JASIRI PROFIT:
   ────────────────────
   Spread Profit:        245.34 KES equiv
   Fiat Processing:     -325 KES (operations cost)
   Crypto Network:      -50 KES (pass-through)
   ────────────────────
   NET PROFIT:           ~170 KES ≈ $1.30 USD
   
   Profit Margin %:      (170 / 50000) × 100 = 0.34%


════════════════════════════════════════════════════════════════
COMPANY_REVENUE TABLE UPDATES (Real-Time):
════════════════════════════════════════════════════════════════

Before Settlement:
{
  "_id": "corporate_treasury",
  "KES": 500000,
  "USDA": 10000,
  "USDC": 5000,
  "BTC": 0.5
}

After Settlement Completes:
{
  "_id": "corporate_treasury",
  "KES": 549350,        # +50,000 received - 650 fees = 49,350 net
  "USDA": 9618.74,      # -381.26 sent to merchant
  "USDC": 5000,
  "BTC": 0.5
}

Net Position Change:
- KES: +49,350 (fiat inflow, minus operational costs)
- USDA: -381.26 (sent to merchant, but profit captured at 1.88 USDA)
- Net Economic Profit: 1.88 USDA ≈ 245 KES worth
```

---

## 📈 SPREAD/MARGIN EXPECTATIONS BY CUSTOMER TIER

```
CUSTOMER TIER ANALYSIS (Institutional RFQ):
════════════════════════════════════════════════════════════════

Tier 1: RETAIL (< 10K KES)
─────────────────────────────
Spread: 100-200 bps (1.00% - 2.00%)
Reason: Higher operational cost per transaction, higher risk
Example: Single mom doing 5K KES → 2.00% margin = ~100 KES profit

Tier 2: SMALL MERCHANT (10K - 100K KES) ◀─ Our Test Case (50K)
─────────────────────────────────────────────
Spread: 50-100 bps (0.50% - 1.00%)
Reason: Moderate risk, standard processing
Example: Savanna Payments 50K KES → 50 bps = 1.88 USDA profit
Channel: BANK_TO_WALLET (fiat to mobile, crypto to wallet)

Tier 3: LARGE MERCHANT (100K - 1M KES)
──────────────────────────────────────
Spread: 20-50 bps (0.20% - 0.50%)
Reason: Volume discount, lower risk
Example: Major aggregator 500K KES → 20 bps = 7.69 USDA profit
Channel: BANK_TO_BANK (faster settlement)

Tier 4: INSTITUTIONAL (1M+ KES) 🏢 
──────────────────────────────────
Spread: 10-20 bps (0.10% - 0.20%)
Reason: Wholesale pricing, relationship rates
Example: Large fintech 5M KES → 10 bps = 38.46 USDA profit
Channel: DIRECT_INTEGRATION (API-only, no manual intervention)


SPREAD SPREAD ADJUSTMENTS BY MARKET CONDITIONS:
════════════════════════════════════════════════

During High Volatility:
├─ Spread: +50-100 bps temporary increase
└─ Reason: Hedging risk when rates move > 2% in 24h

During Low Liquidity:
├─ Spread: +20-50 bps increase
└─ Reason: Inventory management when assets are tight

During Peak Hours (9am-5pm EAT):
├─ Spread: -10 bps discount
└─ Reason: Faster confirmations, less operational cost

Promotional Periods:
├─ Spread: -25 bps temporary reduction
└─ Reason: Customer acquisition, volume growth
```

---

## 🔄 COMPLETE REQUEST/RESPONSE FLOW WITH EXAMPLES

### Example 1: 50,000 KES → USDA @ 50 bps

```yaml
# STEP 1: CREATE RFQ
POST /api/admin/dealer/rfqs
{
  "customer_id": "merchant_savanna_payments",
  "from_asset": "KES",
  "to_asset": "USDA",
  "side": "BUY",
  "amount": 50000,
  "settlement_channel": "BANK_TO_WALLET"
}

# RESPONSE:
{
  "status": "success",
  "rfq": {
    "id": "RFQ-20260819-ABC123",
    "status": "quote_ready",
    "analysis": {
      "passed": true,
      "checks": {
        "customer": [✅ Active, ✅ KYC Verified, ✅ Asset Pair OK, ✅ Single Limit OK],
        "treasury": [✅ Rate Book Active, ✅ 100K+ USDA in inventory, ✅ Amount OK],
        "compliance": [✅ KYC Clear, ✅ Not Sanctioned, ✅ Wallet Known, ✅ Purpose OK]
      }
    }
  }
}

---

# STEP 2: GENERATE QUOTE WITH SPREAD
POST /api/admin/dealer/rfqs/RFQ-20260819-ABC123/quote
{
  "spread_bps": 50  # Dealer decides: 50 basis points
}

# RESPONSE:
{
  "status": "success",
  "rfq": {
    "status": "quoted",
    "quote": {
      "market_rate": 130.50,           # CBK base rate
      "execution_rate": 131.155,       # 130.50 × (1 + 50/10000) = 131.155
      "receive_amount": 381.26,        # 50,000 / 131.155
      "market_receive_amount": 383.14, # 50,000 / 130.50
      "spread_bps": 50,
      "expected_pnl": 1.88,            # Jasiri's profit before fees
      "expires_at": "2026-08-19T14:30:45Z"  # Expires in 60 seconds
    }
  }
}

---

# STEP 3: EXECUTE (Customer Accepts Quote)
POST /api/admin/dealer/rfqs/RFQ-20260819-ABC123/execute

# RESPONSE:
{
  "status": "success",
  "settlement": {
    "id": "SET-A1B2C3D4",
    "status": "pending_settlement",  # Async processing started
    "rfqId": "RFQ-20260819-ABC123"
  }
}

---

# STEP 4: MONITOR SETTLEMENT (Poll every 5 seconds)
GET /api/admin/dealer/settlements/SET-A1B2C3D4

# RESPONSE (T+2 seconds):
{
  "settlement": {
    "status": "processing",  # Both legs in flight
    "legs": {
      "fiat": {
        "status": "initiated",
        "type": "collection",
        "asset": "KES",
        "amount": 50000,
        "provider": "airtel",
        "providerReference": "REQ-xyz-12345",
        "initiatedAt": "2026-08-19T14:30:35Z"
      },
      "crypto": {
        "status": "submitted",
        "type": "transfer",
        "asset": "USDA",
        "amount": 381.26,
        "provider": "cardano",
        "recipientWallet": "addr1qyz1234...",
        "transactionHash": "a1b2c3d4e5f6g7h8...",
        "submittedAt": "2026-08-19T14:30:36Z"
      }
    }
  }
}

# RESPONSE (T+30 seconds - Fiat Arrives):
{
  "settlement": {
    "status": "partial_pending_crypto",  # Fiat done, waiting on crypto
    "legs": {
      "fiat": {
        "status": "confirmed",
        "transactionReference": "AIRTEL-TXN-54321",
        "confirmedAt": "2026-08-19T14:31:05Z"
      },
      "crypto": {
        "status": "submitted",  # Still waiting for 3 confirmations
        "confirmations": 1
      }
    }
  }
}

# RESPONSE (T+45 seconds - Settlement Complete):
{
  "settlement": {
    "status": "completed",  # ✅ BOTH LEGS DONE
    "legs": {
      "fiat": {
        "status": "confirmed",
        "transactionReference": "AIRTEL-TXN-54321"
      },
      "crypto": {
        "status": "confirmed",
        "blockHeight": 8847654,
        "confirmations": 3
      }
    }
  }
}
```

---

## 🎯 KEY TAKEAWAYS: JASIRI'S VALUE PROPOSITION

```
CUSTOMER PERSPECTIVE:
════════════════════════════════════════════════════════════════
Savanna Payments:
├─ Gets 381.26 USDA instantly (not 383.14)
├─ Pays 50,000 KES
├─ Difference (1.88 USDA): Jasiri's spread for facilitating the deal
├─ Time to settlement: 30-60 seconds (vs 2-3 hours on traditional OTC)
└─ Risk: Minimal (regulated platform, real-time confirmations)


JASIRI'S PERSPECTIVE:
════════════════════════════════════════════════════════════════
Per 50K Transaction:
├─ Spread Profit: 1.88 USDA (245 KES equivalent)
├─ Process Margin: 0.34% of transaction
├─ Network Effect: Repeat customers build volume → lower per-tx costs
└─ Scales: 1,000 merchants × 50K avg = 50M KES AUM
           @ 0.34% margin = 170K KES monthly profit


DEALER'S PERSPECTIVE:
════════════════════════════════════════════════════════════════
Controls:
├─ Spread adjustment (10-500 bps)
├─ Customer approval workflow
├─ Settlement channel selection
├─ Real-time monitoring dashboard
└─ Profit/loss tracking by customer tier


PLATFORM (JASIRI) GROWTH LEVERS:
════════════════════════════════════════════════════════════════
1. Scale Volume: More merchants → more spreads → more profit
2. Lower Costs: Optimize Airtel fees + Cardano fees → improve margins
3. Premium Tiers: Higher-touch service = higher spreads for power users
4. Cross-selling: Credit products, derivatives = more revenue streams
5. Leverage: Use customer deposits as working capital for corridors
   └─ Example: 50M KES deposits × 6% yield from airtime corridor
      = 3M KES monthly profit beyond spreads
```

---

## 🔧 CONFIGURATION: SPREAD TUNING

```python
# backend/routes/treasury.py - RATE BOOK CONFIG

DEFAULT_SPREAD_BPS = 50  # 50 bps = 0.50% base margin

# Tiered adjustments:
TIER_SPREADS = {
    "retail": 150,           # 1.50% for small retail
    "small_merchant": 50,    # 0.50% for 10K-100K range
    "large_merchant": 25,    # 0.25% for 100K-1M range
    "institutional": 10,     # 0.10% for 1M+ (wholesale)
}

# Volatility multiplier:
VOLATILITY_ADJUSTMENT = {
    "low": 0,        # No change
    "normal": 0,     # No change
    "high": 50,      # +50 bps when rates jump > 2%
    "critical": 100  # +100 bps during exchange closure/crises
}

# Time-of-day pricing:
HOUR_DISCOUNTS = {
    "9-17": -10,     # -10 bps during business hours (fast confirmations)
    "17-22": 0,      # Normal
    "22-9": 20,      # +20 bps overnight (slower confirmations expected)
}

# To update spreads (admin-only):
POST /api/treasury/rate-book
{
  "active": true,
  "spread_bps": 75,  # Raise default spread to 75 bps
  "reference_source": "CBK",
  "refresh_interval_hours": 3,
  "notes": "Raising margins due to high volatility period"
}
```

---

## 📊 FINANCIAL REPORTING: WHERE MONEY GOES

```
JASIRI MONTHLY P&L STATEMENT
════════════════════════════════════════════════════════════════

REVENUE:
────────
Spread Income (from 1M KES AUM @ 50 bps avg):     500,000 KES
Fiat Processing Fees (Airtel fee share):           50,000 KES
Corridor Yields (airtime procurement 6%):        300,000 KES
────────────────────────────────────────────────────────────
TOTAL REVENUE:                                    850,000 KES


OPERATING EXPENSES:
──────────────────
Airtel Settlement Fees:                            25,000 KES
Blockfrost API Costs:                              10,000 KES
Payment Processing (Daraja/Safaricom):             30,000 KES
Staffing (1 ops person):                           50,000 KES
Infrastructure (servers/monitoring):               20,000 KES
Customer Support:                                  15,000 KES
──────────────────────────────────────────────────────────
TOTAL EXPENSES:                                   150,000 KES


PROFIT:
───────
NET PROFIT (before taxes):                        700,000 KES
PROFIT MARGIN:                                    82.4%

ALLOCATION:
- Retained Earnings: 350,000 KES
- Reinvest R&D: 200,000 KES
- Team Bonus: 100,000 KES
- Reserve: 50,000 KES
```

---

This architecture shows how Jasiri captures value at each step:
1. **Spread** when dealer quotes (50 bps = 1.88 USDA on 50K transaction)
2. **Fiat Processing** when Airtel collects
3. **Network Effects** when Cardano confirms (gas savings)
4. **Scale** when volume grows (fixed costs amortized)
5. **Leverage** when using deposits in corridors for 6% yield

The dealer controls the spread and can optimize for customer acquisition vs. per-transaction profit.
