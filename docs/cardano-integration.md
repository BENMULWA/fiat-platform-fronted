**Cardano Integration — E2E Architecture**

Overview
- Goal: enable secure on-ramp (deposit USDA on Cardano) and off-ramp (withdraw USDA from platform) flows integrated with UI and backend.

Components
- Frontend UI
  - On/Off Ramp pages in `src/pages` (uses `src/api/client.ts` endpoints)
  - Handles user input, shows wallet address, deposit instructions, progress & confirmations
- API Server
  - FastAPI app (`backend/main.py`) exposing Cardano routes (`/api/cardano/*`)
  - Auth middleware (`auth`) for workspace/user context
- Cardano Wallet Service
  - `cardano-USDA/wallet.py` provides HD wallet derivation, address generation, signing helper
  - Responsible for deriving per-workspace addresses and signing transactions
- Blockchain Provider
  - Either a local `cardano-node` + `cardano-wallet` or third-party provider (Blockfrost, Koios)
  - Exposes REST endpoints for UTXO queries, tx submission, and confirmations
- Key Management
  - KMS/HSM for production signing keys; `pycardano` can sign locally for dev/test using mnemonic
  - Secrets manager for mnemonic and provider API keys
- Database
  - MongoDB collections: `cardano_wallets`, `cardano_deposits`, `cardano_withdrawals`, `airtime_entries`, `ledger_entries`, `users`, `workspaces`
- Workers & Queue
  - Background worker (Celery/RQ) for heavy tasks: polling provider, submit/retry txs, reconciliation
- Webhooks & Callbacks
  - Provider or node webhooks notify confirmations; worker reconciles and updates deposit records
- Observability & Security
  - Logging, tracing, metrics, alerting; strict CORS, rate limiting, input validation

Data model (high level)
- `cardano_wallets`: { workspaceId, accountIndex, createdAt }
- `cardano_deposits`: { id, workspaceId, address, amount, asset, txHash, confirmations, status, createdAt, verifiedAt }
- `cardano_withdrawals`: { id, workspaceId, toAddress, amount, asset, txHash, status, attempts, createdAt }

High-level flows

On-Ramp (Deposit) — high-level steps
1. User visits On-Ramp UI and requests a deposit address.

2. Frontend calls `GET /api/cardano/wallet` to obtain a workspace-derived deposit address.

3. Backend uses `get_or_create_wallet_index()` and `CardanoWallet` to derive address and returns it.

4. User sends on-chain USDA (or ADA) to the provided address.

5. Backend worker or provider webhook detects the incoming UTXO and records a `cardano_deposits` entry with `status: pending`.

6. Worker polls/backed webhook watches for required confirmations (e.g., 10). Once reached, backend marks deposit `verified`, credits workspace balance (create ledger entries, update token/USDA balance), and notifies frontend via polling or websocket.

7. If deposit needs verification (amount mapping to USD), run business logic, anti-fraud/KYC checks, then finalize credit to user account.

Off-Ramp (Withdraw) — high-level steps
1. User initiates withdraw from UI, providing `toAddress` and amount.

2. Frontend posts `POST /api/cardano/withdraw` with payload `{ toAddress, amount, asset }`.

3. Backend validates request (balance check, KYC/AML), creates `cardano_withdrawals` record with `status: pending`.

4. Backend prepares transaction: select UTXOs, build, sign (via KMS/HSM or local `pycardano`), and submit to chain via provider (brockfrost).

5. On successful submission, save `txHash` and set `status: submitted`

6. Worker polls for confirmations; once confirmed, mark `status: completed` and create ledger entries for debit.

7. If tx fails, mark `failed`, attempt retries with exponential backoff, or escalate to manual review.

API endpoints (suggested)
- `GET /api/cardano/wallet` → returns workspace deposit address and address metadata
  - Response: `{ address: string, accountIndex: number, createdAt: string }`
- `GET /api/cardano/transactions?limit=20` → recent on-chain txs for workspace address

  - Response: `{ transactions: [{ txHash, amount, asset, direction, confirmations, status, timestamp }] }`
- `POST /api/cardano/on-ramp/verify` → used by UI to request verification (or by webhook)
  - Payload: `{ txHash }` or `{ address, amount }`
  - Response: `{ ok: true, depositId }`
- `POST /api/cardano/withdraw` → request withdrawal
  - Payload: `{ toAddress, amount, asset, idempotencyKey? }`
  - Response: `{ withdrawalId, status }`
- Webhook endpoints: `/api/cardano/webhook` (provider callback). Secure with HMAC.

Security & operational recommendations
- Use KMS/HSM for signing in prod (AWS KMS, HashiCorp Vault Transit, or cloud HSM).
- Limit mnemonic exposure; prefer HD with accountIndex stored in DB and private keys managed in KMS.
- Use idempotency keys for withdraws and on-ramp processing.
- Require KYC/AML before large withdrawals; add rate limits.
- Maintain audit logs and ledger links for every on-chain operation.

Test plan & testnet strategy
- Use Cardano testnet and a Blockfrost test project or local `cardano-wallet` for E2E tests.
- Scripts to fund test addresses, submit txs, and simulate webhooks.
- Automated test suite to verify address derivation, deposit detection, confirmation handling, and withdrawal signing/submission.

Next steps
- Create a Mermaid sequence diagram for the On-Ramp flow and a matching one for Off-Ramp.
- Add concrete API route stubs in `backend/routes/cardano.py` and a worker skeleton.
- Implement a test harness script for the Cardano testnet.

