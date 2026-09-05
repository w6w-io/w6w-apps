# Wise

Send cross-border transfers with **Wise** (formerly TransferWise): quotes, recipients, transfers,
and multi-currency balances, over the **Wise Platform API**.

- **Categories** — finance, commerce
- **Auth methods** — api-token (bearer)
- **Actions** — 19
- **Health checks** — 2 (`service`, ~~`request-rate`~~) + the derived `auth:api-token`
- **Egress allowlist** — `api.wise.com` (the `service` check adds `status.wise.com` to its own hook
  allowlist, never to the app's)
- **Website** — https://wise.com/
- **API docs** — https://docs.wise.com/api-reference
- **OpenAPI** — https://docs.wise.com/_bundle/api-reference/@latest/index.json
- **Status page** — https://status.wise.com/

> **Everything below was verified against Wise's own sources on 2026-09-05** — its machine-readable
> OpenAPI 3.1 bundle ([`_bundle/api-reference/@latest/index.json`](https://docs.wise.com/_bundle/api-reference/@latest/index.json),
> 1,919,425 bytes, `info.title` "Wise Platform API"), the prose guide at
> [`docs.wise.com/guides/developer/auth-and-security/personal-api-token`](https://docs.wise.com/guides/developer/auth-and-security/personal-api-token),
> and live probes against `api.wise.com` and `status.wise.com`. Nothing here came from a
> third-party integration directory.

## The three things most likely to surprise you

### 1. The base URL is a calendar quarter, not a version number

The OpenAPI bundle's `servers[0].url` is `https://api.wise.com/2026Q3` — not `/v1`, not `/v2`. This
is real and load-bearing, not a doc artifact: probing `https://api.wise.com/2027Q1/currencies` live
on 2026-09-05 answered **404** (not yet valid) and `https://api.wise.com/bogus-version-zzz/currencies`
also 404 (the segment isn't a catch-all — it's validated server-side). `2026Q3` currently routes
every endpoint this app calls.

The classic per-resource version numbers still work underneath, and they are genuinely
inconsistent — measured live the same day:

| Resource | Works at |
| --- | --- |
| `GET /profiles`, `POST /accounts`, `GET /transfers`, `GET /rates`, `GET /currencies`, `GET /me` | `v1` and `v2` |
| `POST /profiles/{id}/quotes` | `v3` only (`v1`/`v2` are `404`) |
| `GET /profiles/{id}/balances` | `v3` **and** `v4` (`v1`/`v2` are `404`) |

This is exactly what the vendor's own `recipient` tag description warns about: "If using the
pre-global versioned APIs (legacy), be sure to check the endpoint version path, as our recipient
account endpoints use a mixture of v1 and v2." `lib/client.ts` hard-codes `2026Q3` as
`API_VERSION` — **this will need bumping** when Wise rolls to the next quarter, the same way a
pinned `appVersion` for any calendar-versioned vendor API does.

### 2. The personal-API-token guide and the OpenAPI spec disagree about scope

Wise's Personal API Token is a **business-account** feature (the guide's own words: "Create and
use a personal token with a Wise business account"), and the guide states its scope in one
sentence: *"Personal API tokens are limited to the endpoints for creating quotes, retrieving and
creating recipients, creating transfers and batch groups, and tracking transfer events."*

That prose does not match the OpenAPI bundle's own per-operation `security` field, read the same
day:

| Operation | Guide says a personal token covers this? | `security` in the OpenAPI bundle |
| --- | --- | --- |
| `POST /profiles/{id}/quotes` (Create Quote) | Yes | `UserToken` only — no `PersonalToken` entry |
| `POST /accounts`, `GET /accounts`, `GET /accounts/{id}` (Recipient create/list/get) | Yes | `UserToken` only |
| `GET /profiles` | Not listed | `UserToken` **and** `PersonalToken` — and it's the guide's own worked example |
| `POST /transfers`, `GET /transfers` | Yes | `UserToken` **and** `PersonalToken` |
| `GET /me` | Not listed | `UserToken` **and** `PersonalToken` |

Both documents are real, both were read on 2026-09-05, and this is not resolved one way in this
app: `quote-create`, `recipient-list`, `recipient-get`, and `recipient-create` all carry a comment
pointing at this gap. A personal-token connection that gets a scope-shaped `403` on one of those
four actions is hitting this discrepancy, not a bug here — it likely needs an OAuth user access
token (a Wise Platform partnership) instead.

### 3. Two actions are Strong Customer Authentication (SCA) protected, and country-restricted

`transfer-fund` (fund a transfer from a balance) and `balance-statement-get` are both flagged in
the OpenAPI bundle: *"This endpoint is SCA protected. SCA requirements apply to profiles registered
outside of the following regions: US, AU, NZ, ... CA, MY."* The personal-token guide says the same
thing independently: *"Funding transfers and retrieving balance statements via API are not
supported except for accounts based in the US, Canada, Australia, New Zealand, Singapore, and
Malaysia."* Both actions are kept — they work for OAuth partner flows and for the listed countries
— but both name the restriction in their own `description`, and a caller outside those countries
should expect an SCA challenge rather than a plain success.

No SCA/2FA flow (OTP, PIN, device fingerprint, FaceMap) is implemented anywhere in this app: those
endpoints exist in the OpenAPI bundle (`sca-otp`, `sca-pin`, `sca-facemaps`,
`sca-device-fingerprints`, `sca-sessions`, `sca-ott` tags) but require a multi-step, often
JOSE/JWE-encrypted challenge-response flow that does not fit a single Action's `execute`, so they
are left out entirely rather than half-built.

## Auth

One method: `api-token`, type `bearer` — `Authorization: Bearer <token>`.

Works with either:

- A **Personal API Token** (Wise.com > Settings > Connect and manage apps > API tokens, business
  accounts only). Stays active until revoked from the same screen.
- An OAuth **user access token**, for partners with a Wise Platform partnership (`registration_code`
  or `authorization_code` grant, valid 12 hours).

Both use the identical wire format, so one `sign` hook covers both — Wise's own gateway decides
which token type may reach which endpoint (see finding 2 above).

### The probe is `GET /profiles`

Picked by reading the guide, not by guessing a whoami: it is the personal-API-token guide's own
worked "using a personal API token" example, and it answers no credential material — a `Profile` is
`{id, type, ...}` identity fields, not a secret. Verified live 2026-09-05: no header answers `401
missing_token`; a garbage bearer answers `401 invalid_token`. Both require a credential to get
past, which rules out `GET /currencies` — confirmed live to answer `200` with **no** `Authorization`
header at all, so a Connection whose token never got attached would sail through a probe against
that endpoint.

`afterConnect` calls the same `/profiles` endpoint and publishes only the chosen profile's `id` and
`type` (preferring `PERSONAL` if one exists) as the connection label — nothing from the address or
legal-detail fields a Profile also carries.

## Actions

19 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `profile-list` | search | `GET /profiles` |
| `profile-get` | read | `GET /profiles/{profileId}` |
| `quote-create` | perform | `POST /profiles/{profileId}/quotes` |
| `quote-get` | read | `GET /profiles/{profileId}/quotes/{quoteId}` |
| `quote-update` | perform | `PATCH /profiles/{profileId}/quotes/{quoteId}` |
| `recipient-list` | search | `GET /accounts` |
| `recipient-get` | read | `GET /accounts/{accountId}` |
| `recipient-create` | perform | `POST /accounts` |
| `transfer-create` | perform | `POST /transfers` |
| `transfer-get` | read | `GET /transfers/{transferId}` |
| `transfer-list` | search | `GET /transfers` |
| `transfer-cancel` | perform | `PUT /transfers/{transferId}/cancel` |
| `transfer-fund` | perform | `POST /profiles/{profileId}/transfers/{transferId}/payments` |
| `balance-list` | search | `GET /profiles/{profileId}/balances` |
| `balance-get` | read | `GET /profiles/{profileId}/balances/{balanceId}` |
| `balance-statement-get` | read | `GET /profiles/{profileId}/balance-statements/{balanceId}/statement.json` |
| `rate-get` | search | `GET /rates` |
| `currency-list` | search | `GET /currencies` |
| `account-get` | read | `GET /me` |

### Idempotency

- **`transfer-create` is idempotent**, backed by the vendor's own `customerTransactionId` field —
  documented `"format": "uuid"` and required. `ctx.invocation.invocationId` is host-issued but NOT a
  UUID (shaped `inv_01HXY...`), so it can't be sent verbatim; this action derives a stable UUID from
  it (`lib/client.ts`'s `deriveUuid`) so a retried step reuses the same key instead of double-sending
  a payment.
- **`transfer-cancel` is idempotent**: a `PUT` cancel does not worsen anything on a repeat call — the
  transfer stays cancelled, or the vendor's documented `409 transfer.cancellation.not.allowed` repeats
  for a transfer that already moved on.
- **`quote-update` is idempotent**: a merge-patch is a full state assignment for the fields it names.
- **`quote-create`, `recipient-create`, and `transfer-fund` are `idempotent: false`** — none of them
  has a documented idempotency mechanism, and `transfer-fund` moves money.

### Notes on individual actions

- **`quote-create` requires exactly one of `sourceAmount`/`targetAmount`** — the vendor documents
  them as mutually exclusive ("never both"); this action validates that before sending, since Wise's
  own 400 for getting it wrong doesn't name which field is the problem.
- **`quote-update` sends `application/merge-patch+json`**, not `application/json` — confirmed in the
  OpenAPI bundle's `requestBody.content` key. The wrong content type is refused with a `415`.
- **`recipient-create`'s `details` is a free-form JSON object.** The required fields inside it
  depend on currency/type/legalType/country per the vendor ("GBP requires sort code and account
  number... USD requires routing number, account number and account type... INR requires IFSC code
  and account number"), and Wise's own account-requirements endpoints are the way to discover them —
  those endpoints are not covered by this app (see "Deliberately not covered"), so `details` is
  passed through verbatim for a caller who already knows the shape for their route.
- **`recipient-list` returns a paged envelope**, `{content, seekPositionForNext,
  seekPositionForCurrent, size}` — the one list response in this app that isn't a bare array (see
  finding below). `size` caps at 20 (also the default); page with `seekPosition` from the previous
  response's `seekPositionForNext`.
- **`balance-list`'s `types` filter has no vendor-side default** — unlike almost every other filter
  in this API, Wise requires it explicitly (`STANDARD`, `SAVINGS`, or both), so this action requires
  it too rather than guessing.
- **`transfer-fund`'s `type` selects the funding source.** `BALANCE` (pull from a multi-currency
  balance) is the only one with a dedicated field here; `TRUSTED_PRE_FUND_BULK`/`_TX` exist for the
  Bulk Settlement model and are exposed as selectable values but not otherwise built out.
- **List response shapes are not uniform.** `profile-list`, `transfer-list`, `balance-list`,
  `rate-get`, and `currency-list` all answer bare JSON arrays (wrapped as `{ items }` here for a
  consistent shape); `recipient-list` alone answers the paged envelope above.

## Health checks

Two declared checks plus the derived `auth:api-token`.

### `service` — the status page is real, checked against `status.wise.com`

`page: {"id": "hg7qg2qssg6b", "name": "Wise", "url": "https://status.wise.com"}`, with seven
components, one named exactly `🔗 API` and described "Wise Platform API" — the component this check
exists to surface. The other six (Mobile App, Website, Account, Payments, Debit Card, Customer
Support) are reported too, keyed by the vendor's stable component id with the emoji-prefixed name
in the message, so none of them is mistaken for this app's own surface.

The verdict comes from `status.indicator` (the vendor's own roll-up), not from any single
component — verified why this matters with a real, live example on 2026-09-05: an open incident
("Delayed AED payments", impact `minor`) was still listed under `incidents`, but both of its
`affected_components` entries had already been stepped back to `operational`, and the page-level
indicator read `none`. Deriving a verdict from the incident list instead of the indicator would
have reported an outage Wise itself had already closed out.

Severity is left at the `degraded` default: Wise is SaaS-only, so every Connection this app can
hold runs on exactly the infrastructure this page describes.

### ~~`request-rate`~~ — a declared absence, at `informational` severity

Wise exposes no rate-limit headroom. Verified live 2026-09-05: neither a `200` from `GET
/2026Q3/currencies` nor a `401` from `GET /2026Q3/profiles` carried any `X-RateLimit-*` or
`Retry-After` header — only standard caching/tracing headers and cookies. The only published
performance data, `docs.wise.com/api-performance`, reports daily **uptime** percentages, not request
quotas. `severity: "informational"` is load-bearing: an `unavailable` entry always reports
`unknown`, and `unknown` outranks `ok` in the roll-up, so at any other severity this would pin the
app's verdict at `unknown` forever.

## Deliberately not covered

The Wise Platform API documents **174 paths**. This app covers 19, the send-money path a workflow
actually needs. What is left out, and why:

- **SCA / 2FA challenge endpoints** (`sca-otp`, `sca-pin`, `sca-facemaps`,
  `sca-device-fingerprints`, `sca-sessions`, `sca-ott`, `jose`, `facetec` tags) — multi-step,
  sometimes JOSE/JWE-encrypted challenge-response flows that do not fit a single Action's `execute`.
  Left out entirely rather than half-built; see finding 3 above for which two write actions this
  affects.
- **Recipient account requirements** (`GET`/`POST /quotes/{quoteId}/account-requirements`,
  `GET`/`POST /address-requirements`) — the endpoints that discover which `details` fields a
  currency/type/country combination needs. `recipient-create`'s `details` param is free-form
  instead; a caller who already knows their route's required fields does not need this endpoint,
  and generating one form per route is out of scope here.
- **Cards** (`card`, `card-order`, `card-transaction`, `card-sensitive-details`,
  `card-kiosk-collection`, `digital-wallet`, `spend-controls`, `spend-limits`, `disputes`, `3ds`
  tags) — an entirely separate product surface (Wise's debit card program), heavily SCA-gated, with
  no overlap with the transfer/quote/recipient/balance path this app covers.
- **KYC and verification** (`kyc-review`, `verification`, `claim-account` tags, plus
  `profile-verification-*`) — identity-document upload and review workflows, one-time account setup
  steps rather than an automation surface.
- **Batch groups and bulk settlement** (`batch-group`, `bulk-settlement` tags) — the personal-token
  guide lists "batch groups" as covered, but this is a multi-transfer bulk-payment product distinct
  from the single-transfer path this app builds around; a natural follow-up, not covered here.
- **Business profile administration** (`profileBusinessCreateV5`, directors, UBOs, business
  representative, update-window) — one-time account setup, not workflow automation.
- **Webhooks** (`webhook`, `webhook-event` tags) — this app declares no triggers; see
  `core/docs/build-a-w6w-app.md`'s guidance to add triggers only when asked.
- **Embedded flows, link requests, third-party transfers, incoming transfers, GPI tracking,
  comparisons, direct debit accounts, delivery estimates** — real, documented, and out of scope for
  a first pass; none of them was skipped because it couldn't be confirmed against the vendor's own
  docs, only for scope.

## Icon

`assets/icon.svg` is Wise's own mark from [simple-icons](https://simpleicons.org/) — downloaded
verbatim from
`https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/wise.svg` on 2026-09-05
(237 bytes, confirmed real SVG), then re-framed onto the pack's shared `0 0 100 100` canvas by
`_tools/icon-normalize.ts`. The re-frame changes only the outer viewport; the vendor's path data is
untouched, and a test in [`tests/index.test.ts`](tests/index.test.ts) pins a fragment of it so a
redraw fails the suite.

## Layout

```
wise/
├── package.json                  # manifest — the `w6w` identity block
├── index.ts                      # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                 # WiseClient, the calendar-versioned base URL, error formatting
│   └── params.ts                 # shared Param fragments
├── auth/api-token.ts             # bearer token: sign, test, afterConnect
├── actions/                      # one file per action (19)
├── health/
│   ├── service.ts                # status.wise.com
│   └── request-rate.ts           # declared absence, informational
├── assets/icon.svg               # vendor mark, verbatim (re-framed geometry only)
└── tests/                        # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```

`deno task validate` passes `--config ./deno.json` explicitly, matching the sibling `apify` app's
template — without it, `_tools/audit.ts` resolves imports against `_tools/deno.json` instead of this
app's own, which is a property of how the tool is invoked rather than of this app's code.
