# Twitch

Read Twitch channels, streams, videos, clips, chat metadata, schedules and teams over the
**Helix REST API** (`https://api.twitch.tv/helix`), and update a broadcaster's own channel.

**28 actions · 2 auth methods · 4 declared health checks (+2 derived) · 137 unit tests.**

Everything in this app was verified on **2026-08-11** against Twitch's own sources and live
probes — never a third-party integration directory:

| Source | What was taken from it |
|---|---|
| [`dev.twitch.tv/docs/api/reference/`](https://dev.twitch.tv/docs/api/reference/) — one page, 1,414,793 bytes, all 149 documented endpoints | every path, verb, query parameter, body field, enum and response code |
| [`dev.twitch.tv/docs/authentication/`](https://dev.twitch.tv/docs/authentication/) (35,227 B) + its "Getting OAuth Access Tokens" and "Validating Tokens" sub-pages | the two token kinds, the three grants, the `/oauth2/validate` contract |
| [`dev.twitch.tv/docs/api/guide/`](https://dev.twitch.tv/docs/api/guide/) | the token-bucket rate limit and the three `Ratelimit-*` headers |
| live probes of `api.twitch.tv`, `id.twitch.tv`, `status.twitch.com` | the error shapes, the 401/404 behaviour, the status page's real host and components |

---

## Authentication — the design problem, and what was decided

Twitch is the rare API where **authentication is two values that must agree**. Every Helix
request carries

```
Authorization: Bearer <access token>
Client-Id: <client id>
```

and nearly every endpoint's `401` row in the reference says the same thing: *"The ID in the
Client-Id header must match the client ID in the access token."* Getting this wrong is the
single most common way a Twitch integration fails, and it fails as a bare 401 that names
neither header.

There are also **two kinds of token**, and they are not interchangeable:

| | App access token | User access token |
|---|---|---|
| Grant | `client_credentials` | `authorization_code` (or device code) |
| Identifies | your application | a specific Twitch user |
| Scopes | none | whatever that user consented to |
| Lifetime | ~60 days (`expires_in` 5,011,271 s in Twitch's example) | ~4 hours (`expires_in` 14,124 s), plus a refresh token |
| Reaches | the 29 endpoints marked "app access token **or** user access token" with no scope | those, **plus** everything about a specific broadcaster's own data |

The reference states the requirement per endpoint, and it is one-directional: a user token
can call almost everything an app token can, but an app token is refused by every
user-scoped endpoint.

### Both methods are `type: "custom"`, and that is deliberate

Twitch's authorization-code flow is a textbook OAuth 2.0 flow, and the platform's `oauth2`
auth type drives it correctly — right up to the point the request goes out. Then it breaks,
for a structural reason:

- `sign` is the only hook allowed to stamp a header, and it receives **exactly two things**:
  the request and the credential. It gets no `ctx.connection` (see
  `core/packages/runtime/src/runtime.ts`, `signingFetch` — the `runHook` call for `sign`
  passes no `connection`).
- The credential blob a host stores after a host-driven authorization-code exchange is the
  normalised `{ accessToken, tokenType, refreshToken, expiresAt, scope }` (see
  `server/packages/api/oauth-flow.ts`, `OAuthCredential`). **It does not carry the client
  id**, because for every other vendor in this pack the client id is not needed on the wire.

So an `oauth2`-typed Twitch method would sign every request with a bearer token and **no**
`Client-Id`, and Twitch would 401 all of them. Rather than ship an auth method that cannot
sign a single request, both methods here are `custom` and collect the client id as part of
the credential.

> **What would change this.** Teaching the host to hand `sign` the OAuth installation's
> `clientId` alongside the token — either in the stored credential or via `ctx.connection` on
> the `sign` worker — would let the user method become a real `oauth2` one with
> `authorizationUrl: https://id.twitch.tv/oauth2/authorize`,
> `tokenUrl: https://id.twitch.tv/oauth2/token` and `pkce: false` (Twitch's authorization-code
> flow requires the client secret and documents no `code_challenge`). That is a platform
> change, not an app change, so it is recorded here rather than attempted.

### `app-access-token` — client credentials

Fields: **Client ID** (plain string — Twitch broadcasts it in a header on every request, so
it is not a secret), **Client Secret**, **App Access Token**.

Mint the first token yourself; the connection renews it from then on:

```bash
curl -X POST https://id.twitch.tv/oauth2/token \
  -d 'client_id=…&client_secret=…&grant_type=client_credentials'
```

The `refresh` hook re-mints with the same grant — client-credentials tokens have no refresh
token, so renewal *is* a fresh grant.

### `user-access-token` — a consented token

Fields: **Client ID**, **Client Secret**, **User Access Token**, **Refresh Token**. The
Twitch CLI makes one in a line: `twitch token -u -s "<scopes>"`. The `refresh` hook runs the
`grant_type=refresh_token` exchange and **stores the new refresh token Twitch returns** —
Twitch rotates it on every exchange, so keeping the original is how a refresh loop works
exactly once and never again.

Scopes are the user's, not this app's: nothing here requests them. `test` reports which ones
the token carries, so a connection missing `moderator:read:followers` says so at connect time
instead of failing inside a run.

### The credential probe: `GET https://id.twitch.tv/oauth2/validate`

Twitch ships a purpose-built token-introspection endpoint and *requires* third-party apps to
call it hourly ("Twitch periodically conducts audits to discover applications that are not
validating access tokens hourly as required"). It is the best probe available on four counts:

1. **It needs the credential.** Measured live: no header →
   `{"status":401,"message":"missing authorization token"}`; a fake token →
   `{"status":401,"message":"invalid access token"}`.
2. **It needs no scope.** Every alternative is a Helix read, which is exactly what a narrowly
   scoped user token may legitimately be refused — reporting a working connection as broken.
3. **It returns nothing secret.** The body is `{client_id, login, scopes, user_id,
   expires_in}`. It does not echo the token, and it never sees the client secret at all.
   (Mailjet's `/apikey` and Follow Up Boss's `/me` return the caller's own credential; both
   are banned pack-wide, and neither trap applies here.) A test asserts that no `test` message
   in any of six outcomes contains the token, the secret or the refresh token.
4. **It answers what the 401 cannot.** It reports which client the token belongs to, so the
   client-id mismatch above is caught at *connect* time rather than surfacing later as an
   unexplained 401 on every action.

Its documented header is `Authorization: OAuth <token>` — **not** `Bearer`, which is what
every other request in this app uses. Twitch accepts `Bearer` there too, but the documented
spelling is used so the prefix does not quietly drift.

Both `test` hooks additionally assert the token is the **kind** the method claims, using
Twitch's own discriminator: *"If the access token is an App Access Token, this field
[`user_id`] will be null."* An app token pasted into the user method validates cleanly and
then fails on every action that method exists for; catching it at connect time is one clear
message instead of a support ticket.

---

## Actions

Twenty of the 28 need **no scope** and work with either token kind. Eight need a **user
access token** with the named scope.

### Users and channels

| Action | Endpoint | Needs |
|---|---|---|
| `get-users` | `GET /helix/users` | either |
| `get-channel-information` | `GET /helix/channels` | either |
| `modify-channel-information` | `PATCH /helix/channels` | user · `channel:manage:broadcast` |
| `get-channel-followers` | `GET /helix/channels/followers` | user · `moderator:read:followers` |
| `get-followed-channels` | `GET /helix/channels/followed` | user · `user:read:follows` |

### Streams and schedule

| Action | Endpoint | Needs |
|---|---|---|
| `get-streams` | `GET /helix/streams` | either |
| `get-followed-streams` | `GET /helix/streams/followed` | user · `user:read:follows` |
| `create-stream-marker` | `POST /helix/streams/markers` | user · `channel:manage:broadcast` |
| `get-channel-stream-schedule` | `GET /helix/schedule` | either |

### Videos and clips

| Action | Endpoint | Needs |
|---|---|---|
| `get-videos` | `GET /helix/videos` | either |
| `get-clips` | `GET /helix/clips` | either |
| `create-clip` | `POST /helix/clips` | user · `clips:edit` |

### Categories and search

| Action | Endpoint | Needs |
|---|---|---|
| `get-games` | `GET /helix/games` | either |
| `get-top-games` | `GET /helix/games/top` | either |
| `search-categories` | `GET /helix/search/categories` | either |
| `search-channels` | `GET /helix/search/channels` | either |

### Chat

| Action | Endpoint | Needs |
|---|---|---|
| `get-chat-settings` | `GET /helix/chat/settings` | either |
| `send-chat-announcement` | `POST /helix/chat/announcements` | user · `moderator:manage:announcements` |
| `get-global-emotes` | `GET /helix/chat/emotes/global` | either |
| `get-channel-emotes` | `GET /helix/chat/emotes` | either |
| `get-global-chat-badges` | `GET /helix/chat/badges/global` | either |
| `get-channel-chat-badges` | `GET /helix/chat/badges` | either |
| `get-user-chat-color` | `GET /helix/chat/color` | either |
| `get-cheermotes` | `GET /helix/bits/cheermotes` | either |

### Teams, moderation and metadata

| Action | Endpoint | Needs |
|---|---|---|
| `get-teams` | `GET /helix/teams` | either |
| `get-channel-teams` | `GET /helix/teams/channel` | either |
| `get-moderators` | `GET /helix/moderation/moderators` | user · `moderation:read` |
| `get-content-classification-labels` | `GET /helix/content_classification_labels` | either |

> The table above is checked, not trusted. `tests/index.test.ts` derives each action's
> `(path, verb)` pair from its own source and asserts all 28 are distinct — and that the only
> paths carrying two operations are `/channels` (GET + PATCH) and `/clips` (GET + POST), which
> is Twitch's own multiplexing.

---

## What is deliberately left out, and why

The reference documents **149 endpoints** (counted by parsing the reference page for
title → `Authorization` → `URL` triples). Of those, **29** are marked *"Requires an app access
token or user access token"* with no scope; this app ships **20** of them, plus **8**
user-scoped ones.

**Nine no-scope endpoints are not shipped**, each for a stated reason:

| Endpoint | Why not |
|---|---|
| `GET /helix/tags/streams` (Get All Stream Tags) | **Deprecated.** The reference: "As of February 28, 2023, this endpoint returns an empty array. On July 13, 2023, it will return a 410 response." A test forbids any action from calling it. |
| `GET /helix/streams/tags` (Get Stream Tags) | Same deprecation, same test. Twitch's own replacement is the `tags` field on Get Channel Information, which `get-channel-information` returns. |
| `GET /helix/entitlements/drops`, `PATCH /helix/entitlements/drops` | Drops require the client's owner to be a member of the organization that owns the game. Nothing a connection form can establish, and untestable without one. |
| `GET /helix/extensions/live`, `GET /helix/extensions/released`, `GET /helix/users/extensions` | The Extensions product is a separate surface with its own JWT signed by the extension secret — a different auth model from either method here. |
| `GET /helix/chat/emotes/set` (Get Emote Sets) | Reachable, but only useful once you already hold an `emote_set_id` from Get Channel Emotes. Left out to keep the shipped surface to things a workflow starts from; adding it is a copy of `get-channel-emotes`. |
| `GET /helix/shared_chat/session` | Shared Chat is a live-session feature whose response shape could not be confirmed against a real session, and the rule here is to leave out anything unverified. |

**The remaining 120 endpoints need a user access token, usually with a scope**, and most of
them are one of four families this app does not attempt:

- **EventSub** (`/helix/eventsub/*`) — subscriptions are only useful with a webhook callback
  or a WebSocket the app can hold open. That is a Trigger, not an Action; the app declares no
  triggers, and `core/rfcs/trigger.md` is the thing to read before adding them.
- **Extensions and Bits products** — the separate JWT auth model described above.
- **Analytics and insights** (`/helix/analytics/*`, `/helix/bits/leaderboard`,
  `/helix/subscriptions`) — each needs a scope tied to a broadcaster's monetisation, and none
  could be exercised.
- **Live interactive features** — polls, predictions, goals, raids, charity, channel points,
  moderation actions (ban, timeout, AutoMod), and chat message sending. These are legitimate
  and mostly well documented, but each carries a failure mode that only shows up against a
  live channel (Send Chat Message, for instance, has an app-token path that requires the app
  to already hold `user:bot` and `channel:bot` through prior authorizations — a chatbot
  deployment, not a connection). A representative write from each safe family is shipped
  instead: a channel edit, a clip, a marker, an announcement.

Nothing was inferred from a sibling app or from a marketing page. Every one of the 28 shipped
`(path, verb)` pairs was matched back against the parsed reference index, and all 28 are
present in it.

---

## Vendor behaviours that will cost you a day

**Multi-valued query parameters repeat the key, and comma-joining fails silently.**
`?id=1234&id=5678` — never `?id=1234,5678`. The comma form does not error: Twitch looks up one
nonexistent user named `"1234,5678"` and returns `{"data": []}`, which reads exactly like "no
results". `lib/client.ts` appends one entry per value and never joins; `lib/client.ts#toList`
splits a pasted string on commas or whitespace so a user typing a list gets the right wire
form. Tested on Get Users, Get Streams, Get Channel Information, Get Clips, Get Videos, Get
Moderators, Get User Chat Color and Get Channel Stream Schedule.

**`status.twitch.tv` 302-redirects to `status.twitch.com`.** Measured: `GET
https://status.twitch.tv/api/v2/status.json` → `302`, 110 bytes of HTML, pointing at the
`.com` host, whose own `page.url` reads `https://status.twitch.com`. Every `curl -L` hides
this. It matters here because a health check may only reach hosts it declares, and a redirect
is followed without a second allowlist check — so declaring `.tv` would mean silently reaching
a host the app never declared. `health/service.ts` calls `.com` directly and declares exactly
that; a test forbids the `.tv` spelling anywhere in the app's 37 source files.

**Get Channel Followers answers `200 OK` when you lack the scope.** The reference: "If a scope
is not provided or the user isn't the broadcaster or a moderator for the specified channel,
only the total follower count will be included in the response." So the wrong token yields
`{"total": 4127, "data": []}` — indistinguishable from a channel nobody follows, unless you
read `total`. The action's description and output say so, and a test pins the behaviour.

**Two other silent-empty traps in the same family:** Get Streams *only ever* returns live
streams, so an empty `data` for a valid login means offline, not unknown (use Get Channel
Information for a channel that may be offline); and Get Clips with `started_at` but no
`ended_at` returns a **one-week** window from that date, not everything since.

**Three response shapes differ from their siblings.** `GET /helix/schedule` returns `data` as
an **object** (segments live at `data.segments`) where every sibling returns an array, and its
`first` maxes at **25** rather than 100. `GET /helix/chat/settings` **omits** the
moderator-only fields entirely rather than returning `false` when the token cannot see them.
`POST /helix/clips` answers **`202 Accepted`** with a clip id *before the clip exists* —
Twitch's own instruction is to poll Get Clips and "if after 60 seconds Get Clips hasn't
returned the clip, assume it failed".

**Parameter placement is inconsistent across the writes.** Create Clip puts `title` and
`duration` in the **query** of a POST with no body at all; Send Chat Announcement puts the two
ids in the query and the message in the **body**; Create Stream Marker puts everything —
including `user_id` — in the **body**. Each is pinned by a test.

**Send Chat Announcement truncates rather than rejecting.** A message over 500 characters is
silently halved by Twitch and reported as success. The action refuses it locally instead.

---

## Health checks

Four declared, plus two `auth:*` checks derived for free from the two `test` hooks.

| Key | Kind | Credential | What it answers |
|---|---|---|---|
| `service` | `service` | `none` | Twitch's Statuspage at **`status.twitch.com`** — six components: Login, Web, Chat, Video (Watching), Video (Broadcasting), Purchases. The page-level `status.indicator` is the verdict; components are the detail. Widens egress to that one host, which is why it is unsigned. |
| `api-status` | `service` | `none` | **Declared absence**, `severity: "informational"`. Twitch publishes **no component for the Helix API** — verified in both `summary.json` and `components.json` (1,944 B, same six). A green consumer-status page is not a statement about `api.twitch.tv`, and pretending otherwise would invent a signal. |
| `api` | `dependency` | `none` | Unauthenticated `GET /helix/users`. **A JSON 401 in Twitch's documented shape is a PASS** — it proves the request reached Twitch's own application layer, not a CDN error page or a proxy. A 401 whose body is HTML reports `unknown`, not `ok`. Whether a credential works is the derived `auth:*` checks' job; conflating the two is how an outage gets misreported as an expired token. |
| `quota` | `quota` | `signed` | Points left in this connection's token bucket, from `Ratelimit-Limit` / `Ratelimit-Remaining` / `Ratelimit-Reset` on a cheap `GET /helix/content_classification_labels`. |

`api-status` is `informational` because an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up — at any other severity, saying "Twitch publishes
nothing about the API" would pin this app's verdict at `unknown` forever.

Two details in `quota` worth knowing. **`Ratelimit-Reset` is a Unix epoch second**, not a
duration — reading it as milliseconds puts the reset in 1970, reading it as a delay puts it
decades out; the conversion is exported and unit-tested against Twitch's own example value.
And **the headers only appear on responses Twitch actually bucketed**, so an unauthenticated
401 carries none — a response without them reports `unknown`, never `ok`, because "we learned
nothing" is not "full headroom".

`/helix/content_classification_labels` is the probe because it is the one endpoint in this
surface with no required parameters, no scope, both token kinds, and a small static body. The
obvious alternative, `/helix/users`, is a **400** with an app token and no `id`.

---

## Egress

```jsonc
"network": { "allow": ["api.twitch.tv", "id.twitch.tv"] }
```

`api.twitch.tv` for every action; `id.twitch.tv` for the auth hooks (`test`, `afterConnect`,
`refresh`). Because both methods are `custom` rather than `oauth2`, the token host is **not**
allowlisted implicitly, so it is declared — honestly, because the app really does call it.

`status.twitch.com` belongs to the `service` check's own `network.allow`, not the app's, per
`rfcs/healthcheck.md`. There is no loopback entry and no placeholder; a test asserts the
allowlist is exactly those two hosts.

## Layout

```
twitch/
├── index.ts                    # { actions, auth, healthChecks }
├── package.json                # w6w identity block
├── lib/client.ts               # Helix client: repeated-key queries, error formatting
├── lib/params.ts               # shared Param fragments and vendor enums
├── auth/shared.ts              # credential shape, the two headers, id.twitch.tv calls
├── auth/app-access-token.ts    # client credentials
├── auth/user-access-token.ts   # consented user token + refresh
├── actions/*.ts                # 28 actions, one file each
├── health/*.ts                 # service · api-status · api · quota
├── assets/icon.svg             # simple-icons Twitch mark, 292 B, verbatim
└── tests/                      # 137 unit tests, mocked HookContext
```

`assets/icon.svg` is the [simple-icons](https://simpleicons.org) Twitch mark, downloaded
verbatim from `cdn.jsdelivr.net/npm/simple-icons@latest/icons/twitch.svg` — 292 bytes, md5
`dea70bc60b3dcc91f3433cd9ec3de68c`. A test asserts the byte count and the `<title>Twitch</title>`
element so a redraw cannot pass silently. **Format with `deno task fmt`, never bare
`deno fmt`** — the bare form would rewrite `assets/icon.svg` and falsify that claim.

## Development

```bash
deno task validate   # manifest + sandbox rules (0 errors, 0 warnings)
deno task check      # typecheck
deno task lint
deno task fmt
deno task test       # 137 tests
```

There is no `deno` on the devcontainer host; run them in the `api` service:

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/twitch && deno task test'
```
