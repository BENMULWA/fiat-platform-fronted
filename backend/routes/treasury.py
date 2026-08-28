from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import asyncio
import traceback
from datetime import datetime, timedelta
import uuid
import requests
import os
from copy import deepcopy
from typing import Optional

from database import get_db
from Brain_Engine.corridor_1_airtime import AirtimeCeloCorridor
from services.safaricom_daraja import DarajaService
from routes.retail import SUPPORTED_ASSETS
from routes.cardano import get_master_wallet_balance
from routes.valora import ASSET_CONTRACTS, get_treasury_address, w3
from web3 import Web3
from routes.auth import get_current_user, get_current_user_with_role, is_admin_role

router = APIRouter(prefix="/api/treasury", tags=["Treasury"])
daraja = DarajaService()

RATE_BOOK_ID = "swap_rate_book"
DEFAULT_USD_BASE_RATES = {
    "USDA": 1.0, "USDC": 1.0, "USDT": 1.0, "USD": 1.0, "cUSD": 1.0, "IMP": 1.0,
    "KES": 130.50, "UGX": 3750.00, "TZS": 2580.00, "RWF": 1320.00,
    "BIF": 2850.00, "XAF": 605.00, "XOF": 605.00,
    "BTC": 1 / 64000, "ETH": 1 / 3500,
}


class TreasuryRateBookUpdate(BaseModel):
    active: bool
    reference_source: str
    refresh_interval_hours: int
    spread_bps: float
    usd_base_rates: dict[str, float]
    notes: Optional[str] = None


def ensure_admin(current_user: dict):
    if not is_admin_role(current_user.get("role")):
        raise HTTPException(status_code=403, detail="Admin role required")


def _default_rate_book() -> dict:
    return {
        "_id": RATE_BOOK_ID,
        "active": True,
        "reference_source": "CBK",
        "refresh_interval_hours": 3,
        "spread_bps": 50,
        "usd_base_rates": deepcopy(DEFAULT_USD_BASE_RATES),
        "notes": "Treasury-managed swap pricing.",
        "updatedAt": datetime.utcnow(),
        "updatedBy": None,
    }


def _serialize_rate_book(doc: dict) -> dict:
    updated_at = doc.get("updatedAt")
    refresh_hours = int(doc.get("refresh_interval_hours", 3) or 3)
    next_refresh_at = None
    if isinstance(updated_at, datetime):
        next_refresh_at = updated_at.replace(microsecond=0)
        next_refresh_at = next_refresh_at.isoformat() + "Z"
        updated_at_value = updated_at.replace(microsecond=0).isoformat() + "Z"
    else:
        updated_at_value = str(updated_at) if updated_at else None
    if isinstance(updated_at, datetime):
        next_refresh_at = (updated_at + timedelta(hours=refresh_hours)).replace(microsecond=0).isoformat() + "Z"
    return {
        "active": bool(doc.get("active", True)),
        "referenceSource": doc.get("reference_source", "CBK"),
        "refreshIntervalHours": refresh_hours,
        "spreadBps": float(doc.get("spread_bps", 50) or 0),
        "usdBaseRates": doc.get("usd_base_rates", deepcopy(DEFAULT_USD_BASE_RATES)),
        "notes": doc.get("notes", ""),
        "updatedAt": updated_at_value,
        "updatedBy": str(doc.get("updatedBy")) if doc.get("updatedBy") else None,
        "nextRefreshAt": next_refresh_at,
    }


async def get_or_create_rate_book(db):
    doc = await db["treasury_rate_book"].find_one({"_id": RATE_BOOK_ID})
    if doc:
        return doc
    doc = _default_rate_book()
    await db["treasury_rate_book"].update_one({"_id": RATE_BOOK_ID}, {"$setOnInsert": doc}, upsert=True)
    return doc


def compute_swap_quote_from_book(from_asset: str, to_asset: str, amount: float, rate_book: dict) -> dict:
    rates = deepcopy(DEFAULT_USD_BASE_RATES)
    rates.update(rate_book.get("usd_base_rates", {}))
    amount_value = float(amount or 0)
    spread_bps = max(float(rate_book.get("spread_bps", 0) or 0), 0.0)

    if {from_asset, to_asset} == {"KES", "AIRT"}:
        fee_amount = round(amount_value * spread_bps / 10000, 4)
        receive_amount = amount_value if from_asset == "KES" else max(amount_value - fee_amount, 0.0)
        return {
            "market_rate": 1.0,
            "execution_rate": 1.0,
            "receive_amount": round(receive_amount, 4),
            "market_receive_amount": round(amount_value, 4),
            "fee_amount": fee_amount,
            "fee_currency": "KES" if from_asset == "KES" else "KES",
            "debit_amount": round(amount_value + fee_amount, 4) if from_asset == "KES" else round(amount_value, 4),
            "spread_bps": spread_bps,
        }

    if from_asset == to_asset:
        return {
            "market_rate": 1.0,
            "execution_rate": 1.0,
            "receive_amount": round(float(amount or 0), 4),
            "market_receive_amount": round(float(amount or 0), 4),
            "fee_amount": 0.0,
            "spread_bps": float(rate_book.get("spread_bps", 0) or 0),
        }

    if from_asset not in rates or to_asset not in rates:
        raise HTTPException(status_code=400, detail=f"Unsupported swap pair: {from_asset} -> {to_asset}")

    market_rate = rates[to_asset] / rates[from_asset]
    execution_rate = market_rate * (1 - (spread_bps / 10000))
    market_receive_amount = amount_value * market_rate
    receive_amount = amount_value * execution_rate
    fee_amount = max(market_receive_amount - receive_amount, 0.0)

    return {
        "market_rate": market_rate,
        "execution_rate": execution_rate,
        "receive_amount": round(receive_amount, 4),
        "market_receive_amount": round(market_receive_amount, 4),
        "fee_amount": round(fee_amount, 4),
        "spread_bps": spread_bps,
    }


@router.get("/rate-book")
async def get_treasury_rate_book(db=Depends(get_db), current_user=Depends(get_current_user_with_role)):
    ensure_admin(current_user)
    doc = await get_or_create_rate_book(db)
    return {"status": "success", "rateBook": _serialize_rate_book(doc)}


@router.post("/rate-book")
async def update_treasury_rate_book(payload: TreasuryRateBookUpdate, db=Depends(get_db), current_user=Depends(get_current_user_with_role)):
    ensure_admin(current_user)

    merged_rates = deepcopy(DEFAULT_USD_BASE_RATES)
    for asset, value in payload.usd_base_rates.items():
        try:
            numeric_value = float(value)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid numeric rate for {asset}")
        if numeric_value <= 0:
            raise HTTPException(status_code=400, detail=f"Rate for {asset} must be greater than zero")
        merged_rates[asset] = numeric_value

    doc = {
        "_id": RATE_BOOK_ID,
        "active": bool(payload.active),
        "reference_source": (payload.reference_source or "CBK").strip() or "CBK",
        "refresh_interval_hours": max(int(payload.refresh_interval_hours or 1), 1),
        "spread_bps": max(float(payload.spread_bps or 0), 0.0),
        "usd_base_rates": merged_rates,
        "notes": (payload.notes or "").strip(),
        "updatedAt": datetime.utcnow(),
        "updatedBy": current_user.get("_id"),
    }
    await db["treasury_rate_book"].update_one({"_id": RATE_BOOK_ID}, {"$set": doc}, upsert=True)
    return {"status": "success", "rateBook": _serialize_rate_book(doc)}


@router.get("/swap-quote")
async def get_swap_quote(from_asset: str, to_asset: str, amount: float = 1.0, db=Depends(get_db), current_user=Depends(get_current_user)):
    if amount < 0:
        raise HTTPException(status_code=400, detail="Amount must not be negative")
    rate_book = await get_or_create_rate_book(db)
    quote = compute_swap_quote_from_book(from_asset, to_asset, amount, rate_book)
    return {
        "status": "success",
        "active": bool(rate_book.get("active", True)),
        "fromAsset": from_asset,
        "toAsset": to_asset,
        "amount": amount,
        "referenceSource": rate_book.get("reference_source", "CBK"),
        "refreshIntervalHours": int(rate_book.get("refresh_interval_hours", 3) or 3),
        "updatedAt": _serialize_rate_book(rate_book).get("updatedAt"),
        "marketRate": quote["market_rate"],
        "executionRate": quote["execution_rate"],
        "receiveAmount": quote["receive_amount"],
        "marketReceiveAmount": quote["market_receive_amount"],
        "feeAmount": quote["fee_amount"],
        "feeCurrency": quote.get("fee_currency", to_asset),
        "debitAmount": quote.get("debit_amount", amount),
        "spreadBps": quote["spread_bps"],
    }


@router.get("/rate-book/history")
async def get_treasury_rate_book_history(db=Depends(get_db), current_user=Depends(get_current_user_with_role)):
    ensure_admin(current_user)
    history = await db["treasury_rate_book_history"].find().sort("updatedAt", -1).limit(50).to_list(length=50)
    for item in history:
        item.pop("_id", None)
    return {"status": "success", "history": history}

class CorridorRequest(BaseModel):
    amount_kes: float

@router.post("/corridor/airtime-celo")
async def trigger_airtime_celo_corridor(req: CorridorRequest, db=Depends(get_db)):
    if req.amount_kes <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")

    try:
        corridor = AirtimeCeloCorridor(db_collection=db["transactions"])
        result = await corridor.execute_from_kes(deployed_kes=req.amount_kes)
        
        return {
            "status": "success",
            "message": f"Airtel -> Celo Corridor executed. Yielded {result['yield_percent']}%",
            "data": result
        }
        
    except Exception as e:
        traceback.print_exc() 
        print(f"Corridor Execution Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class HFTExecuteRequest(BaseModel):
    amount: float
    corridor_id: str

@router.post("/corridor/execute-hft")
async def execute_dynamic_hft_corridor(req: HFTExecuteRequest, db=Depends(get_db)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")

    try:
        from Brain_Engine.state_engine import ImmutableLedger, HFTCorridorFSM, FSMState
        ledger = ImmutableLedger(db_collection=db["transactions"])
        
        config = {}
        if req.corridor_id == "telkom_5x":
            config = {"cycles": 5, "discount": 0.10, "fx_edge": 0.05, "node_procure": "N1", "node_liquidate": "N4"}
        elif req.corridor_id == "airtel_5x":
            config = {"cycles": 5, "discount": 0.06, "fx_edge": 0.00, "node_procure": "N2", "node_liquidate": "N5"}
        else:
            raise HTTPException(status_code=400, detail="Unknown corridor ID")
            
        bot = HFTCorridorFSM(ledger=ledger, starting_capital_usd=req.amount, config=config)
        await bot.boot_system()
        
        while bot.state != FSMState.COMPLETED and bot.state != FSMState.HALTED:
            await bot.tick()
            
        if bot.state == FSMState.HALTED:
            raise Exception("Corridor halted due to internal error or low liquidity.")
            
        return {
            "status": "success",
            "message": f"{config['cycles']}x Rollover Complete via {config['node_procure']}! Exited to Celo.",
            "data": {
                "starting_usd": req.amount,
                "final_usd": bot.current_usd_principal,
                "profit": bot.current_usd_principal - req.amount
            }
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
async def get_treasury_dashboard(db=Depends(get_db)):
    try:
        cursor = db["transactions"].find().sort("timestamp", -1).limit(10)
        records = await cursor.to_list(length=10)
        
        settlements = []
        for r in records:
            amount = r.get("amount", 0)
            asset = r.get("asset", "").replace("_KES", "")
            txn_type = r.get("txn_type", r.get("type", "UNKNOWN"))
            profit_str = f"+ {amount:,.2f} {asset}" if txn_type == "PNL_CAPTURE" else f"0.00 {asset}"
            
            settlements.append({
                "id": str(r.get("_id", uuid.uuid4())),
                "desc": f"Engine Executed {txn_type}",
                "time": r.get("timestamp", datetime.utcnow()).strftime("%H:%M:%S"),
                "status": "COMPLETED",
                "profit": profit_str
            })

        vaults = {
            "N7_USDA": 0.0, "N4_MPESA": 0.0, "N1_TELKOM": 0.0, "N2_AIRTEL": 0.0,
            "N3_SAFARICOM": 0.0, "N8_IMP": 0.0, "N9_XLM": 0.0, "N10_USD": 0.0, "N11_GOLD": 0.0
        }
        
        all_txns_cursor = db["transactions"].find()
        all_txns = await all_txns_cursor.to_list(length=None)
        
        for txn in all_txns:
            amt = txn.get("amount", 0)
            frm = txn.get("from_node")
            to = txn.get("to_node")
            if frm in vaults: vaults[frm] -= amt
            if to in vaults: vaults[to] += amt

        mam_laka_res = daraja.get_merchant_balance()
        fiat_balances = mam_laka_res.get("data", {}) if mam_laka_res.get("status") == "success" else {}
        mam_laka_total = 0.0

        if fiat_balances:
            vaults["N2_AIRTEL"] = fiat_balances.get("artmBalance", 0.0) 
            vaults["N4_MPESA"] = fiat_balances.get("kesBalance", 0.0)   
            vaults["N8_IMP"] = fiat_balances.get("impaBalance", 0.0)    
            mam_laka_total = fiat_balances.get("totalBalance", 0.0)

        return {
            "status": "success",
            "vaults": vaults,
            "settlements": settlements,
            "web2_total_kes": mam_laka_total
        }
    except Exception as e:
        traceback.print_exc()
        return {"status": "success", "vaults": {}, "settlements": []}


@router.get("/positions")
async def get_treasury_positions(db=Depends(get_db)):
    """Return master-wallet balances, with retail-wallet fallback where needed."""
    try:
        wallets = await db["retail_wallets"].find({}, {asset: 1 for asset in SUPPORTED_ASSETS}).to_list(length=None)
        retail_balances = {asset: 0.0 for asset in SUPPORTED_ASSETS}
        for wallet in wallets:
            for asset in SUPPORTED_ASSETS:
                retail_balances[asset] += float(wallet.get(asset, 0) or 0)

        master_balances = {}
        master_assets = set()

        async def read_daraja_balance():
            return await asyncio.to_thread(daraja.get_merchant_balance)

        async def read_cardano_balance():
            return await asyncio.to_thread(lambda: asyncio.run(get_master_wallet_balance()))

        def read_celo_balances():
            treasury_address = get_treasury_address()
            balance_abi = [{
                "constant": True,
                "inputs": [{"name": "account", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function",
            }]
            balances = {}
            for asset, contract_address in ASSET_CONTRACTS.items():
                contract = w3.eth.contract(address=contract_address, abi=balance_abi)
                decimals = 6 if asset in {"USDC", "USDT"} else 18
                balances[asset] = float(contract.functions.balanceOf(treasury_address).call()) / (10 ** decimals)
            return balances

        master_results = await asyncio.gather(
            read_daraja_balance(),
            read_cardano_balance(),
            asyncio.wait_for(asyncio.to_thread(read_celo_balances), timeout=20),
            return_exceptions=True,
        )

        merchant_result, cardano_balance, celo_balances = master_results
        if isinstance(merchant_result, dict) and merchant_result.get("status") == "success":
            merchant_data = merchant_result.get("data", {})
            master_balances.update({
                "KES": float(merchant_data.get("kesBalance", 0) or 0),
                "AIRT": float(merchant_data.get("artmBalance", 0) or 0),
                "IMP": float(merchant_data.get("impaBalance", 0) or 0),
            })
            master_assets.update({"KES", "AIRT", "IMP"})
        if isinstance(cardano_balance, dict) and cardano_balance.get("status") == "success":
            master_balances.update({
                "ADA": float(cardano_balance.get("ada", 0) or 0),
                "USDA": float(cardano_balance.get("usda", 0) or 0),
            })
            master_assets.update({"ADA", "USDA"})
        if isinstance(celo_balances, dict):
            master_balances.update(celo_balances)
            master_assets.update(celo_balances)

        assets = [*SUPPORTED_ASSETS]
        if "ADA" not in assets:
            assets.append("ADA")
        balances = {
            asset: master_balances[asset] if asset in master_assets else retail_balances.get(asset, 0.0)
            for asset in assets
        }

        fiat_assets = {"KES", "USD", "UGX", "TZS", "RWF", "BIF", "XAF", "XOF"}
        rows = []
        for asset, available in balances.items():
            usd_rate = float(DEFAULT_USD_BASE_RATES.get(asset, 1) or 1)
            rows.append({
                "asset": asset,
                "source": "master wallet" if asset in master_assets else "retail wallets",
                "live": asset in master_assets,
                "available": available,
                "reserved": 0,
                "pendingIn": 0,
                "pendingOut": 0,
                "netPosition": available,
                "limit": None,
                "utilization": None,
                "usdEquivalent": available / usd_rate,
            })

        rows.sort(key=lambda row: row["asset"])
        fiat = [row for row in rows if row["asset"] in fiat_assets]
        stablecoins = [row for row in rows if row["asset"] not in fiat_assets]
        fiat_total = sum(row["usdEquivalent"] for row in fiat)
        stablecoin_total = sum(row["usdEquivalent"] for row in stablecoins)
        return {
            "status": "success",
            "fiat": fiat,
            "stablecoins": stablecoins,
            "kpis": {
                "totalLiquidityUsd": fiat_total + stablecoin_total,
                "fiatLiquidityUsd": fiat_total,
                "stablecoinLiquidityUsd": stablecoin_total,
            },
        }
    except Exception:
        traceback.print_exc()
        return {
            "status": "success",
            "fiat": [],
            "stablecoins": [],
            "kpis": {
                "totalLiquidityUsd": 0,
                "fiatLiquidityUsd": 0,
                "stablecoinLiquidityUsd": 0,
            },
        }

@router.post("/reset-sandbox")
async def reset_treasury_sandbox(db=Depends(get_db)):
    await db["transactions"].delete_many({})
    genesis_entries = [
        {"txn_id": "GENESIS-01", "timestamp": datetime.utcnow(), "from_node": "EXTERNAL", "to_node": "N7_USDA", "asset": "USDA", "amount": 50000.00, "internal_usd_value": 50000.00, "txn_type": "SYSTEM_FUND", "cycle": 0},
        {"txn_id": "GENESIS-02", "timestamp": datetime.utcnow(), "from_node": "EXTERNAL", "to_node": "N4_MPESA", "asset": "KES", "amount": 6500000.00, "internal_usd_value": 50000.00, "txn_type": "SYSTEM_FUND", "cycle": 0}
    ]
    await db["transactions"].insert_many(genesis_entries)
    try:
        from Brain_Engine.cache import memory_cache
        memory_cache.set("system:kill_switch", False)
    except:
        pass
    return {"status": "success", "message": "Sandbox reset to Genesis. Kill switch lifted."}

@router.post("/kill-switch")
async def toggle_kill_switch(req: dict):
    try:
        from Brain_Engine.cache import memory_cache
        memory_cache.set("system:kill_switch", req.get("active", False))
    except:
        pass
    return {"status": "success"}


@router.get("/mpesa/balances")
async def get_mpesa_balances():
    """Mock endpoint for M-Pesa B2C and C2B float balances."""
    return {
        "status": "success",
        "payouts_kes": 6500000.0,
        "collections_kes": 1250000.0
    }

# ======================================================================
# 🟢 CORPORATE REVENUE ENDPOINTS
# ======================================================================
@router.get("/revenue")
async def get_corporate_revenue(db=Depends(get_db)):
    """Fetches the accumulated profit separated from user liquidity."""
    revenue = await db["company_revenue"].find_one({"_id": "corporate_treasury"})
    if not revenue:
        return {
            "status": "success", 
            "balances": {
                        "KES": 0.0, "USD": 0.0,
                        "USDC": 0.0, "USDA": 0.0, 
                        "AIRT": 0.0
                        }
                }
    
    balances = {k: v for k, v in revenue.items() if k != "_id"}
    return {"status": "success", "balances": balances}

class RevenueWithdrawal(BaseModel):
    asset: str
    amount: float
    destination: str

@router.post("/revenue/withdraw")
async def withdraw_corporate_revenue(payload: RevenueWithdrawal, db=Depends(get_db)):
    """Allows the Admin to cash out accumulated company profits."""
    # 1. Check Revenue Balance
    revenue = await db["company_revenue"].find_one({"_id": "corporate_treasury"})
    current_balance = float(revenue.get(payload.asset, 0.0)) if revenue else 0.0
    
    if payload.amount > current_balance:
        raise HTTPException(status_code=400, detail=f"Insufficient {payload.asset} in Corporate Revenue Account.")

    # 2. Safely Lock Funds in Database
    await db["company_revenue"].update_one(
        {"_id": "corporate_treasury"},
        {"$inc": {payload.asset: -payload.amount}}
    )

    # 3. Execute the Admin Withdrawal (M-Pesa B2C for KES)
    if payload.asset == "KES":
        try:
            token = daraja.get_access_token()
            payout_url = f"{daraja.base_url}/api/v1/mobile/transfer"
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            
            b2c_payload = {
                "impalaMerchantId": "meshex_sandbox",
                "currency": "KES",
                "amount": int(payload.amount),
                "recipientPhone": payload.destination,
                "mobileMoneySP": "M-Pesa",
                "externalId": f"REV_{uuid.uuid4().hex[:6].upper()}",
                "callbackUrl": "https://mamlaka-test.ngrok.app/api/ramp/b2c/result"
            }
            
            res = requests.post(payout_url, json=b2c_payload, headers=headers, timeout=15)
            if res.status_code not in [200, 201]:
                raise Exception(f"M-Pesa API rejected transfer: {res.text}")
                
            print(f"💰 Corporate Revenue Withdrawn! Sent {payload.amount} KES to {payload.destination}.")
        except Exception as e:
            # Safely refund the revenue wallet if the Daraja API fails
            await db["company_revenue"].update_one({"_id": "corporate_treasury"}, {"$inc": {payload.asset: payload.amount}})
            raise HTTPException(status_code=500, detail=str(e))
            
    return {"status": "success", "message": f"Successfully withdrew {payload.amount} {payload.asset} to {payload.destination}."}

class SimSwapReq(BaseModel):
    user_id: str
    from_asset: str
    to_asset: str
    amount: float

@router.post("/simulate-swap")
async def simulate_swap(req: SimSwapReq, db=Depends(get_db)):
    from routes.ramp import execute_internal_swap
    return await execute_internal_swap(req, db)


# ======================================================================
# 🟢 DYNAMIC MULTI-CHAIN DEPOSIT GATEWAY & WALLET GENERATOR
# ======================================================================

def get_celo_hot_wallet():
    """Mathematically derives the Celo address from the Private Key so it CANNOT mismatch."""
    pk = os.getenv("CELO_TREASURY_PK")
    if pk:
        try:
            w3 = Web3()
            clean_pk = pk if pk.startswith("0x") else f"0x{pk}"
            return w3.eth.account.from_key(clean_pk).address
        except Exception as e:
            print(f"Error deriving wallet from PK: {e}")
            pass
    # Absolute fallback if PK is missing entirely
    return os.getenv("CELO_HOT_WALLET_ADDRESS", "0x6f7BeAb48EAfC47B89041899a35a0525a6A60F59")

@router.get("/deposit-info")
async def get_deposit_info(asset: str = "USDT", network: str = "stellar"):
    """
    Dynamically generates deposit addresses and Memos based on the requested network.
    Called by the React DepositPage when a user selects a crypto channel.
    """
    stellar_address = os.getenv("STELLAR_MASTER_ADDRESS", "GB44UP5VEV2GEHO7UBQQGLWDN5UURTFXTECVYZRX63KBV2PUYLNFQ6K2")
    tron_address = os.getenv("TRON_MASTER_ADDRESS", "TNZZyXUR6JDmxd7Gub8pgdaHWFg6RmSk5U")
    cardano_address = os.getenv("MASTER_WALLET_ADDRESS", "addr1qx2p8zzt0u9e5n62354c4n2mamlaka_master_vault")

    # Derives the EXACT address that the valora.py scanner is listening to!
    celo_address = get_celo_hot_wallet()

    response_data = {
        "address": "",
        "memo": "",
        "network":  network,
        "asset": asset
    }

    network_lower = network.lower()

    # 1. EVM Networks (Celo, Polygon, Ethereum) - No Memo required
    if network_lower in ["celo", "polygon", "ethereum"]:
        response_data["address"] = celo_address
        
    # 2. Tron Network - No Memo required
    elif network_lower in ["tron", "trc20"]:
        response_data["address"] = tron_address
        
    # 3. Stellar Network - MEMO IS STRICTLY REQUIRED
    elif network_lower == "stellar":
        response_data["address"] = stellar_address
        unique_memo = f"JASIRI-{uuid.uuid4().hex[:6].upper()}"
        response_data["memo"] = unique_memo

    # 4. Cardano Network
    elif network_lower == "cardano":
        response_data["address"] = cardano_address

    return {"status": "success", "data": response_data}