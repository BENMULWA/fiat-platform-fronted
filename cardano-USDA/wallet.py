"""
HD wallet management for the platform hot wallet.

Each workspace is assigned a unique Cardano account index stored in MongoDB.
All addresses are derived from a single BIP39 mnemonic at:
  m/1852'/1815'/{account_index}'/0/0  (Shelley payment key path)

Private keys never leave this module — only public addresses are returned
to the API layer. Signing happens here via sign_and_submit().
"""
from __future__ import annotations

from cardano.client import get_network
from config import settings


class CardanoWallet:
    def __init__(self, account_index: int):
        if not settings.cardano_mnemonic:
            raise RuntimeError(
                "CARDANO_MNEMONIC is not set. "
                "Generate a 24-word mnemonic and add it to your .env file."
            )
        try:
            from pycardano import HDWallet, PaymentSigningKey, PaymentVerificationKey, Address
        except ImportError:
            raise RuntimeError("pycardano is not installed. Run: pip install pycardano")

        root = HDWallet.from_mnemonic(settings.cardano_mnemonic)
        child = root.derive_from_path(f"m/1852'/1815'/{account_index}'/0/0")
        self._signing_key: PaymentSigningKey = PaymentSigningKey.from_primitive(
            child.private_key
        )
        vk: PaymentVerificationKey = PaymentVerificationKey.from_signing_key(
            self._signing_key
        )
        self.address: Address = Address(
            payment_part=vk.hash(), network=get_network()
        )

    @property
    def address_str(self) -> str:
        return str(self.address)

    @property
    def signing_key(self):
        return self._signing_key


async def get_or_create_wallet_index(db, workspace_id: str) -> int:
    """
    Returns the account index for a workspace, creating one if it doesn't exist.
    Index is stored in the `cardano_wallets` collection.
    """
    doc = await db.cardano_wallets.find_one({"workspaceId": workspace_id})
    if doc:
        return int(doc["accountIndex"])

    count = await db.cardano_wallets.count_documents({})
    new_index = count
    await db.cardano_wallets.insert_one(
        {"workspaceId": workspace_id, "accountIndex": new_index}
    )
    return new_index
