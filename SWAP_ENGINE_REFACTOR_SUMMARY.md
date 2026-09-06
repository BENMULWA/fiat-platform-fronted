can w# Swap Engine Refactoring: Production-Ready Implementation

## ✅ Completed Refactoring

### What Changed
The swap engine has been completely refactored from **simulations** to **real production integrations**.

### Old Code (Simulations)
```python
async def send_real_celo_crypto(...):
    await asyncio.sleep(5)  # FAKE ❌
    return "0xMOCK_TX_HASH_CELLO"

async def send_real_airtime(...):
    await asyncio.sleep(3)  # FAKE ❌
    return "TELCO_REF_12345"
```

### New Code (Production)
```python
async def settle_crypto_on_celo(...):
    # ✅ REAL: Uses Web3.py to execute actual ERC20 transfers
    # ✅ Waits for blockchain confirmation
    # ✅ Returns actual tx hash from Celo explorer

async def settle_airtime_via_africastalking(...):
    # ✅ REAL: HTTP POST to Africa's Talking API
    # ✅ Validates response status
    # ✅ Returns actual provider reference ID

async def settle_mobilemoney_via_flutterwave(...):
    # ✅ REAL: HTTP POST to Flutterwave transfer API
    # ✅ Currency mapping for 8+ African countries
    # ✅ Returns actual transfer ID
```

---

## 📋 Production Checklist

### 1. ⚠️ Critical: Funding (MUST DO FIRST)
- [ ] **Treasury wallet must have CELO**
  - Run: `python backend/diagnostics/check_treasury_balance.py`
  - Minimum recommended: 5-10 CELO
  - Gas cost per swap: ~0.2 CELO (~$0.10 USD)
  - Fund via: Send CELO to `$CELO_TREASURY_PK` from any exchange

### 2. ⚙️ Configuration: Environment Variables
```bash
# .env file (backend root)
CELO_RPC_URL=https://forno.celo.org                    # ✓ Already set
CELO_TREASURY_PK=0x...                                  # ⚠️ CHECK
AFRICASTALKING_API_KEY=atsk_...                        # ⚠️ CHECK
AFRICASTALKING_USERNAME=your_username                   # ⚠️ CHECK
FLUTTERWAVE_API_KEY=FLWPUBK_...                        # ⚠️ CHECK
FLUTTERWAVE_CALLBACK_URL=https://yourdomain/webhooks    # ⚠️ Optional
```

### 3. 🧪 Pre-Flight Tests (Recommended Order)
1. **Test Celo Connectivity:**
   ```bash
   python -c "from web3 import Web3; w3 = Web3(Web3.HTTPProvider('https://forno.celo.org')); print(w3.is_connected())"
   ```

2. **Check Treasury Balance:**
   ```bash
   python backend/diagnostics/check_treasury_balance.py
   ```

3. **Test Africa's Talking Credentials:**
   ```bash
   # Try a test airtime send (small amount)
   curl -X POST https://api.africastalking.com/airtime/send \
     -H "Authorization: Bearer $AFRICASTALKING_API_KEY" \
     -d "username=$AFRICASTALKING_USERNAME&recipients=+254702123456,10"
   ```

4. **Test Flutterwave Credentials:**
   ```bash
   curl -X GET https://api.flutterwave.com/v3/transactions \
     -H "Authorization: Bearer $FLUTTERWAVE_API_KEY" \
     -H "Content-Type: application/json"
   ```

### 4. 🚀 End-to-End Swap Tests
- [ ] **Test 1: KES → USDT (Crypto)**
  ```
  1. Call POST /api/swap/execute
  2. from_asset: KES, to_asset: USDT, from_amount: 100
  3. destination_address: valid 0x wallet
  4. Check: Celo explorer shows tx hash
  ```

- [ ] **Test 2: KES → AIRT (Airtime)**
  ```
  1. Call POST /api/swap/execute
  2. from_asset: KES, to_asset: AIRT, from_amount: 500
  3. destination_phone: +254702XXXXXX (valid phone)
  4. Check: Airtime credited to phone
  ```

- [ ] **Test 3: KES → UGX (Mobile Money)**
  ```
  1. Call POST /api/swap/execute
  2. from_asset: KES, to_asset: UGX, from_amount: 10000
  3. destination_phone: +256701XXXXXX (valid phone)
  4. Check: UGX received on phone
  ```

### 5. 🛡️ Error Handling Tests
- [ ] **Test Refund on Celo Failure:** Insufficient gas → auto-refund
- [ ] **Test Refund on API Failure:** Dead API → auto-refund
- [ ] **Test Invalid Input:** Bad address/phone → proper error message

### 6. 📊 Database Validation
- [ ] Verify `ramp_entries` collection has swap records
- [ ] Verify `retail_wallets` balances update correctly
- [ ] Check failed swaps are refunded in DB

---

## 🔧 How to Verify Production Settings

### Step 1: Check Celo Connectivity
```bash
cd backend
python << 'EOF'
from web3 import Web3
w3 = Web3(Web3.HTTPProvider("https://forno.celo.org"))
print(f"✓ Connected to Celo: {w3.is_connected()}")
print(f"  Latest block: {w3.eth.block_number}")
print(f"  Gas price: {w3.eth.gas_price / 1e18:.6f} CELO")
EOF
```

### Step 2: Check Treasury Balance
```bash
cd backend
python diagnostics/check_treasury_balance.py
```

**Expected output:**
```
========================================
Celo Treasury Status
========================================
Treasury Address: 0x...
CELO Balance: 5.25 CELO
Estimated gas per swap: 0.15 CELO
Swaps possible before refund: 35

Status: ✅ FUNDED
========================================
```

### Step 3: Verify Swap Engine Loads
```bash
cd backend
python << 'EOF'
from routes.swap_engine import (
    settle_crypto_on_celo,
    settle_airtime_via_africastalking,
    settle_mobilemoney_via_flutterwave
)
print("✓ All production functions loaded successfully")
EOF
```

---

## 📁 Files Modified

- `backend/routes/swap_engine.py` — Complete refactor (300+ lines)
- `PRODUCTION_SWAP_SETUP.md` — Setup documentation (NEW)

## 📚 Related Files (No Changes Needed)

- `backend/routes/valora.py` — Crypto withdrawal (already uses real Web3)
- `backend/routes/airtime_ledger.py` — Airtime redemption (already uses real APIs)
- `backend/services/impala_airtime.py` — Airtime provider adapter (already production)
- `backend/diagnostics/check_treasury_balance.py` — Admin diagnostics (already exists)

---

## ⚠️ Critical Known Issues

1. **Treasury Funding Required**
   - Must have CELO balance to pay transaction fees
   - Without CELO: all crypto swaps will fail
   - Solution: Fund treasury before going live

2. **API Credentials Required**
   - Africa's Talking: Must have valid API key + username
   - Flutterwave: Must have valid sandbox/live API key
   - Without credentials: all airtime/mobile money swaps will fail

3. **Phone Number Validation**
   - Africa's Talking requires E.164 format: +254702123456
   - Flutterwave currency must match country
   - Without valid format: API will reject requests

---

## 🎯 Next Actions (In Priority Order)

1. **IMMEDIATE:** Fund Treasury with 5-10 CELO
2. **IMMEDIATE:** Verify all API credentials in .env
3. **TODAY:** Run `check_treasury_balance.py` to confirm funding
4. **TODAY:** Run pre-flight tests (Celo connectivity, API health)
5. **TOMORROW:** Execute end-to-end swap tests (1 of each type)
6. **WEEK:** Full UAT with users
7. **AFTER UAT:** Deploy to production

---

## 💬 Need Help?

See `PRODUCTION_SWAP_SETUP.md` for:
- Detailed flow diagrams
- API error references
- Troubleshooting guide
- Security checklist
