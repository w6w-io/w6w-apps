# Invoice Ninja

Manage Invoice Ninja clients, invoices, quotes, payments, products, tasks and expenses.

- **Categories** — finance, commerce
- **Auth methods** — api-token
- **Actions** — 40
- **Egress allowlist** — `*` (see "Why not a wildcard apex" below)
- **Website** — https://www.invoiceninja.com
- **API docs** — https://api-docs.invoicing.co/

## Where the spec came from

Invoice Ninja's API reference is a Redoc-rendered page. Redoc does not fetch its spec from a
separate URL here — it embeds the fully parsed OpenAPI 3.0.1 document directly into the page as
`const __redoc_state = {...}`. That blob (`__redoc_state.spec.data`) was extracted from the page's
own `<script>` tag and parsed directly (fetched 2026-09-05), then every endpoint, field, auth
scheme and status code cited below was checked against it — not against the rendered HTML, and not
inferred from a sibling app.

## Why not a wildcard apex like `apps/gorgias`/`apps/kustomer`

The task that produced this app assumed Invoice Ninja follows the same
`{tenant}.vendor.com`-under-one-owned-apex shape as `apps/gorgias`, `apps/kustomer` and
`apps/freshdesk`. **That assumption does not survive contact with the vendor's own spec.**

The OpenAPI document's `servers` list names exactly two fixed hosts:

- `https://invoicing.co` — production
- `https://demo.invoiceninja.com` — demo

Nothing in the document defines a `{subdomain}.invoicing.co` **API** host. The one `subdomain`
field that does exist — `CompanySettings.subdomain`, feeding `CompanySettings.portal_domain` (e.g.
`https://subdomain.invoicing.co`) — is the **client-facing invoice portal** URL (where a client
views/pays an invoice), a different surface this app never calls.

What the spec's own intro text *does* say: "you'll need an active Invoice Ninja account (**or your
own self hosted installation**)". Invoice Ninja is source-available and commonly self-hosted at an
arbitrary domain — the same two-audience shape `apps/discourse` and `apps/wordpress` already model
in this pack. So this app follows that pattern instead of the wildcard-apex one:

- `w6w.network.allow: ["*"]` — a self-hosted install is not under any vendor-owned apex, so no
  narrower wildcard is honest.
- The instance URL (`baseUrl`) is collected as an **Auth field**, not composed from a
  `*.invoicing.co` template. `lib/client.ts` reads it off the Connection's redacted `display`.

## Auth scheme

`X-API-TOKEN` header — verified against `components.securitySchemes.ApiKeyAuth` (`type: apiKey, in:
header, name: X-API-TOKEN`), applied globally (`security: [{ ApiKeyAuth: [] }]`) to every operation.
A token is minted per-user from **Settings → Account Management → API Tokens** on the running
instance; there is no documented OAuth2 flow for third-party integrations.

Two things verified **live** against `demo.invoiceninja.com` on 2026-09-05, since the spec and the
real API disagree here:

- **`X-Requested-With: XMLHttpRequest`** is documented as a *required* header on every operation
  (`components.parameters.X-Requested-With`), but `GET /api/v1/ping` answered identically with and
  without it. This app sends it anyway — a self-hosted install may enforce what the demo doesn't.
- **An invalid token returns `403 {"message":"Invalid token"}`**, not the `401` the spec's shared
  `responses/401` implies for this operation. `auth/api-token.ts`'s `test` hook classifies from that
  JSON `message` body, never from the bare status code, for exactly this reason.

## Health check

Two different questions, kept apart the way this pack's healthcheck.md distinguishes them:

### Is Invoice Ninja's own hosted service up?

`health/service.ts` reads `https://status.invoiceninja.com/rss` — a real, currently-maintained
Laravel/Livewire status page (verified live 2026-09-05, titled "No problems detected. | Invoice
Ninja" at the time) with a genuine RSS 2.0 feed, presently empty (zero `<item>` entries — no
incidents on record, not a decoy). This check is scoped to the **hosted** service only; a
self-hosted install's own health is a different question, answered per-connection below.

### Is THIS connection's instance healthy?

`health/instance.ts` calls `GET /api/v1/health_check` — a genuine diagnostics endpoint, verified
live against the demo instance:

```json
{"system_health":true,"extensions":[...],"php_version":{...},"env_writable":false,
 "simple_db_check":true,"cache_enabled":false,"queue":"database",
 "queue_data":{"failed":0,"pending":0,"last_error":""},"jobs_pending":0,
 "pending_migrations":true, ...}
```

Unlike `apps/gorgias`'s unauthenticated `domain` check, this endpoint is **not** reachable
unsigned — both a missing and an invalid token come back `403 {"message":"Invalid token"}`,
identical to `ping`'s own rejection. So this check is `credential: "signed"` (this kind's default,
left unset rather than overridden). It reads `system_health`, `queue_data.failed` and
`pending_migrations` together, because a self-hosted install can answer requests fine while its
background jobs are silently broken — a failure `system_health` alone would miss.

### Is this credential live?

The derived `auth:api-token` check, from `auth/api-token.ts`'s `test` hook — `GET /api/v1/ping`,
which needs no scope beyond a valid token and echoes only `{ company_name, user_name }`, never the
caller's own token.

## Declared health checks

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 300s | `health/service.ts` (feed) |
| `instance` | dependency | connection | signed | degraded | 300s | `health/instance.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from `api-token`'s `test` hook |

## Actions

Full CRUD (create / get / list / update / delete) for **clients**, **invoices**, **quotes**,
**payments**, **products**, **tasks** and **expenses**, plus:

- `invoice-send` / `invoice-mark-paid` — `POST /api/v1/invoices/bulk` with `action: "email"` /
  `"mark_paid"`. There is no single-invoice `/invoices/{id}/send` route in this API; a one-element
  `ids` array on the documented bulk endpoint is the vendor's own way to act on one record.
- `quote-approve` / `quote-convert-to-invoice` — the same bulk pattern, `action: "approve"` /
  `"convert"`, both verified against the bulk-quote request schema's own documented enum.
- `payment-refund` — `POST /api/v1/payments/refund`.

Line items (`invoice-create`/`invoice-update`/`quote-create`/`quote-update`) and payment-to-invoice
allocations (`payment-create`/`payment-refund`) are exposed as `type: "json"` fields rather than
itemised controls — the underlying schemas (`InvoiceItem`, `InvoicePaymentable`) carry more
properties per element than a flat form can usefully lay out, and a document can hold any number of
them.

## Deviations and scope

- **Recurring invoices/quotes/expenses, purchase orders, credits, projects, vendors, bank
  integrations, e-invoice designs, subscriptions and webhooks** — all real, documented resources
  this API has, but outside the client/invoice/quote/payment/product/task/expense core surface this
  task specified.
- **`expense-create`/`expense-update`'s request body is not documented at all** in the OpenAPI
  spec — `storeExpense`/`updateExpense` declare only their `200` response schema (`Expense`). Their
  fields here are drawn from that response schema's own writable-looking properties (`amount`,
  `client_id`, `vendor_id`, `category_id`, `date`, `public_notes`, `private_notes`), not invented —
  but this is a documentation gap worth flagging rather than a confirmed request contract.
- **`expense-get-many`'s pagination is verified live, not from the spec** — the OpenAPI document's
  own parameter list for `GET /api/v1/expenses` is unusually sparse (`include`/`index` only). A live
  probe against `demo.invoiceninja.com` on 2026-09-05 confirmed `page`/`per_page` are honoured
  (`meta.pagination` came back correctly populated); `status` was not independently confirmed to
  change the result set, so it is left out of that one action.
- **`task-get-many` exposes only pagination**, not `status`/`client_id` — `GET /api/v1/tasks`'s own
  parameter list documents neither filter, unlike every other list endpoint in this app.
- **`task-create`'s `time_log` field is passed through verbatim, undecoded** — Invoice Ninja's own
  UI encodes it as a JSON array of `[start_ts, end_ts, description, billable]` tuples, but the
  OpenAPI spec documents the field only as a bare string (`"Time logged for the task"`, example
  `"2.5"`). Rather than invent the tuple format, the hint says exactly this and the field is passed
  through unchanged.
- **`client-create`'s `country_id`** is exposed as optional even though `ClientRequest`'s own schema
  marks `contacts` and `country_id` required — forcing a numeric ISO country code into every create
  call seemed worse than surfacing the 422 Invoice Ninja itself returns (via `InvoiceNinjaClient`,
  verbatim) on an instance that truly enforces it. `contacts` is always sent as a one-element array
  (blank if no contact fields were given) to satisfy that half of the requirement unconditionally.
- **OAuth2/SSO login** is absent — this API's only documented credential for third-party
  integrations is the static `X-API-TOKEN`.

---

Researched and endpoint-verified 2026-09-05 against the OpenAPI 3.0.1 document embedded in
https://api-docs.invoicing.co/'s Redoc page, plus live probes against `demo.invoiceninja.com` (the
vendor's own public demo instance, `X-API-TOKEN: TOKEN`) and `status.invoiceninja.com`.
