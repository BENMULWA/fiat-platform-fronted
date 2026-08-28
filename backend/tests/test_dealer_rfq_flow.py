import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from datetime import datetime, timedelta
from bson import ObjectId

from dealer_engine.liquidity import LiquidityEngine
from dealer_engine.positions import TreasuryPositionEngine
from dealer_engine.liquidity import SmartRouter
from routes.otc_admin import _serialize_dealer_rfq, accept_dealer_rfq, create_dealer_rfq, execute_dealer_rfq, get_dealer_rfq_analysis, get_dealer_settlement, quote_dealer_rfq


class FakeCollection:
    def __init__(self):
        self.docs = []

    async def insert_one(self, document):
        document["_id"] = object()
        self.docs.append(document)
        return {"inserted_id": document["_id"]}

    async def find_one(self, query):
        for doc in self.docs:
            if query.get("id") is not None and doc.get("id") == query.get("id"):
                return doc
            if query.get("_id") is not None and doc.get("_id") == query.get("_id"):
                return doc
            if query.get("userId") is not None and doc.get("userId") == query.get("userId"):
                return doc
            if query.get("asset") is not None and doc.get("asset") == query.get("asset"):
                return doc
        return None

    def find(self, query=None):
        return self

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            matches_id = query.get("id") is None or doc.get("id") == query.get("id")
            matches_asset = query.get("asset") is None or doc.get("asset") == query.get("asset")
            if matches_id and matches_asset:
                if "$set" in update:
                    doc.update(update["$set"])
                if "$inc" in update:
                    for key, value in update["$inc"].items():
                        doc[key] = doc.get(key, 0) + value
                return {"matched_count": 1, "modified_count": 1}
        if upsert:
            doc = dict(query)
            if "$set" in update:
                doc.update(update["$set"])
            self.docs.append(doc)
            return {"matched_count": 1}
        return {"matched_count": 0}

    def sort(self, *args, **kwargs):
        return self

    async def to_list(self, length=100):
        return self.docs


class FakeDB:
    def __getitem__(self, name):
        return getattr(self, name)

    def __init__(self):
        self.dealer_rfqs = FakeCollection()
        self.dealer_settlements = FakeCollection()
        self.dealer_executions = FakeCollection()
        self.treasury_rate_book = FakeCollection()
        self.treasury_positions = FakeCollection()
        self.liquidity_sources = FakeCollection()
        self.users = FakeCollection()
        self.retail_wallets = FakeCollection()
        self.ramp_entries = FakeCollection()
        self.users.docs.append({"_id": "CUST-01", "status": "active", "kycStatus": "verified"})
        self.treasury_positions.docs.append({"asset": "USDC", "total": 200000, "reserved": 0, "pending": 0})
        self.retail_wallets.docs.append({"userId": "CUST-01", "USDA": 200000})


class DealerRfqFlowTests(unittest.TestCase):
    def test_rfq_serializer_converts_nested_object_ids(self):
        serialized = _serialize_dealer_rfq({
            "customerId": ObjectId(),
            "analysis": {"allocations": [{"providerQuoteId": ObjectId()}]},
        })

        self.assertIsInstance(serialized["customerId"], str)
        self.assertIsInstance(serialized["analysis"]["allocations"][0]["providerQuoteId"], str)

    def test_customer_volume_is_calculated_per_merchant_from_transactions(self):
        async def run_test():
            db = FakeDB()
            db.users.docs.extend([
                {"_id": "CUST-02", "status": "active", "kycStatus": "verified", "dailyLimit": 5000},
            ])
            today = datetime.utcnow()
            db.ramp_entries.docs.extend([
                {"userId": "CUST-01", "fromAmount": 1200, "status": "completed", "createdAt": today},
                {"userId": "CUST-01", "fromAmount": 300, "status": "completed", "createdAt": today},
                {"userId": "CUST-02", "fromAmount": 800, "status": "completed", "createdAt": today},
                {"userId": "CUST-02", "fromAmount": 900, "status": "pending", "createdAt": today},
            ])

            first = await create_dealer_rfq({"amount": 100, "from_asset": "USDC", "to_asset": "KES", "customer_id": "CUST-01", "side": "BUY", "settlement_channel": "BANK_TO_WALLET", "destination_wallet": "wallet-cust-01", "network": "Celo"}, db)
            second = await create_dealer_rfq({"amount": 100, "from_asset": "USDC", "to_asset": "KES", "customer_id": "CUST-02", "side": "BUY", "settlement_channel": "BANK_TO_WALLET", "destination_wallet": "wallet-cust-02", "network": "Celo"}, db)

            first_checks = first["rfq"]["analysis"]["customer"]
            second_checks = second["rfq"]["analysis"]["customer"]
            self.assertEqual(next(check for check in first_checks if check["key"] == "customer_volume")["value"], "1,500.00")
            self.assertEqual(next(check for check in first_checks if check["key"] == "customer_limit")["value"], "9,998,500.00")
            self.assertEqual(next(check for check in second_checks if check["key"] == "customer_volume")["value"], "800.00")
            self.assertEqual(next(check for check in second_checks if check["key"] == "customer_limit")["value"], "4,200.00")

        asyncio.run(run_test())

    def test_buying_usda_requires_and_tracks_destination_wallet(self):
        async def run_test():
            db = FakeDB()
            payload = {"amount": 1, "from_asset": "USDA", "to_asset": "KES", "customer_id": "CUST-01", "side": "BUY", "settlement_channel": "BANK_TO_WALLET", "destination_wallet": "addr_test1merchant", "network": "Cardano"}
            result = await create_dealer_rfq(payload, db)
            quote = await quote_dealer_rfq(result["rfq"]["id"], {"send_quote": True}, db)
            self.assertEqual(quote["rfq"]["quote"]["destinationWallet"], "addr_test1merchant")
            self.assertEqual(quote["rfq"]["quote"]["network"], "Cardano")

        asyncio.run(run_test())

    def test_usda_treasury_uses_live_master_wallet_token_balance(self):
        async def run_test():
            db = FakeDB()
            db.treasury_positions.docs.append({"asset": "USDA", "total": 5.88, "reserved": 0, "pending": 0})
            live_balance = {"status": "success", "ada": 5.88, "usda": 38.16}

            with patch("routes.cardano.get_master_wallet_balance", new=AsyncMock(return_value=live_balance)):
                position = await TreasuryPositionEngine(db).available("USDA")
                sources = await LiquidityEngine(db).sources("USDA", 1.0)

            self.assertEqual(position["total"], 38.16)
            self.assertEqual(position["available"], 38.16)
            self.assertEqual(sources[0]["available"], 38.16)

        asyncio.run(run_test())

    def test_dealer_rfq_analysis_and_quote_flow(self):
        async def run_test():
            db = FakeDB()
            result = await create_dealer_rfq(
                {
                    "amount": 1000,
                    "from_asset": "USDC",
                    "to_asset": "KES",
                    "customer_id": "CUST-01",
                    "customer_name": "Acme",
                    "side": "BUY",
                    "settlement_channel": "BANK_TO_WALLET",
                },
                db,
            )

            self.assertEqual(result["status"], "success")
            self.assertTrue(result["rfq"]["analysis"]["passed"])
            treasury = result["rfq"]["analysis"]["treasurySummary"]
            self.assertEqual(treasury["asset"], "USDC")
            self.assertEqual(treasury["total"], 200000)
            self.assertEqual(treasury["required"], 1000)
            self.assertEqual(treasury["coverage"], 20000)
            customer_checks = result["rfq"]["analysis"]["customer"]
            self.assertEqual(next(check for check in customer_checks if check["key"] == "customer_volume")["value"], "0.00")
            self.assertEqual(next(check for check in customer_checks if check["key"] == "customer_limit")["value"], "10,000,000.00")
            compliance_checks = result["rfq"]["analysis"]["compliance"]
            self.assertEqual(next(check for check in compliance_checks if check["key"] == "compliance_kyc")["value"], "CLEAR")
            self.assertEqual(next(check for check in compliance_checks if check["key"] == "risk_rating")["value"], "LOW")

            rfq_id = result["rfq"]["id"]
            analysis = await get_dealer_rfq_analysis(rfq_id, db)
            self.assertEqual(analysis["status"], "success")
            self.assertTrue(analysis["analysis"]["passed"])

            quoted = await quote_dealer_rfq(rfq_id, {"spread_bps": 50}, db)
            self.assertEqual(quoted["status"], "success")
            self.assertGreater(quoted["rfq"]["quote"]["execution_rate"], 0)
            self.assertEqual(quoted["rfq"]["status"], "quoted")
            self.assertTrue(quoted["rfq"]["quote"]["route"])

            accepted = await accept_dealer_rfq(rfq_id, db, {"_id": ObjectId(), "role": "admin"})
            self.assertEqual(accepted["status"], "success")
            self.assertEqual(accepted["rfq"]["status"], "accepted")
            self.assertTrue(accepted["rfq"]["reservationId"])
            self.assertEqual(db.dealer_executions.docs[0]["status"], "accepted")
            self.assertIsInstance(accepted["execution"]["acceptedBy"], str)

            executed = await execute_dealer_rfq(rfq_id, db)
            settlement_id = executed["settlement"]["id"]
            completed = await get_dealer_settlement(settlement_id, db)
            self.assertEqual(completed["settlement"]["status"], "pending")
            self.assertFalse(completed["settlement"]["simulation"])

    def test_analysis_blocks_insufficient_treasury_inventory(self):
        async def run_test():
            db = FakeDB()
            db.treasury_positions.docs[0]["total"] = 1
            result = await create_dealer_rfq(
                {
                    "amount": 1000,
                    "from_asset": "USDC",
                    "to_asset": "KES",
                    "customer_id": "CUST-01",
                    "side": "BUY",
                    "settlement_channel": "BANK_TO_WALLET",
                    "destination_wallet": "wallet-cust-01",
                    "network": "Celo",
                },
                db,
            )
            self.assertFalse(result["rfq"]["analysis"]["passed"])
            self.assertEqual(result["rfq"]["status"], "blocked")
            self.assertFalse(next(check for check in result["rfq"]["analysis"]["treasury"] if check["key"] == "treasury_available")["passed"])

        asyncio.run(run_test())

    def test_smart_router_splits_required_amount_by_effective_cost(self):
        route = SmartRouter().route(
            [
                {"id": "lp-expensive", "name": "LP Expensive", "rate": 131, "fee": 0, "available": 100},
                {"id": "treasury", "name": "Internal Treasury", "rate": 130, "fee": 0, "available": 60},
                {"id": "lp-cheap", "name": "LP Cheap", "rate": 130.5, "fee": 0, "available": 40},
            ],
            90,
        )
        self.assertTrue(route["sufficient"])
        self.assertEqual(route["totalAllocated"], 90)
        self.assertEqual([item["sourceId"] for item in route["allocations"]], ["treasury", "lp-cheap"])


if __name__ == "__main__":
    unittest.main()
