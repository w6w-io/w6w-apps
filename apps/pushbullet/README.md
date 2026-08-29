# Pushbullet

Send push notifications, links, files and SMS/MMS across devices, plus one-to-one chats and
broadcast channels, on the **Pushbullet API v2**.

- **Categories** — communication, productivity
- **Auth methods** — access-token
- **Actions** — 24
- **Health checks** — 2 declared (~~`service`~~, `rate-limit`) + a declared absence
  (~~`push-limit`~~) + the derived `auth:access-token`
- **Egress allowlist** — `api.pushbullet.com`
- **Website** — https://www.pushbullet.com/
- **API docs** — https://docs.pushbullet.com/

> **Everything below was verified against Pushbullet's own docs on 2026-08-29**
> (`docs.pushbullet.com`, fetched live, 414,076 bytes) plus live probes against
> `api.pushbullet.com`, `pushbullet.com`, and `pushbullet.statuspage.io`. Nothing here came from a
> third-party integration directory.

## The three things most likely to trip up a new integration

### 1. The auth header is bespoke — `Access-Token`, never `Authorization: Bearer`

The vendor's own quick-start, verbatim: "To authenticate for the API, use your access token in a
header like `Access-Token: <your_access_token_here>`." Every worked example on the page uses this
header; a second, legacy option (the token as an HTTP Basic username with an empty password) is
mentioned once and used nowhere in the vendor's own examples, so this app only ever sends the header
form (`auth/access-token.ts`).

### 2. `delete-device`'s own docs contradict themselves — and `delete-text` is the opposite case

Reading the **Devices** section closely: the "Call" line for `delete-device` states
`DELETE https://api.pushbullet.com/v2/devices` — no `{iden}` — but the worked curl example directly
below it uses `DELETE https://api.pushbullet.com/v2/devices/ujpah72o0sjAoRtnM0jc`. This app follows
the concrete example, consistent with every other single-resource delete (`push`, `chat`,
`subscription`) on the same page (`actions/device-delete.ts`).

`delete-text` looks like it should be the same kind of typo — it is the one delete in this API that
is **documented as a `POST`**, at the same path `update-text` uses — but here both statements agree:
the "Call" line *and* the request field table both say `POST .../v2/texts/{iden}` with
`{"iden": "..."}` in the body. Nothing here contradicts itself, so `actions/text-delete.ts`
implements it exactly as written rather than "fixing" it to match its siblings.

### 3. Rate-limit headroom is genuinely readable; the 500-pushes/month ceiling is not

Every response carries `X-Ratelimit-Limit`, `X-Ratelimit-Remaining` and `X-Ratelimit-Reset` (unix
seconds) — a real, live headroom signal, unlike most vendors in this pack. `health/rate-limit.ts`
reads it. The vendor separately documents a 500-push/month ceiling for free accounts, but exposes no
endpoint, field or header that reports current consumption against it — a genuinely different,
unreadable limit, declared unavailable in `health/push-limit.ts` rather than folded into the readable
one.

## Auth

**`access-token`** (`apiKey`, header `Access-Token`) — a personal access token from
**pushbullet.com → Settings → Account**, or an OAuth2 access token (same wire format; this app does
not implement the OAuth2 authorization-code exchange itself, since a pasted token authenticates
identically either way).

Pushbullet issues no scoped tokens: every access token, personal or OAuth2, carries full account
access. So unlike Apify or Ashby, there is no "this action needs a scope the credential may lack"
question anywhere in this app.

**The probe is `GET /v2/users/me`** — Pushbullet's *only* documented account endpoint, so there is no
alternative to weigh (unlike Apify's `/users/me`, which leaks the account's Apify Proxy password, this
object is `iden`/`email`/`name`/`image_url`/`max_upload_size`/`referred_count`/`referrer_iden` —
profile fields, never the access token itself). `afterConnect` reuses the same call to publish `name`
and `email` as the connection label, and nothing else.

## Actions

24 actions. `resource` groups them in the editor.

| Key                     | Type    | Endpoint                              |
| ------------------------ | ------- | -------------------------------------- |
| `push-list`               | read    | `GET /v2/pushes`                       |
| `push-create`             | perform | `POST /v2/pushes`                      |
| `push-update`             | perform | `POST /v2/pushes/{iden}`               |
| `push-delete`             | perform | `DELETE /v2/pushes/{iden}`             |
| `push-delete-all`         | perform | `DELETE /v2/pushes`                    |
| `device-list`             | read    | `GET /v2/devices`                      |
| `device-create`           | perform | `POST /v2/devices`                     |
| `device-update`           | perform | `POST /v2/devices/{iden}`              |
| `device-delete`           | perform | `DELETE /v2/devices/{iden}`            |
| `chat-list`               | read    | `GET /v2/chats`                        |
| `chat-create`             | perform | `POST /v2/chats`                       |
| `chat-update`             | perform | `POST /v2/chats/{iden}`                |
| `chat-delete`             | perform | `DELETE /v2/chats/{iden}`              |
| `channel-create`          | perform | `POST /v2/channels`                    |
| `channel-info-get`        | read    | `GET /v2/channel-info`                 |
| `subscription-list`       | read    | `GET /v2/subscriptions`                |
| `subscription-create`     | perform | `POST /v2/subscriptions`               |
| `subscription-update`     | perform | `POST /v2/subscriptions/{iden}`        |
| `subscription-delete`     | perform | `DELETE /v2/subscriptions/{iden}`      |
| `text-create`             | perform | `POST /v2/texts`                       |
| `text-update`             | perform | `POST /v2/texts/{iden}`                |
| `text-delete`             | perform | `POST /v2/texts/{iden}` (see above)    |
| `user-get`                | read    | `GET /v2/users/me`                     |
| `upload-request`          | perform | `POST /v2/upload-request`              |

### Idempotency

- **No dedupe key at all**: `device-create`, `channel-create` (`tag` must be globally unique, and
  re-using one is undocumented — not assumed safe), `subscription-create` (re-subscribing to an
  already-subscribed channel is undocumented), `upload-request` (a fresh, one-time upload slot every
  call). All `idempotent: false`.
- **A dedupe key that is optional**: `push-create` and `text-create` both accept a `guid` the vendor
  documents as making a retry "mostly idempotent" — "sending another push with the same guid is
  unlikely to create another push (it will return the previously created push)". That is a property of
  *whether the caller supplied one*, not a blanket guarantee, so both are declared `idempotent: false`
  with a hint steering a retry-safe caller toward setting `guid`.
- **Get-or-create by design**: `chat-create` — the vendor's own words, "Create a chat … if one does
  not already exist" — is `idempotent: true`.
- **Every update, delete and mute/dismiss toggle** settles into the same end state on retry:
  `idempotent: true`.

### Notes on individual actions

- **`push-create` needs exactly one target** — `deviceIden`, `email`, `channelTag` or `clientIden` —
  or none, which broadcasts to every device. Not enforced structurally; the vendor's own request shape
  is this permissive.
- **A file push or a picture text needs `upload-request` first.** This action stops at requesting the
  authorized upload URL — it does not itself `POST` the file's bytes to that URL, because the
  destination host is returned **per call** by Pushbullet (the docs' own example is
  `upload.pushbullet.com`, but nothing commits that host in advance) and is not something this app
  can put in `network.allow` ahead of time. Upload the bytes with the workflow's own HTTP step, then
  pass the returned `fileUrl`/`fileName`/`fileType` into `push-create` or `text-create`.
- **`channel-info-get` does not require a Connection.** The vendor's own example calls it with no
  `Access-Token` header at all — public channel metadata, by tag.
- **List actions accept `active`/`limit`/`cursor`/`modifiedAfter`** even where a specific endpoint's
  own docs say "Request: none" (`device-list`, `chat-list`, `subscription-list`) — the vendor's general
  Objects section states these apply to every `list-*` call, and `push-list`'s own field table
  confirms the same four parameters explicitly.
- **Text messages queue for at most an hour.** The vendor's own caveat: if the sending Android device
  does not come online and sync within that window, the message is canceled — this app cannot make
  delivery faster, only queue the request.

## Health checks

Two declared checks (`rate-limit`, a real probe; `push-limit`, a declared absence) plus a declared
absence for `service`, and the derived `auth:access-token`.

### ~~`service`~~ — no live status page

`status.pushbullet.com` does not resolve at all. `pushbullet.statuspage.io` redirects
(`302` → `https://www.statuspage.io` → `301` → `https://www.atlassian.com/software/statuspage`) to a
**127,696-byte** page — Atlassian's own Statuspage marketing page, the standard signature for an
*unclaimed* `*.statuspage.io` subdomain, not a real status page Pushbullet ever set up. `pushbullet.com`
itself links to About/Get Started/Help/API/Press/Security/Privacy/Terms — nothing status-shaped.
Declared `unavailable`, `severity: "informational"`.

### `rate-limit` — a live probe, because request-rate headroom *is* readable

`X-Ratelimit-Limit` / `X-Ratelimit-Remaining` / `X-Ratelimit-Reset` on every authenticated response —
measured live on `GET /v2/users/me`, the same call `auth/access-token.ts`'s `test` hook makes. Reusing
it costs nothing beyond the credential check that already runs. The ceiling resets on a rolling
window, so exhausting it is a queue, not an outage: capped at `degraded`, never `down`.

### ~~`push-limit`~~ — the 500-pushes/month ceiling is a different, unreadable limit

The vendor's own Limits section states free accounts are capped at 500 pushes/month and that going
over "will result in an error when sending a Push" — but no endpoint, field or header reports pushes
sent this cycle, plan tier, or reset date. Declared `unavailable`, `severity: "informational"`,
distinct from `rate-limit` because the two are genuinely different meters (API call volume vs.
billable pushes sent).

## Deliberately not covered

- **List Contacts** — removed from the API in 2015. The vendor's own changelog: "Removed Contacts
  calls as the official apps no longer us[e] Contacts. These have been replaced with the `Chat`
  objects." `chat-list`/`chat-create`/`chat-update`/`chat-delete` are the modern surface.
- **The ephemeral-based "Send SMS" guide** — an older, lower-level way to queue a text via
  `POST /v2/ephemerals`, superseded by the `Text` object API this app implements. The vendor's own
  docs point callers at the modern surface explicitly: "To send a text message, use `create-text`."
- **The rest of Ephemerals** (clipboard sync, notification mirroring/dismissal) — a consumer-app
  feature requiring client-side end-to-end encryption (PBKDF2 + AES-256-GCM, with the key derived from
  a user-supplied password that never reaches Pushbullet's servers) this app does not implement. Left
  out rather than shipped half-working.
- **The Realtime Event Stream** (`wss://stream.pushbullet.com/websocket/<token>`) — a WebSocket, not
  an HTTP call `ctx.fetch` can make from inside the sandbox.
- **OAuth2 client registration / the authorization-code exchange** — this app accepts a token however
  it was obtained (personal access token or a completed OAuth2 flow); it does not perform the
  browser-redirect exchange itself, since the resulting credential is wire-identical either way.

## Icon

`assets/icon.svg` — Pushbullet's own favicon (`www.pushbullet.com/favicon.ico`, confirmed reachable,
200, `image/x-icon`) carries only raster PNG frames (16×16 and 32×32), not vector artwork, so per the
house fallback order this app uses **simple-icons**'s Pushbullet mark instead:
<https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/pushbullet.svg>, downloaded 2026-08-29,
inked with `#4AB367` (the hex simple-icons records for this brand, sourced from
`pushbullet.com/press`), then re-framed onto the pack's normalized `0 0 100 100` canvas by
`_tools/icon-normalize.ts`. The original artwork is nested untouched inside that frame — see
`tests/index.test.ts` for the assertions pinning both the geometry and the brand colour.

## Development

```bash
deno task test       # unit tests
deno task check       # typecheck
deno task lint         # deno lint
deno task fmt           # format (lineWidth 100, semicolons, double quotes)
deno task validate       # @w6w/validator CLI, via _tools/audit.ts
```
