# Grain

List, read and manage Grain meeting recordings, transcripts, tags, shares and webhooks, plus a
workspace's users, teams and meeting types, via the Grain Public API (v2).

- **Categories** — ai, productivity, video
- **Auth methods** — api-key
- **Actions** — 19
- **Egress allowlist** — `api.grain.com`

## Links

- **Website** — https://grain.com
- **Developer docs** — https://developers.grain.com — a single-page HTML reference (no OpenAPI
  document exists); every path, param, enum and response field below was transcribed from that
  page's prose and example `curl`/JSON blocks on **2026-08-24**, not from memory or a sibling app.
- **Status page** — https://status.grain.com (redirects to https://www.grainstatus.com)
- **Icon** — Grain publishes no standalone SVG mark; the app icon is the vendor's own
  `apple-touch-icon` PNG (`.../5f7c00be1be3c48c24ce7977_Grain-Web-Clip.png`, 256×256, served from
  grain.com's own CDN), per this pack's PNG-fallback precedent for vendors with no vector mark.

## How big is this API, really?

Grain's Public API v2 is small: **21 documented operations**, minus the 2 OAuth2 token-exchange
endpoints (not data operations — see [Auth](#auth)) and minus the file-upload `PUT` itself (see
[Uploading a recording](#uploading-a-recording)), leaves **19**, and every one has an Action here.
There is no v2 endpoint held back and none padded in.

Grain does publish a **v1** ("Personal API" / "Workspace API") behind a Notion doc for beta
participants, but its own page says plainly: "we don't recommend usage of v1 anymore" and "v1 will
be sunset". This app targets v2 exclusively.

## Actions

| Resource     | Action                          | Endpoint                                                       |
| ------------ | -------------------------------- | --------------------------------------------------------------- |
| recording    | List Recordings                  | `POST /recordings`                                              |
| recording    | Get Recording                    | `POST /recordings/:recording_id`                                |
| recording    | Get Recording Transcript (JSON)  | `GET /recordings/:recording_id/transcript`                      |
| recording    | Get Recording Transcript (text)  | `GET /recordings/:recording_id/transcript.{txt,vtt,srt}`        |
| recording    | Download Recording               | `GET /recordings/:recording_id/download`                        |
| recording    | Create Recording Upload URL      | `POST /recordings/upload`                                       |
| recording    | Update Recording                 | `PATCH /recordings/:recording_id`                                |
| recording    | Add Tag to Recording             | `PUT /recordings/:recording_id/tags`                             |
| recording    | Remove Tag from Recording        | `DELETE /recordings/:recording_id/tags/:tag`                     |
| recording    | Share Recording to a User        | `PUT /recordings/:recording_id/users`                            |
| recording    | Unshare Recording from a User    | `DELETE /recordings/:recording_id/users/:user_id`                |
| recording    | Share Recording to a Team        | `PUT /recordings/:recording_id/teams` (see caveat below)         |
| recording    | Unshare Recording from a Team    | `DELETE /recordings/:recording_id/teams/:team_id`                |
| hook         | Create Hook                      | `POST /hooks/create`                                             |
| hook         | List Hooks                       | `POST /hooks`                                                    |
| hook         | Delete Hook                      | `DELETE /hooks/:hook_id`                                         |
| user         | List Users                       | `POST /users`                                                    |
| team         | List Teams                       | `POST /teams`                                                    |
| meeting-type | List Meeting Types               | `POST /meeting_types`                                            |

All paths above are relative to `https://api.grain.com/_/public-api/v2` (recordings/hooks/users/
teams/meeting_types) except `hooks/create`, which is one level up at `.../v2/hooks/create`.

**Deliberately absent:**

- **OAuth2.** Grain documents it fully (Authorization Code + PKCE), but see [Auth](#auth) for why
  it isn't implemented here.
- **Uploading a recording's actual bytes.** _Create Recording Upload URL_ mints the single-use
  `PUT` target; performing that `PUT` is left to whatever client obtained the URL, since its host
  is not knowable in advance (Grain's own example uses a placeholder,
  `https://example.com/generated_url`). This mirrors this pack's `mux` app, whose
  `upload-create` action stops at minting a direct-upload URL for the same reason.
- **OAuth2 Generate Token / Refresh Token as Actions.** These mint the credential the `oauth2` auth
  method (not implemented) would use — not data operations, and not something a workflow should be
  able to call outside the connect flow.
- **A Trigger for inbound hook deliveries.** _Create Hook_, _List Hooks_ and _Delete Hook_ are here
  because they are real endpoints that register/inspect/remove a delivery target. Modelling Grain's
  inbound payload as a `TriggerDefinition` is separate work, and Grain's docs do not state whether
  deliveries are signed (no HMAC/secret field appears anywhere in the Hook object or its payload
  example), which a Trigger's ingest verification would need to know.

### Two documentation findings worth knowing before you rely on this API

1. **The Recording Filter's `before_datetime` / `after_datetime` descriptions are swapped.** Grain's
   own docs state `before_datetime` matches recordings whose `start_datetime` is "after the selected
   date" and `after_datetime` matches "before the selected date" — the opposite of what the field
   names say. This app trusts the **names**, not the (almost certainly copy-pasted) prose — see the
   comment in `lib/params.ts`. Verify against a live response before depending on the exact boundary
   (inclusive/exclusive) either param applies.
2. **"Share Recording to a Team"'s own Endpoint line disagrees with its own Example Request.** The
   Endpoint line reads `PUT /recordings/:recording_id/teams/:team_id`, but the Example Request on the
   very same page `curl`s `.../recordings/:recording_id/teams` (no `team_id` in the path) with
   `--data '{"team_id": "..."}'` — matching the sibling "Share Recording to an User" endpoint's shape,
   not its own stated path. This app follows the **example**, on the theory that a runnable `curl`
   command is less likely to be a typo than a one-line path summary, and because the example's shape
   is internally consistent with the neighboring "to an User" section. See the comment in
   `actions/recording-share-team.ts`.

### Working with recordings

The usual sequence is _List Recordings_ (optionally filtered by team, meeting type, title, date
range, or your own attendance/hosting) → take a recording's `id` → _Get Recording_ / _Get Recording
Transcript_ / _Download Recording_.

_List Recordings_ and _Get Recording_ share one `include` object with **nine** flags:
`highlights`, `participants`, `ai_action_items`, `ai_summary`, `private_notes` (Personal API
only), `calendar_event`, `hubspot`, `screenshares`, and `ai_template_sections` (itself
configurable — `format`: json/markdown/text, and `allowed_sections` to filter by title). None are
on by default; set only what a given workflow step needs.

The transcript has **two independent forms** with different shapes: _Get Recording Transcript
(JSON)_ returns structured `{ participant_id, speaker, start, end, text }` entries (wrapped here
under `entries`, since Grain returns a bare array with no wrapper object); _Get Recording
Transcript (text format)_ returns plain text, WebVTT or SubRip depending on the `format` param —
three separate documented endpoints (`.txt` / `.vtt` / `.srt` path suffixes) collapsed into one
Action here.

### Uploading a recording

Two Grain steps, one Action here: _Create Recording Upload URL_ (`POST /recordings/upload`) mints
a single-use `url` plus `max_duration_sec` / `max_upload_bytes` limits for one of `.mov` / `.mp4` /
`.mp3` / `.m4a`. The follow-up `PUT` of the actual file to that `url` happens outside this app (see
"Deliberately absent" above). Once the `PUT` finishes, Grain still has to **process** the file —
progress, the resulting `recording_id`, and any error are delivered to an `upload_status` hook, not
returned synchronously by either step.

`user_id` on _Create Recording Upload URL_ is documented "**Workspace API Only**, required" — i.e.
mandatory with a Workspace Access Token (naming which member owns the result) and inapplicable to a
Personal token. It is an optional param here, since this app has no way to know which token type is
connected.

### Sharing and tags

Adding/removing a tag and sharing/unsharing with a user or team are each a single dedicated
endpoint, all returning `{ "success": true }` on success and nothing more informative on failure
(no vendor error-body schema is published — see [Errors](#errors-and-pagination)). Tags are
validated client-side against Grain's own published regex
(`/^[\p{L}\d][\p{L}\d-]*$/u` — letters/digits, then more letters/digits/dashes) before the request
is sent.

### Hooks

_Create Hook_ registers a URL for one of ten event types
(`recording_added/updated/deleted`, `highlight_added/updated/deleted`,
`story_added/updated/deleted`, `upload_status`). Grain **tests reachability at creation time** — "A
reachability test is made to the provided url on creation. The endpoint must respond with a 2xx
status in order to successfully create the hook" — so a hook pointed at an endpoint that isn't
listening yet will fail to register, not silently sit disabled. `include` only applies to four of
the ten types and takes a different shape for each pair (Recording Include for
`recording_added`/`recording_updated`, Highlight Include — `transcript`/`speakers` — for
`highlight_added`/`highlight_updated`); this action exposes both sets of include params
unconditionally and sends only the one matching the chosen `hookType`.

There is no list-webhooks-by-URL lookup beyond _List Hooks_' `filter` (by `hook_type` and/or
`state`), and no update-hook endpoint — change one by deleting and recreating it.

### Errors and pagination

Grain documents accepted params and success shapes exhaustively but publishes **no general
error-body schema** — only "300 requests per minute... any requests beyond that limit will return a
429". This app's client (`lib/client.ts`) reports the HTTP status plus a truncated response body on
any non-2xx response rather than pretending to know a field name.

Only **List Recordings** paginates, and it is the odd one out even among Grain's own list
endpoints: `{ cursor, recordings: [...] }`, where `cursor` is echoed back as a **top-level body
field** on the next call (this is a `POST`, not a `GET` with a query string), `null` on the last
page. _List Users_, _List Teams_, _List Meeting Types_ and _List Hooks_ each return their full
array in a single call with no cursor at all — Grain documents no paging for them, and this app
does not invent one.

**Almost every "read" here is a `POST`, not a `GET`** — List Recordings, Get Recording, List Users,
List Teams, List Meeting Types and List Hooks are all documented `POST`, because their filter/
include objects don't fit query strings. Only the transcript/download GETs, the two DELETEs and the
one PATCH use a different verb.

## Auth

**API Key** only — a Grain **Personal Access Token** or **Workspace Access Token**, both sent
identically:

```
Authorization: Bearer {token}
```

...plus a **second header required on every call**, which is not credential material and is set by
this app's client rather than the auth method:

```
Public-Api-Version: 2025-10-31
```

Grain's docs list exactly one supported version (marked "*current version") and describe no
fallback for an omitted header, so it is always sent.

Personal and Workspace tokens differ only in scope, not wire format: a Personal token has "the same
level of access as the user that generated the token", while a Workspace token has "access to ALL
DATA from your workspace" (Grain's own wording). A handful of params are documented "*Personal API
Only" (the `attendance` recording filter, `private_notes` include) or "**Workspace API Only**"
(`user_id` on the upload-URL endpoint) — both are exposed here as ordinary optional params, since
this app cannot tell at runtime which token type is connected. Mint either kind at
**grain.com → Settings → Integrations → API**.

### Why OAuth2 is not implemented

Grain documents a complete OAuth2 Authorization Code + PKCE flow
(`GET https://grain.com/_/public-api/oauth2/authorize`,
`POST https://api.grain.com/_/public-api/oauth2/token`), and it is deliberately left out — not for
lack of documentation (unlike some vendors in this pack, Grain publishes both endpoints, PKCE
params and refresh semantics in full), but because of a concrete wire-format mismatch:

Grain's own example requests for **both** "Generate Token" and "Refresh Token" send
`Content-Type: application/json` with a JSON body
(`{"grant_type": "authorization_code", "code": ..., "client_id": ...}`) — not the
`application/x-www-form-urlencoded` body RFC 6749 (and every OAuth2 app already in this pack) uses.
Whether this platform's generic `oauth2` token exchange sends JSON or form-encoded is a host
implementation detail this app cannot observe or override without declaring a custom `exchange` /
`refresh` hook that reimplements PKCE's `code_verifier` handling — and getting that wrong would
silently mint a token request Grain rejects on every connect attempt. A Personal or (especially) a
Workspace Access Token already covers everything an OAuth2 connection would see, so nothing is lost
for this app's coverage by shipping only the unambiguous bearer-token form.

### No connection label

Grain publishes no whoami endpoint for either token type. There is no `/me`, and _List Users_
returns the whole workspace roster (or may 403 for a Personal token without admin visibility), not
"the current user" — so no `afterConnect` and no `connectionLabel` is declared.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Atlassian Statuspage, reached via a redirect chain worth knowing about:
`status.grain.com` **301s to `www.grainstatus.com`** (verified 2026-08-24), so the check calls the
latter directly.

```
GET https://www.grainstatus.com/api/v2/summary.json
```

**Verified real, not assumed.** The response is 200 JSON with `page.name: "Grain"` (page id
`y13ml4pg4j8t`) and four components (`Grain Desktop App`, `Recording Processing`, `Grain Recorder`,
`Grain Web App`); a deliberately bogus sibling path (`/api/v2/nonsense-zzz.json`) answers **404
with an empty body**, confirming this is a genuine Statuspage API rather than an HTML catch-all.

**Honest caveat**: none of the four components is named "API" or "Public API" — this page tracks
the desktop app, the recorder, the web app and the async recording-processing pipeline, not
`api.grain.com` specifically. It is reported anyway, capped at `degraded` (never `down` outright
from this signal alone), because a stalled Recording Processing pipeline is the most common reason
a perfectly-reachable API call returns an empty summary or transcript.

### Is this credential live?

This is what the Auth `test` hook does.

```
POST /_/public-api/v2/teams
{}
```

Chosen as the cheapest documented call: no required params, no filter object, and a workspace's
team list is typically small — unlike _List Users_ (which can be a long roster) or _List
Recordings_ (which needs no body but returns meeting content). `teams` carries no `*Personal
API Only` / `**Workspace API Only` annotation, so both token types can reach it.

### Do we have quota left?

**Real probe, published headers, one caveat.** Grain plainly documents its limit ("Grain allows a
total of 300 requests per minute") and its headers:

```
POST /_/public-api/v2/teams
→ x-ratelimit-limit: 300 · x-ratelimit-remaining: 250
```

`Retry-After` is documented as present **only once the limit is exceeded** (on the 429 itself), not
on every response the way the other two are — so this check's `resetAt` is left unset on a healthy
reading (there is nothing to compute it from) and populated only from `Retry-After` on a 429. The
probe reuses the exact call the Auth `test` hook makes, so this check costs nothing beyond what a
liveness probe would anyway.

## Development

```bash
deno task validate   # manifest checks (@w6w/validator)
deno task check       # typecheck
deno task lint         # deno lint
deno task fmt           # format (use this, never bare `deno fmt` — see CLAUDE.md)
deno task test           # unit tests, mocked HookContext
```
