# Pinterest

Create and manage Pinterest boards and Pins, save content, search your own Pins, and read
account/ad-account info via the Pinterest REST API v5.

- **Categories** — social-media, marketing
- **Auth methods** — oauth2
- **Actions** — 16
- **Health checks** — service, quota (2, plus 1 derived `auth:oauth2`)
- **Egress allowlist** — `api.pinterest.com`
- **Website** — https://www.pinterest.com
- **API docs** — https://developers.pinterest.com/docs/api/v5/ (ground truth used: Pinterest's
  own OpenAPI 3.0 description, `github.com/pinterest/api-description`, `v5/openapi.json`,
  `info.version` `5.28.0`, fetched 2026-08-29 — the docs SITE is a client-rendered app that
  returns no usable content to a plain fetch)

## Auth

### `oauth2` — OAuth (Pinterest)

Authorization Code flow against `pinterest_oauth2`, the only user-context security scheme
Pinterest's v5 API documents.

- Authorization URL: `https://www.pinterest.com/oauth/`
- Token URL / refresh URL: `https://api.pinterest.com/v5/oauth/token`
- Scopes: `boards:read`, `boards:write`, `pins:read`, `pins:write`, `user_accounts:read`,
  `ads:read` — only what this app's actions use. Pinterest also defines
  `boards:read_secret`/`write_secret`, `pins:read_secret`/`write_secret`, `ads:write`,
  `catalogs:*`, `billing:*` and `biz_access:*`, none of which any action here needs.
- Scope separator: **comma** (`,`), not space — confirmed from Pinterest's own worked example
  (`scope=ads:read,ads:write,boards:read,pins:read`). This is the opposite of LinkedIn/X in
  this pack, and getting it wrong silently authorizes zero scopes.
- PKCE: **off**. Neither the OpenAPI description nor Pinterest's authentication guide document
  a `code_challenge`/`code_verifier` field anywhere.
- **Token exchange requires HTTP Basic client authentication**
  (`Authorization: Basic base64(client_id:client_secret)`), confirmed by the OpenAPI
  description's `security: [{"basic": []}]` on `POST /oauth/token` and by the vendor's own curl
  example. Pinterest does **not** accept `client_id`/`client_secret` in the token request body.
  If connecting ever fails at the token-exchange step, check the host's OAuth2 grant driver
  sends Basic auth for this provider.
- Refresh: the same token endpoint accepts `grant_type=refresh_token`. Pinterest also documents
  a one-time `continuous_refresh` request field for apps activated before 2025-09-25 (needed on
  the *initial* exchange to get an indefinitely-renewable 60-day refresh token instead of the
  retired 365-day one-shot form); apps activated on or after that date get it automatically.
  There's no generic `oauth2` config field to carry that one-time detail, so it's documented
  here rather than encoded.
- Probe (`test`/`afterConnect`): `GET /v5/user_account` — needs only `user_accounts:read`, the
  smallest scope requested, and its response (id, username, profile counts) carries no
  credential material.

## Actions

### Boards

| Action | Endpoint |
|---|---|
| `board-create` | `POST /v5/boards` |
| `board-get` | `GET /v5/boards/{board_id}` |
| `board-list` | `GET /v5/boards` |
| `board-update` | `PATCH /v5/boards/{board_id}` |
| `board-delete` | `DELETE /v5/boards/{board_id}` |
| `board-pins-list` | `GET /v5/boards/{board_id}/pins` |

### Pins

| Action | Endpoint |
|---|---|
| `pin-create` | `POST /v5/pins` (image-URL media source only — see below) |
| `pin-get` | `GET /v5/pins/{pin_id}` |
| `pin-list` | `GET /v5/pins` |
| `pin-update` | `PATCH /v5/pins/{pin_id}` |
| `pin-delete` | `DELETE /v5/pins/{pin_id}` |
| `pin-save` | `POST /v5/pins/{pin_id}/save` |
| `pin-search` | `GET /v5/search/pins` (the connected account's own Pins, not the public catalog) |

### Account / ad accounts

| Action | Endpoint |
|---|---|
| `user-account-get` | `GET /v5/user_account` |
| `ad-account-list` | `GET /v5/ad_accounts` (requires Business Access; needs `ads:read`) |
| `ad-account-get` | `GET /v5/ad_accounts/{ad_account_id}` |

Every list action uses Pinterest's cursor pagination (`bookmark` in, `bookmark` out) — not
offset/limit. `ad_account_id` is an optional Business-Access parameter on almost every
read/write here: leave it empty to act as the connected account, or set it to act as the owner
of a shared ad account.

## Why `pin-create` only supports an image URL

`PinCreate.media_source` is a discriminated union of six shapes. This app implements exactly
`image_url` (`{ source_type: "image_url", url }`) because Pinterest fetches that URL
server-side — no upload step, no request-body size limit to reason about.

Left out, and why:

- **`video_id`** requires first calling `POST /v5/media` to register a video, which hands back
  a one-time, per-request upload target that is not `api.pinterest.com`. A static
  `w6w.network.allow` can't declare that host in advance — the same reason LinkedIn's
  image/video upload is absent from this pack.
- **`image_base64` / `multiple_image_base64` / `multiple_image_urls`** send image bytes in the
  request body, a materially different action shape (`type: "file"` params, base64 sizing)
  left for a future iteration rather than invented here.
- **`pin_url`** (re-pinning from a URL Pinterest already knows) — Pinterest's own endpoint
  description says to use the client-side "Save button" for that flow instead of this API.

A Pin created any other way can still be read, updated, deleted, or saved through this app —
only the *creation* path is narrowed.

## Health checks

- **`service`** (`kind: "service"`) — reads `www.pintereststatus.com` (a real, verified
  Atlassian Statuspage; `status.pinterest.com` itself just redirects into the pinterest.com
  product pages and is not a status feed). The page has 41 components spanning the consumer
  website, the Ads Manager UI, *and* the developer API — this check filters to the 8 children of
  the **"The Pinterest API"** group (Content and Core, Conversions, Campaign Management,
  Audience Targeting, Analytics, Shopping, Business Access and Billing, Trends) and reports the
  worst of those 8, not the page-level indicator, which rolls up all 41 and would report this
  app degraded over a pinterest.com login-page incident it cannot even observe.
- **`quota`** (`kind: "quota"`) — declared `unavailable`, `severity: "informational"`. Verified
  live on 2026-08-29: neither an unauthenticated nor an invalid-token request to
  `GET /v5/user_account` carries any `X-RateLimit-*`/`RateLimit-*` header, and Pinterest's
  OpenAPI description declares none either. Pinterest's own docs say call-volume ceilings vary
  by endpoint/tier and that the only signal is the `429` refusal itself.
- **`auth:oauth2`** (derived) — the Auth method's own `test` hook, projected automatically.

## Errors

Every Pinterest v5 error answers `{"code": <int>, "message": "...", "status": "failure"}`
(the `status` field was observed live in addition to the two the OpenAPI description states).
`code` has no published table, so this app's error messages lead with the HTTP status and
Pinterest's own `message` text rather than trying to interpret `code`.
