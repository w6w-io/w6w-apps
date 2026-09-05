# Tapfiliate

Manage affiliate programs, affiliates, customers, conversions, commissions and payments through the
**Tapfiliate REST API v1.6**.

- **Categories** — marketing, crm
- **Auth methods** — api-key
- **Actions** — 46
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.tapfiliate.com` (the `service` check adds `status.tapfiliate.com` to
  its own hook allowlist, never to the app's)
- **Website** — https://tapfiliate.com/
- **API docs** — https://tapfiliate.com/docs/rest/
- **Status page** — https://status.tapfiliate.com/

Tapfiliate lets a business run **programs**: sets of rules for how affiliates earn commission.
**Affiliates** join a program (via a referral link or coupon) and refer **customers**, whose
**conversions** generate **commissions**, which are eventually settled as **payments**.
**Affiliate prospects** are people who signed up but have not yet been promoted to a full affiliate,
and **clicks** are the tracking events that attribute a customer/conversion to an affiliate before
either exists.

> **Everything below was verified against Tapfiliate's own sources on 2026-09-05** — the rendered
> reference at `https://tapfiliate.com/docs/rest/`, its own Node.js code samples (which occasionally
> carry a body field the prose omits), and live probes against `api.tapfiliate.com` and
> `status.tapfiliate.com`. Nothing here came from a third-party integration directory.

## The three things most likely to cost you a day

### 1. The Apiary blueprint the platform names is a 144-byte redirect stub

`https://tapfiliate.docs.apiary.io/` — the canonical-looking API reference URL — returns:

```
FORMAT: 1A
HOST: https://api.tapfiliate.com/1.6/

# Our docs have moved
[https://tapfiliate.com/docs/rest/](https://tapfiliate.com/docs/rest/)
```

That's the whole document. The real reference lives at `https://tapfiliate.com/docs/rest/` instead —
and despite looking like a client-rendered single-page app, that page is actually **server-rendered**:
every endpoint, URI parameter, request argument and example request/response is present in the raw
HTML, wrapped in the site's marketing-page chrome. `curl` or any static fetch gets the full reference;
no headless browser is needed.

### 2. A missing or empty credential answers with an HTML page, not a JSON error

Measured live against `GET /1.6/programs/` on 2026-09-05:

| `X-Api-Key` sent              | Status | Content-Type       | Body                                                    |
| ------------------------------ | ------ | ------------------- | -------------------------------------------------------- |
| *(header absent)*              | 401    | `text/html`          | the Tapfiliate web app's own "Unauthorized" login-wall page |
| `X-Api-Key:` (empty string)    | 401    | `text/html`          | the same HTML page — an empty value is treated as absent  |
| `X-Api-Key: totally-bogus-key` | 401    | `application/json`   | `{"message":"Authentication Failed.","code":401}`         |

Only a **non-empty** (even if wrong) key gets Tapfiliate's real, parseable JSON error shape. A typo'd
or unmapped path gets the same HTML treatment — its own "Page not found" page — regardless of the key.
A client that assumes every error body is JSON throws an opaque "Unexpected token '<'" parse error for
exactly the two cases (a missing credential, a code typo) that most need a clear message.

This app's client ([`lib/client.ts`](lib/client.ts)) checks the response `content-type` before
parsing and falls back to a truncated excerpt with an explicit note when it is not JSON. The auth
`test` hook ([`auth/api-key.ts`](auth/api-key.ts)) also guards against an empty key **before** making
the request, so the failure reads the same as every other app in this pack's "credential missing"
case rather than surfacing raw HTML.

### 3. Two request bodies are documented only in a code sample, not in prose

"Set affiliate group" (`PUT /affiliates/{affiliate_id}/group/`) and "Create affiliate group"
(`POST /affiliate-groups/`) both render with a completely **empty** "Arguments" section on the docs
page — there is no prose hint that either endpoint expects a body at all. The only place their body
fields (`group_id` and `title`, respectively) appear is inside the page's own rendered Node.js code
sample:

```js
body: {group_id: '<ADD STRING VALUE>'}   // "Set affiliate group"
body: {title: '<ADD STRING VALUE>'}      // "Create affiliate group"
```

Trusting the prose alone would have shipped two actions ([`actions/affiliate-group-set.ts`](actions/affiliate-group-set.ts),
[`actions/affiliate-group-create.ts`](actions/affiliate-group-create.ts)) that silently PUT/POST an
empty body and did nothing.

## Other things worth knowing

- **Auth: `X-Api-Key` header, no prefix, one account-wide key.** Unlike some vendors in this pack,
  Tapfiliate documents no scoped or read-only key — its own warning reads "Your API keys can approve
  commissions, so be sure to keep them secret!" There is therefore no "narrowest usable" read to
  prefer for the health probe; `GET /programs/` was picked because it needs the credential, takes no
  required parameters, and returns nothing secret.
- **No response envelope.** Unlike some vendors, Tapfiliate returns the resource directly — an object
  for a single item, a bare JSON array for a collection. Nothing to unwrap.
- **Two different "boolean" encodings in the same API.** Most boolean query parameters
  (`recalculate_commissions`, `pending`, `use_profile_timezone`, `override_max_cookie_time`) are the
  literal words `true`/`false`. `GET /commissions/`'s `paid` filter is the one documented exception:
  `Valid values are: 1 | 0`. Sending `paid=false` there is undocumented behaviour — `lib/client.ts`
  keeps `boolStr` and `flagStr` as two separate helpers for exactly this reason.
- **Pagination is a global convention, not per-endpoint.** The docs' top-level "Pagination" section —
  "paginated to 25 items by default … `?page` parameter" — applies to every list endpoint, and further
  pages are signalled only via the `Link` response header (`rel="next"`), never a body field. Every
  list action here reads it and returns `nextPage`.
- **Rate-limit headroom, not usage headroom.** The only readable quota signal Tapfiliate documents is
  `X-Ratelimit-Limit`/`X-Ratelimit-Remaining`/`X-Ratelimit-Reset` on the response headers — there is no
  separate usage/spend endpoint the way some vendors expose one. `health/quota.ts` reads it off the
  same `GET /programs/` call the auth probe already makes.
- **Clicks are Enterprise-plan-gated.** The docs state plainly, twice: "The method is available only
  for the clients of Enterprise plan" — for both `click-list` and `click-get` (not `click-create`,
  which carries no such note and is the one a REST-only, no-JS-snippet integration needs to obtain a
  click id in the first place).

## Health checks

Per [`HEALTHCHECKS.md`](../../HEALTHCHECKS.md)'s convention:

| Check | Kind | Credential | What it reads |
| --- | --- | --- | --- |
| `service` | `service` | none | `status.tapfiliate.com/api/v1/components` — a **SorryApp**-hosted page (confirmed by its `assets*.sorryapp.com` script tags; not Atlassian Statuspage, whose shaped paths all 404 here), anchored on the component named exactly `Tapfiliate API`. The other four components (Webapp, Tracking Servers, Tracking Script, Assets) are reported for context but do not affect this app's own verdict, since this app only calls the REST API. |
| `quota` | `quota` | signed | `X-Ratelimit-Limit`/`X-Ratelimit-Remaining`/`X-Ratelimit-Reset`, read off the same `GET /programs/` call `auth/api-key.ts` uses to establish the key is live. |
| `auth:api-key` | derived | — | Projected automatically from the Auth `test` hook. |

Finding the real status page took three tries: `status.tapfiliate.com/api/v2/summary.json` and
`/status.json` (the obvious Statuspage-shaped guesses) both 404 onto the page's own SPA shell, and
`tapfiliate.statuspage.io` redirects to statuspage.io's marketing page (unclaimed). The real,
machine-readable endpoint — `/api/v1/status` and `/api/v1/components` — was found by reading the
page's own script tags rather than guessing paths.

No check is declared `unavailable` in this app: both a real status feed and a real rate-limit
headroom signal exist, so there is nothing to declare absent.

## Endpoints implemented

**Customers** (7) — list, get, create, update, delete, cancel, uncancel
**Conversions** (6) — list, get, create, update, delete, add commissions
**Commissions** (5) — list, get, update, approve, disapprove
**Affiliates** (9) — list, get, create, delete, set/remove group, get balances, list payments, list programs
**Affiliate Groups** (2) — list, create
**Affiliate Prospects** (3) — list, create, delete
**Programs** (7) — list, get, list affiliates, add affiliate, approve/disapprove affiliate, list commission types
**Payments** (4) — list balances, list, create, cancel
**Clicks** (3) — create, list, get

## Left out of this build, on purpose

Every one of these is real and documented; they were left out for surface control on a first build,
not because they couldn't be confirmed. Each is reachable today via the vendor's raw REST API if a
workflow needs it, and could be added as a follow-up action without any change to this app's shape:

- **Per-key `meta-data/{key}/` CRUD** on customers, conversions and affiliates (get/set/delete a
  single meta-data key). The collection-level get/replace form (used by e.g. `customer-update`'s
  `metaData` field) already covers the same data.
- **Affiliate notes CRUD** (`GET`/`POST`/`PUT`/`DELETE .../notes/`).
- **Affiliate payout-methods** get/set and the **MLM parent** set/remove endpoints.
- **`affiliate-groups` update** (`PATCH /affiliate-groups/{id}/`) and **`affiliate-prospects`
  get-by-id**.
- **`programs/{id}/affiliates/{id}`** get and update (retrieving/patching one specific
  affiliate-in-program record, distinct from `program-affiliates-list`).
- **`programs/{id}/levels/`** and **`programs/{id}/bonuses/`** (MLM level and bonus-program listings —
  `commission-types` was kept as the one most directly useful alongside `conversion-create`'s
  `commissionType` field).
- **The bulk (array-body) form of `payment-create`** — "Create a single payment or multiple (using an
  array of payments)". Only the single-payment form is implemented.
- **`affiliates/custom-fields/`** (the account's custom-field definitions) — `affiliate-create` and
  `affiliate-prospect-create` accept `custom_fields` values but this app does not read back the
  field definitions themselves.

## Testing

```bash
deno task test       # unit tests — mocked HookContext, no network
deno task check       # typecheck
deno task lint        # deno lint
deno task fmt         # format (run before check/lint, not after)
deno task validate    # manifest + icon-legibility audit
```
