# Airtel Payments Flow: Jasiri to Mamlaka Sandbox

## Overview

Jasiri now uses the Mamlaka sandbox API directly for Airtel collections and disbursements. The custom Go Airtel gateway is no longer used by the active Jasiri retail and admin payment paths.

The active flow is:

```
text
Jasiri -> Mamlaka sandbox API -> Airtel network
                                      |
                                      v
                         Mamlaka/Airtel callback
                                      |
                                      v
                         Jasiri public callback URL
                                      |
                                      v
                             MongoDB transaction
                                      |
                                      v
                         Wallet and UI status update
```

## Services and Responsibilities

### Jasiri

Jasiri is the FastAPI application in the `backend` directory. It:

- Authenticates to Mamlaka using Basic Auth.
- Receives a JWT from Mamlaka.
- Uses the JWT for payment requests.
- Creates a local transaction record with `processing` status.
- Receives the asynchronous callback.
- Matches the callback to the local transaction.
- Credits a wallet for a successful collection.
- Marks a payout or collection as `completed` or `failed`.
- Broadcasts the final status to the frontend.

Relevant implementation:

- `backend/services/airtel_client.py`
- `backend/routes/ramp.py`
- `backend/main.py`

### Mamlaka Sandbox API

Mamlaka is the payment gateway between Jasiri and Airtel. It:

- Authenticates Jasiri and issues a JWT.
- Accepts collection and disbursement requests.
- Sends the request to Airtel.
- Returns an immediate acceptance or rejection response.
- Sends a later asynchronous transaction callback.

### Airtel

Airtel processes the actual mobile-money transaction. The customer confirms a collection on their phone, or Airtel processes a disbursement to the recipient.

### ngrok

ngrok exposes Jasiri's local port 8000 to the public internet during development:

```text
https://hemathermal-ha-dextrously.ngrok-free.dev
```

Mamlaka must be able to reach this URL. ngrok is only a public tunnel; it is not the payment processor.

## Configuration

Jasiri's backend environment should contain equivalent settings without exposing credentials in source control:

```env
AIRTEL_API_BASE_URL=https://sandbox.payments.mamlakapsp.com/api/v1
AIRTEL_API_USERNAME=meshex_sandbox
AIRTEL_API_PASSWORD=<sandbox password>
AIRTEL_CALLBACK_BASE_URL=https://hemathermal-ha-dextrously.ngrok-free.dev
AIRTEL_USE_PORTAL_CALLBACK=false
```

`AIRTEL_CALLBACK_BASE_URL` is a base URL. Jasiri appends the callback paths itself.

The resulting callback URLs are:

```text
Collections:
https://hemathermal-ha-dextrously.ngrok-free.dev/api/v1/callbacks/collections

Disbursements:
https://hemathermal-ha-dextrously.ngrok-free.dev/api/v1/callbacks/disbursements
```

Do not place a callback path inside `AIRTEL_CALLBACK_BASE_URL`, or Jasiri will append a second path.

The previous external portal relay is disabled by default. To temporarily restore it,
set `AIRTEL_USE_PORTAL_CALLBACK=true` and configure `AIRTEL_PORTAL_COLLECTIONS_CALLBACK_URL`.

## Authentication Flow

Before the first payment request, Jasiri requests a Mamlaka JWT:

```http
GET https://sandbox.payments.mamlakapsp.com/api/v1/
Authorization: Basic <base64(username:password)>
Accept: application/json
```

Mamlaka returns a response containing a token and expiry information:

```json
{
  "token": "<jwt>",
  "expires_at": "<timestamp>"
}
```

Jasiri caches the token and sends it on subsequent requests:

```http
Authorization: Bearer <jwt>
Content-Type: application/json
```

Jasiri refreshes the token when it expires or is close to expiry.

## Airtel Collection Flow

A collection is money paid by a customer into the application.

1. The customer starts a deposit in Jasiri.
2. Jasiri generates a local reference such as `LIVE-XXXXXXXX`.
3. Jasiri calls Mamlaka's collection operation:

```http
POST https://sandbox.payments.mamlakapsp.com/api/v1/mobile/initiate
```

4. Jasiri submits the customer phone, amount, merchant ID, provider, local reference, and callback URL.
5. Mamlaka sends the collection request to Airtel.
6. Airtel prompts the customer for confirmation.
7. Jasiri stores the transaction in `ramp_entries` with:

```text
status = processing
direction = on
providerReference = local reference
```

8. Mamlaka/Airtel sends the asynchronous callback to:

```text
POST /api/v1/callbacks/collections
```

9. Jasiri extracts the best transaction identifier, preferring `externalId` and nested transaction IDs over a provider-generated numeric reference.
10. Jasiri finds the matching `ramp_entries` record.
11. For a successful callback, Jasiri credits the user's wallet and sets the transaction to `completed`.
12. For a failed callback, Jasiri sets the transaction to `failed`.

## Airtel Disbursement Flow

A disbursement is money paid from the application to a recipient.

1. The user or admin starts a withdrawal.
2. Jasiri generates a local payout reference such as `B2CXXXXXXXX` or `CWXXXXXXXX`.
3. Jasiri deducts or reserves the amount according to the withdrawal workflow.
4. Jasiri calls Mamlaka's transfer operation:

```http
POST https://sandbox.payments.mamlakapsp.com/api/v1/mobile/transfer
```

5. Jasiri submits the recipient phone, amount, merchant ID, provider, local reference, and disbursement callback URL.
6. Mamlaka sends the payout request to Airtel.
7. Jasiri stores the transaction as:

```text
status = processing
direction = off
providerReference = local payout reference
```

8. Mamlaka/Airtel sends the asynchronous callback to:

```text
POST /api/v1/callbacks/disbursements
```

9. Jasiri matches the callback using all available identifiers, including `externalId`, transaction ID, callback reference, and stored provider reference.
10. For a successful callback, Jasiri marks the withdrawal `completed`. The funds were already deducted when the payout was submitted, so no additional wallet deduction occurs.
11. For a failed callback, Jasiri marks the withdrawal `failed` and refunds the user's wallet where required.

## Immediate Response Versus Callback

The response to the initial Mamlaka request is not the final transaction result.

Example immediate response:

```json
{
  "status": "processing",
  "message": "Request accepted"
}
```

This means Mamlaka accepted the request for processing. It does not prove that Airtel completed the transaction.

The final result comes later through the callback. A successful callback may contain fields such as:

```json
{
  "amount": 10,
  "currency": "KES",
  "externalId": "LIVE-XXXXXXXX",
  "transactionStatus": "COMPLETE",
  "transactionReport": "..."
}
```

Jasiri treats `COMPLETE`, `COMPLETED`, `SUCCESS`, `SUCCESSFUL`, `TS`, `APPROVED`, and `PAID` as successful callback statuses. Failed or rejected statuses result in a failed transaction.

## Callback Processing

Jasiri mounts callback routes in `backend/main.py`:

```text
/api/v1/callbacks/collections
/api/v1/callbacks/disbursements
```

The callback handler:

1. Reads JSON, form-urlencoded, or query-string callback formats.
2. Stores the raw callback in `airtel_callback_events`.
3. Extracts the callback reference and transaction status.
4. Searches `ramp_entries` and company withdrawals for a matching reference.
5. Updates the transaction state.
6. Credits or refunds wallets when required.
7. Returns HTTP 200 after processing or recording the callback result.

A callback response of HTTP 200 only confirms that Jasiri received and handled the HTTP request. The body may still say that a transaction was ignored, for example when no local reference matched.

## Tracing a Test Deposit

Start Jasiri:

```bash
cd ~/Crypto-Meshex-B2B-Platform/project/backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

Start ngrok in another terminal:

```bash
ngrok http 8000
```

Confirm the callback URL in the active backend environment matches the current ngrok hostname. Then open the ngrok inspector:

```text
http://127.0.0.1:4040
```

Start a small test deposit, such as `10 KES`, and observe:

1. Jasiri logs the direct Mamlaka request.
2. The customer confirms the Airtel prompt.
3. ngrok shows `POST /api/v1/callbacks/collections`.
4. Jasiri logs the matched transaction and final status.
5. The `ramp_entries` record changes from `processing` to `completed`.
6. The user's wallet balance is updated.

## Tracing a Test Disbursement

For a payout, observe:

```text
POST /api/v1/callbacks/disbursements
```

Check that the callback's `externalId` or transaction ID matches the stored `providerReference`. A successful callback should change the payout from `processing` to `completed`.

## Troubleshooting

### No request appears in ngrok

The callback was not delivered to Jasiri. Check:

- The Mamlaka sandbox callback configuration.
- The callback URL submitted in the request.
- The current ngrok hostname.
- Whether ngrok is still running.
- Whether Jasiri is listening on port 8000.

### ngrok shows HTTP 200 but the transaction remains processing

Inspect the callback response body and Jasiri logs. Common causes are:

- Callback reference does not match `providerReference`.
- Callback uses `externalId` while the handler used a numeric `reference`.
- The callback status is `COMPLETE` or another value not recognized by the parser.
- The callback belongs to an older transaction created through the Go gateway.

### Response says `Ignored: transaction not found`

Compare the callback identifiers with the transaction record:

```text
ramp_entries.providerReference
ramp_entries._id
ramp_entries.reference
callback.externalId
callback.reference
callback.transaction.id
```

The callback handler now checks the common identifier variants, but the submitted transaction reference must still be preserved by Mamlaka.

### Callback returns 401

Signature verification is rejecting the callback. Confirm the callback signing key and header format. Jasiri and the Go gateway have separate environment settings; changing a Jasiri variable does not configure the Go service.

### The callback says `COMPLETE` but the wallet is unchanged

Check Jasiri logs for:

- The matched `ramp_entries` ID.
- The transaction direction.
- The wallet user ID.
- The wallet asset and amount.
- The result of the wallet update.

A successful collection credits the wallet. A successful disbursement does not credit the wallet because the amount was already deducted before the payout request.

## Security Notes

- Keep the Mamlaka username and password in backend-only environment configuration.
- Never expose payment credentials in the frontend.
- Never commit `.env` files containing credentials.
- Rotate credentials, JWT secrets, wallet keys, and callback signing keys if they were shared in logs, chat, screenshots, or source control.
- Use a stable HTTPS callback domain in production instead of a temporary ngrok hostname.
