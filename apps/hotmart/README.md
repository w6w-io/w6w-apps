# Hotmart

Sell and manage online courses and digital products through Hotmart: sales, subscriptions,
products and checkout coupons, over Hotmart's **Public API**.

- **Categories** — commerce, finance
- **Auth methods** — client-credentials (`custom`)
- **Actions** — 17
- **Health checks** — 2 (~~`service`~~, `quota`) + the derived `auth:client-credentials`
- **Egress allowlist** — `developers.hotmart.com` (every resource endpoint), `api-sec-vlc.hotmart.com`
  (the OAuth token endpoint only)
- **Website** — https://hotmart.com/
- **API docs** — https://developers.hotmart.com/docs/en/start/about/

Hotmart is a platform creators use to sell ebooks, video courses, memberships and other digital
goods, and to manage the affiliates, co-producers and subscribers around them. This app covers the
day-to-day of running that business from a workflow.

> **Everything below was verified on 2026-09-05** against Hotmart's own developer documentation
> (`developers.hotmart.com/docs/en/...`, a Gatsby site whose page content was read from its own
> structured `page-data.json`, not screen-scraped) and live, unauthenticated probes of both API
> hosts. Nothing here was inferred from a sibling integration or from Hotmart's marketing site.

## The three things most likely to cost you a day

### 1. The docs host really is the API host — and it isn't the only one

Every documented endpoint (sales, subscriptions, products, coupons, user) is called at
`https://developers.hotmart.com/...` — the same host that serves the documentation pages. That reads
like a placeholder a copy-paste sample forgot to replace, so it was checked live rather than trusted:

| Path                                | Status | Body |
| ------------------------------------ | ------ | ---- |
| `/payments/api/v1/sales/history`     | 401    | `{"error":"unauthorized","error_description":"Full authentication is required..."}` |
| `/user/api/v1/me`                    | 401    | `{"error":"invalid_token","error_description":"Access token is missing or invalid..."}` |
| `/definitely-not-a-real-path-zzz`    | 200    | the docs site's own Gatsby SPA shell, redirecting to `/docs/pt-BR/404/index.html` |

The two documented paths answer with a schema-correct, endpoint-specific JSON error; the nonsense
path answers the docs site's own catch-all shell. That contrast is what proves `developers.hotmart.com`
is genuinely the API, not just the docs.

The **token endpoint is a separate host entirely** — `api-sec-vlc.hotmart.com/security/oauth/token` —
confirmed live and unauthenticated-reachable the same way. `network.allow` lists both.

### 2. Auth is client_credentials wrapped in a THIRD secret

Hotmart's Developer Credentials tool (Tools > Developer Credentials) mints **three** values at once:
`client_id`, `client_secret`, and a third value the docs literally call "token of the Basic type".
Minting an access token needs all three **simultaneously** — `client_id`/`client_secret` as **query
parameters**, and the Basic token as an `Authorization: Basic <token>` **header**:

```
POST https://api-sec-vlc.hotmart.com/security/oauth/token
     ?grant_type=client_credentials&client_id=...&client_secret=...
Authorization: Basic <basicToken>
```

Two easy ways to get this wrong: assuming the Basic header is the textbook
`base64(client_id:client_secret)` construction (it is not — Hotmart hands you an opaque pre-built
value), and sending the credentials as `Authorization: Bearer` on the token call itself (that header
shape is for every *other* endpoint, not this one). See [`auth/client-credentials.ts`](auth/client-credentials.ts).

Only the resulting `access_token` expires (~48h, per `expires_in`); the three secrets themselves do
not, so `refresh` is just another run of the same exchange. The `test` hook also re-runs the exchange
rather than reading a resource — a resource read only proves today's cached access token still works,
not whether the long-lived secrets themselves are still valid, and would report a healthy Connection
as broken the moment the access token merely expires between scheduled checks.

### 3. Two silent behaviors that change what a "list" endpoint returns

- **Every sales list endpoint** (`sales-history`, `sales-summary`, `sales-users`,
  `sales-commissions`, `sales-price-details`) silently narrows to `APPROVED`/`COMPLETE` sales when
  you leave **both** the Transaction and Transaction Status filters empty — stated in the vendor's
  own doc, not visible from the response shape. Set Transaction Status explicitly if you need to see
  e.g. `REFUNDED` or `CHARGEBACK` sales.
- **`subscription-reactivate`** does not reactivate a subscription immediately — it emails the
  subscriber a link, valid three days, asking them to accept. The response comes back `INACTIVE`,
  reflecting the pending-acceptance state, not a completed reactivation.

## Actions (17)

| Resource | Key | Type | What it does |
| --- | --- | --- | --- |
| Sales | `sales-history` | read | List sales with per-purchase detail |
| Sales | `sales-summary` | read | Total commission value per currency for a period |
| Sales | `sales-users` | read | List sale participants (buyer/producer/co-producer/affiliate) with contact detail |
| Sales | `sales-commissions` | read | Per-participant commission breakdown for each sale |
| Sales | `sales-price-details` | read | Base/total/VAT/fee/coupon breakdown of a purchase |
| Sales | `sales-refund` | perform | Refund an APPROVED/COMPLETE, non-trial purchase |
| Sales | `sales-billet` | perform | Generate a new boleto (bank payment slip) PDF |
| Subscriptions | `subscribers-list` | read | List subscribers/subscriptions with current status |
| Subscriptions | `subscription-summary` | read | Recurrence/recovery status (up to 24h delayed) |
| Subscriptions | `subscription-cancel` | perform | Cancel a subscription |
| Subscriptions | `subscription-reactivate` | perform | Request subscriber acceptance to reactivate |
| Subscriptions | `subscription-change-due-day` | perform | Move a subscription's billing day |
| Products | `product-list` | read | List the creator's products |
| Coupons | `coupon-create` | perform | Create a percentage-off coupon (non-subscription products only) |
| Coupons | `coupon-list` | read | List coupons for a product |
| Coupons | `coupon-delete` | perform | Delete a coupon by its numeric id |
| User | `user-me` | read | The authenticated producer's own profile |

## Health checks

| Check | Kind | What it does |
| --- | --- | --- |
| ~~`service`~~ | service | **Declared unavailable.** `status.hotmart.com` answers HTTP 200 with the identical 975-byte SPA shell for every path tried, including a made-up one — no path there is a real per-component status route. `hotmart.statuspage.io` is the well-known unclaimed-Statuspage decoy (302s to statuspage.io's own marketing page). Declared `informational`, not left as a silent gap. |
| `quota` | quota | Reads the `RateLimit-*`/legacy `X-RateLimit-*-Minute` headers (documented at [`.../start/rate-limit/`](https://developers.hotmart.com/docs/en/start/rate-limit/), a flat 500 req/min ceiling) off `GET /user/api/v1/me`. Not observed on the unauthenticated probes used to verify reachability, so their absence reports `unknown`, never zero headroom. |
| `auth:client-credentials` | credential (derived) | The `test` hook re-runs the token exchange with the stored `client_id`/`client_secret`/Basic token. |

## Not implemented, and why

- **Bulk cancel/reactivate** (`cancel-subscriptions`, `reactivate-subscriptions` — plural) and
  **Get Account Info** (`POST /accounts/api/v1/info`, a GraphQL-shaped call requiring a hand-built
  query string) exist in Hotmart's docs but were left out here to keep this pass to the endpoints
  whose request/response shape could be fully confirmed against the vendor's own structured page
  data without guessing at an undocumented bulk-request body or GraphQL query shape.
- **Club** (modules/pages/lessons/users), **Tickets**, **Negotiation**, **Payment Link** and
  **Webhooks** are separate Hotmart surfaces this pass did not cover — say so here rather than
  guess at them from the marketing site.

## Sandbox

Hotmart's sandbox mirrors production one-for-one at a different host
(`https://sandbox.hotmart.com` in place of `https://developers.hotmart.com`) using the same
credential flow. This app does not expose a base-URL override; point a sandbox credential's
Connection at production only after switching hosts at the vendor's own Developer Credentials tool,
per [`.../start/sandbox/`](https://developers.hotmart.com/docs/en/start/sandbox/).
