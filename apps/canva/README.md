# Canva

Create and manage Canva designs, folders, assets, and brand templates over the Canva Connect
API.

- **Categories** — productivity, documents
- **Auth methods** — oauth2
- **Actions** — 29
- **Egress allowlist** — `api.canva.com`
- **Website** — https://www.canva.com
- **API docs** — https://www.canva.dev/docs/connect/

## Actions

All paths are relative to `https://api.canva.com`.

| Key | Resource | Method + path |
|---|---|---|
| `list-designs` | design | `GET /rest/v1/designs` |
| `get-design` | design | `GET /rest/v1/designs/{designId}` |
| `get-design-pages` | design | `GET /rest/v1/designs/{designId}/pages` (preview API) |
| `get-design-export-formats` | design | `GET /rest/v1/designs/{designId}/export-formats` |
| `get-design-dataset` | design | `GET /rest/v1/designs/{designId}/dataset` |
| `create-design` | design | `POST /rest/v1/designs` |
| `list-folder-items` | folder | `GET /rest/v1/folders/{folderId}/items` |
| `get-folder` | folder | `GET /rest/v1/folders/{folderId}` |
| `create-folder` | folder | `POST /rest/v1/folders` |
| `update-folder` | folder | `PATCH /rest/v1/folders/{folderId}` |
| `delete-folder` | folder | `DELETE /rest/v1/folders/{folderId}` |
| `move-folder-item` | folder | `POST /rest/v1/folders/move` |
| `get-asset` | asset | `GET /rest/v1/assets/{assetId}` |
| `update-asset` | asset | `PATCH /rest/v1/assets/{assetId}` |
| `delete-asset` | asset | `DELETE /rest/v1/assets/{assetId}` |
| `create-asset-upload-job` | asset | `POST /rest/v1/asset-uploads` (async) |
| `get-asset-upload-job` | asset | `GET /rest/v1/asset-uploads/{jobId}` |
| `create-url-asset-upload-job` | asset | `POST /rest/v1/url-asset-uploads` (async, preview API) |
| `get-url-asset-upload-job` | asset | `GET /rest/v1/url-asset-uploads/{jobId}` (preview API) |
| `create-design-export-job` | export | `POST /rest/v1/exports` (async) |
| `get-design-export-job` | export | `GET /rest/v1/exports/{exportId}` |
| `create-design-autofill-job` | design | `POST /rest/v1/autofills` (async, Enterprise/trial) |
| `get-design-autofill-job` | design | `GET /rest/v1/autofills/{jobId}` |
| `list-brand-templates` | brand-template | `GET /rest/v1/brand-templates` |
| `get-brand-template` | brand-template | `GET /rest/v1/brand-templates/{brandTemplateId}` |
| `get-brand-template-dataset` | brand-template | `GET /rest/v1/brand-templates/{brandTemplateId}/dataset` |
| `get-current-user` | user | `GET /rest/v1/users/me` |
| `get-user-profile` | user | `GET /rest/v1/users/me/profile` |
| `get-user-capabilities` | user | `GET /rest/v1/users/me/capabilities` |

Every path, verb, scope, and request/response field above was verified 2026-09-05 against
Canva's own live reference documentation at `https://www.canva.dev/docs/connect/` — each
per-endpoint page fetched and read directly (server-rendered HTML, not a generated OpenAPI
doc, but no less authoritative), plus a live probe of `api.canva.com` and
`www.canvastatus.com`.

### Left out on purpose

- **Comments** (create/get/list threads and replies) — the request shapes (an `assignee`
  object, thread vs. reply addressing) needed their own verification pass this build didn't
  have budget for; nothing here was guessed to fill out the surface.
- **Analytics** (`get-design-analytics*`) — Enterprise-only and shaped around date-range
  aggregation this pass didn't verify against live traffic.
- **Design imports** (`create-design-import-job` / `create-url-import-job`) — the same
  async-job shape as asset upload, for a different target resource (a design rather than an
  asset); left out to keep this first pass to one upload path per resource type.
- **Merges** and **Resizes** — small, single-purpose job endpoints (`POST /v1/merges`,
  `POST /v1/resizes`) that would be quick additions later, just not exercised here.
- **Webhooks** (`GET /v1/webhooks/keys` plus the notification event shapes) — this host
  doesn't expose a per-app receiving endpoint for inbound Canva webhooks, so subscribing
  would have nothing to deliver to.

## Auth

**oauth2** is the only auth model Canva Connect publishes for third-party integrations —
OAuth 2.0 Authorization Code flow with **PKCE (S256)**, mandatory, not optional as it is for
some other vendors.

- **Authorize**: `https://www.canva.com/api/oauth/authorize` — note this is the **marketing
  host** (`www.canva.com`), not the API host. Requires `code_challenge_method=s256`.
- **Token exchange / refresh**: both hit the same endpoint,
  `POST https://api.canva.com/rest/v1/oauth/token`, distinguished only by `grant_type`
  (`authorization_code` vs. `refresh_token`). The client authenticates with HTTP Basic
  (`base64(client_id:client_secret)`) — handled host-side by the w6w server, never by this
  package.
- **Revoke**: a separate endpoint, `POST /rest/v1/oauth/revoke`.
- **Token lifetime**: access tokens last **4 hours** as of this writing, and Canva's own docs
  flag that figure as subject to change without notice.

Canva scopes access **tightly and explicitly** — its own guidance: `asset:write` does not
imply `asset:read`; you must request both if you need both. A scope not granted at connect
time isn't merely unused, it's a hard `403 permission_denied` on any endpoint that needs it.
This app's oauth2 method requests the union of every scope its 29 actions use:

| Scope | Used by |
|---|---|
| `design:meta:read` | `list-designs`, `get-design`, `get-design-autofill-job` |
| `design:content:read` | `get-design-pages`, `get-design-export-formats`, `get-design-dataset`, `create-design-export-job`, `get-design-export-job` |
| `design:content:write` | `create-design`, `create-design-autofill-job` |
| `folder:read` | `list-folder-items`, `get-folder` |
| `folder:write` | `create-folder`, `update-folder`, `delete-folder`, `move-folder-item` |
| `asset:read` | `get-asset`, `get-asset-upload-job`, `get-url-asset-upload-job` |
| `asset:write` | `update-asset`, `delete-asset`, `create-asset-upload-job`, `create-url-asset-upload-job` |
| `brandtemplate:meta:read` | `list-brand-templates`, `get-brand-template` |
| `brandtemplate:content:read` | `get-brand-template-dataset` |
| `profile:read` | `get-user-profile`, `get-user-capabilities` |

`get-current-user` (`GET /rest/v1/users/me`) needs **no scope at all** — see the health
section below.

## Three things that would have cost a day to discover

1. **The authorize host and the API host are different domains.** Authorization happens on
   `www.canva.com` (the consumer product); every REST call, including the token exchange
   itself, goes to `api.canva.com`. Pointing the authorize URL at `api.canva.com` (a
   reasonable first guess) fails outright.
2. **Three endpoint families are asynchronous, job-based, and answer identically.** Asset
   upload, design export, and design autofill all return
   `{ "job": { "id": "...", "status": "in_progress" } }` immediately — the real result only
   appears once a paired `get-*-job` action is polled to `status: "success"` (or `"failed"`,
   with an `error.code`/`error.message`). This app models each as a `create-*` + `get-*`
   action pair rather than pretending Canva's API is synchronous; Canva's own guidance is
   exponential backoff between polls.
3. **Asset upload is the one action that isn't JSON.** `create-asset-upload-job` sends the raw
   file bytes as the entire request body (`Content-Type: application/octet-stream`) and
   carries the asset's name — base64-encoded — in a separate `Asset-Upload-Metadata` header,
   specifically so a user-facing name containing emoji or other non-ASCII characters survives
   the trip. `create-design-autofill-job`'s `data` field is likewise passed straight through
   as Canva documents it (image/video/text/chart/sheet, each shaped differently) rather than
   modeled field-by-field, since the shape is fully driven by whatever fields the target brand
   template or design actually declares — read them first with `get-brand-template-dataset` /
   `get-design-dataset`.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — Atlassian Statuspage at `canvastatus.com`.

```
GET https://www.canvastatus.com/api/v2/summary.json
```

Verified live 2026-09-05: `page.name` is `"Canva"`, and the component list includes one named
exactly **"Connect API"** (group "Apps", alongside "Admin API", "Apps SDK", "Canvas") — this
check reads that one component's status, not the page-wide indicator, because the page also
covers dozens of unrelated Canva surfaces (mobile apps, billing, LMS integrations like Moodle
and Schoology) that say nothing about this API's health. If Canva ever renames or removes that
component, the check reports `unknown` rather than silently falling back to the page-wide
rollup.

The check is unsigned (`credential: "none"`) and `www.canvastatus.com` is reachable **only
inside this hook's worker** — deliberately absent from `w6w.network.allow`, so no action can
call it and no credential can ever reach the status host.

### Is this credential live?

This is what the `oauth2` auth method's `test` hook does — the app's own health check.

```
GET /rest/v1/users/me
```

This is the narrowest possible authenticated probe: it needs **no specific scope**, so it
succeeds regardless of which of the ten scopes above a Connection actually has, and its
response (`{ "team_user": { "user_id", "team_id" } }`) can't leak anything sensitive the way a
design/folder/asset read might. It's also exposed as its own action,
`get-current-user`, for a workflow that wants the ID mid-run.

### Do we have quota left?

**Not declared.** Searched every Connect API reference page fetched for this build (auth,
designs, folders, assets, exports, autofills, brand templates, users, plus the "API requests
and responses" and "Error responses" fundamentals pages) for a rate-limit response header of
any kind (`X-RateLimit-*`, `RateLimit-*`, `Retry-After`, etc.) — **none is documented
anywhere**. Every endpoint states its limit only as prose ("rate limited to N requests per
minute"), and even the `429 too_many_requests` error body carries no remaining-quota figure.
There is nothing a successful response could expose that answers "how much headroom is left
before the next call gets throttled", so this app declares the check `unavailable` rather than
probing something that would prove nothing.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | — | — | informational | — | `unavailable` — see above |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `www.canvastatus.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the widening
precisely because the check is unsigned; pairing an extra host with `credential: "signed"` is
rejected at load time, so a credential can never reach a status host.

---

Researched and endpoint-verified 2026-09-05 against `www.canva.dev/docs/connect/` and
`www.canvastatus.com`. Status surfaces move; re-check if a probe starts failing for everyone at
once.
