# Trustpilot

Read a Business Unit's profile, categories and reviews, read product-review summaries and
lists, and send review invitations, on Trustpilot's own API.

- **Categories** — marketing, support, commerce
- **Auth methods** — `api-key` (public endpoints), `client-credentials` (private endpoints)
- **Actions** — 11
- **Health checks** — `service` (Statuspage) + ~~`quota`~~ (declared absence) + 2 derived
  (`auth:api-key`, `auth:client-credentials`)
- **Egress allowlist** — `api.trustpilot.com`, `invitations-api.trustpilot.com` (the `service`
  check adds `status.trustpilot.com` to its own hook allowlist, never to the app's)
- **Docs** — https://developers.trustpilot.com/
- **Status page** — https://status.trustpilot.com/

> **Everything below was verified against Trustpilot's own developer documentation
> (`developers.trustpilot.com`) on 2026-09-01** — the Authentication overview, all four OAuth
> grant-type pages, the Business Units API, Product Reviews API and Invitations API reference
> pages, Rate limiting best practices, Common error messages — plus a live fetch of
> `status.trustpilot.com`. Nothing here came from a third-party integration directory.

## The three things most likely to cost you a day

### 1. Two hosts, not one

Trustpilot splits its API across **two separate origins**, and only realizes it in the docs'
own 404 troubleshooting row: "an incorrect URL (a base URL that isn't `api.trustpilot.com` or
`invitations-api.trustpilot.com`)".

| Host | Serves |
| --- | --- |
| `api.trustpilot.com` | Business Units API, Product Reviews API (and Service Reviews, Categories, Consumer — not covered here) |
| `invitations-api.trustpilot.com` | The Invitations API, exclusively |

The Invitations *overview* page lives on `developers.trustpilot.com` next to everything else,
so the different host is easy to miss until you're reading the endpoint reference pages
themselves, which show `https://invitations-api.trustpilot.com/v1/private/...` in every curl
example.

### 2. Two authentication stories, not one

> "You can access public APIs with only your API key (Client ID)... You don't need an access
> token... if you want to access private APIs you need to use OAuth 2.0 authentication."
> — Authentication overview

- **Public** (nearly everything under Business Units and Product Reviews): a bare
  `apikey: <key>` header. No token, no expiry, nothing to refresh. `auth/api-key.ts`.
- **Private** (the whole Invitations API): `Authorization: Bearer <access_token>`, minted via
  OAuth 2.0. Trustpilot documents **four** grant types (Authorization Code, Implicit, Client
  Credentials, Password — the last marked "Deprecated" in the sidebar). Only **Client
  Credentials** needs no browser and no end-user login: "You can only use this grant type from
  server-side." This app uses it, and mints/renews the token itself from a Client ID and
  Client Secret. `auth/client-credentials.ts`.

A Client Credentials token is **not tied to a business user** — "the access token won't be
assigned to a specific user." Two Invitations endpoints (`email-invitations`,
`invitation-data/delete`) accept an optional `x-business-user-id` header for exactly this case,
"should be provided when access token is obtained using client_credentials grant type... the
user must have either Admin or Manager role." `client-credentials`'s optional `businessUserId`
field carries it.

The grant issues **no refresh token** — "You can't refresh access tokens that you've obtained
with the Client Credentials grant type. When your access token expires, you must issue the
same request to get a new token." So `refresh` here re-mints, exactly like `exchange`.

### 3. `test()` for the OAuth method has no ID-less endpoint to probe

Every private endpoint this grant can reach (Invitations) is scoped to a `{businessUnitId}`
this credential does not carry, and Trustpilot publishes no bare "whoami" the way Apify
(`/v2/users/me/limits`) or Auth0 (`/api/v2/users`) do. `client-credentials`'s `test()`
re-mints the token instead — the strongest, and only universal, proof the Client ID/Secret
pair is still live. It does not prove any one Business Unit's Invitations calls will succeed;
that depends on the app's own Trustpilot-side authorisation, which no unattended probe can
observe.

## Auth

Two methods, for the two authentication stories above:

- **`api-key`** (type `apiKey`) — stamps `apikey: <key>` on every request. `test()` probes
  `GET /v1/business-units/search?query=trustpilot&perpage=1` — a public, unscoped endpoint
  reachable by any valid key, chosen over the more obvious `/v1/business-units/find` because
  `find`'s reference page shows only the request, never a response schema.
- **`client-credentials`** (type `custom`) — Client ID + Client Secret, an optional Business
  User ID. Mints a bearer token via `POST
  /v1/oauth/oauth-business-users-for-applications/accesstoken` (HTTP Basic
  `client_id:client_secret`, `grant_type=client_credentials`) and re-mints on `refresh`/`test`.

Use `api-key` for the Business Units and Product Reviews actions, and `client-credentials` for
the Invitations actions — the runtime signs a request with whichever method the invoking
Connection uses, so pointing an Invitations action at an `api-key` Connection (or vice versa)
fails with the wrong auth type.

### A note on verifying this live

Every probe this app made against `api.trustpilot.com` from its build environment — signed and
unsigned alike — was refused with an HTTP 403 **CloudFront** page ("Request blocked... too much
traffic or a configuration error") before it ever reached Trustpilot's API. This is a real,
observed failure mode (the pack already documents the same shape for Campaign Monitor's
WAF), not a Trustpilot outage: `developers.trustpilot.com` (a different host, different CDN)
answered normally throughout. Two consequences worth knowing:

- This app's actual request/response **shapes** are all pinned from Trustpilot's own worked
  documentation examples, not from a live capture — the docs pages carry curl and JavaScript
  examples for every endpoint the app calls.
- Neither `auth/api-key.ts`'s nor `auth/client-credentials.ts`'s failure-classification code
  could be checked against Trustpilot's real error response *bodies* (unlike Apify's
  documented `{"error":{"type","message"}}` shape, Trustpilot's own "Common error messages"
  page names only status codes). Both read the body defensively — trying a handful of the
  field names REST APIs commonly use (`message`, `error`, `error_description`) — rather than
  asserting a shape nobody could confirm. See `lib/client.ts`'s `formatTrustpilotError`.

## Actions

11 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `business-unit-get-profile` | read | `GET /v1/business-units/{id}/profileinfo` |
| `business-unit-search` | search | `GET /v1/business-units/search` |
| `business-unit-list-categories` | read | `GET /v1/business-units/{id}/categories` |
| `business-unit-get-web-links` | read | `GET /v1/business-units/{id}/web-links` |
| `business-unit-reviews-list` | search | `GET /v1/business-units/{id}/reviews` |
| `business-unit-reviews-list-all` | search | `GET /v1/business-units/{id}/all-reviews` (cursor) |
| `product-review-get-summary` | read | `GET /v1/product-reviews/business-units/{id}` |
| `product-review-batch-summaries` | search | `POST /v1/product-reviews/business-units/{id}/batch-summaries` |
| `product-review-list` | search | `GET /v1/product-reviews/business-units/{id}/reviews` |
| `invitation-list-templates` | read | `GET .../v1/private/business-units/{id}/templates` (invitations-api host) |
| `invitation-send-email` | perform | `POST .../v1/private/business-units/{id}/email-invitations` (invitations-api host) |

### Notes on individual actions

- **`business-unit-search`'s query parameter is `perpage`, lower-cased** — unlike every review
  endpoint's `perPage`. Confirmed from the endpoint's own wire example.
- **`business-unit-reviews-list` vs `business-unit-reviews-list-all`.** The first is
  page/perPage with the full filter set (stars, language, location, tag, response state,
  sort order); the second is cursor-paginated (`pageToken` → `nextPageToken`) and is
  Trustpilot's own recommendation for scraping *every* review without page drift as new ones
  arrive: "Use pageToken to paginate through reviews. This is a public endpoint and won't
  return customer emails or order IDs."
- **`stars` and `language` are single-value filters here**, even though Trustpilot documents
  both as `array` params. The reference never shows the multi-value wire form (repeated key vs.
  comma-joined), so this app does not guess at it — pass one value per call.
- **`product-review-list` needs `sku` and/or `productUrl`** — Trustpilot's own note: "You must
  specify parameters for either SKUs, productUrls or both." `execute` throws before making a
  request if both are empty.
- **`invitation-send-email` covers the service-review-invitation path only.** Trustpilot's
  request body also supports a `productReviewInvitation` block (a nested product list, each
  with its own SKU/name/brand/GTIN) for sending product-review invitations in the same call —
  left out of this action's params for now; it is sizeable enough to deserve its own action if
  a workflow needs it.
- **`invitation-send-email`'s response shape is unconfirmed.** Trustpilot's reference shows this
  endpoint's request body in full but publishes no worked response example — unlike every
  other endpoint this app calls. `execute` returns whatever body comes back, unshaped
  (`{ response }`), rather than asserting fields nobody could confirm.

## Deliberately not covered

- **`GET /v1/business-units/find`** — the endpoint Trustpilot names as *the* way to look up a
  Business Unit's id from a domain ("To find your Business Unit ID, you need to provide your
  API key and your domain name"). Its reference page shows the request only — no response
  schema, unlike every other endpoint in this app. `business-unit-search` covers the same
  practical need with a documented response.
- **Private Business Units/Product Reviews reads** (`GET /v1/private/business-units/{id}/reviews`,
  `GET /v1/private/product-reviews/...`, product-review conversations/comments) — these need
  the OAuth grant too, but are out of scope for this pass; the two modules covered here are the
  read-a-business's-reputation-and-invite-reviews path this app is built around.
- **Service Reviews API, Consumer API, Consumer Profile API, Categories API (standalone),
  Business Signup API, Private Products API, Resources API, Data Solutions API, Deletions
  API** — separate modules, out of scope.
- **Invitations' `invitation-links` (generate a link instead of sending an email) and
  `invitation-data/delete`** — out of scope for this pass; `invitation-send-email` and
  `invitation-list-templates` cover the send-an-invitation path.
- **The Authorization Code, Implicit and Password grant types** — all need an end-user login
  (a browser redirect, or the user's own Trustpilot username/password); none is usable from an
  unattended workflow. Password is additionally marked "Deprecated" in Trustpilot's own nav.

Nothing was left out because it could not be confirmed to exist — every endpoint above is
named and described in Trustpilot's own reference. What's missing is either a response schema
(`find`, `email-invitations`'s response) or scope (everything else in this section).

## Health checks

`service` (live) + `quota` (declared absence) + 2 derived `auth:*` checks.

### `service` — status.trustpilot.com, a genuine Atlassian Statuspage

Verified live on 2026-09-01: `GET /api/v2/summary.json` answers 200 with 5,239 bytes of
Statuspage-shaped JSON self-identifying as `{"name": "Trustpilot", "url":
"https://status.trustpilot.com"}`. Its 14 components include **`APIs`** (this app's own
dependency) alongside `www.trustpilot.com`, `Business Portal`, `TrustBoxes`, an
"invitation-reviews" template-delivery group, and several marketing/legal/corporate sites. The
page-level `status.indicator` is read as the verdict — deriving one from the component list
instead would report Trustpilot down because its marketing site is having a bad day.

### `quota` — declared unavailable, informational

Trustpilot's "Rate limiting best practices" page recommends staying under 833 calls/5 minutes
or 10K calls/hour, but documents no response header or endpoint reporting a remaining count or
reset time on any of its APIs — "the only signal" it names for exceeding the limit is the `429`
itself. Declared `unavailable` at `informational` severity rather than guessed at.

## Icon

`assets/icon.ico` is Trustpilot's own favicon, downloaded **verbatim** from
`https://cdn.trustpilot.net/brand-assets/4.3.0/favicons/favicon.ico` on 2026-09-01 — 15,086
bytes, a Windows `.ico` resource bundling three icon sizes (48×48 and 32×32 at 32 bits/pixel).
Declared via `appearance.icon.url` (not `.svg`) per `ImageObject`'s raster/fallback slot; the
pack's icon-legibility auditor does not attempt to score a non-SVG/PNG format and reports it
`unsupported icon format — not scored` rather than failing.

## Layout

```
trustpilot/
├── package.json                    # manifest — the `w6w` identity block
├── index.ts                        # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                   # requestApi/requestInvitations, error formatting, both hosts
│   └── params.ts                   # shared Param fragments (businessUnitId, pagination, ...)
├── auth/
│   ├── api-key.ts                  # apikey header: sign, test
│   └── client-credentials.ts       # OAuth client_credentials: exchange, refresh, sign, test
├── actions/                        # one file per action (11)
├── health/
│   ├── service.ts                  # status.trustpilot.com
│   └── quota.ts                    # declared absence, informational
├── assets/icon.ico                 # vendor mark, verbatim
└── tests/                          # 68 tests: entry module, every action, both auth methods, health
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt`
deno task test
```
