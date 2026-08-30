# Chatwork

Chats, messages, tasks, files, invite links and contacts on **Chatwork**, the Japan-based business
team chat platform (chatwork.com), over the **Chatwork API v2**.

- **Categories** — communication, productivity
- **Auth methods** — api-token
- **Actions** — 32 (every operation the vendor's OpenAPI document declares)
- **Health checks** — 1 (`quota`) + ~~`service`~~ (declared absence) + the derived `auth:api-token`
- **Egress allowlist** — `api.chatwork.com`
- **Website** — https://go.chatwork.com/
- **API docs** — https://developer.chatwork.com/reference/get-me
- **OpenAPI license** — https://github.com/chatwork/chatwork-api-spec (MIT)

> **Everything below was verified against Chatwork's own sources on 2026-08-29** — its machine-
> readable OpenAPI 3.1 document, embedded server-side in every `developer.chatwork.com/reference/*`
> page (`info.version` `v2`), plus live probes against `api.chatwork.com`. Nothing here came from a
> third-party integration directory. All 32 operations the document declares are implemented.

## The three things most likely to go wrong

### 1. Auth is a plain header, not `Authorization: Bearer`

The vendor's security scheme is a bare `apiKey` named `x-chatworktoken` in its OpenAPI document; its
own UI and docs display it as `X-ChatWorkToken`. There is no `Authorization` header anywhere in this
API. Confirmed live: an unauthenticated `GET /me` and a syntactically-plausible bogus token **both**
answer `401 {"errors":["Invalid API Token"]}` — Chatwork's own error message does not distinguish "no
token reached the API" from "the token is wrong", so [`auth/api-token.ts`](auth/api-token.ts) surfaces
that ambiguity in its `test` message rather than inventing a distinction the vendor doesn't make.

OAuth2 is documented too (20 granular scopes), but this app implements only the personal API token —
see the comment block at the top of `auth/api-token.ts` for why.

### 2. Empty lists answer `204`, not `200 []`

Five list endpoints — `GET /my/tasks`, `/contacts`, `/rooms/{id}/tasks`, `/rooms/{id}/files`,
`/incoming_requests` — document a bare `204 No Content` for the empty case instead of `200` with an
empty array. Missing this reads as "the request failed" for the ordinary case of an empty chat or an
account with no pending contact requests.
[`ChatworkClient.list()`](lib/client.ts) normalises both shapes to `[]`, so every list action in this
app returns one consistent type regardless of which the vendor chose.

### 3. `GET /rooms/{room_id}/messages` is a stateful per-connection cursor

With `force` off — the documented default — Chatwork returns only the messages posted **since this
same API token's last read of this room**, not the chat's history. An empty result commonly means
"nothing new since last time", not "this chat has no messages". Calling this repeatedly from the same
Connection with `force` off returns different results each time, by design. Turn `force` on to force a
fetch of the newest messages (up to 100) regardless of that cursor. See
[`actions/room-message-list.ts`](actions/room-message-list.ts).

## Two smaller vendor quirks, documented at the call site

- **`PUT .../tasks/{task_id}/status` returns `task_id` as a *string*** — every other `task_id` in this
  API, including the one in the request path, is an integer. Declared as a string in this action's
  `output` rather than silently coerced.
- **`DELETE /rooms/{room_id}/link` answers `200` with a body** (`{"public": false}`), not the bare
  `204` every other `DELETE` in this API uses.

## Out of scope

Nothing was left out for scope — all 32 operations the vendor's OpenAPI document declares are
implemented. The only thing explicitly **not** built is **OAuth2** (see auth note above); a personal
API token, which is what Chatwork's own "Getting started" guide tells a developer to generate for
their own integration, is the sole auth method.

## Health

Chatwork publishes **no machine-readable status page or incident feed** — checked on 2026-08-29
against `status.chatwork.com` / `chatworkstatus.com` / `info.chatwork.com` (none resolve in DNS),
`chatwork.statuspage.io` (an unclaimed Statuspage instance), the vendor's Zendesk help center (403 to
a server-side client), and the developer portal's own guide pages (name none). This is declared as a
positive fact in [`health/service.ts`](health/service.ts) with `severity: "informational"`, rather
than left as a silent gap or guessed at from an unrelated host.

The only quota surface Chatwork publishes is the `X-RateLimit-Limit` / `-Remaining` / `-Reset`
headers, present on every successful response and absent from error responses (confirmed live).
[`health/quota.ts`](health/quota.ts) reads them off the same `GET /me` call the auth probe already
makes, so one request answers both "is the token live?" and "how much headroom is left?".

## Icon

`assets/icon.svg` wraps `https://www.chatwork.com/favicon.ico`, downloaded verbatim on 2026-08-29 (a
64×64, 32bpp Windows icon; 16,958 bytes) and losslessly re-encoded as PNG (same pixels, different
container — no artwork was redrawn or traced), then wrapped in an `<svg><image>` container. Chatwork
publishes no SVG mark of its own (only this raster favicon), no `apple-touch-icon` was found on
`www.chatwork.com`, it has no entry in simple-icons, and it has no node in `n8n-io/n8n`'s
`nodes-base` — the fallback chain named in this app's brief was exhausted in that order. This follows
the pack's existing precedent for that exact case: wrapping the vendor's own raster asset rather than
hand-tracing a vector that doesn't exist (see `apollo`, `blandai`, `dialpad`, `gorgias`, `kustomer`).
It is not run through `_tools/icon-normalize.ts`, matching those apps: that tool re-frames genuine
vector artwork onto the pack's shared 100×100 canvas, and a wrapped raster already fills its own
square.

## Layout

```
chatwork/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # ChatworkClient, the 204->[] normalisation, error formatting
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/api-token.ts            # X-ChatWorkToken: sign, test, afterConnect
├── actions/                     # one file per operation (32)
├── health/
│   ├── service.ts               # declared absence, informational
│   └── quota.ts                 # X-RateLimit-* headroom, signed
├── assets/icon.svg              # vendor's own raster favicon, wrapped as SVG
└── tests/                       # 99 tests: entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt`
deno task test
```

`deno task validate` fails with an `@w6w/runtime` import-map error identical to the one reproduced on
an unmodified `apify` — a property of how `_tools/audit.ts` is invoked from this package's `deno.json`,
not of this app. Run the audit directly instead:

```bash
cd ../../_tools && deno run --no-check -A audit.ts chatwork
```
