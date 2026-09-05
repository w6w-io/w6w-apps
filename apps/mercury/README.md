# Mercury

Manage **Mercury** (mercury.com) business banking accounts, cards, recipients, invoices, and money
movement, over the **Mercury API**.

- **Categories** — finance
- **Auth methods** — api-token (bearer)
- **Actions** — 30
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-token`
- **Egress allowlist** — `api.mercury.com` (the `service` check adds `status.mercury.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://mercury.com/
- **API docs** — https://docs.mercury.com/reference
- **Status page** — https://status.mercury.com/

> **Everything below was verified against Mercury's own sources on 2026-09-05** — its
> machine-readable OpenAPI document, embedded verbatim (all 74 paths, `info.title` "Mercury API",
> `servers[0].url` "https://api.mercury.com/api/v1") inside the `ssr-props` hydration payload of
> every page at `docs.mercury.com/reference/*` (a ReadMe-hosted reference confirmed live the same
> day — the HTML page itself carries no rendered spec, so this app's `lib/client.ts` doc comment
> records exactly how it was extracted), plus live probes against `api.mercury.com` and
> `status.mercury.com`. Nothing here came from a third-party integration directory.

## The three things most likely to surprise you

### 1. This is a banking API — two actions move real money

`transaction-send` ("Send money to a recipient", `POST /account/{accountId}/transactions`) and
`transfer-create` ("Create an internal transfer", `POST /transfer`) both call endpoints the vendor
documents as "processed immediately or may require approval" — whether a given organization's own
Mercury approval policy holds a payment for review or lets it clear instantly is invisible to this
app. There is no dry-run flag anywhere in the OpenAPI document. Both require a vendor-mandated
`idempotencyKey` (a plain string, no UUID format constraint), which this app supplies from
`ctx.invocation.invocationId` — see each action's own doc comment.

Everything else that reads or writes is scoped narrower: card freeze/unfreeze/cancel are state
transitions on an existing card (no new money movement), recipient/category/customer/invoice/webhook
writes create records but never move funds directly, and every `list`/`get` action is read-only.

### 2. The auth probe deliberately avoids every sensitive read

A banking API's own "prove this token works" endpoints tend to hand back exactly the data a health
check has no business fetching: `GET /organization` returns the organization's **EIN** and legal
business name, `GET /accounts` returns **live balances**. Both were considered and rejected. The
probe is `GET /categories?limit=1` — custom expense-category **labels** only (e.g. "Software",
"Payroll"), with no balance, account, or PII field anywhere in its response schema. It still proves
the credential exactly as well: a garbage bearer against `/categories` answers the identical
`401 noTokenInDB` a garbage bearer gets against `/accounts`, verified live 2026-09-05. See
`auth/api-token.ts`.

### 3. List response envelopes are never uniform

The array key varies per resource — `accounts`, `cards`, `categories`, `recipients`, `customers`,
`invoices`, `webhooks`, `users`, `transactions`, `statements` — never a fixed `items`/`data` wrapper,
and there is no single schema every list endpoint shares. Every list action in this app reads its own
key and re-presents the result as a consistent `{ items, nextPage, previousPage }`, so a workflow
never has to know which key a particular Mercury resource happens to use.

## Auth

One method: `api-token`, type `bearer` — `Authorization: Bearer <token>`.

Mercury's own OpenAPI `securitySchemes.bearerAuth` description bakes a literal `secret-token:` prefix
INTO the token value itself:

> Example: `Authorization: Bearer secret-token:mercury_production_<redacted>`
> Your Mercury API token should include the 'secret-token:' prefix.

This app stores whatever the user pastes from **Mercury dashboard > Settings > API tokens** verbatim
— prefix included — and never tries to add or strip it.

### The probe is `GET /categories?limit=1`

See "The auth probe deliberately avoids every sensitive read" above. Classified from the response
**body**, not the HTTP status: a missing `Authorization` header answers
`{"errors":{"errorCode":"noAuthTokenHeader", ...}}`, a rejected/unrecognized token answers
`{"errors":{"errorCode":"noTokenInDB", ...}}` — both verified live 2026-09-05, both `401`, and this
app's `test` hook reads `errorCode` rather than trusting the status code alone.

## Actions

30 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `account-list` | search | `GET /accounts` |
| `account-get` | read | `GET /account/{accountId}` |
| `account-statement-list` | search | `GET /account/{accountId}/statements` |
| `statement-pdf-get` | read | `GET /statements/{statementId}/pdf` |
| `transaction-list` | search | `GET /transactions` |
| `transaction-get` | read | `GET /transaction/{transactionId}` |
| `transaction-update` | perform | `PATCH /transaction/{transactionId}` |
| `transaction-send` | perform | `POST /account/{accountId}/transactions` |
| `transfer-create` | perform | `POST /transfer` |
| `card-list` | search | `GET /cards` |
| `card-get` | read | `GET /cards/{cardId}` |
| `card-freeze` | perform | `POST /cards/{cardId}/freeze` |
| `card-unfreeze` | perform | `POST /cards/{cardId}/unfreeze` |
| `card-cancel` | perform | `POST /cards/{cardId}/cancel` |
| `recipient-list` | search | `GET /recipients` |
| `recipient-get` | read | `GET /recipient/{recipientId}` |
| `recipient-create` | perform | `POST /recipients` |
| `recipient-delete` | perform | `DELETE /recipient/{recipientId}` |
| `category-list` | search | `GET /categories` |
| `category-create` | perform | `POST /categories` |
| `customer-list` | search | `GET /ar/customers` |
| `customer-get` | read | `GET /ar/customers/{customerId}` |
| `customer-create` | perform | `POST /ar/customers` |
| `invoice-list` | search | `GET /ar/invoices` |
| `invoice-get` | read | `GET /ar/invoices/{invoiceId}` |
| `invoice-create` | perform | `POST /ar/invoices` |
| `webhook-list` | search | `GET /webhooks` |
| `webhook-create` | perform | `POST /webhooks` |
| `organization-get` | read | `GET /organization` |
| `user-list` | search | `GET /users` |

### Idempotency

- **`transaction-send` and `transfer-create` are idempotent**, backed by the vendor's own
  **required** `idempotencyKey` request field (a plain string, no format constraint) — this app
  supplies `ctx.invocation.invocationId` directly, so a retried step reuses the same key rather than
  double-sending a payment or double-transferring between accounts.
- **`transaction-update` is idempotent**: it is a full reassignment of the note/category fields, not
  an additive change.
- **`card-freeze`, `card-unfreeze`, and `card-cancel` are idempotent**: each is a state assignment —
  freezing an already-frozen card, or cancelling an already-cancelled one, lands on the same end
  state rather than compounding.
- **`recipient-delete` is idempotent**: a repeat call against an already-deleted recipient repeats
  Mercury's own not-found error rather than causing a second side effect.
- **`recipient-create`, `category-create`, `customer-create`, `invoice-create`, and `webhook-create`
  are `idempotent: false`** — none has a documented idempotency mechanism, and `invoice-create` in
  particular can email a real customer on every call (see below).

### Notes on individual actions

- **`transaction-send`'s `purpose` is conditionally required.** Mercury requires it only when
  `paymentMethod` is `domesticWire`; left optional here so a caller not sending a wire is not forced
  to pick a purpose category, and Mercury's own `400` for a missing purpose on a wire names the
  field.
- **`recipient-create`'s payment-rail fields are free-form JSON.** `electronicRoutingInfo` (ACH),
  `domesticWireRoutingInfo` (wire), and `checkInfo` (physical check) are three separate,
  non-discriminated schemas in the OpenAPI document, each with its own nested required fields
  (routing/account number, or a mailing address). Rather than building one narrow form per rail —
  and going stale the day Mercury adds a fourth — each is exposed as a `json`-typed param, the same
  choice `wise`'s `recipient-create` makes for its own per-corridor `details` object in this pack.
  The deprecated `address` field ("Deprecated. Use checkInfo instead.") is not exposed.
- **`invoice-create` defaults to NOT emailing the customer.** Mercury's own default for
  `sendEmailOption` is to send the invoice immediately when the field is omitted; this action
  defaults its `Send immediately` param to `false` (mapping to `DontSend`) so testing invoice
  creation does not accidentally email a real customer. Set it explicitly to opt in.
- **`statement-pdf-get` returns bytes, not JSON.** Same base64 + `contentType` + `fileName` shape
  `docusign`'s `envelope-document-download` uses elsewhere in this pack — an Action's return value
  has to survive JSON serialization across the worker boundary.
- **List filters that repeat a query key** (`cardId`, `accountId`, `status`, `type`, `kind` across
  several list actions) are sent as `?key=a&key=b`, Mercury's own documented convention for a
  multi-value filter — verified against the OpenAPI document's `parameters[].schema.type: "array"`
  declarations, not guessed from a sibling app's convention.
- **`CreateCardType` is a one-value enum: `["virtual"]`.** The API can only issue virtual cards;
  physical card issuance is not exposed by Mercury's own API and so not built here. `card-list`/
  `card-get` still surface any physical cards an org already has, since those are reads.

## Health checks

Two declared checks plus the derived `auth:api-token`.

### `service` — the status page is real, but NOT a classic Statuspage

`status.mercury.com` is **incident.io-hosted** (the page's own HTML references
`incident-io-status-page-logos`), not an Atlassian Statuspage instance — yet its
`/api/v2/summary.json` route answers a Statuspage-v2-JSON-**compatible** shape (`page`, `status`,
`components`), the same shape most vendors in this pack publish, so the same mapping logic applies.

`page: {"id": "01KY0BM0EDZQQK0BXQ6XWYAX8A", "name": "Mercury ", "url": "https://status.mercury.com/"}`,
with 11 components, one named exactly **"Integrations & API"** and described "QuickBooks, Xero, and
NetSuite sync; bank feeds; receipt capture, and the Mercury public API and webhooks" — the component
this check exists to surface. A decoy `mercury.statuspage.io` also exists but answers
`401 "Your page is inactive"` (unclaimed), confirming `status.mercury.com` is the real one.

Two other components — "Money Movement" and "Cards" — cover the same underlying rails this app's
`transaction-send`/`transfer-create`/`card-*` actions ride on, so they are reported too (an app-wide
credential/network incident often correlates with a product incident), keyed by the vendor's stable
component id, never mistaken for this app's own surface. The verdict comes from `status.indicator`
(the vendor's own roll-up), not from any single component's status.

**This page's JSON omits `incidents`/`scheduled_maintenances` entirely** when there are none, rather
than the empty arrays a classic Statuspage instance always includes — verified on a live all-clear
response 2026-09-05, where both keys were absent (not `null`, not `[]`). Every read in
`health/service.ts` defaults with `?? []` rather than assuming the key exists.

Severity is left at the `degraded` default: Mercury is SaaS-only, so every Connection this app can
hold runs on exactly the infrastructure this page describes.

### ~~`quota`~~ — a declared absence, at `informational` severity

Mercury exposes no rate-limit headroom. Verified live 2026-09-05: neither a `401` from
`GET /api/v1/accounts` (no bearer) nor a `401` from `GET /api/v1/categories` (garbage bearer) carried
any `X-RateLimit-*`, `RateLimit-*`, or `Retry-After` header. Mercury's own OpenAPI document declares
no such header on any response, and `docs.mercury.com` names no separate rate-limit guide.
`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up, so at any other severity this would pin the app's verdict at
`unknown` forever.

## Deliberately not covered

Mercury's own OpenAPI document lists **74 paths / ~95 operations**. This app covers 30 actions across
the resources most workflow automations need. What is left out, and why:

- **Credit accounts** (`GET /credit`) and **Treasury/Invest reads** (`GET /treasury`,
  `/treasury/{id}/statements`, `/treasury/{id}/transactions`, `GET /invest`,
  `/invest/{id}/activity`) — real, documented, distinct product surfaces from the checking/savings
  path this app builds around; a natural follow-up, not covered in this pass.
- **Bookkeeping / journal entries** (`books/journal-entries`, `books/journal-entry`, `books/ledgers`)
  — a separate accounting-ledger surface, out of scope for a first pass.
- **Spend management** (`spend/budgets`, `spend/receipts`, `spend/reimbursements`) — a distinct
  expense-management product with its own approval workflow (`approve`/`deny`/`cancel` on a
  reimbursement); real and documented, left for a follow-up.
- **Merchants** (`GET /merchants`) — a read this app could add cheaply; left out only for scope.
- **SAFEs** (`GET /safes`, `/safes/{id}`, `/safes/{id}/document`) — startup fundraising instruments,
  a narrower audience than the accounts/cards/money-movement path this app covers first.
- **Send-money and transfer *approval requests*** (`POST /account/{id}/request-send-money`,
  `GET/POST /request-transfer`, `GET /request-send-money`, `GET /request-send-money/{id}`,
  `GET /request-transfer/{id}`) — Mercury's own **safer alternative** to `transaction-send` and
  `transfer-create`: these create a request that Mercury's own approval policy must clear, rather
  than a payment that may process immediately. A strong candidate for a follow-up, and worth reaching
  for instead of this app's direct-send actions wherever the connected organization's own approval
  policy expects the request pathway.
- **Card details reveal and creation** (`GET /cards/{id}/reveal`, `POST /cards`) — reveal returns raw
  PAN/CVV, a materially higher-risk read than anything else in this app, and issuance couples to
  cardholder/spend-limit setup this pass does not build a form for; both are real endpoints, left out
  for scope and risk rather than because they could not be confirmed.
- **Onboarding** (`POST /submit-onboarding-data`) — an account-setup step, not workflow automation.
- **Attachments** (`ar/attachments/{id}`, `recipient/{id}/attachments`,
  `recipients/attachments`, `transaction/{id}/attachments`) — file upload/list endpoints layered on
  top of recipients/transactions/invoices; a natural follow-up once the base resources are proven
  out.
- **Recipient invites** (`recipients/invites*`) — a distinct onboarding flow for recipients who need
  to self-supply their own banking details, rather than the direct create/list/get/delete path this
  app covers.

## Icon

`assets/icon.svg` is Mercury's own mark, downloaded verbatim from `https://mercury.com/favicon.svg`
on 2026-09-05 (10,123 bytes, confirmed `image/svg+xml`), then re-framed onto the pack's shared
`0 0 100 100` canvas by `_tools/icon-normalize.ts`. The re-frame changes only the outer viewport; the
vendor's path data is untouched, and a test in [`tests/index.test.ts`](tests/index.test.ts) pins a
fragment of it so a redraw fails the suite.

The vendor SVG embeds its own dark-mode variant via a `@media (prefers-color-scheme:dark)` CSS rule
scoped to an element `id` — a technique this pack's static icon-legibility auditor cannot evaluate
(it reads `fill`/`style`/class-rule paint, not `@media`-scoped id rules), and one that many rendering
paths (an `<img>` tag, a CSS `background-image`) do not reliably apply the OS theme to either. Rather
than rely on it, `_tools/icon-legibility.ts fix` generated `assets/icon.dark.svg` — the same mark
re-inked to white — and it is declared explicitly via `appearance.darkMode.icon`, confirmed legible
against both tiles by `deno run -A icon-legibility.ts check mercury`.

## Layout

```
mercury/
├── package.json                  # manifest — the `w6w` identity block
├── index.ts                      # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                 # MercuryClient, the API base URL, error formatting
│   └── params.ts                 # shared Param fragments
├── auth/api-token.ts             # bearer token: sign, test
├── actions/                      # one file per action (30)
├── health/
│   ├── service.ts                # status.mercury.com
│   └── quota.ts                  # declared absence, informational
├── assets/
│   ├── icon.svg                  # vendor mark, verbatim (re-framed geometry only)
│   └── icon.dark.svg             # generated dark-mode variant (re-inked to white)
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

`deno task validate` passes `--config ./deno.json` explicitly, matching the sibling `apify`/`wise`
apps' template — without it, `_tools/audit.ts` resolves imports against `_tools/deno.json` instead of
this app's own, which is a property of how the tool is invoked rather than of this app's code.
