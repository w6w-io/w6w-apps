# Shippo

Rate a parcel across every carrier account on the connection, buy the label,
track it to the door, and validate an address before it costs a return.

- **Categories** — commerce, developer-tools
- **Auth methods** — api-key
- **Actions** — 14
- **Egress allowlist** — `api.goshippo.com` (the `service` health check adds
  `status.goshippo.com`)
- **Website** — https://goshippo.com
- **API docs** — https://docs.goshippo.com

Shippo publishes a real OpenAPI document — `https://docs.goshippo.com/spec/shippoapi/public-api.yaml`
(found via `.speakeasy/workflow.yaml` in `goshippo/shippo-python-sdk` on
GitHub, Shippo's own generated Python SDK) — and this app was built against
it directly, plus every documented endpoint, error shape and rate limit was
reproduced live on 2026-09-05.

> **On categories.** Shipping has no slug in the controlled vocabulary
> (`core/rfcs/categories.md`), so this app is filed under `commerce` and
> `developer-tools` — the same choice `easypost` made, for the same reason.

## Setup

### API Token

Shippo dashboard → **Settings → API**. Sent as
`Authorization: ShippoToken <token>` — **Shippo's own scheme, not Bearer.**
Verified live 2026-09-05: sending `Authorization: Bearer <token>` gets back a
distinct `{"detail": "Invalid access token."}` rather than being accepted.

### The token itself says which environment it is for

Every Shippo account has a **test** token (`shippo_test_...`) and a **live**
token (`shippo_live_...`), confirmed in Shippo's own "Testing the Shippo API"
guide. Unlike some vendors, you never have to ask the API which one you are
using — the prefix says so. A test token creates shipments, rates and labels
that look completely real: nothing is charged and no label is valid postage,
and nothing in the *response* says which kind made it. So the connection test
and the `account` health check both read the prefix and report it in plain
words, treating a test token as `degraded` rather than `ok` — not because test
tokens are bad, but because "we shipped two hundred orders" and "we produced
two hundred worthless PNGs" are otherwise the same log line.

## Rating is a side effect of creating a shipment, and buying is a second step

Everything here is built around this:

1. **`shipment-create`** — two addresses and a parcel. Shippo answers with a
   `rates` array: every carrier and service on the connection, priced. Nothing
   is bought and nothing is owed.
2. **`transaction-create`** — *now* money moves, a label exists, and a
   tracking number is issued.

They are separate actions on purpose, so a workflow that quotes and a
workflow that spends can never be the same step.

**`async: false` is sent explicitly on both.** Left to Shippo's own default
(`async: true`), a shipment or transaction comes back `QUEUED` with nothing
useful in it yet — Shippo's own docs pass `"async": false` in every example to
avoid this. `shipment-get`/`transaction-get` are how a caller who *wants*
async polls for the eventual result.

## Actions

| Key | Type | Description |
|---|---|---|
| `shipment-create` | perform | **Rate a parcel** — buys nothing |
| `transaction-create` | perform | **Buy the label** — money moves here |
| `shipment-get` | read | One shipment, before or after purchase |
| `shipment-list` | read | Recent shipments, incl. quotes never bought |
| `rate-get` | read | Re-read one rate — confirm it before buying |
| `transaction-get` | read | One label purchase, incl. tracking number |
| `transaction-list` | read | Recent label purchases |
| `refund-create` | perform | Ask the carrier for the postage back |
| `address-create` | perform | Store an address, optionally validating it |
| `address-validate` | read | Re-check a stored address for corrections |
| `parcel-create` | perform | Describe a box once and reuse its id |
| `track-create` | perform | Track a number not bought through Shippo |
| `track-get` | read | Current tracking status for any number |
| `carrier-account-list` | read | Which carriers this account can rate against |

## Five things that go wrong quietly

### 1. Rates are strings, and sorting them lexically buys the wrong label

`amount` comes back as `"9.99"`, not `9.99`. Compared as strings, `"9.99"`
sorts *above* `"10.05"` — so a workflow picking "the first one" after a naïve
sort buys a more expensive label, forever, and nobody notices.

Every action here sorts numerically, and `shipment-create`/`shipment-get`
return `cheapestRate` separately so the comparison never has to be written
twice.

### 2. Dimensions and weight are strings in Shippo's own schema, not numbers

`ParcelDimensions`/`ParcelBase` type `length`, `width`, `height` and `weight`
as **`string`** — "up to six digits... four digits after the decimal
separator." Sending a JSON number happens to work in practice, but is not
what the schema declares; `parcel-create` and `shipment-create` always
stringify what they are given rather than relying on that.

### 3. Only rates less than 7 days old can be purchased

Stated in Shippo's own schema on `Transaction.rate`. A rate quoted last week
is refused at purchase time with a validation error — re-rate with
`shipment-create` first if that has happened.

### 4. A refund is a request, not a reversal

Shippo's own `status` values are `QUEUED` → `PENDING` → `SUCCESS`/`ERROR`, and
most carriers only honor a refund for a label that was never scanned into
their network. `refund-create` returns the request's own state rather than
implying success — `transaction-get`'s `status` moves to `REFUNDED` only once
the carrier actually agrees.

### 5. Rate limits are per minute, per object type, per verb, and differ by token

Verified 2026-09-05 at `docs.goshippo.com/api-concepts/rate-limits`: a live
Shipment `POST` is capped at 500/minute, a **test** Shipment `POST` at only
50/minute — and every one of the eleven object types (Address, Parcel,
Shipment, Rate, Transaction, Customs Item/Declaration, Refund, Manifest,
Carrier Account, Batch, Tracking) has its own figures. No
`X-RateLimit-*`/`Retry-After` header was found on any live response, so there
is nothing to poll ahead of time — see `quota` below.

## Address validation is the cheapest step in the pipeline

A wrong address is not caught at purchase. The label is bought, the parcel
moves, and days later it comes back — postage spent, customer waiting, a
return to process.

`address-create` can validate inline (`validate: true`), and `address-validate`
re-checks a stored address later. Both return `validation_results.is_valid`
plus any correction messages Shippo found — worth showing a human before it
goes on a parcel. A failed validation is a result (`is_valid: false`), not a
thrown error, so a workflow can branch on it rather than catch it.

## Tracking status is read for what it actually means

`tracking_status.status` is one of `UNKNOWN`, `PRE_TRANSIT`, `TRANSIT`,
`DELIVERED`, `RETURNED`, `FAILURE`. **`PRE_TRANSIT`/`UNKNOWN` do not mean
lost** — they mean the carrier has not scanned it yet, which is normal until
the parcel is handed over. The two worth acting on are `RETURNED` (it is
coming back and the customer does not know) and `FAILURE` (the carrier has
given up); neither is otherwise flagged, so a workflow that only checks for
`DELIVERED` misses both.

`track-create` is for a number **not** bought through this app (a label
purchased elsewhere, or on a customer's own carrier account) — a transaction
bought via `transaction-create` is already tracked, so `track-get` reads it
directly rather than registering it twice.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is Shippo up — and **which carriers are**? |
| `account` | dependency | Does this account work, and is it test or live? |
| `quota` | quota | Declared absence — see below |

### Real Statuspage instance, verified 2026-09-05

`status.goshippo.com/api/v2/summary.json` — page id `x4bhgfp1j1x0`, named
"Shippo". `status.shippo.com` 301-redirects to the same host, so there is
only one page to check.

### A carrier outage is not a Shippo outage, and it is more actionable

The page lists Shippo's own top-level services — **Shippo REST API**,
**Shippo Web Dashboard**, **Shippo Platform API** — alongside a **"Carrier
API"** group containing ~65 carriers (USPS, UPS, FedEx, DHL, Aramex, and the
rest), each nested under that group's `group_id`. The `service` check uses
that STRUCTURE (top-level vs. inside the group) rather than a hand-maintained
carrier name list, so it keeps working if Shippo adds or renames a carrier.

Verified live 2026-09-05: at that moment "FedEx" and its parent "Carrier API"
group both read `partial_outage` while every Shippo-owned component read
`operational` — exactly the case this split exists for. When FedEx is down,
Shippo's API answers perfectly; you simply cannot buy a FedEx label. Rolling
those together would report an outage that is not one; ignoring them would
hide the reason a purchase is failing. So Shippo's own services decide the
verdict, and **the affected carriers are named in the message**.

### `quota` is a declared absence, and the reason is the interesting part

There is no single "headroom" figure to poll: eleven object types times four
verb classes times two environments (test/live), each on its own per-minute
ceiling, and no `X-RateLimit-*`/`Retry-After` header on any live response. A
`429` from this app's own client names the rate-limits doc and says spacing
calls out fixes it, rather than implying a quota that refills.

## What this app deliberately does not do

- **Manage carrier accounts.** Registering one is a dashboard-level, often
  OAuth-driven flow per carrier — a deliberate act for a person, not a
  workflow step. `carrier-account-list` covers reading which ones exist.
- **Orders, batches, manifests.** Orders are an e-commerce integration
  concept layered above shipments; batches and manifests are asynchronous,
  multi-shipment operations with their own job/state shape rather than a
  single workflow step.
- **Customs declarations as a standalone action.** International shipments
  can pass one inline via `shipment-create`'s `customsDeclaration` field
  (JSON or an existing `object_id`), but there is no dedicated
  `customs-declaration-create` action — it is always paired with a shipment.
- **Webhook management.** `POST/GET/PUT/DELETE /webhooks` configure delivery
  endpoints, which is dashboard/infrastructure configuration rather than a
  step in an automation.
- **Shippo Platform Accounts** (`/shippo-accounts`). That surface is for
  platforms reselling Shippo to their own end users — a different product
  from shipping a parcel.

## Errors

Shippo answers auth failures as `{"detail": "..."}`, and the text itself
distinguishes three cases, all reproduced live 2026-09-05: no header at all
("Authentication credentials were not provided."), the right scheme with a
token that does not exist ("Token does not exist"), and the wrong scheme
entirely ("Invalid access token." — e.g. sending `Bearer` instead of
`ShippoToken`). Validation failures are an arbitrary `{"field": ["message"]}`
object (Shippo's own `BadRequest` schema is `additionalProperties: true` —
its shape is not fixed), surfaced field by field. A `429` names the
per-minute rate-limits doc rather than implying a quota that refills.
