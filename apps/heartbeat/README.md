# Heartbeat

Manage a **Heartbeat** (heartbeat.chat) community: members, groups, discussion/chat/voice channels,
threads and comments, direct messages, events, webhooks, courses/lessons/videos and a document wiki
— on Heartbeat's own public REST API.

- **Categories** — communication, social-media
- **Auth methods** — api-key
- **Actions** — 54
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.heartbeat.chat` (the `service` check adds `status.heartbeat.chat` to
  its own hook allowlist, never to the app's)
- **Website** — https://heartbeat.chat/
- **API docs** — https://heartbeat.readme.io/reference
- **Status page** — https://status.heartbeat.chat/

> **Everything below was verified against Heartbeat's own sources on 2026-09-05** — its OpenAPI 3.0
> document (embedded verbatim as `oasDefinition` inside the `__NEXT_DATA__` payload of every page
> under `heartbeat.readme.io/reference/*`; ReadMe does not publish it at a stable
> `/openapi.json`-shaped URL, so it was extracted from the rendered reference itself, `info.version`
> `1.0.0`), the "Authentication", "Request limits" and "Rich Text" prose pages, and live probes
> against `api.heartbeat.chat` and `status.heartbeat.chat` the same day. Nothing here came from a
> third-party integration directory.

## The three things most likely to cost someone a day

### 1. Response shapes are documented unevenly — and most are bare, not enveloped

Unlike most REST APIs this pack wraps, Heartbeat's list endpoints answer a **bare JSON array** and
a get-by-id answers the resource **directly** — there is no `{"data": …}` envelope anywhere. Two
endpoints break that pattern on purpose, in opposite directions:

| Endpoint | Shape |
| --- | --- |
| `GET /v0/chatChannel/{id}/messages` | `{data: [...], hasMore: boolean}` — a real "more pages?" signal |
| `GET /v0/documents` | **bare array, no `hasMore` at all** — despite taking the same cursor params |

`list-documents`' own description states this: the only "is there another page?" signal is "did this
page come back shorter than the Limit I asked for", which is silently wrong the one time the
remaining count exactly equals the limit.

Worse: Heartbeat's spec fully documents the **request** shape (path, verb, body) for all 54
operations, but leaves **19 of the 30 write endpoints** — create/update/delete on users, groups,
channels, voice channels, channel categories, invitations and events — with a bare `200` and no
response schema at all. Two (`createDirectMessage`, `createChatMessage`) are confirmed `204 No
Content`. Rather than guessing at an undocumented body, this app declares those actions' `output` as
empty and passes through whatever (if anything) actually comes back — see `lib/client.ts` for the
full accounting.

### 2. The rate-limit window is ~2 seconds, not 1

Heartbeat's "Request limits" page says only: "API keys are limited to at most 10 requests per
second." Measured live on 2026-09-05 against `api.heartbeat.chat/v0/users` — both signed and
unsigned — every response, **including the 401**, carries `x-ratelimit-limit: 20`,
`x-ratelimit-remaining`, and `x-ratelimit-reset` (a Unix timestamp measured **~2 seconds** ahead of
the request). A limit of 20 over a rolling ~2-second window averages to the documented 10/second —
but reading `x-ratelimit-limit` at face value as a per-second ceiling overstates the real burst
budget by 2x. `health/quota.ts` reads this.

### 3. Rich text is a restricted HTML subset, not Markdown

Every `text` field this API accepts (thread/comment/chat/direct-message bodies) is documented on
Heartbeat's own "Rich Text" page: only `<p>`, `<a>`, `<b>`, `<h1>`-`<h3>`, `<ul>`, `<li>`, `<br>`
survive — every other tag is **silently stripped**, and only `<a>`'s `href` attribute survives.
Sending `# Heading` or Markdown-style `**bold**` does not error; it just renders as literal text,
which reads like a workflow bug in the *content*, not in the request. `@`-mentions are inline text of
the literal form `@<uuid>` (a user or group id) — an invalid uuid there returns a real `400`
`ValidationError`, so a mention is not "best effort". Every text param in this app states the rule in
its `hint` (`RICH_TEXT_HINT` in `lib/params.ts`).

## Auth

One method: `api-key`, type `bearer` — `Authorization: Bearer <API_KEY>`. Heartbeat publishes no
OAuth surface for third-party apps and has no unauthenticated endpoints; the key is the whole
authentication story, and one key is scoped to one community (not one user).

### The probe is `GET /v0/roles`

Heartbeat documents no dedicated ping/whoami endpoint. The candidates and why `/roles` won:

| Candidate | Needs a credential? | Needs an unknown param? | Leaks anything? |
| --- | --- | --- | --- |
| **`GET /v0/roles`** | ✅ (401 unsigned, measured) | ❌ | ✅ only `{id, name}` role labels an admin chose |
| `GET /v0/users` | ✅ | ❌ | ❌ **every member's full profile** — email, bio, LinkedIn history, onboarding answers |
| `GET /v0/find/users` | ✅ | ✅ needs a specific email | — |
| `GET /v0/notifications` | ✅ | ✅ needs a specific email | — |

`/users` is this pack's familiar trap (Apify's `/users/me`, Follow Up Boss's `/me`, Mailjet's
`/apikey`): a health probe's response is stored and displayed, and copying a community's whole
member list into it on every check would be exactly the leak this pack refuses elsewhere.

### Both a missing and an invalid key answer the same body

Measured live: no `Authorization` header and a syntactically-plausible bogus token both come back

```
401 {"error":true,"message":"Invalid API Key"}
```

There is no second, more-specific machine code to branch on — Heartbeat's error shape is one flat
`{error, message}` envelope everywhere, with `message` as the only signal. `formatHeartbeatError` in
`lib/client.ts` surfaces it verbatim rather than inventing a taxonomy the vendor does not draw.

## Actions

54 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `get-user` | read | `GET /v0/users/{userID}` |
| `list-users` | read | `GET /v0/users` |
| `find-user` | search | `GET /v0/find/users` |
| `create-user` | perform | `PUT /v0/users` |
| `update-user` | perform | `POST /v0/users` |
| `delete-user` | perform | `DELETE /v0/users` |
| `reactivate-user` | perform | `POST /v0/users/reactivate` |
| `create-pending-user` | perform | `PUT /v0/pendingUser` |
| `list-invitations` | read | `GET /v0/invitations` |
| `create-invitation` | perform | `PUT /v0/invitations` |
| `update-invitation` | perform | `POST /v0/invitations/{invitationID}` |
| `get-notifications` | read | `GET /v0/notifications` |
| `list-roles` | read | `GET /v0/roles` |
| `list-groups` | read | `GET /v0/groups` |
| `get-group` | read | `GET /v0/groups/{groupID}` |
| `create-group` | perform | `PUT /v0/groups` |
| `update-group` | perform | `POST /v0/groups/{groupID}` |
| `delete-group` | perform | `DELETE /v0/groups/{groupID}` |
| `add-to-group` | perform | `PUT /v0/groups/{groupID}/memberships` |
| `remove-from-group` | perform | `DELETE /v0/groups/{groupID}/memberships` |
| `list-channel-categories` | read | `GET /v0/channelCategories` |
| `create-channel-category` | perform | `PUT /v0/channelCategories` |
| `update-channel-category` | perform | `POST /v0/channelCategories/{channelCategoryID}` |
| `delete-channel-category` | perform | `DELETE /v0/channelCategories/{channelCategoryID}` |
| `list-channels` | read | `GET /v0/channels` |
| `create-channel` | perform | `PUT /v0/channels` |
| `update-channel` | perform | `POST /v0/channels/{channelID}` |
| `delete-channel` | perform | `DELETE /v0/channels/{channelID}` |
| `create-voice-channel` | perform | `PUT /v0/voiceChannels` |
| `update-voice-channel` | perform | `POST /v0/voiceChannels/{voiceChannelID}` |
| `list-threads` | read | `GET /v0/channels/{channelID}/threads` |
| `get-thread` | read | `GET /v0/threads/{threadID}` |
| `create-thread` | perform | `PUT /v0/threads` |
| `create-comment` | perform | `PUT /v0/comments` |
| `create-direct-chat` | perform | `PUT /v0/directChats` |
| `create-direct-message` | perform | `PUT /v0/directMessages` |
| `list-direct-messages` | read | `GET /v0/directMessages/{chatID}` |
| `create-chat-message` | perform | `PUT /v0/chatChannel/{channelID}/message` |
| `list-chat-channel-messages` | search | `GET /v0/chatChannel/{channelID}/messages` |
| `list-events` | search | `GET /v0/events` |
| `create-event` | perform | `PUT /v0/events` |
| `get-event` | read | `GET /v0/events/{eventID}` |
| `list-event-instances` | read | `GET /v0/events/{eventID}/instances` |
| `get-event-attendance` | read | `GET /v0/events/{eventID}/attendance` |
| `list-webhooks` | read | `GET /v0/webhooks` |
| `create-webhook` | perform | `PUT /v0/webhooks` |
| `delete-webhook` | perform | `DELETE /v0/webhooks/{webhookID}` |
| `list-courses` | read | `GET /v0/courses` |
| `get-lesson` | read | `GET /v0/lessons/{lessonID}` |
| `create-lesson` | perform | `PUT /v0/lessons` |
| `update-lesson` | perform | `POST /v0/lessons/{lessonID}` |
| `list-videos` | read | `GET /v0/videos` |
| `list-documents` | search | `GET /v0/documents` |
| `get-document` | read | `GET /v0/documents/{documentID}` |

### Idempotency

Every DELETE-verb action, and `create-direct-chat` (Heartbeat documents it explicitly as
get-or-create: "if one already exists, then nothing will be created and the existing chat id & URL
will be returned"), are `idempotent: true`. Every plain field-overwrite update
(`update-user`/`update-group`/`update-channel`/`update-channel-category`/`update-voice-channel`/
`update-lesson`) reaches the same end state on retry, so those are `true` too, along with
`add-to-group`/`remove-from-group` (set operations) and `reactivate-user` (a state transition).

Everything that **creates, sends, or appends with a side effect** is `idempotent: false`: a retry
after a dropped response would mint a second user/group/channel/invitation/webhook/lesson, post a
duplicate thread/comment/event, or send a duplicate direct/chat message. `update-invitation` is
`false` for a subtler reason — when `shouldSendEmail` is true, Heartbeat **re-sends the invitation
email on every call**, so a retry is a visible duplicate email, not a harmless no-op.
`create-webhook` is `false` because, unlike Apify's webhook-create, Heartbeat documents **no
idempotency key** for it.

### Notes on individual actions

- **`update-channel` / `update-voice-channel`: `restrictedTo` is nullable.** Sending an explicit
  empty selection is indistinguishable from "leave unchanged" once serialized, so both actions only
  build `restrictedTo` from Invited users/groups when at least one is set, and expose a separate
  **Make public** switch that sends the documented `restrictedTo: null` — the only way to actually
  reopen a restricted channel.
- **`create-comment`: `parentCommentID` is required-but-nullable.** The vendor's schema lists it in
  `required`, even though `null` (a direct reply to the thread) is the documented default meaning.
  This action always sends the key, `null` when left empty, rather than omitting it.
- **`create-webhook` models one endpoint, not eleven actions.** `trigger` is a discriminated union
  (`name` picks one of 11 shapes, most carrying their own `filter`); this action exposes every filter
  field the union defines and assembles the right nested shape for whichever event is chosen.
- **`create-lesson`: `hero` and `communityEmbedCards` are required-but-complex.** See "Deliberately
  not covered" below — this action always sends `hero: null` and `communityEmbedCards: []` to satisfy
  the requirement without modeling either union.
- **`list-users` is fully unpaginated.** Heartbeat documents no `limit`/cursor on `GET /v0/users` at
  all — a large community returns its entire member list, profiles included, in one response.
- **`list-threads` is capped at 20, with no further paging documented.** "Returns an array of the 20
  most recent threads in a channel" is the whole contract; there is no cursor to ask for more.
- **`list-direct-messages` only reaches chats with an admin in them.** Heartbeat states this
  explicitly; a chat between two non-admins is not readable via this endpoint, by vendor design.

## Health checks

Two declared checks plus the derived `auth:api-key`.

### `service` — the status page is real, checked three ways

**(a) Bogus sibling path — is this a catch-all?** No: `/api/v2/summary.json` answers 200 with 1,313
bytes of structured JSON; a nonsense path under the same page answers 404.

**(b) Content type and body.** `application/json`, parsing as the Statuspage v2 schema — not the
~127,700-byte HTML shape of an unclaimed `*.statuspage.io` decoy this pack has hit before.

**(c) Does the page describe *this* product?** Yes —
`"page": {"id": "ccmqxzqxfb5n", "name": "Heartbeat", "url": "https://status.heartbeat.chat"}`.

**But there are only two components, and neither is named "API":** `Heartbeat Communities` and
`Mobile Apps`. Heartbeat is a small vendor with one backend serving both the web community product
and this REST API — there is no separately-tracked API component the way there is for Apify or
GitHub. This check reads `Heartbeat Communities` as the signal for the API too, and **drops `Mobile
Apps` entirely**: a native-app outage says nothing about REST API availability, and including it
would report this app's own surface as degraded over a problem it structurally cannot have.

Severity is left at the `degraded` default: Heartbeat is SaaS-only, so every Connection this app can
hold runs on exactly the infrastructure this page describes.

### `quota` — rate-limit headroom, read off the same call as the auth probe

`GET /v0/roles` — the credential probe — is reused here rather than duplicated, since it needs a
credential, takes no parameters, and returns nothing about a specific person, which makes it
simultaneously the right liveness probe and a free source of the rate-limit headers. See finding 2
above for what those headers actually mean (a ~2-second window, not a 1-second one). A 401 on this
call reports `unknown`, not `degraded` — that is `auth:api-key`'s finding, not this check's, and
Heartbeat stamps the same rate-limit headers on a rejected request as on an accepted one.

There is no separate credential-quota (seats, storage, message volume) endpoint documented anywhere
in the spec — rate-limit headroom is the only metered dimension Heartbeat exposes.

## Deliberately not covered

- **`profilePicture`** on `create-user` / `update-user` / `create-pending-user` — a base64 data-URI
  string. Nothing in this pack's `Param` model maps cleanly to "base64-encode this file inline as a
  data URI", and inventing that mapping risked shipping a subtly wrong content-type/encoding pairing
  Heartbeat would silently reject or mis-render. Left out rather than guessed.
- **`hero` (video block) and `communityEmbedCards`** on `create-lesson` / `update-lesson`. `hero` is
  a two-shape union (a native Heartbeat video by id, or an external Youtube/Vimeo/Loom embed by URL);
  `communityEmbedCards` is a six-shape union (channel, post, event, document, a user/group prompt, or
  a "matchups" card). Building either safely from a flat param form risked a malformed payload more
  than it was worth; `create-lesson` always sends `hero: null` and `communityEmbedCards: []` (both
  are in the vendor's `required` list despite being nullable/empty-able) so the call still succeeds,
  and `update-lesson` omits both entirely so an existing hero/embed set on a lesson is left untouched.
  Add either by hand in Heartbeat's own editor.
- **The `?token=` query-parameter auth form.** Heartbeat's OpenAPI document only names the
  `Authorization: Bearer` header as its security scheme; no alternate query-parameter form is
  documented anywhere (unlike, say, Apify's explicitly-documented-and-discouraged `?token=`), so
  there is nothing to deliberately avoid here beyond the header this app already uses.

Nothing was left out because a request shape could not be confirmed — every path, verb and body
field in the 54 actions above is read directly from Heartbeat's own OpenAPI document.

## Icon

`assets/icon.svg` is Heartbeat's own mark, downloaded **verbatim** from
`https://www.heartbeat.chat/favicon.svg` on 2026-09-05 — a rounded-square tile of layered pink/orange
circles (`#F91E87`, `#FFBA54`, `#FD8467`) with a white heart glyph on top. `_tools/icon-normalize.ts`
re-frames it onto the pack's shared `0 0 100 100` canvas; the artwork itself (path data, colours) is
untouched, which is what `tests/index.test.ts` pins. It clears both light- and dark-tile legibility
checks (`_tools/icon-legibility.ts`) without needing a `darkMode` variant — the mark's own saturated
colours are separable from both tile backgrounds.

## Layout

```
heartbeat/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # HeartbeatClient, error formatting, rate-limit header reader
│   └── params.ts                # shared Param fragments (ids, emails, rich-text hint, cursor pair)
├── auth/api-key.ts               # bearer key: sign, test
├── actions/                     # one file per action (54)
├── health/
│   ├── service.ts               # status.heartbeat.chat
│   └── quota.ts                 # rate-limit headroom, signed
├── assets/icon.svg               # vendor mark, verbatim (geometry-normalized only)
└── tests/                       # entry module, every action, auth, health, all green
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
