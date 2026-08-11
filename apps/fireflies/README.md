# Fireflies.ai

Read Fireflies.ai meeting transcripts, summaries, soundbites, contacts, channels and analytics,
upload audio, drive the notetaker in live meetings, and ask AskFred — over the Fireflies GraphQL
API.

- **Categories** — ai, productivity, video
- **Auth methods** — api-key (bearer)
- **Actions** — 25
- **Egress allowlist** — `api.fireflies.ai`
- **Website** — https://fireflies.ai
- **API docs** — https://docs.fireflies.ai/getting-started/introduction ·
  machine-readable index: https://docs.fireflies.ai/llms.txt

## One endpoint, typed actions

Fireflies has **no REST surface**. Every read and every write is a `POST` to
`https://api.fireflies.ai/graphql` with a `{ query, variables }` body
(docs: `fundamentals/authorization`). `lib/client.ts` is therefore a GraphQL client rather than a
REST wrapper, and **each action owns its own query or mutation document** with typed params.

There is deliberately **no "run any GraphQL query" passthrough action**. A passthrough would push
the schema onto the workflow author, make every input unvalidated, and give the editor nothing to
render — the whole point of an App is that the operation is described, not typed out.

## Three things this vendor does that will cost you a day

All three were measured against the live API and the live status page on **2026-08-11**, not
inferred from docs or from a sibling app.

### 1. A rejected credential answers **HTTP 500** — not 401, not 403

```console
$ curl -sD- -X POST -H 'content-type: application/json' \
    --data '{"query":"{ user { name } }"}' https://api.fireflies.ai/graphql
HTTP/2 500
content-type: application/json; charset=utf-8

{"errors":[{"friendly":true,"code":"auth_failed","message":"An error occurred while
 authenticating your request. ...","extensions":{"code":"auth_failed"}}]}
```

The body is a perfectly well-formed GraphQL envelope; only the status line is wrong. Two
consequences run through this app:

- **`lib/client.ts` reads `errors[]` before it reads `res.ok`.** Checking the status first turns
  "your API key is wrong" into "Fireflies is down", and worse, would discard a valid `data` payload
  on any vendor-side 5xx.
- **`health/api.ts` treats that exact 500 as a PASS.** The probe is unauthenticated, so
  `auth_failed` is the *expected* reply, and getting it proves DNS resolved, TLS terminated,
  Cloudflare passed the request through, GraphQL parsed it and the auth middleware ran. A
  status-code verdict would report Fireflies permanently down.

Note also that `extensions.status` carries the status the vendor *meant* (400/403/404/429) while
the wire status stays 500, so the code — not the status — is what a workflow should branch on.

### 2. The status page answers 200 and is dead underneath

`https://status.fireflies.ai/` renders a Freshstatus page with `HTTP 200`. Its own
server-rendered props say otherwise:

```json
"userReferer": "http://fireflies.freshstatus.io/",
"accountDetails": { "status": "Not Found",
  "response": { "status": 404, "data": { "detail": "Account with the subdomain does not exist" } },
  "statusCode": 404, "isError": true }
```

It is a dangling CNAME to a Freshstatus tenant that no longer exists — which is why
`/api/v2/status.json`, `/api/v1/status`, `/rss/` and `/history.atom` all 404 into the same HTML
shell, and why no `feed:` declaration is possible: there is no incident log, not even an empty one.
Freshstatus' public API (`public-api.freshstatus.io`, which this pack's **freshservice** app does
use) is keyed by an account id this subdomain has never resolved to.

So `service` is a **declared absence**, not a probe. See "Declared health checks" below.

### 3. Three Transcript field groups are paid-plan-gated, and the docs disagree with themselves on a scalar

`audio_url`, `video_url` and `analytics` each carry "You need to be subscribed to a Pro or higher
plan" in `schema/transcript`. Putting them in a default selection set — the obvious thing to do —
makes **every** transcript read fail for a Free-plan connection. They are opt-in booleans on
`transcript-get` instead; `sentences` is opt-in too, for size rather than entitlement.

Separately, `graphql-api/query/apps` documents `skip`/`limit` as `Int` in its argument table and
declares them `$skip: Float, $limit: Float` in its own usage example. A GraphQL variable's type
must match the argument's exactly — `Int` is *not* a subtype of `Float` for variable usage — so one
of those two spellings is a hard client-side validation error and the docs do not say which.
`intArg()` in `lib/client.ts` sidesteps it by emitting a validated **integer literal** inline
(`, limit: 25`), which is legal input for both scalars. It rejects non-integers rather than
interpolating them, which is what keeps it injection-safe. The same treatment is applied to every
top-level integer argument (`transcripts`, `bites`, `apps` pagination and `addToLiveMeeting`'s
`duration`); fractional values that are *meant* to be fractional — `createBite`'s `start_time` /
`end_time` — stay `Float!` variables.

## Actions

| Key | Type | What it calls |
|---|---|---|
| `transcript-get` | read | `transcript(id:)` |
| `transcript-search` | search | `transcripts(...)` |
| `transcript-delete` | perform | `deleteTranscript(id:)` |
| `meeting-title-update` | perform | `updateMeetingTitle(input:)` |
| `meeting-privacy-update` | perform | `updateMeetingPrivacy(input:)` |
| `meeting-channel-update` | perform | `updateMeetingChannel(input:)` |
| `meeting-share` | perform | `shareMeeting(input:)` |
| `meeting-share-revoke` | perform | `revokeSharedMeetingAccess(input:)` |
| `audio-upload` | perform | `uploadAudio(input:)` |
| `active-meeting-list` | read | `active_meetings(input:)` |
| `live-meeting-join` | perform | `addToLiveMeeting(...)` |
| `live-meeting-state-set` | perform | `updateMeetingState(input:)` |
| `live-action-item-create` | perform | `createLiveActionItem(input:)` |
| `bite-get` | read | `bite(id:)` |
| `bite-search` | search | `bites(...)` |
| `bite-create` | perform | `createBite(...)` |
| `user-get` | read | `user(id:)` — whoami when the id is omitted |
| `user-list` | read | `users` |
| `user-role-set` | perform | `setUserRole(user_id:, role:)` |
| `contact-list` | read | `contacts` |
| `channel-list` | read | `channels` |
| `app-output-list` | read | `apps(...)` |
| `analytics-get` | read | `analytics(start_time:, end_time:)` |
| `askfred-ask` | perform | `createAskFredThread(input:)` |
| `askfred-continue` | perform | `continueAskFredThread(input:)` |

Notes worth knowing before wiring a workflow:

- **`bites` needs a selector.** Fireflies rejects it with `args_required` unless at least one of
  `mine`, `my_team` or `transcript_id` is set, so `bite-search` defaults `mine` to true — and the
  client's `compact()` keeps an explicit `mine: false`, which would otherwise be silently dropped
  and turn a valid narrowing into a hard error.
- **`askfred-ask` sends `filters` only when no `transcript_id` is set**, because Fireflies ignores
  `filters` in that case; sending both would quietly mislead the author.
- **Live-meeting ids are not transcript ids.** `live-meeting-*` take the ids from
  `active-meeting-list`.
- **`analytics` uses `String` for its date bounds** while `transcripts` uses `DateTime` for
  `fromDate`/`toDate`. The two are not interchangeable and the variable declarations differ.
- **`active_meetings`' `states` is declared `[MeetingState!]`** — the form the vendor's own usage
  example uses, against the `[MeetingState]` its argument table names. A non-null-item list
  variable is accepted where a nullable-item list is expected; the reverse is a validation error,
  so this is the safe spelling either way round.

### Rate limits, which are severe

50 requests **per day** on Free, 500/day on Pro, 60/min on Business and Enterprise
(`fundamentals/limits`), plus per-mutation caps: `addToLiveMeeting` 3 per 20 min, `shareMeeting`
10/hour (50 emails each), `deleteTranscript` 10/min, `updateMeetingState` and
`createLiveActionItem` 10/hour. Exceeding any of them returns `too_many_requests` with
`extensions.metadata.retryAfter` as an epoch-millisecond timestamp. `askfred-*` and
`live-action-item-create` additionally spend AI credits (`require_ai_credits`).

## What is deliberately left out

Each of these is a real Fireflies surface that this app does **not** expose, and why:

- **Webhooks / Webhooks V2** — a Trigger, not an Action. `TriggerDefinition` is a separate surface
  (`rfcs/trigger.md`) and none of this app's actions are the right home for it.
- **The Realtime API** — a WebSocket stream. `ctx.fetch` cannot carry it, and the sandbox denies
  any other transport.
- **`uploadAudio`'s `download_auth`** — a bearer/basic credential for a *private media host*.
  A third-party credential does not belong in Action params, where it would be persisted with the
  workflow definition; use a pre-signed URL instead. Nothing else about `uploadAudio` is affected.
- **`createLiveSoundbite`, `deleteAskFredThread`, the `askFredThread(s)` queries,
  `live_action_items`, `ruleExecutionsByMeeting`, `userGroups`, `auditEvents` (beta), and the
  MCP-server surface** — documented, but their reference pages were not read for this build, so
  they are omitted rather than guessed at. Adding any of them is one action file plus one test.
- **Deprecated `transcripts` arguments** (`title`, `organizer_email`, `participant_email`, `date`)
  — the vendor marks them deprecated and names the replacements, which is what the params expose.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.fireflies.ai> answers 200 over a dead Freshstatus tenant (see
finding 2 above). Nothing machine-readable exists, so what the app can actually answer is the
narrower question: **is the API endpoint serving?** That is `health/api.ts` — an unauthenticated
POST where an `auth_failed` reply is a pass.

### Is this credential live?

The Auth `test` hook, projected automatically into the health surface as `auth:api-key`:

```
POST /graphql  ·  { user { user_id name email } }
```

`user` with no `id` returns the API key's **owner** (`graphql-api/query/user`), so the probe needs
no user id and no admin privilege — the narrowest usable credential can still run it. The probe was
chosen by what the response **body** contains: every selected field is account metadata, and
nothing on the `User` type echoes the caller's own API key back. `integrations` is deliberately not
selected — it lists connected integrations, which is more than a liveness check needs. (This is the
Mailjet `/apikey` and Follow Up Boss `/me` trap: a whoami whose body returns the caller's own
credential is not usable as a probe, however well-named it is.)

### Do we have quota left?

Not knowable. There are **no rate-limit headers** — a live response carries only `date`,
`content-type`, `content-length`, `vary`, `access-control-allow-origin`,
`strict-transport-security`, `cf-cache-status`, `server` and `cf-ray` — and no usage endpoint.
`user { minutes_consumed }` counts recorded *meeting* minutes, a billing quantity for the
notetaker, not API allowance; reporting it as headroom would be a confident lie. Headroom exists
only retroactively, as the `retryAfter` on a `too_many_requests` error.

And a probe would be self-defeating: the only way to observe the counter is to spend it. At a
five-minute interval that is 288 calls a day against a 50/day Free plan — the check would cause
the outage it claims to warn about. This is also why `health/api.ts` is unsigned.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `api` | dependency | app | none | degraded | 120s | `health/api.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

**Both absences are `informational`.** An `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up — at any other severity, saying "this vendor publishes
nothing" would pin the app's verdict at `unknown` permanently.

**`api` is `credential: "none"` and declares no `network.allow`.** It probes the app's own egress
host, so no widening is needed — and the spec forbids pairing extra egress with a signed posture
anyway. Its verdict comes from the response body, never the status code: an `auth_failed` envelope
or a `data` payload is `ok`; another GraphQL error is `degraded` (the layer is running, we just
cannot read the answer); a non-JSON body is `down`; JSON with neither `data` nor `errors` is
`unknown`, because guessing in either direction would be worse than admitting ignorance.

## Auth

One method, `api-key`, typed `bearer` — Fireflies takes a standard
`Authorization: Bearer <key>` header. Get the key at app.fireflies.ai → Integrations →
Fireflies API. It is **not scoped**: it acts as the user who created it, so admin-only mutations
(`updateMeetingTitle`, `setUserRole`, another user's `active_meetings`) work only if that user is a
team admin — otherwise you get `require_elevated_privilege`, `forbidden` or `not_in_team`.

`sign` is the only hook handed the raw credential and runs network-less. No action sets an
`Authorization` header.

## Icon

`assets/icon.svg` is the vendor's own mark, fetched verbatim from
`https://fireflies.ai/images/logo.svg` (`image/svg+xml`, 3,600 bytes, md5
`89ec6186ab1d9aad245f35e81fbffb1f`) — the four-block gradient "F", `viewBox="0 0 48.446 48.808"`.
`assets/icon.png` is the vendor's 180×180 app icon from `https://fireflies.ai/apple-touch-icon.png`
(12,441 bytes, md5 `3e995f8622ae1a4c6ce73bf7276b75b7`, byte-identical to the `/apple-icon.png` the
live site links in its `<head>`). Both unmodified.

Note that `https://fireflies.ai/favicon.svg` is a Next.js catch-all **404 HTML page served with a
200-looking body** — one more instance of finding 2, and not an icon.

## Development

```bash
deno task validate   # pack conformance audit (manifest, sandbox rules, test coverage)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task scope excludes assets/
deno task test       # 105 unit tests
```

Tests call every hook directly with a mocked `HookContext` (`tests/_helpers.ts`: a queued fake
`ctx.fetch`, a recording no-op `ctx.log`). An unqueued fetch throws, so a test that makes an
unexpected request fails rather than hanging. `AUTH_FAILED_500` in that file is the live-measured
bad-credential response, reused everywhere the "500 is not an outage" behaviour is asserted.
