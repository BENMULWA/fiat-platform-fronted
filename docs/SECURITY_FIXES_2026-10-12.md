# Security fixes — 2026-10-12 (retail go-live review, round 1)

Source: the retail go-live review of 2026-10-12. This file records **what was
changed, why, and what you must configure/decide** so the change history is
traceable. Exact diffs: `docs/patches/backend-security-fixes-2026-10-12.patch`
(backend is a nested git repo — `cd backend && git diff`) and
`docs/patches/frontend-security-fixes-2026-10-12.patch`.

## What was wrong → what changed

| # | Problem found | Fix | Files |
|---|---|---|---|
| 1 | `POST /api/treasury/revenue/withdraw` had **no auth**: anyone could send an M-Pesa payout from company revenue to any phone number. Balance check + debit were also two separate steps (race). | Admin-only; asset allow-list; amount finite and > 0; check+debit is now one atomic guarded `update_one`; audit record written. | `routes/treasury.py` |
| 2 | `POST /api/treasury/reset-sandbox` (deletes the whole `transactions` ledger) and `POST /api/treasury/kill-switch` had no auth. | Admin-only. Reset additionally needs `ALLOW_SANDBOX_RESET=true` on that host (off by default). Both audited. | `routes/treasury.py` |
| 3 | Treasury `dashboard`, `positions`, `revenue`, `mpesa/balances`, `simulate-swap` were open. | Admin-only. | `routes/treasury.py`, `src/pages/DashboardPage.tsx` (bare `fetch` → authenticated `api.get`) |
| 4 | `POST /api/market-maker/spread` (changes retail pricing) and the Comet exposure/quote endpoints were open. | Admin-only; bid/ask must be finite, positive, bid < ask; change audited with previous values. `GET /spread` left public (the pricing page reads it). | `routes/market_maker.py` |
| 5 | IMM node/corridor on-off switches and health were open. | Admin-only; toggles audited. | `routes/imm_control.py` |
| 6 | `GET /api/ledger/feed` exposed every ledger entry publicly, and fed `search` into `$regex` unescaped. | Admin-only; `re.escape`, 100-char cap, `limit` capped at 500. | `routes/general_ledger.py` |
| 7 | `operations-overview` and `analytics/chart-data` were open. | Admin-only. Status-moderation `PATCH` now writes an audit record (actor + requested status). | `routes/otc_admin.py` |
| 8 | `/ws/dashboard?userId=X` let anyone subscribe to any user's wallet/deposit/withdrawal events. | JWT required (`?token=`); identity comes from the token, a mismatching `userId` is refused; revoked sessions honoured. Client hook sends the token and stops retrying on close code 4401 (it also now stops reconnecting after unmount). | `routes/realtime.py`, `src/hooks/useWebsocket.ts` |
| 9 | `POST /api/ramp/execute` never validated `amount`/assets. A negative amount made `debit_wallet` *credit* (`$inc` by a positive number; `$gte: <negative>` always passes) while the other leg went negative → free balance → withdrawable as real crypto. Asset strings became MongoDB field names. | `_validate_ramp_request`: direction allow-list, `rate/fee/amount` finite, `amount > 0` and ≤ `RAMP_MAX_AMOUNT_PER_REQUEST` (default 10,000,000), assets must be in `SUPPORTED_ASSETS`, no self-swap, mobile-money ≥ 1 KES. | `routes/ramp.py` |
| 10 | Same class of bug at the primitive level. | `debit_wallet` rejects non-finite/≤ 0; `credit_wallet` rejects non-finite/negative (0 = no-op), so no other caller can reintroduce it. | `wallet_utils.py` |
| 11 | Airtel callbacks were unauthenticated by default (`AIRTEL_CALLBACK_AUTH_ENABLED=false`), and the `providerReference` is returned to the customer → a forged "TS" credits a deposit that was never paid, a forged "TF" refunds a payout that was. | New shared-secret mechanism (`AIRTEL_CALLBACK_TOKEN`, via `X-Callback-Token` header or `?token=`), constant-time compared; the token is appended **only** to the URL sent to the gateway, never stored or returned to the customer. With `APP_ENV=production` and no HMAC/token configured, callbacks are rejected (fail-closed). | `routes/ramp.py` |
| 12 | JWT secret silently fell back to a string in the repo. | Startup check: weak/default/short (< 32) secret → warning; with `APP_ENV=production` → refuses to start. | `config.py` |
| 13 | No record of *who* did privileged actions. | New `admin_audit_log` collection via `admin_audit.log_admin_action` (actor id/email/role, action, details, time). | `admin_audit.py` (new) |

## You must do (these are not code)

1. Set on the **production** API: `APP_ENV=production`, a strong `JWT_SECRET`
   (`python -c "import secrets; print(secrets.token_urlsafe(48))"`), and
   `AIRTEL_CALLBACK_TOKEN=<random>`. **Ask the Mamlaka/Airtel gateway operator
   to preserve the `?token=` query string on callbacks** (or send
   `X-Callback-Token`) — until they do, production callbacks will be rejected
   with 401 and deposits will sit in `processing`. If they can sign bodies
   instead, set `AIRTEL_CALLBACK_AUTH_ENABLED=true` + `AIRTEL_CALLBACK_HASH_KEY`.
2. Rotate `JWT_SECRET` after deploying (all users are logged out — intended).
3. Check whether anyone abused the open endpoints before this fix: look at
   `company_revenue` history, `settlement_logs`, `airtel_callback_events`
   (callbacks you did not expect), and whether the `transactions` ledger was
   ever wiped.

## Verified (2026-10-12)

- All changed Python compiles; `import main` succeeds; `tsc --noEmit` clean.
- Unauthenticated requests to all 17 locked endpoints → 403.
- 9 malformed `/ramp/execute` bodies rejected, 2 valid ones accepted; wallet
  primitives reject −1 / 0 / NaN.
- Callback auth: dev permissive, prod fail-closed, wrong/missing/right token
  behave as expected.
- WebSocket: no token / garbage token / someone else's userId refused; valid
  token accepted.
- **Not verified:** a real browser session, real gateway callbacks, and a
  logged-in *admin* happy path against the live DB (no Mongo in this check;
  existing `pytest` suite not run — `pytest` is not installed in `.venv`).

## Round 2 (same day): full review and fixes

| # | Problem found | Fix | Files |
|---|---|---|---|
| 14 | **Crypto swaps could pay twice.** The swap sent real crypto on-chain to `destination_address` *and* credited the same amount on the internal ledger. The retail UI never sends an address, but any verified user calling the API could name their own, receive the crypto, then withdraw the ledger balance again. | Swap on-chain legs now go only to platform-owned addresses (`CELO_HOT_WALLET_ADDRESS`/`CELO_EXIT_ADDRESS`, `MASTER_WALLET_ADDRESS`); client-supplied and user-saved addresses are ignored. | `routes/ramp.py` |
| 15 | **Internal-transfer history leaked every transfer.** `get_current_user` returns no email, so the code used `""`: it stored `senderEmail=""` on every transfer, the self-transfer check never fired, and `GET /transfers` filtered on `senderEmail == ""` — i.e. returned *all* users' transfers (emails, assets, amounts) to any caller. | Email is read from the user document; history matches on user id (legacy rows handled). Transfers now require approved KYC on the backend (it was only a frontend route guard), `cUSD` transfers work (`.upper()` made it `CUSD`), a `started`→`completed/reversed/needs_reconciliation` record is written *before* money moves. | `routes/retail.py` |
| 16 | **Withdrawal could lose the customer's money.** KES was debited first; a mistyped phone number, missing credentials or gateway-auth failure then raised without refunding. The silent-timeout sweeper also marked unconfirmed withdrawals `failed` with no refund. | Every pre-send failure refunds *and* moves the row to `failed`. | `routes/ramp.py`, `main.py` |
| 17 | **Double refund / double payout.** A synchronous refund left the row `processing`, so a later provider failure callback refunded again. Conversely a timeout *after* the payout request was sent refunded the customer even though the payout may have gone out. | Sync refunds mark the row terminal. Failures after the payout request is sent are treated as *unknown*: funds stay held, row flagged `ambiguousProvider`, shown in the admin "Needs attention" queue; the sweeper flags (never fails) unconfirmed withdrawals. | `routes/ramp.py`, `main.py` |
| 18 | **Double-click / parallel requests** could pass the same balance check twice. | `request_lock.py`: one in-flight money-out request per user (Mongo-backed, expiring), applied to `/ramp/execute`, Celo/Cardano/Stellar withdraw and transfer. | `request_lock.py`, `routes/ramp.py`, `valora.py`, `cardano.py`, `treasury.py`, `retail.py` |
| 19 | **No trace of a request that died mid-flight.** | `ramp_intents` row written before any balance moves and closed with the outcome; stuck ones surface in the admin queue. | `routes/ramp.py` |
| 20 | **Treasury nonce collisions.** Four code paths sign with the one treasury key using `get_transaction_count(addr)` (mined count only) → duplicate nonces → random failed withdrawals/swap legs. | `celo_nonce.reserve_treasury_nonce` (pending count + in-process reservation under a lock). | `celo_nonce.py` + 4 call sites |
| 21 | **Password-only login and signup bypassed the email OTP.** `POST /auth/login` issued a token on email+password; `/auth/signup` let anyone register an address they don't own. Only an unrouted legacy page used them. | Return 410 unless `ALLOW_LEGACY_PASSWORD_AUTH=true`. | `routes/auth.py` |
| 22 | **No rate limiting anywhere** (password/OTP guessing, OTP-email flooding, recipient enumeration). | `rate_limit.py`; applied to all signup/login/OTP/reset routes, withdrawal OTP request, transfer lookup and `/ramp/execute`. In-process (see limits in the module docstring). | `rate_limit.py`, `routes/auth.py`, `retail.py`, `ramp.py` |
| 23 | **Authenticator (TOTP) codes could be brute-forced and replayed** (±2-step window, no attempt counter). | ±1 step, one use per time-step, 5 failures → 15-minute lock. | `two_factor.py` |
| 24 | **Stale / never-set prices kept quoting;** no slippage protection. | `assert_rate_book_fresh` (production: book must have been saved by an admin and be < 2× its refresh interval old) applied to quote and swap; `min_receive` guard (UI sends quote − 0.5%, not for AIRT pairs). | `routes/treasury.py`, `routes/ramp.py`, `src/pages/retail/TradePage.tsx` |
| 25 | **AIRT rounding:** both directions priced the typed fractional amount but only whole tokens move (AIRT→KES paid KES for a fraction that was never burned). | Re-priced on the whole-token amount. | `routes/ramp.py` |
| 26 | **Admins could not see most of what happens.** | `GET /api/admin/audit/{events,stuck,summary}` + new admin page **Audit Log & Alerts** (`/admin/audit-log`, sidebar → Compliance): admin actions, money requests, transfers, payouts, Celo/Stellar signing, compliance checks, provider callbacks (raw bodies/headers stripped), and a live "Needs attention" queue. | `routes/admin_audit_view.py`, `src/pages/OTC Dashboard/AuditLog.tsx`, `App.tsx`, `Sidebar.tsx`, `api/client.ts` |

New environment variables: `APP_ENV`, `AIRTEL_CALLBACK_TOKEN`, `ALLOW_SANDBOX_RESET`,
`ALLOW_LEGACY_PASSWORD_AUTH`, `RAMP_MAX_AMOUNT_PER_REQUEST`, `RATE_BOOK_ENFORCE_FRESHNESS`,
`RATE_BOOK_MAX_AGE_HOURS`, `TOTP_MAX_FAILED_ATTEMPTS`, `TOTP_LOCKOUT_MINUTES`, `RATE_LIMIT_DISABLED`.

## Decisions for you (behaviour changes you should know about)

1. **Rate-book freshness in production** pauses trading when treasury hasn't saved the
   rate book within 2× `refresh_interval_hours` (default 6 h) or has never saved it.
   Someone must update rates on a schedule, or set `RATE_BOOK_MAX_AGE_HOURS`.
2. **Swap on-chain legs are now treasury-internal.** The customer's crypto is a ledger
   balance they withdraw later through the 2FA withdraw endpoints. Whether the swap
   should make any on-chain movement at all is a product call — it costs gas and moves
   nothing the customer can see.
3. **Authenticator codes are single-use per 30 s.** A user whose withdrawal is
   rejected *after* the 2FA step (e.g. insufficient balance) must wait for the next code.
4. **Ambiguous payouts hold funds** until the provider callback or an admin settles
   them. That is deliberate (refunding can pay twice) but needs someone watching the
   "Needs attention" tab.

## Verified

- `python -m unittest tests.test_security_fixes -v` → 15 tests, all pass.
- App imports; every changed money/admin route returns 403 anonymously; legacy
  `/auth/login` and `/auth/signup` return 410; the HTTP rate limiter returns 429
  with `Retry-After` after the limit.
- `tsc --noEmit` clean; `vite build` succeeds.
- **Not verified:** anything against a real MongoDB, real gateway/Celo/Cardano calls,
  a logged-in browser session, or the pre-existing test-suite (pytest isn't installed
  in `.venv`). The withdrawal-refund branches, the transfer reconciliation states, TOTP
  lockout/replay and the audit endpoints' queries were reviewed and partly unit-tested
  but have **not** run end to end — test them on staging with small amounts before launch.

## Still open

- Secrets manager / hot-cold treasury split / multisig (infrastructure).
- A real price feed behind the rate book (it is still an admin-typed table).
- Cross-currency fiat swaps (KES→UGX …) remain ledger-only.
- Float money → `Decimal128`/integer minor units; Mongo multi-document transactions.
- On-chain vs ledger reconciliation job; alert delivery (email/Slack/pager) for the
  "Needs attention" queue; structured logging/Sentry.
- `revenue/withdraw` for non-KES assets debits the ledger but sends nothing.
- Rate limiter and nonce reservation are per-process: moving to several API instances
  needs Redis and a shared signer.
- Cardano/Stellar deposit→credit→sweep and M-Pesa flows still need real-money tests.
