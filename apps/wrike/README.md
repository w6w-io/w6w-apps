# Wrike

Manage Wrike tasks, folders/projects, comments, contacts and timelogs on the **Wrike API v4**.

- **Categories** — project-management, productivity
- **Auth methods** — permanent-token
- **Actions** — 29
- **Health checks** — 1 live (`account`) + 2 declared absences (~~`service`~~, ~~`quota`~~) + the
  derived `auth:permanent-token`
- **Egress allowlist** — `www.wrike.com`, `app-eu.wrike.com`, `app-us2.wrike.com` (Wrike's three
  fixed regional API hosts — see below)
- **Website** — https://www.wrike.com/
- **API docs** — https://developers.wrike.com/docs/overview (one OpenAPI 3.0.1 document per
  endpoint, under `developers.wrike.com/reference/<operationId>` — there is no single combined spec)

> **Everything below was verified against Wrike's own sources on 2026-08-29** — the per-endpoint
> OpenAPI documents linked from `developers.wrike.com/llms.txt`, the `docs/oauth-20-authorization`
> and `docs/errors-api-reference-v4` guides, and live probes against `www.wrike.com/api/v4/version`.
> Nothing here came from a third-party integration directory.

## The three things most likely to go wrong

### 1. Every mutating request is a query string — never a JSON body

This is the single most surprising thing about this API, and the most common way a hand-rolled Wrike
integration silently does nothing. Wrike's own OpenAPI documents declare **every** field on a
POST/PUT — scalars, arrays and objects alike — `"in": "query"`. Creating a task with
`{"dates": {"start": "2026-09-01"}}` as a JSON body gets back a *successful*-looking response with no
dates applied, because Wrike never looked at the body at all: the client is expected to
`JSON.stringify` the object and place it in the query string as one value
(`?dates=%7B%22start%22...%7D`).

Every action here builds requests that way (`lib/client.ts`'s `buildQuery`), and the unit tests for
`task-create`/`folder-create`/`contact-update` all assert the request body is `null` and the
structured field lands JSON-encoded in the query string instead.

### 2. The API host is chosen per account, not fixed

Wrike stores customer data in one of three fixed data centers —`www.wrike.com`, `app-eu.wrike.com`,
`app-us2.wrike.com` — all three documented as `servers` on every single endpoint. Calling the wrong
one for a given account answers `401 not_authorized`, **identical to an invalid token** — Wrike's own
OAuth guide states this explicitly. A Permanent Access Token is generated from inside an
already-logged-in workspace, so nothing about the token's bytes says which host it belongs to; this
app collects the data center as an ordinary (non-secret) connect-time field and records it on the
Connection's `display` data (the same pattern Zendesk's per-account subdomain uses in this pack), so
every action reads it back via `hostFromConnection` rather than guessing.

### 3. No live credential leaks, but no live status feed either

Unlike several apps in this pack (Apify's proxy password, Follow Up Boss's `/me`, Mailjet's
`/apikey`), **no Wrike read endpoint used here returns credential material** — confirmed by reading
every response schema this app's actions touch. `account-get` returns Wrike's `Account` object
unmodified; there is nothing to strip.

The flip side: Wrike publishes **no usable machine-readable status feed** and **no rate-limit
headroom of any kind**. `status.wrike.com` is a real, Wrike-branded page, but it is a client-rendered
SPA whose every plausible JSON/RSS route 404s and whose own bundled JS contains no fetchable API path;
`wrike.statuspage.io` and `wrike.freshstatus.io` are both unclaimed decoys. Both are declared
`unavailable` with `severity: "informational"` rather than silently omitted — see `health/service.ts`
and `health/quota.ts` for the full trail. The one thing that *is* live and worth watching —
`GET /account`'s `subscription.suspended` flag — is its own `credential`-kind health check
(`health/account.ts`), because a suspended account fails every action regardless of how valid the
token is.

## Auth: Permanent Access Token, not OAuth2

Wrike's own PAT guide recommends OAuth2 "for team deployments" and a Permanent Access Token "for
individual use or testing" — but a workflow Connection is exactly the unattended, server-to-server
case OAuth2's three-legged browser flow is built to avoid. A PAT never expires on its own (unlike an
OAuth access token's documented 1-hour lifetime) and needs no client id/secret or refresh flow this
app would have to implement. This mirrors Apify's identical choice in this pack for the same reason.

To connect: Wrike workspace → profile icon → **Apps & Integrations** → **API** → **+ App** → **Get
Token**, then pick the matching **Data center** (check your Wrike URL in the browser if unsure — an
EU or US2 account shows `app-eu.wrike.com` / `app-us2.wrike.com` instead of `www.wrike.com`).

The credential probe (`auth/permanent-token.ts`'s `test` hook, and the derived `auth:permanent-token`
health check) is `GET /version` — chosen over the more obvious `GET /contacts?me=true` because it
needs **no scope** (every other read/list endpoint in this app documents `Scopes: Default,
wsReadOnly, wsReadWrite`) and returns nothing about the account at all
(`{"data":[{"major":4,"minor":0}]}`). Confirmed live: an invalid token against
`www.wrike.com/api/v4/version` answers `401 {"error":"not_authorized","errorDescription":"Access
token is unknown or invalid"}`.

## What's covered, and what's deliberately left out

| Resource | Actions | Notes |
| --- | --- | --- |
| Tasks | list, get, create, update, delete | `task-create`'s `folderId` becomes the parent — see the vendor's own root-folder/subtask note in the action's doc comment |
| Folders & projects | list, get, create, update, delete | Wrike models spaces/projects/plain folders all as "folders"; `project` param on create/list selects project behavior |
| Comments | list (task), create, get-by-id, update, delete | **A comment is editable only within 5 minutes of creation** — Wrike's own stated limit, not this app's |
| Contacts (users & groups) | list, get-by-id, update | Update can only touch the **requesting user's own** contact (or, for admins, a group) — Wrike's separate admin-only "Modify User" endpoint is not implemented here |
| Timelogs | list (task), create, get-by-id, update, delete | `hours` is validated to Wrike's documented `[0, 24]` range |
| Attachments | list (task), get-by-id, get download URL, delete | **Metadata only** — see below |
| Account | get, API version | `account-get` also carries `rootFolderId`/`recycleBinId`, needed to create at the account root |

**Attachment upload (`POST /tasks/{taskId}/attachments`) is intentionally not implemented.** Wrike's
own OpenAPI document for that endpoint declares no request body and no content-type at all; the real
binary-upload contract (raw bytes plus a filename, by Wrike's own convention elsewhere) is only
described in prose this app's sourcing did not reach and confirm. Per this pack's house rule — "if a
detail can't be confirmed, leave it out and say so" — every other attachment action (list, get
metadata, get a fresh download URL, delete) is implemented; creating one is not.

**Account-wide and folder-scoped comment listings** (`GET /comments`, `GET
/folders/{folderId}/comments`) also exist in Wrike's API but are not separately implemented —
`comment-list` covers the task-scoped case, and `comment-get` reads any comment by ID regardless of
which parent it belongs to.

Every create/update action also exposes an advanced **`rawParams`** JSON passthrough (merged last
into the query string) for reaching a field this app does not model directly — Wrike's full
parameter surface per endpoint is large and heavily cross-referenced (`effortAllocation`,
`cascadingFieldSettings`, `workScheduleId`, …), and this passthrough round-trips any of them exactly
as Wrike's own docs specify, without this app needing to be updated first.

## Pagination

Several list endpoints (`task-list`, `folder-list`, `timelog-list`) support Wrike's own
`pageSize`/`nextPageToken` cursor pair. `pageSize` is prefilled to a modest 100 here — Wrike's own
default/maximum for these endpoints is far larger (`GET /tasks` with no filter returns the account's
**entire** task list), the same "vendor list defaults are enormous" trap already documented for
Apify's `GET /v2/store` in this pack. Wrike's own parameter description says the response "will
return a token that applies an offset to the next page" but never states, in any endpoint's published
OpenAPI document, which response field or header actually carries it — it is not in the documented
`{kind, data}` envelope. This app therefore accepts a `nextPageToken` as an input (for a caller who
already has one) but cannot mint the next one itself.

## File layout

```
wrike/
├── package.json            # identity — the `w6w` block
├── index.ts                # entry: default-exports { actions, auth, healthChecks }
├── actions/                # one file per action (29)
├── auth/
│   └── permanent-token.ts  # bearer PAT + data-center host field
├── health/
│   ├── service.ts          # declared unavailable — see finding #3
│   ├── quota.ts             # declared unavailable — see finding #3
│   └── account.ts           # live: GET /account's subscription.suspended
├── lib/
│   ├── client.ts            # WrikeClient — query-string convention, envelope, errors, host
│   └── params.ts             # shared Param fragments and option lists
├── assets/
│   └── icon.png              # vendor mark, decoded pixel-exact from favicon.ico (see below)
└── tests/                    # unit tests for the entry module, every action, auth and health
```

## Icon

Wrike's only linked favicon (`https://www.wrike.com/tp/static/favicon.ico`, confirmed from the
site's own `<link rel="icon">`) is a multi-resolution **raster** `.ico` — not cleanly convertible to
SVG. No `apple-touch-icon` is published, Wrike has no entry in simple-icons, and no `n8n-io/n8n`
`nodes-base` node exists for Wrike either, exhausting this pack's fallback order. `assets/icon.png` is
therefore decoded pixel-exact from the `.ico`'s 48×48 32bpp frame (the vendor's own green
checkmark/arrow mark), matching the same pattern this pack already uses for Apify, ClickSend,
AssemblyAI and others whose only source is a raster favicon.
