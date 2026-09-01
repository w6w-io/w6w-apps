# Razorpay

Accept payments, manage orders, refunds, customers, invoices and subscriptions on the
**Razorpay API v1**, India's payment gateway.

- **Categories** — commerce, finance
- **Auth methods** — basic (Key ID + Key Secret)
- **Actions** — 44
- **Health checks** — 1 live (`service`) + 1 declared absence (`quota`) + the derived `auth:basic`
- **Egress allowlist** — `api.razorpay.com` (the `service` check adds `status.razorpay.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://razorpay.com/
- **API docs** — https://razorpay.com/docs/api/ (redirects to `/docs/us/api/`)
- **OpenAPI** — https://razorpay.com/openapi.json
- **Status page** — https://status.razorpay.com/

> **Everything below was verified against Razorpay's own sources on 2026-09-01** — its
> machine-readable OpenAPI 3.0 document ([`razorpay.com/openapi.json`](https://razorpay.com/openapi.json),
> 402,421 bytes, `info.version` `1.0.0`), the prose docs it is generated alongside (fetched as raw
> Markdown via the `.md` suffix Mintlify serves, e.g. `razorpay.com/docs/api/orders/.md`), and live
> probes against `api.razorpay.com` and `status.razorpay.com`. Nothing here came from a third-party
> integration directory.

## The three things most likely to cost someone a day

### 1. The auth error code never disambiguates — only the description does

Every authentication failure is `401 BAD_REQUEST_ERROR`, whether the credential is missing,
malformed, or simply wrong. Measured live:

| Situation | `error.code` | `error.description` |
| --- | --- | --- |
| No `Authorization` header at all | `BAD_REQUEST_ERROR` | `"Please provide your api key for authentication purposes"` |
| Wrong secret / garbage key / lower-cased `basic` | `BAD_REQUEST_ERROR` | `"Authentication failed"` |

A check that branches on `code` alone cannot tell "the connection lost its credential" from "the
credential is wrong". [`auth/basic.ts`](auth/basic.ts)'s `test` hook matches on `description`
instead — see its doc comment for the exact regex and reasoning.

### 2. Amounts are integers in the smallest currency sub-unit, with two silent exceptions

Every `amount` field across every resource (Order, Payment, Refund, Invoice, Payment Link, Item,
Plan, QR Code, Subscription add-on) is an integer count of the smallest currency sub-unit — paise
for INR (`50000` = ₹500). The OpenAPI document states two exceptions verbatim, in
`PaymentLink.amount`'s own description:

- **Three-decimal currencies** (KWD, BHD, OMR) — drop the last decimal digit
  (295.991 KWD → `295990`).
- **Zero-decimal currencies** (JPY) — pass the value as-is.

Every amount `Param` in this app ([`lib/params.ts`](lib/params.ts)'s `AMOUNT_HINT`) repeats this
rule in its field hint rather than silently assuming INR's two decimals — a naive
`Math.round(amount * 100)` is wrong for both exceptions.

### 3. The status host has a real feed and a decoy, on the same domain

`status.razorpay.com` looks like an Atlassian Statuspage instance — every Statuspage-shaped path
"works":

| Path | Status | Bytes | Content-Type |
| --- | --- | --- | --- |
| `/api/v2/summary.json` | 200 | 3,270 | `text/html` |
| `/api/v2/status.json` | 200 | 3,270 | `text/html` |
| `/api/v2/definitely-not-real-zzz.json` | 200 | 3,270 | `text/html` |

All three answer 200 with the byte-identical HTML shell of a client-rendered SPA's router
catch-all — not a Statuspage API. Trusting any `/api/v2/*.json` path here silently "succeeds" with
garbage.

The **real** feed is `/api/services` — a self-hosted **Statping** instance (confirmed via its
bundled JS referencing `github.com/statping/statping`, and via `GET /api` returning
`{"name": "Razorpay Status Page", "domain": "statping.stage.razorpay.in", ...}`). Measured live:

| Path | Status | Bytes | Content-Type |
| --- | --- | --- | --- |
| `/api/services` | 200 | 5,381 | `application/json` |
| `/api/nonsense-zzz` | 200 | 3,270 | `text/html` |

Different content-type, different byte count, and the body is a live JSON array of Razorpay's own
named services (`Payments API`, `Checkout`, `Dashboard`, `Payment Link`, `RazorpayX Payouts`,
`RazorpayX Payroll`, `Optimizer`) with `last_check` timestamps from the moment of the request. See
[`health/service.ts`](health/service.ts) for the full write-up.

## Auth

One method: `basic`, type `basic` — HTTP Basic with the **Key ID** as username and **Key Secret**
as password (`Authorization: Basic base64(key_id:key_secret)`). Verified against
`razorpay.com/docs/api/authentication` and the OpenAPI document's `securitySchemes.basicAuth`.

Both `rzp_test_*` (Test mode) and `rzp_live_*` (Live mode) keys hit the **same** API host —
there is no separate sandbox origin. Test mode moves no real money; Live mode does. Getting the
wrong pair on the wrong connection is a trap this app cannot detect from the outside.

### No safe whoami exists

Razorpay's REST API for a standard account publishes no `/v1/me` or account-profile read at all —
the closest things are Partner-only OAuth account endpoints (`/v2/accounts/**`) this app does not
use. The connection's `test` probe is therefore the cheapest documented read, `GET /v1/payments?
count=1`, and `afterConnect` labels the connection directly from the key id's own documented prefix
(`rzp_test_` / `rzp_live_`) rather than calling the network at all.

## Actions

44 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `order-create` | perform | `POST /v1/orders` |
| `order-get` | read | `GET /v1/orders/{id}` |
| `order-list` | search | `GET /v1/orders` |
| `order-payments-list` | read | `GET /v1/orders/{id}/payments` |
| `payment-get` | read | `GET /v1/payments/{id}` |
| `payment-list` | search | `GET /v1/payments` |
| `payment-update` | perform | `PATCH /v1/payments/{id}` (notes only) |
| `payment-capture` | perform | `POST /v1/payments/{id}/capture` |
| `payment-refund-create` | perform | `POST /v1/payments/{id}/refund` |
| `refund-list` | search | `GET /v1/refunds` |
| `refund-get` | read | `GET /v1/refunds/{id}` |
| `customer-create` | perform | `POST /v1/customers` |
| `customer-get` | read | `GET /v1/customers/{id}` |
| `customer-list` | search | `GET /v1/customers` |
| `customer-update` | perform | `PUT /v1/customers/{id}` |
| `payment-link-create` | perform | `POST /v1/payment_links` |
| `payment-link-get` | read | `GET /v1/payment_links/{id}` |
| `payment-link-list` | search | `GET /v1/payment_links` |
| `payment-link-update` | perform | `PATCH /v1/payment_links/{id}` |
| `payment-link-cancel` | perform | `POST /v1/payment_links/{id}/cancel` |
| `item-create` | perform | `POST /v1/items` |
| `item-list` | search | `GET /v1/items` |
| `plan-create` | perform | `POST /v1/plans` |
| `plan-list` | search | `GET /v1/plans` |
| `subscription-create` | perform | `POST /v1/subscriptions` |
| `subscription-get` | read | `GET /v1/subscriptions/{id}` |
| `subscription-list` | search | `GET /v1/subscriptions` |
| `subscription-cancel` | perform | `POST /v1/subscriptions/{id}/cancel` |
| `subscription-pause` | perform | `POST /v1/subscriptions/{id}/pause` |
| `subscription-resume` | perform | `POST /v1/subscriptions/{id}/resume` |
| `settlement-list` | search | `GET /v1/settlements` |
| `settlement-get` | read | `GET /v1/settlements/{id}` |
| `dispute-list` | search | `GET /v1/disputes` |
| `dispute-get` | read | `GET /v1/disputes/{id}` |
| `dispute-accept` | perform | `POST /v1/disputes/{id}/accept` |
| `dispute-contest` | perform | `PATCH /v1/disputes/{id}/contest` |
| `qr-code-create` | perform | `POST /v1/payments/qr_codes` |
| `qr-code-get` | read | `GET /v1/payments/qr_codes/{id}` |
| `qr-code-close` | perform | `POST /v1/payments/qr_codes/{id}/close` |
| `invoice-create` | perform | `POST /v1/invoices` |
| `invoice-get` | read | `GET /v1/invoices/{id}` |
| `invoice-issue` | perform | `POST /v1/invoices/{id}/issue` |
| `invoice-cancel` | perform | `POST /v1/invoices/{id}/cancel` |
| `invoice-list` | search | `GET /v1/invoices` |

### Idempotency

**Money-moving creates and captures are `idempotent: false`**: `order-create`, `payment-capture`,
`payment-refund-create`, `customer-create`, `payment-link-create`, `item-create`, `plan-create`,
`subscription-create`, `qr-code-create`, `invoice-create`. A runtime retry of any of these could
double-charge, double-refund, or double-create a resource.

`payment-refund-create` carries its own protection regardless: it sends
`ctx.invocation.invocationId` as `X-Refund-Idempotency`, which Razorpay documents as making a
retried refund with the same key return the *existing* refund rather than creating a second one. A
different payload under the same key is rejected outright; a `409` means a prior request with that
key is still processing and must be retried later, not resent immediately.

**Pure state-transition performs are `idempotent: true`**: `payment-update`, `customer-update`,
`payment-link-update`, `payment-link-cancel`, `subscription-cancel`, `subscription-pause`,
`subscription-resume`, `dispute-accept`, `dispute-contest`, `qr-code-close`, `invoice-issue`,
`invoice-cancel`. An update overwrites named fields, and a cancel/close/accept's end state is the
same however many times it runs.

### Notes on individual actions

- **`payment-capture` requires an exact amount match.** Unless partial capture is enabled on the
  account, `amount` must equal the authorized amount exactly, and it must happen inside the
  capture window (5 days by default) — Razorpay rejects a mismatch rather than capturing a
  different figure.
- **`order-create` vs `payment-link-create` vs `invoice-create` vs `qr-code-create`** are four
  different ways to *start* collecting money, not overlapping options: an Order is the handle a
  client-side Checkout integration needs; a Payment Link and an Invoice/payment-page are both
  hosted, shareable URLs (an Invoice can attach itemized `line_items` and issue formally; a
  Payment Link cannot); a QR Code is a UPI-specific on-demand feature requiring separate merchant
  activation.
- **`subscription-create`'s `short_url` must be opened by the customer.** The subscription will
  not charge anything until the customer authorizes the mandate (UPI Autopay, NACH, or
  card-on-file) at that URL. Requires the Subscriptions feature enabled on the account.
- **`dispute-accept` is irreversible.** Status moves to `lost` and the disputed amount is deducted
  from the account balance immediately.
- **`dispute-contest`'s evidence fields take Document IDs, not files.** This app implements no
  document upload; the evidence array parameters (`shippingProof`, `billingProof`, …) accept
  already-uploaded `doc_*` IDs obtained elsewhere (e.g. the Dashboard).
- **List endpoints have inconsistent filter support.** `customer-list` and `item-list`/`plan-list`
  take no date-range (`from`/`to`), unlike `order-list`, `payment-list`, `refund-list`,
  `settlement-list` and `invoice-list` — this mirrors the vendor's own OpenAPI parameter lists
  exactly rather than inventing a uniform shape the API doesn't have.

## Health checks

One live probe, one declared absence, plus the derived `auth:basic`.

### `service` — a real feed hiding behind a Statuspage-shaped decoy

See finding 3 above and [`health/service.ts`](health/service.ts) for the full verification. The
verdict is driven only by the three components this app's surface actually depends on
(`Payments API`, `Checkout`, `Payment Link`); `Dashboard` and the separate RazorpayX
Payouts/Payroll product are still reported as components, for context, but never worsen the
roll-up on their own — this app never calls RazorpayX.

Statping's `online` field is a plain boolean with no degraded state of its own, so a service that
is currently up but had a rough day is inferred from `online_24_hours < 100` rather than reported
as a flat `ok`.

### ~~`quota`~~ — a declared absence, at `informational` severity

Razorpay's OpenAPI document declares a `429` on every list/create endpoint with the advice
"Implement exponential backoff with jitter before retrying" and states no numeric ceiling anywhere.
Live probes (both a 401 and success) carried **no** `X-RateLimit-*`, `RateLimit-*` or
`Retry-After` header of any kind. There is nothing to read in advance — the only signal is the
`429` itself, after the fact.

## Deliberately not covered

Razorpay's OpenAPI document lists nearly 100 operations. This app covers the payment-gateway core
— the path a workflow needs to accept a payment and later reconcile, refund, or dispute it — and
leaves out a different product and a different activation tier:

- **RazorpayX (Razorpay's separate banking/payouts product)** — `contacts`, `fund_accounts`
  (+ validation), `payouts`, `payout-links`, `virtual_accounts`, `banking_balances`,
  `transactions`, and payment-side `bank_transfer`/`bills`. This is business banking (vendor
  payouts, payroll, current accounts), a separate Razorpay product with its own activation, not an
  extension of the payment-gateway surface this app targets.
- **Partner/Route sub-merchant APIs** (`/v2/accounts/**`, `stakeholders`, `products`,
  `transfers`, `reversals`) — onboarding and managing linked sub-merchant accounts under a
  Razorpay Partner program. A different auth model (OAuth2 via `mcp.razorpay.com`, per the
  OpenAPI document's second security scheme) and a different account relationship entirely.
- **`settlements/ondemand`, `settlements/recon/combined`** — instant-settlement payout requests
  and combined bank-reconciliation exports. Advanced treasury operations layered on top of the
  `settlement-list`/`settlement-get` this app already covers; left out for scope, worth adding
  later.
- **`documents` (raw upload)** — `dispute-contest` accepts already-uploaded Document IDs rather
  than implementing the upload endpoint itself, since a workflow action returns structured data,
  not a multipart file upload flow.
- **`payments/downtimes`** — per-payment-method downtime (a specific bank or network temporarily
  failing). A genuine, narrower signal than the platform-wide `service` health check; left out for
  scope.
- **Payment Link / Invoice notification resend** (`notify_by/{medium}`) — re-sending the SMS/email
  a link or invoice already triggered on creation. An edge case, not the core collect-and-reconcile
  path.

## Icon

`assets/icon.svg` is Razorpay's own mark — the two-tone arrow glyph, not the full wordmark.
Extracted **verbatim** from `https://cdn.razorpay.com/logo.svg` (Razorpay's own CDN, the exact
graphic the task's confirmed `apple-touch-icon.png` also depicts): the wordmark SVG's leading
`<path>` (`fill="#3395FF"`) is already the icon glyph on its own, and the *second* `<path>`'s `d`
string is the glyph shape followed immediately by the wordmark letters in one continuous path — cut
cleanly at the exact point (`...L25.6 232.92`) where the icon subpath closes and the first letter's
`m426.32...` begins, with no geometry altered. Re-framed onto the pack's normalized `0 0 100 100`
canvas by `_tools/icon-normalize.ts`; the path data and both vendor colours (`#3395FF`, `#072654`)
are untouched, and a test in [`tests/index.test.ts`](tests/index.test.ts) pins both.

## Layout

```
razorpay/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # RazorpayClient, error formatting, array-query encoding
│   └── params.ts                # shared Param fragments (pagination, amount, resource ids)
├── auth/basic.ts                # Key ID + Key Secret: sign, test, afterConnect
├── actions/                     # one file per action (44)
├── health/
│   ├── service.ts                # status.razorpay.com's real Statping feed
│   └── quota.ts                  # declared absence, informational
├── assets/icon.svg              # vendor mark, extracted verbatim from the wordmark SVG
└── tests/                       # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt`
deno task test
```
