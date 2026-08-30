# Unbounce

Landing pages, pop-ups and sticky bars for conversion campaigns, over the
[Unbounce REST API v0.4](https://developer.unbounce.com/api_reference/)
(`api.unbounce.com`). Verified 2026-08-30 against Unbounce's own developer
portal (`developer.unbounce.com/api_reference/` and `/getting_started/`) and
live probes against `api.unbounce.com` / `status.unbounce.com`.

- **Website:** https://unbounce.com
- **API docs:** https://developer.unbounce.com/api_reference/ (getting
  started / auth: https://developer.unbounce.com/getting_started/)
- **Categories:** marketing, forms, analytics
- **Egress allowlist:** `api.unbounce.com` (the `service` health check adds
  its own unsigned allowlist entry for `status.unbounce.com` — see below)
- **Actions:** 24
- **Auth methods:** 2 (API Key, OAuth 2.0)
- **Health checks:** 1 declared (`service`) + 2 derived (`auth:api-key`,
  `auth:oauth2`)

## Auth

### API Key (`api-key`, type `basic`)

Unbounce authenticates with HTTP Basic Auth: the API key as the **username**,
an **empty password** (`Authorization: Basic base64("<key>:")`). Request
access with the email used to log in (Unbounce support enables it within a
couple of days), then create the key under **Manage Account → API Access**.

A key authenticates as an **account administrator** — Unbounce's own docs say
"API keys currently act like Unbounce account administrators", so there is no
narrower scope to request. **Two endpoints refuse an API key outright** and
are documented "OAuth only": deleting a lead
(`DELETE /pages/{page_id}/leads/{lead_id}`) and requesting an asynchronous
bulk lead deletion (`POST /pages/{page_id}/lead_deletion_request`). Both are
still implemented as actions (`page-lead-delete`,
`page-lead-deletion-request-create`) — connect with OAuth to reach them — and
both actions say so in their own description, since Unbounce has no scope
system to warn a user of this in advance.

### OAuth 2.0 (`oauth2`)

The "public integrator" path: register one Unbounce OAuth application
(`developer.unbounce.com/getting_started/#oauth`), then end users authorize
it individually.

- Authorize URL: `https://api.unbounce.com/oauth/authorize`
- Token URL: `https://api.unbounce.com/oauth/token` (also used for
  `grant_type=refresh_token`)
- Single fixed scope, `full` — Unbounce documents no narrower option
- No PKCE (`client_secret`-based exchange, no `code_verifier` documented)

## Setup

1. Decide API Key (single account, simplest) or OAuth (multi-tenant / needs
   lead deletion).
2. **API Key:** Manage Account → API Access → create a key. Paste it into the
   Connection.
3. **OAuth:** register an application via Unbounce's OAuth registration form
   (linked from the getting-started guide), configure the resulting
   `client_id` / `client_secret` / `redirect_uri` on this w6w installation,
   then connect per-user through the browser flow.

## What's covered

Every documented endpoint in the reference is implemented as an action:

- **Meta:** `api-meta-get` (`GET /`, no auth required)
- **Accounts:** `account-list`, `account-get`, `account-sub-account-list`,
  `account-page-list`
- **Sub-Accounts** (Unbounce's own app UI calls these **"Clients"**):
  `sub-account-get`, `sub-account-domain-list`, `sub-account-page-group-list`,
  `sub-account-page-list`
- **Domains:** `domain-get`, `domain-page-list`
- **Pages:** `page-list` (top-level, for OAuth clients that can see pages
  across sub-accounts — see the vendor's own note under `GET /pages`),
  `page-get`, `page-form-field-list`
- **Leads:** `page-lead-list`, `page-lead-create`, `page-lead-get`,
  `page-lead-delete` (OAuth only), `page-lead-deletion-request-create`
  (OAuth only, bulk/async), `page-lead-deletion-request-get`, `lead-get`
  (by lead id alone)
- **Page Groups:** `page-group-page-list`
- **Users:** `user-get-self`, `user-get`

### The account model is three levels deep

An **Account** owns **Sub-Accounts** ("Clients" in the app UI), and
Sub-Accounts own **Domains**, **Page Groups** and **Pages**. "List every
page" therefore depends on which level a credential can see — this app
exposes each level's own page list separately rather than assuming one global
list is enough (`account-page-list`, `sub-account-page-list`,
`domain-page-list`, `page-group-page-list`, and the top-level `page-list` for
OAuth clients spanning sub-accounts).

### Not one query-parameter shape

Every collection endpoint documents its own subset of
`sort_order` / `count` / `from` / `to` / `offset` / `limit` — verified per
endpoint rather than assumed uniform:

- `GET /accounts` takes **only** `sort_order`.
- `GET /pages/{page_id}/leads` takes `sort_order`/`from`/`to`/`offset`/`limit`
  but **no `count`**.
- `GET /pages/{page_id}/form_fields` takes `sort_order`/`count`/
  `include_sub_pages` but **no `offset`/`limit`/`from`/`to`**.
- The top-level `GET /pages` alone adds `with_stats` and `role`.
- Every other collection endpoint (sub-accounts, domains, page groups, the
  per-level page lists) takes the full `sort_order`/`count`/`from`/`to`/
  `offset`/`limit` set, with `limit` defaulting to Unbounce's own 50 and
  capped at its documented maximum of 1000.

## Non-obvious findings

- **Errors are not one shape.** The reference's own "Errors" section
  documents HTTP status codes only, and reading it implies a uniform JSON
  body. The wire disagrees, measured live: an unmatched route
  (`GET /` unauthenticated) answers JSON
  (`{"message": "Not Found", "documentation": "…"}`), but a missing or
  rejected credential answers `401` as **plain text**
  (`"Unauthorized\nRequested URL: …"`) — with no field distinguishing "no
  credential" from "bad credential" the way some other vendors' error codes
  do. `lib/client.ts`'s `formatUnbounceError` tries JSON first and falls back
  to the raw text.
- **Two endpoints are OAuth-only**, with no scope system to warn a caller in
  advance — see "Auth" above.
- **No rate-limit header is published.** The reference documents a 500
  requests/minute (per account and IP) ceiling in prose only, in the
  "Rate Limiting" section of the getting-started guide; none was observed on
  a live probe either. So this app declares no `quota` health check rather
  than inventing a headroom figure Unbounce never publishes.
- **The icon** (`assets/icon.png`) was extracted from the real vendor favicon
  (`unbounce.com/favicon.ico`, 34,993 bytes, a 4-frame Windows ICO). Its
  256×256 frame is already a PNG (`89 50 4E 47 0D 0A 1A 0A` at the frame's own
  offset inside the ICO directory), so it was sliced out directly — no
  decoding, no redraw.

## Health checks

- **`service`** (declared) — the `status.unbounce.com` Statuspage's own
  **"Partner API"** component, not the page-level indicator. The page lists
  38 components; most (the marketing site, live chat/phone/email support, the
  Smart Copy app, and two dozen individual `AWS *` infrastructure rows) say
  nothing about whether `api.unbounce.com` itself answers, so the verdict is
  narrowed to the one component that is this app's own surface — every other
  component is still reported in the check's `components` detail map. This
  check runs unsigned (`credential: "none"`) against its own allowlisted host
  (`status.unbounce.com`), never the API host.
- **`auth:api-key`**, **`auth:oauth2`** (derived) — projected automatically
  from each Auth method's `test` hook, both of which probe `GET /users/self`:
  it requires a credential (measured unauthenticated: `401` plain text), is
  not resource-scoped (an API key is never scoped narrower than admin
  anyway), and its response — id, name, email, and the account/sub-account
  URLs the credential can see — carries only the caller's own profile, never
  the credential itself.
- No `quota` check — see "Non-obvious findings" above.
