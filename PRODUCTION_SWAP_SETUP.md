# Production Swap Engine Setup

## Overview
The refactored swap engine performs **real-time, synchronous settlements** across Celo blockchain, Africa's Talking Telco APIs, and Flutterwave mobile money networks. **No simulations—everything settles on-chain and with real payment providers.**

---

## Environment Configuration

### 1. Celo Blockchain (Crypto Swaps)
```bash
# Mainnet RPC endpoint
CELO_RPC_URL=https://forno.celo.org

# Treasury account private key (MUST HAVE CELO FOR GAS)
CELO_TREASURY_PK=0x... or just_the_hex_without_0x

# Treasury hot wallet address (fallback if PK not available)
CELO_HOT_WALLET_ADDRESS=0x...
```

**⚠️ Critical:** The Treasury wallet **must have CELO balance** to pay transaction fees.
- Recommended minimum: 5-10 CELO
- ~0.2 CELO per typical ERC20 transfer

---

### 2. Africa's Talking (Airtime Dispatch)
```bash
# Get from https://africastalking.com
AFRICASTALKING_API_KEY=atsk_...
AFRICASTALKING_USERNAME=your_username

# Supported networks:
# - Safaricom (Kenya)
# - Airtel (Uganda, Tanzania, Rwanda, etc.)
# - Vodafone (Tanzania, Ghana)
# - Others (check Africa's Talking docs)
```

**Flow:**
```
User: KES 1000 → System
System sends: KES 1000 airtime to phone via Africa's Talking
User receives: Mobile airtime on phone
```

---

### 3. Flutterwave (Mobile Money / Cross-Border Fiat)
```bash
# Get from https://dashboard.flutterwave.com
FLUTTERWAVE_API_KEY=FLWPUBK_...

# Optional callback for async status updates
FLUTTERWAVE_CALLBACK_URL=https://yourdomain.com/webhooks/flutterwave

# Supported currencies:
# KES, UGX, TZS, RWF, BIF, XAF, XOF, ZAR, GHS, NGN, etc.
```

**Flow:**
```
User: KES 1000 → System
System transfers: KES 1000 to phone via Flutterwave
User receives: Mobile money on phone (M-Pesa, AirtelMoney, etc.)
```

---

## How Swaps Work (Real Production Flow)

### Example 1: KES → USDT (Crypto)
```
1. User inputs: 1000 KES, destination wallet: 0x123...
2. Backend validates: user has 1000 KES ✓
3. Backend calculates rate: 1 KES = 0.0077 USDT (from treasury book)
4. Backend deducts: -1000 KES from wallet
5. [🔵 REAL] Execute on Celo: send 7.7 USDT to 0x123...
6. If success: +7.7 USDT to user wallet, record tx hash
7. If fail: refund -1000 KES, mark swap failed
```

### Example 2: KES → AIRT (Airtime)
```
1. User inputs: 500 KES, destination phone: +254702XXXXXX
2. Backend validates: user has 500 KES ✓
3. Backend calculates: 500 KES of airtime
4. Backend deducts: -500 KES from wallet
5. [🔴 REAL] Call Africa's Talking: dispatch airtime to phone
6. If success: airtime credited to phone, record ref ID
7. If fail: refund -500 KES, mark failed
```

### Example 3: KES → UGX (Mobile Money)
```
1. User inputs: 10000 KES, destination phone: +256701XXXXXX
2. Backend calculates rate: 1 KES = 30 UGX
3. Backend deducts: -10000 KES
4. [💳 REAL] Call Flutterwave: send 300,000 UGX to phone
5. If success: UGX received on phone, record transfer ID
6. If fail: refund -10000 KES, mark failed
```

---

## Synchronous Settlement (No Background Tasks)

**Key difference from old code:**
- ❌ Old: Background worker runs after user gets 200 OK
- ✅ New: Settlement runs **during the request**, user waits for confirmation

**Pros:**
- User knows immediately if swap succeeded or failed
- No "pending settlement" state
- Clear error messages
- Atomic: either fully succeeds or fully refunds

**Cons:**
- Request times out if API is slow (max 60 seconds recommended)
- External API downtime blocks users

---

## API Responses

### Success Response (HTTP 200)
```json
{
  "swap_id": "SWP-20260901103045-user",
  "status": "completed",
  "message": "Successfully swapped 1000 KES → 7.7 USDT",
  "tx_hash": "0xabc123... or AT_REF_123 or FLW_TXN_456"
}
```

### Failure Response (HTTP 400/502)
```json
{
  "detail": "Swap settlement failed: insufficient CELO in treasury for gas"
}
```

User is **automatically refunded** on any failure.

---

## Testing Production Integrations

### 1. Test Celo Transfer
```python
from routes.swap_engine import settle_crypto_on_celo

result = await settle_crypto_on_celo(
    to_address="0x...",
    asset="USDT",
    amount=1.5
)
print(result)
# {
#   "success": True/False,
#   "tx_hash": "0x...",
#   "status": "completed",
#   "block": 1234567
# }
```

### 2. Test Africa's Talking
```python
from routes.swap_engine import settle_airtime_via_africastalking

result = await settle_airtime_via_africastalking(
    phone_number="+254702123456",
    amount_kes=100
)
print(result)
# {
#   "success": True/False,
#   "phone": "+254702123456",
#   "amount_kes": 100,
#   "reference": "AT_REF_...",
#   "status": "completed"
# }
```

### 3. Test Flutterwave
```python
from routes.swap_engine import settle_mobilemoney_via_flutterwave

result = await settle_mobilemoney_via_flutterwave(
    phone_number="+256701234567",
    currency="UGX",
    amount=50000
)
print(result)
# {
#   "success": True/False,
#   "phone": "+256701234567",
#   "currency": "UGX",
#   "amount": 50000,
#   "reference": "FLW_...",
#   "transfer_id": 12345
# }
```

---

## Monitoring & Debugging

### Check Treasury CELO Balance
```bash
python backend/diagnostics/check_treasury_balance.py
```

### Monitor Swap Failures
```python
# Check failed swaps in database
db["ramp_entries"].find({"status": "failed", "direction": "swap"})
```

### External API Health
- **Africa's Talking:** https://africastalking.com/status
- **Flutterwave:** https://status.flutterwave.com
- **Celo:** https://explorer.celo.org (check block time)

---

## Error Handling & Refunds

All failures trigger **automatic user refunds:**
```python
# On any error:
1. Deducted amount is refunded
2. Swap marked as FAILED
3. User receives error message
4. Admin is alerted (optional: send to admin_notifications)
```

---

## Security Checklist

- [x] Backend rate calculation (never trust frontend)
- [x] User balance validation
- [x] Escrow pattern (deduct before settling)
- [x] Atomic operations (settle fully or refund fully)
- [x] Transaction validation (check blockchain receipt)
- [x] API error handling (graceful failures)
- [x] Secret management (.env for keys)
- [ ] Rate limiting (optional: add per-user swap limits)
- [ ] Audit logging (optional: log all swaps to audit_log collection)

---

## Next Steps

1. **Fund Treasury:** Send 5-10 CELO to CELO_TREASURY_PK
2. **Configure APIs:** Add all .env keys
3. **Test Testnet:** Use Celo Alfajores testnet first
4. **Monitor:** Deploy diagnostics, check logs
5. **Go Live:** Switch to Celo mainnet

---

## Support & Issues

If swaps fail with:
- `"insufficient CELO in treasury"` → Fund Treasury with CELO
- `"Africa's Talking credentials not configured"` → Check API_KEY/.env
- `"Flutterwave transfer failed"` → Check if phone valid for country
- `"Invalid destination address"` → Validate 0x checksum format
