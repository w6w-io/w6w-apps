# systeme.io

Manage contacts, tags, funnels, email campaigns and newsletters, courses and enrollments,
communities and memberships, and outbound webhooks on **systeme.io's Public API**.

- **Categories** — marketing
- **Auth methods** — api-key (`X-API-Key` header)
- **Actions** — 41
- **Health checks** — 1 (~~`service`~~, declared unavailable) + the derived `auth:api-key`
- **Egress allowlist** — `api.systeme.io`
- **Website** — https://systeme.io/
- **API docs** — https://developer.systeme.io/reference/api
- **OpenAPI** — embedded in the reference page's own SSR payload (see below) — no public download link
- **Status page** — none published (see [Health checks](#health-checks))

systeme.io is an all-in-one funnel/email/course platform: build a funnel, run an email campaign or a
one-off newsletter, manage contacts and tags, sell a course, run a community, and fire webhooks when
any of it happens. This app covers that surface at the granularity the API actually exposes — see
[Scope](#scope-and-what-is-deliberately-not-implemented) for what is left out and why.

> **Everything below was verified against systeme.io's own OpenAPI 3.1 document on 2026-08-24**, plus
> live probes against `api.systeme.io`, `status.systeme.io`, `systemeio.statuspage.io` and
> `systemeio.instatus.com` / `systeme.instatus.com`. Nothing here came from a third-party integration
> directory.

## The OpenAPI document has no visible download link — here is where it actually lives

`developer.systeme.io/reference/api` is a **Readme.io**-hosted reference site, rendered client-side.
There is no "Download OpenAPI" button and no `/openapi.json` at any of the URLs a Readme.io site
conventionally serves it from (all checked live and confirmed 404/302-to-marketing). But every
Readme.io page embeds the **full spec as JSON** inside its own server-rendered
`<script id="ssr-props" type="application/json">` tag, at `document.api.schema`. Fetching any
operation's page (e.g. `.../reference/api_contacts_get_collection-1`) and parsing that script tag
yields the complete OpenAPI 3.1 document — 45 paths, 82 operations, every schema — as genuine
machine-readable JSON, not scraped HTML. That is the source every claim in this app was checked
against; the rendered page was never used to infer a field or a path.

## Findings that would cost someone a day

### 1. Auth is a bare `X-API-Key` header — not a bearer token, not OAuth2

The vendor's own words, from the spec's `info.description`: *"To authenticate with the systeme.io
Public API, your only option right now is to attach your API key to the `X-API-Key` header of each
request."* Confirmed against `components.securitySchemes.Api_Key`
(`{"type":"apiKey","in":"header","name":"X-API-Key"}`). No `Bearer ` prefix, no token endpoint, no
scopes — a key is the entire authentication story.

### 2. `PATCH` uses `application/merge-patch+json`, not `application/json`

Every `PATCH` operation's `requestBody.content` key in the OpenAPI document is literally
`application/merge-patch+json`, confirmed for contacts, contact fields, campaigns, campaign steps,
newsletters and webhooks. [`lib/client.ts`](lib/client.ts)'s `patch()` sets this explicitly rather
than reusing the `POST`/`PUT` code path — sending plain `application/json` to a PATCH endpoint is
undocumented behavior, not a documented fallback.

### 3. Two different 401 bodies for two different problems — confirmed live, not assumed

Measured 2026-08-24 against unauthenticated and wrong-key calls to `GET /api/contacts`:

| Case | Body | `WWW-Authenticate` header |
| --- | --- | --- |
| No header at all | `{"detail":"Full authentication is required to access this resource."}` | absent |
| Header present, wrong key | `{"detail":"Invalid API Key."}` | `API Key` |

Both are genuine `application/problem+json` responses — not a catch-all error page. `auth/api-key.ts`
distinguishes them by `detail` text (with the header as a secondary signal) so a stale connection and
a never-connected one report different, actionable messages instead of one generic "check your
credential".

### 4. Cursor pagination reads the last `id` back — and the floor is 10, not 1

Every collection answers `{"items": [...], "hasMore": boolean}`. The vendor's own guidance: set
`startingAfter` to the **positive `id` of the last item returned**, keep the same `order`, and never
guess a value or start from `0`. Less obviously, `limit`'s OpenAPI schema states
`"minimum": 10, "maximum": 100` — asking for 3 rows is not just wasteful, it is a documented 4xx, not
something the API silently clamps.

### 5. No status page exists — verified by content, not by a 404 alone

Three guesses, all checked live on 2026-08-24: `status.systeme.io` (bare 404, 24-byte body),
`systemeio.statuspage.io/api/v2/summary.json` (302s through `www.statuspage.io` to a 127,696-byte
Atlassian marketing page — the known signature for an **unclaimed** `*.statuspage.io` subdomain, not
a quiet one), and `systemeio.instatus.com` / `systeme.instatus.com` (bare `500`, 5-byte body, neither
subdomain provisioned). This app declares the absence explicitly rather than silently omitting a
`service` health check — see [Health checks](#health-checks).

### 6. `GET /api/contact_fields` is the safest credential probe — because there is no `/me`

systeme.io publishes no whoami/account endpoint at all. The auth `test` hook probes
`GET /api/contact_fields` instead: it requires a valid key (unauthenticated it 401s, same as every
other endpoint), and its response — a list of `{slug, fieldName}` custom-field *definitions* — carries
no contact PII and nothing key-shaped, unlike probing `/api/contacts` itself, which would put a page
of real contact emails into the health surface on every check.

## Scope, and what is deliberately not implemented

This app covers 9 of systeme.io's 12 documented resource groups: **Contact**, **Tag**,
**ContactField**, **Funnels**, mailing **Campaign** (+ its steps only at the create/read/update/delete
level of the campaign itself), **Newsletter**, **Webhook**, **School** (courses/enrollments), and
**Community** (communities/memberships).

Deliberately **not** implemented — every one of these is fully documented in the same OpenAPI schema
everything above was checked against, so this is a scope decision for this build pass, not a "could
not confirm":

- **Funnel steps and campaign steps** (`/api/funnels/{id}/steps`,
  `/api/mailing/campaigns/{id}/steps`, `/api/funnel-steps/{id}`,
  `/api/mailing/campaign-steps/{id}`) — a funnel or campaign can be created and addressed by this
  app; the individual pages/emails inside it are authored in systeme.io's own visual editor, which is
  not a workflow-shaped operation.
- **Newsletter tag targeting** (`/api/mailing/newsletters/{id}/excluded-tags`, `/included-tags`) —
  audience-targeting detail on top of a newsletter this app can already create and update.
- **Payment** (coupons, price plans, digital products, subscriptions), **SMS templates**, and
  **booking calendar** — real, verified, fully-documented endpoints that sit closer to
  commerce/billing/scheduling than to the marketing-automation surface this app targets.
- **Page editor** (`/api/page-editor/*`) — an internal page-builder wire format (raw page-schema
  JSON), not something a workflow step would construct.

## Health checks

Only one is declared, and it is a stated **absence**:

- `service` — `unavailable`, `severity: "informational"`. See finding #5 above for the evidence; the
  `informational` severity is load-bearing, since an `unavailable` entry always reports `unknown` and
  `unknown` outranks `ok` in a host's roll-up — any stronger severity would pin this App's verdict at
  `unknown` forever.
- `auth:api-key` — derived automatically from the Auth `test` hook (finding #6). Every Connection
  already carries this for free; no separate check is declared for it.

No `quota` check is declared either. systeme.io's rate-limit headers
(`X-RateLimit-Limit`/`X-RateLimit-Refill`) state only the ceiling and refill cadence — there is no
`X-RateLimit-Remaining` anywhere in the documented header set, so there is no headroom number to
report.

## Icon

`assets/icon.svg` is extracted from systeme.io's own site header wordmark
(`d1yei2z3i6k35z.cloudfront.net/161/68c03b5dc30e4_systemelogo.svg`, fetched from `systeme.io`'s own
page source on 2026-08-24): the roundel-and-"S" mark, with the surrounding "ystem.io" wordmark letters
dropped and the mark's own nested transforms collapsed to a plain `0 0 32 32` viewBox — a mechanical
recomposition of the vendor's own coordinates, not a redraw. It was then run through this pack's
`_tools/icon-normalize.ts`, which re-frames every app's mark onto a shared `0 0 100 100` canvas
without touching the path data or colors inside.

## Testing

```bash
deno task validate   # manifest against @w6w/validator
deno task check       # typecheck
deno task lint        # deno lint
deno task test         # unit tests, mocked HookContext (fake ctx.fetch, no-op ctx.log)
```

Every action, the auth method, the health check, and the entry module (`index.ts`) have unit tests
under `tests/`. `tests/_helpers.ts` provides `mockCtx()` (a queued fake `ctx.fetch`), `page()` and
`problemBody()` (the vendor's own response envelopes), and `pathOf()`/`queryOf()` for asserting on the
recorded request.
