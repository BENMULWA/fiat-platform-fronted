# Swap Engine Hotfix & Diagnosis

## Issue Summary
- Swaps showing as COMPLETED in UI
- Funds NOT appearing in wallets
- NO database records being created in ramp_entries

## Root Causes Fixed

### 1. ✅ Undefined Variable Bug (CRITICAL)
**File**: `backend/routes/swap_engine.py` Line 366
**Issue**: `to_asset_config` was used in main endpoint but only defined in `validate_swap_request()` function
**Impact**: Caused NameError, preventing settlement route selection
**Fix**: Moved `to_asset_config = ASSET_CONFIG.get(req.to_asset)` into main endpoint

### 2. ✅ User ID Mismatch in Database Operations
**File**: `backend/routes/swap_engine.py` Multiple lines
**Issue**: Wallet lookup could match ObjectId, but updates used req.user_id (string format)
**Impact**: Wallet updates missed the document, no balance changes recorded
**Fix**: Extract `actual_user_id` from found wallet, use it for all subsequent DB ops

### 3. ✅ Double-Crediting Logic Error
**File**: `backend/routes/swap_engine.py` Line 432
**Issue**: Credited wallet for ALL swaps, including on-chain crypto (which goes to destination_address)
**Impact**: Logic error in settlement confirmation
**Fix**: Only credit wallet for fiat/airtime, not crypto transfers

## Additional Improvements
- ✅ Enhanced exception handler with detailed logging
- ✅ Better error messages for debugging
- ✅ Improved refund/rollback logic with transaction tracking

## Database Discovery
- ⚠️ **meshex** database does NOT exist in MongoDB
- Only admin/config/local databases present
- No ramp_entries or retail_wallets collections yet

## Next Steps to Verify Fix

### 1. Restart Backend
```bash
# Kill current uvicorn process and restart
pkill -f "uvicorn main:app"
cd /home/software-engineer/mam-laka/Crypto-Meshex-B2B-Platform/project
source backend/.venv/bin/activate
uvicorn backend.main:app --reload
```

### 2. Test Swap Creation
- Execute a test swap through UI
- Monitor backend logs for:
  - ✅ "Asset configuration retrieved"
  - ✅ "Swap record created in ramp_entries"
  - ✅ "User wallet updated successfully"

### 3. Verify Database Records
Run diagnostic:
```bash
source backend/.venv/bin/activate
python backend/tests/diagnose_swap_issue.py
```

### 4. Manual Database Check
```bash
mongosh meshex
db.ramp_entries.find().pretty()
db.retail_wallets.findOne()
```

## If Database Still Empty
**Possible Causes**:
1. Database initialization script not run
2. Collection creation migration missing
3. Wrong MongoDB connection in .env
4. Backend seed/setup scripts not executed

**Solution**: Check if there's a database initialization script:
```bash
ls -la backend/ | grep -i init
ls -la backend/ | grep -i seed
ls -la backend/ | grep -i migrate
```

## Files Modified
- ✅ `backend/routes/swap_engine.py` - Core fixes
- ✅ `backend/tests/diagnose_swap_issue.py` - New diagnostic tool
- ✅ `backend/tests/inspect_database.py` - New DB inspection tool

## Related Documentation
- See `/memories/repo/ramp-webhooks.md` for swap engine architecture context
