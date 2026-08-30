# Wave

Wave Financial's free small-business accounting and invoicing platform — customers, products,
invoices, estimates and money transactions — over Wave's **GraphQL API**.

- **Categories** — finance
- **Auth methods** — `oauth2` (the flow required for any app offered to other Wave users) and
  `full-access-token` (a static bearer token, documented by Wave as the "for yourself" path)
- **Actions** — 21
- **Egress allowlist** — `gql.waveapps.com` (the `service` health hook additionally reaches
  `status.waveapps.com`)
- **Website** — https://www.waveapps.com/
- **API docs** — https://developer.waveapps.com/hc/en-us

Wave has **no REST API at all** — every action in this app is a `query`/`mutation` sent to
`https://gql.waveapps.com/graphql/public`, the single endpoint that expresses the entire schema.
`lib/client.ts` is a thin GraphQL client, not a REST wrapper, and each action owns its own document.

> Every field name, argument name, enum value and nullability claim below was cross-checked against
> **Wave's live schema**, not only the documentation. Wave's GraphQL endpoint answers introspection
> without a credential, so the full schema was pulled directly and every query/mutation in this app
> was written against it. Where the hand-maintained docs and the schema agreed, both are cited below;
> where they didn't, the schema won.

## The two things most likely to surprise a workflow author

### 1. A failed request is still HTTP 200 — on two separate channels

Wave's own "Errors" doc states this plainly, with worked examples for each case:

- **Transport-level `errors[]`.** A malformed query, an unresolvable id, or an expired token all
  answer `HTTP 200` with an `errors[]` array and the requested field `null` in `data`. The
  `extensions.code` values this app relies on: `GRAPHQL_VALIDATION_FAILED`, `NOT_FOUND`,
  `UNAUTHENTICATED`, `INTERNAL_SERVER_ERROR`. `WaveClient.send` throws on this channel.
- **`inputErrors[]` inside a mutation payload.** A rejected write — a missing required field, a
  business-rule violation — comes back with **no** `errors[]` at all: `didSucceed: false`,
  `inputErrors: [{ path, message, code }]`, and the mutated record itself `null`. This is the easier
  one to miss, because nothing about the HTTP response looks wrong. `unwrap` (`lib/client.ts`) closes
  this channel, and every mutation action here selects `inputErrors { code message path }` and routes
  its result through it.

### 2. Pagination is limit/offset, not cursor-based

Most GraphQL APIs in this pack paginate with a cursor (`first`/`after`, `pageInfo.endCursor`). Wave's
own "Pagination" doc says otherwise, in so many words: **"Wave uses limit/offset pagination."** Every
list action here takes a 1-based `page` and a `pageSize`, and reads back
`pageInfo { currentPage totalPages totalCount }` to decide whether to fetch another page.

## Other things worth knowing

- **Almost nothing hangs off the root `Query` type.** Customers, products, accounts, invoices and
  estimates are all fields on `Business`, reached as `business(id: $businessId) { customers(...) {
  ... } }` — Wave's own schema reference says so explicitly. `business-list` is how a workflow
  discovers the id every other action needs; `unwrapBusiness` in `lib/client.ts` is the one place that
  reaches into `data.business.<field>`.
- **No version header, no query-cost budget.** Unlike Jobber (also in this pack), Wave's docs
  describe the API as deliberately versionless — evolved by adding fields, not by breaking existing
  ones — and nothing in the schema or the 39 developer-portal articles checked while building this
  app exposes a rate-limit header, a cost extension, or any other quota signal. That's why this app
  ships no `quota` health check: inventing one would be a guess dressed as a measurement.
- **String arguments must be passed as GraphQL variables, never inlined.** Wave's own "Variables" doc:
  "Any query or mutation arguments of GraphQL type `String` must be provided to the server as
  variables instead of inline." Every query and mutation in this app already does this via `$input`/
  named variables, so it's a non-issue here — but it's the first thing to check if a hand-written
  `graphql-query` call fails validation for no obvious reason.
- **`estimates(sort: ...)` takes a single enum, not a list** — unlike `customers`/`invoices`/
  `products`, whose `sort` argument is `[XSort!]!`. `estimate-list` deliberately leaves `sort` unset
  rather than risk sending the wrong shape; Wave's schema-level default (`CREATED_AT_DESC`) applies
  either way.
- **There is no `transaction:read` OAuth scope.** Wave's own "OAuth Scopes" doc lists `read`/`write`/
  `send`/`*` operations per resource, but `MoneyTransaction` only has `write`/`*`. This app can create
  a money transaction but cannot list or read one back — that's a Wave-side gap, not an omission here.
- **`moneyTransactionCreate`'s `INCREASE`/`DECREASE` line-item direction is account-type-relative.**
  Wave's own doc: *"INCREASE is equivalent to Debit when the line item account is of type ASSET or
  EXPENSE, and to Credit when it is INCOME, LIABILITY, or OWNERS EQUITY."* This action does not
  re-derive or validate that — it passes the direction straight through, as Wave's own worked example
  does.

## Auth

Wave's own "3 - Authentication" article names both paths side by side:

> "Use Full Access if you're creating an app just for yourself, or if you don't have a Pro account.
> Use OAuth 2 if you have a Pro account, or you want to create an app for multiple users... For any
> applications that will be published or sold for other Wave users to access their accounts,
> authentication must be via OAuth 2."

- **`oauth2`** — authorization code against `https://api.waveapps.com/oauth2/authorize/`, token
  exchange/refresh at `https://api.waveapps.com/oauth2/token/`, revoke at
  `https://api.waveapps.com/oauth2/token-revoke/`. PKCE (S256, Wave's only supported method). Scopes
  use Wave's `resource:operation` grammar (`write` does NOT imply `read`); this app requests the
  narrowest set covering every action, listed in `auth/oauth2.ts`. **The connected business must have
  an active Pro or Wave Advisor subscription** — Wave's docs state OAuth access to a free-tier
  business is not possible, and a lapsed subscription fails a token refresh with HTTP 403.
- **`full-access-token`** — a static bearer token from *Manage Applications* in the developer portal.
  Wave's own words: *"Your Access Token provides full access to all businesses in your Wave account,
  not just your test account."* There is no scoping at all on this token. Use only for a personal or
  single-operator install; never offer it as the Connection method for a third party.

Both auth methods probe the same cheapest authenticated query Wave's own docs use as the canonical
example — `{ user { id defaultEmail } }` — and check both failure channels (HTTP status and
`errors[]`), since Wave's documented "Login Required" case is an HTTP-200 response.

## Health

- **`service`** — Atlassian Statuspage rollup at `status.waveapps.com`, with per-component detail
  (Web Application, Accounting, Invoicing, Payments, Payroll, Receipts Processing, Mobile
  Application). Verified as the genuine, claimed page — its `page.name` is `"Wave"` and its
  `page.url` is `https://status.waveapps.com`, with real component history and a currently-scheduled
  maintenance window. The tempting alternative, `wave.statuspage.io`, is the classic **unclaimed**
  Statuspage decoy: its `summary.json` names its components `"API (example)"` and `"Management Portal
  (example)"` — Atlassian's own placeholder demo content, not Wave's.
- No `quota` check — see "Other things worth knowing" above.
- The credential-liveness check (`auth:oauth2` / `auth:full-access-token`) is derived automatically
  from each auth method's `test` hook.

## What isn't covered

Reachable through `graphql-query`, not modelled as a named action:

- **Sales taxes** (`salesTaxCreate`/`Patch`/`Archive`) and attaching them to invoice/estimate items.
- **Vendors** (`vendors`/`vendor` — Wave's bill-paying counterpart to customers).
- **Invoice payments and reminders** (`invoicePaymentCreateManual`, `invoiceReminders`), and the
  matching estimate-deposit mutations (`estimateDepositPaymentCreateManual` and friends).
- **Recurring invoices** (`RecurringInvoice`) and estimate acceptance history
  (`AREstimateAcceptanceHistory`).
- **Checkouts** (`checkout:read`/`checkout:*` scopes exist in the schema; no `Checkout` fields were
  explored while building this app).
- **Constants queries** — `currencies`, `countries` (with provinces), `accountSubtypes` — useful for
  populating a dropdown, but not exposed as their own actions here.
- **`invoiceClone`/`invoiceMarkSent`** and their estimate equivalents (`estimateClone`,
  `estimateMarkSent`, `estimateMarkAccepted`, `estimateResetAcceptance`,
  `convertEstimateToInvoice`, `estimateGeneratePdf`) — real mutations, left out of the named set to
  keep this app's surface to the spine most workflows reach for first.
