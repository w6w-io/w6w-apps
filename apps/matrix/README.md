# Matrix

Send and read messages, manage rooms and membership, and manage your profile, against **any**
homeserver implementing the **Matrix Client-Server API** — `matrix.org`, an organisation's own
Synapse/Dendrite/Conduit install, or any other federated homeserver.

- **Categories** — communication
- **Auth methods** — `access-token`, `password`
- **Actions** — 14
- **Health checks** — 2 (`service`, `instance`) + the derived `auth:access-token` and `auth:password`
- **Egress allowlist** — `*` (see below — the homeserver is per-connection)
- **Website** — https://matrix.org/
- **Spec** — https://spec.matrix.org/latest/client-server-api/

> **Everything below was verified against the official spec on 2026-09-06** — the "latest" render of
> the Client-Server API at `https://spec.matrix.org/latest/client-server-api/`. Nothing here came
> from a third-party integration directory.

## The three things most likely to cost someone a day

### 1. Only ONE endpoint used here has no version prefix

Every action endpoint lives under `/_matrix/client/v3/...`. The single exception, used only by the
`instance` health check, is capability discovery: `GET /_matrix/client/versions` — **no** `v3`. That
is deliberate on the spec's part: it exists so a client can ask "which versions do you speak?" before
assuming any prefix is safe to use. Copying a `v3` path onto it, or a `versions` call to some other
endpoint expecting `v3`, both 404.

The spec has also, as of v1.15, grown a **second, OAuth2-based** authentication API that sits
alongside the original one. The two are "mutually incompatible" per the spec's own words, and the
OAuth2 API names no fixed `authorizationUrl`/`tokenUrl` — a homeserver publishes its own issuer via
discovery. This app implements only the original ("legacy") password grant
(`POST /_matrix/client/v3/login`), which every currently-deployed homeserver answers and which needs
no separate discovery step.

### 2. Never trust the status code alone for "is this credential dead?"

Every Matrix error is `{"errcode": "M_SOMETHING", "error": "human text"}` — the spec's own "Standard
error response", and its own guidance is to prefer `errcode` over the transport status. A `401` on
`GET /_matrix/client/v3/account/whoami` is only treated as "this token is dead" when the body's
`errcode` is `M_UNKNOWN_TOKEN` or `M_MISSING_TOKEN`; a `401` with some other code (e.g. a soft-logout
signal) means something more specific, and is reported as that instead of a blanket "unauthorized".
`whoami`'s own body is also the credential-liveness probe deliberately, rather than its name: it
returns only `user_id`, `device_id` and `is_guest` — never the token that was sent, unlike Follow Up
Boss's `/me` or Mailjet's `/apikey`, both of which echo the credential back.

### 3. Profile field endpoints changed shape in v1.16, but the old paths still work

The "latest" spec render documents a single generic
`PUT /_matrix/client/v3/profile/{userId}/{keyName}` (added v1.16) in place of the two fixed
pre-v1.16 endpoints, `.../displayname` and `.../avatar_url`. This app deliberately calls the **fixed,
literal paths** (`set-display-name.ts`, `set-avatar-url.ts`): with `keyName` fixed to `displayname`
or `avatar_url`, the generic route resolves to the exact same URL a pre-v1.16 homeserver already
routes directly — so one code path works whichever spec version the homeserver implements, with no
version detection needed.

## Auth

Two methods, both ending in the same bearer credential (`Authorization: Bearer <token>`, verified
with `GET /_matrix/client/v3/account/whoami`):

- **`access-token`** — paste a homeserver URL and a long-lived access token copied from an existing
  client (in Element: Settings → Help & About → Advanced → Access Token). No connect-time network
  call; the trade-off is that it borrows a device that already exists, so signing that client out (or
  an admin revoking the device) invalidates the token too.
- **`password`** — log in with a username/Matrix ID and password
  (`POST /_matrix/client/v3/login`, `type: "m.login.password"`). This mints its **own** device
  (`initial_device_display_name`, default `"w6w"`) rather than borrowing a session, refreshes itself
  via `POST /_matrix/client/v3/refresh` when the homeserver grants a refresh token
  (`refresh_token: true` is always requested), and logs the device out
  (`POST /_matrix/client/v3/logout`) on disconnect. If the homeserver never granted a refresh token —
  some don't, and the spec makes that optional — `refresh` fails with a clear "reconnect" error rather
  than guessing.

`afterConnect` on both publishes the homeserver origin and the account's own Matrix ID. Never the
token.

## Actions

| Action | Type | Endpoint |
| --- | --- | --- |
| `send-message` | perform | `PUT /_matrix/client/v3/rooms/{roomId}/send/m.room.message/{txnId}` |
| `get-messages` | read | `GET /_matrix/client/v3/rooms/{roomId}/messages` |
| `create-room` | perform | `POST /_matrix/client/v3/createRoom` |
| `join-room` | perform | `POST /_matrix/client/v3/join/{roomIdOrAlias}` |
| `leave-room` | perform | `POST /_matrix/client/v3/rooms/{roomId}/leave` |
| `list-joined-rooms` | read | `GET /_matrix/client/v3/joined_rooms` |
| `list-room-members` | read | `GET /_matrix/client/v3/rooms/{roomId}/joined_members` |
| `invite-user` | perform | `POST /_matrix/client/v3/rooms/{roomId}/invite` |
| `kick-user` | perform | `POST /_matrix/client/v3/rooms/{roomId}/kick` |
| `ban-user` | perform | `POST /_matrix/client/v3/rooms/{roomId}/ban` |
| `unban-user` | perform | `POST /_matrix/client/v3/rooms/{roomId}/unban` |
| `get-profile` | read | `GET /_matrix/client/v3/profile/{userId}` |
| `set-display-name` | perform | `PUT /_matrix/client/v3/profile/{userId}/displayname` |
| `set-avatar-url` | perform | `PUT /_matrix/client/v3/profile/{userId}/avatar_url` |

### Notes on individual actions

**`send-message`'s `{txnId}` path segment is a real idempotency key, not decoration.** The spec:
"Clients should generate an ID unique across requests with the same access token; it will be used by
the server to ensure idempotency of requests." This action uses `ctx.invocation.invocationId` as that
id, so a retried invocation reuses the same `txnId` and the **homeserver itself** de-duplicates the
send — which is what makes `idempotent: true` an honest claim for an action that posts a message,
rather than an optimistic one.

**`join-room` takes a room ID or an alias**, via `POST /join/{roomIdOrAlias}` rather than the
ID-only `POST /rooms/{roomId}/join` — one action covers both `!id:server` and a human-typed
`#alias:server`.

**`set-display-name` and `set-avatar-url` take no `userId` param.** A homeserver only lets an access
token change that token's own profile, so the connected account's own Matrix ID (recorded by
`afterConnect`) is used automatically; a user-supplied `userId` here would only ever produce a 403.

**`list-room-members` uses `joined_members`, not `members`.** The spec notes it "should be faster to
respond" than the alternative, which instead returns every historical `m.room.member` **state event**
(joins, invites, leaves, bans, one per change) rather than a flat "who's in the room right now" view.

## Health checks

| Check | Kind | Scope | Severity | What it does |
| --- | --- | --- | --- | --- |
| `service` | service | app | informational | Declared absence — see below |
| `instance` | dependency | connection | (default `degraded`) | Probes this connection's own `/_matrix/client/versions`, unsigned |
| `auth:access-token` | — | connection | — | Derived from `access-token`'s `Auth.test` automatically |
| `auth:password` | — | connection | — | Derived from `password`'s `Auth.test` automatically |

### Why `service` is a declared absence, not a probe

Matrix is a **federated protocol**, not a hosted service — there is no single vendor platform behind
a Connection, because the Connection could point at `matrix.org` or at any of thousands of
independently-run homeservers. `instance` is the check that answers the real question, by asking the
Connection's own homeserver directly.

The Matrix.org Foundation *does* run `status.matrix.org`, and it is a real, machine-readable
Atlassian Statuspage instance — verified 2026-09-06 via its own `/api/v2/summary.json` (page name
`"Matrix"`, 17 components). Every one of those components — `Synapse`, `matrix.org`, `Outbound
federation`, `matrix.to`, `federationtester.matrix.org`, the IRC/Slack/XMPP bridges,
`conference.matrix.org`, and so on — describes the **Foundation's own free `matrix.org` homeserver**
and its ancillary bridges specifically. It is real, but it is not "Matrix's" status any more than one
company's uptime page is its whole industry's — declared `unavailable` at `informational` severity
rather than probed, so an incident on the Foundation's own server cannot pin every self-hosted
Connection's health at `degraded`.

### `instance`, not a fixed vendor host

`GET /_matrix/client/versions` (no `v3` — see above) answers unauthenticated with a `versions: [...]`
array. The probe never attaches a credential (`credential: "context"`): an expired or revoked access
token must not make a perfectly reachable homeserver look down.

## Deliberately not shipped

| Surface | Why |
| --- | --- |
| **End-to-end encryption** | See below — the largest, deliberate scope cut in this app. |
| **`/sync` and `/initialSync`** | The long-poll/incremental timeline API a real client holds open. This app is a stateless action model — one call in, one call out — with no persistent connection to hold a sync loop or a `since` cursor between invocations. `get-messages` (`/rooms/{roomId}/messages`) is the pagination-based equivalent that fits a single call. |
| **Media upload (`/​_matrix/media/v3/upload`)** | A separate content-repository API (multipart, different base path) outside this app's messaging/rooms/profile scope. `set-avatar-url` accepts an already-uploaded `mxc://` URI rather than half-implementing upload. |
| **Typing indicators, read receipts, read markers** | Ephemeral, per-session UI state (`/typing`, `/receipt`, `/read_markers`) rather than durable room content — the wrong shape for a discrete action call. |
| **Third-party (email/phone) invites** | `POST /rooms/{roomId}/invite`'s email/phone-number sibling needs a separate identity-server integration (`id_server`, `id_access_token`) this app does not implement; the Matrix-ID form (`invite-user`) is. |
| **Room state beyond membership/name/topic/preset** | Power levels, join rules, history visibility, canonical aliases, room avatars, and every other `m.room.*` state event are room *administration*; `create-room`'s `preset` covers the common defaults. |
| **Spaces, threads, VoIP/calls, redaction, reactions** | Each is its own event/state surface layered on top of the core messaging model covered here; left out to keep this first version reviewable. |
| **Device management, cross-signing, federation admin, server notices** | Account/server administration, not a workflow's day-to-day messaging. |

### End-to-end encryption is a deliberate scope cut

Matrix's E2EE (Olm/Megolm) keys every message to a **specific device's** cryptographic session state:
long-term Ed25519/Curve25519 identity keys, a pool of one-time keys consumed as other devices start
sessions, and a per-room Megolm session that ratchets forward with each message and must be shared
out-of-band with every new device that joins. None of that has anywhere to live in this app's
stateless, replayable action model — an Action's `execute` runs once, holds no session state between
calls, and cannot participate in device verification. Every action in this app sends and reads
messages in rooms that are **not** end-to-end encrypted; sending `m.room.message` content into an
encrypted room via `send-message` would either be rejected by clients expecting `m.room.encrypted`
events or, worse, be visible in the clear inside a room participants believe is encrypted. This is
named here explicitly rather than left as a silent gap.

## Icon

`assets/icon.svg` — the Matrix mark, from
<https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/matrix.svg>, downloaded 2026-09-06.

- **939 bytes** as downloaded, md5 `b671f6d98aeb6512c5c5900a19a9cd4e`, `<title>Matrix</title>`,
  `viewBox="0 0 24 24"`
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the path data inside the
  nested `<svg>` is the vendor's, verbatim
- **needs a dark variant**: the mark's default black fails `_tools/icon-legibility.ts` against the
  dark tile (ΔE 15.2, contrast 1.34) — `_tools/icon-legibility.ts fix` generated
  `assets/icon.dark.svg`, the same verbatim path data re-inked to `#ffffff` (a reversed mark, the
  sanctioned fix for a single-colour mark; no artwork was redrawn)

Run `deno task fmt`, never bare `deno fmt` — the latter reformats `assets/` and would rewrite the
vendor paths.

## Layout

```
matrix/
├── index.ts                  # AppDefinition: 14 actions, 2 auth, 2 health checks
├── lib/client.ts             # homeserver URL from the connection, MatrixClient, errcode taxonomy
├── auth/access-token.ts      # long-lived Bearer token pasted from a client
├── auth/password.ts          # m.login.password, own device, refresh, logout on disconnect
├── auth/whoami.ts            # shared account/whoami probe (both auth methods' test hook)
├── actions/                  # one file per action
├── health/                   # service (declared absence) + instance (/_matrix/client/versions)
└── tests/                    # unit tests against a mocked HookContext
```

## Development

```bash
deno task test      # unit tests
deno task check     # typecheck
deno task lint
deno task validate   # @w6w/validator manifest check
deno task fmt        # NEVER bare `deno fmt` — it rewrites assets/icon.svg
```
