# eBay

Search and read live eBay listings through the Buy Browse API.

- **Categories** — commerce
- **Auth methods** — client-credentials
- **Actions** — 4
- **Egress allowlist** — `api.ebay.com`
- **Website** — https://www.ebay.com
- **API docs** — https://developer.ebay.com/api-docs/buy/browse/overview.html

## A note on how this was researched

`developer.ebay.com` (the docs host) blocks direct server-side requests with a `403
"Error Page | eBay"` — an edge/bot-detection block, not a missing resource. Verified with a
realistic browser User-Agent, `Accept`/`Accept-Language` headers and a `Referer`; even its own
`robots.txt` 403s the same way. So every spec and doc page cited below was read through the
[Wayback Machine](https://web.archive.org)'s archived copies of the real, eBay-published pages
(Feb–Jun 2026 snapshots), not reconstructed from memory.

**`api.ebay.com` — the actual production API host every action and health check calls — is a
different case, and is not edge-blocked.** Verified live: an unauthenticated request to it 403s
the same way, but a request carrying *any* `Authorization` header — even a fabricated one — gets
past the edge and returns eBay's own JSON error envelope, and the OAuth2 token endpoint itself
answers a fabricated Basic-auth request with the standard OAuth2 error shape (see Setup below).
This app's `sign` hook always attaches a real token, so a genuine call never takes the
edge-blocked unsigned path.

## Setup

1. Register an app at [developer.ebay.com/my/keys](https://developer.ebay.com/my/keys) and copy
   its **Client ID** and **Client Secret**.
2. When connecting the app in w6w, paste both. There is no browser sign-in step.

This grants access to eBay's **public data only** — listing search and lookup. It cannot see or
touch any seller's own inventory, orders or account; that is a separate, user-consented part of
eBay's API surface (Sell Inventory, Sell Fulfillment, ...) that authorizes via eBay's browser
authorization-code flow instead, and this app does not implement it.

### Auth: Client Credentials (`custom`)

eBay's Buy Browse API and Developer Analytics API (the only two surfaces this app covers)
authorize with an **Application access token**, minted via the OAuth2 `client_credentials`
grant: `POST https://api.ebay.com/identity/v1/oauth2/token`, HTTP Basic
`clientId:clientSecret`, `grant_type=client_credentials`,
`scope=https://api.ebay.com/oauth/api_scope`. Verified live against the real production token
endpoint — a fabricated Basic-auth request returns
`401 {"error":"invalid_client","error_description":"client authentication failed"}`, the
standard OAuth2 (RFC 6749 §5.2) error shape.

- `exchange` mints the first token from the pasted Client ID/Secret at connect time.
- `refresh` re-mints it when the runtime sees it expire (eBay documents ~2 hours, 7200s).
- `sign` stamps `Authorization: Bearer <token>` on every request.
- `test` re-runs the same `client_credentials` exchange — the narrowest possible liveness
  probe, since it needs no scope beyond what every registered app already carries.

`type: "custom"` rather than `"oauth2"`: the `oauth2` type in this spec models the browser
authorization-code flow (`authorizationUrl` + PKCE) that eBay's *seller*-scoped APIs use
(confirmed from the Sell Inventory API's own `securitySchemes`:
`authorizationUrl: https://auth.ebay.com/oauth2/authorize`) — a different, user-consented
credential this app does not request.

## Actions

| Resource | Action | Wraps |
|---|---|---|
| Item | `item-search` | `GET /buy/browse/v1/item_summary/search` |
| Item | `item-get` | `GET /buy/browse/v1/item/{item_id}` |
| Item | `item-get-by-legacy-id` | `GET /buy/browse/v1/item/get_item_by_legacy_id` |
| Item | `item-group-get` | `GET /buy/browse/v1/item/get_items_by_item_group` |

`item-search` needs at least one of `q` (keywords) or `categoryIds`, matching eBay's own
`12001` error ("The call must have a valid 'q', 'category_ids', 'epid' or 'gtin' query
parameter"). `item-get` takes the RESTful `itemId` (`v1|<legacyItemId>|<variationId or 0>`) an
`item-search` result returns; `item-get-by-legacy-id` takes the older numeric ID shown on an
ebay.com listing page instead — a different, opaque identifier space eBay documents as a
compatibility bridge for callers migrating off the legacy Trading/Finding APIs.
`item-group-get` lists every variation (size, color, ...) of a multi-SKU listing, given the
group's shared legacy item ID.

`X-EBAY-C-MARKETPLACE-ID` is exposed as an optional `marketplaceId` param (default `EBAY_US`)
on every action — eBay defaults to `EBAY_US` itself when it's omitted, but a workflow searching
a UK or German marketplace needs to set it explicitly.

Deliberately absent: everything that needs seller consent (Sell Inventory/Fulfillment/Account),
the Sandbox environment (`api.sandbox.ebay.com` — a separate app registration with fake test
listings, a different credential and a different host this app's manifest does not allowlist),
and any Trading/Finding (legacy XML) API.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Declared unavailable.** eBay does publish a genuine, API-specific status page —
[developer.ebay.com/support/api-status](https://developer.ebay.com/support/api-status) — and it
is not a marketing rollup: an archived copy shows a server-rendered HTML table naming individual
APIs and environments, e.g. `RESOLVED: Trading API ReviseItem, AddItem Call Returning "System
Error"` against the `Trading API` component, `Production` environment. But it fails both of this
pack's requirements for a wired `service` check:

1. **No machine-readable feed.** It's a plain HTML table (server-rendered via eBay's own Marko
   framework), not RSS/Atom/JSON — nothing for this host's declarative `feed:` parser to read.
2. **The host itself is edge-blocked** for server-side clients (see "A note on how this was
   researched" above), independent of the feed question.

Declared `unavailable` with `severity: "informational"`, per this pack's convention for a vendor
whose status host cannot be reached or parsed (see e.g. `campaignmonitor`) — a positive fact,
not a silent gap, and one that can never worsen a roll-up.

### Is this credential live?

This is what the Auth `test` hook does — it re-runs the `client_credentials` exchange (see
Setup above) rather than probing a separate endpoint.

### Do we have quota left?

**A real, live probe.** eBay's **Developer Analytics API** — a separately-specced REST API
(`developer_analytics_v1_beta_oas3.json`) — exposes exactly this via
`GET /developer/analytics/v1_beta/rate_limit/`: per-resource call count, limit, remaining calls
and reset time for the current window. It requires only the same
`https://api.ebay.com/oauth/api_scope` this app's token already carries — confirmed live: a
fabricated bearer token against this endpoint returns eBay's standard
`401 {"errors":[{"domain":"OAuth", ...}]}`, the same shape as an invalid Browse API call, not a
scope-denied `403`. Scoped to `api_context=buy&api_name=browse`, the one API this app calls.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared unavailable_ |
| `quota` | quota | connection | signed | degraded | 300s | `health/quota.ts` |
| `auth:client-credentials` | credential | connection | signed | fatal | — | derived from the `client-credentials` auth method's `test` hook |

---

Researched 2026-09-05 against eBay's own OpenAPI/Swagger specs (Buy Browse API v1.20.4,
Developer Analytics API v1_beta), read through Wayback Machine archives of
developer.ebay.com, and confirmed live against the production `api.ebay.com` host directly
(the OAuth2 token endpoint and both API surfaces used here). Re-check if a probe starts
failing for everyone at once.
