# ElevenLabs

Generative audio: text-to-speech with per-character timings, speech-to-text, sound effects, the
voice catalogue and public library, generation history, Studio projects, and plan usage — over the
ElevenLabs API at `api.elevenlabs.io`.

**22 actions · 1 auth method · 3 declared health checks (2 live probes + 1 declared absence) · 169
unit tests.**

## How it was built

Every path, verb, query parameter, body field and enum in this app was verified on **2026-08-11**
against three sources, in this order of authority:

1. **ElevenLabs' own OpenAPI 3.1 document** — `https://api.elevenlabs.io/openapi.json`,
   1,952,556 bytes, md5 `78ec1a2a31e9ff37bda5104b64b9b2b1`, `info.version` `1.0`, **285 paths /
   364 operations**.
2. **The vendor's own documentation pages** (`/docs/api-reference/authentication.md`,
   `/docs/eleven-api/resources/errors.md`,
   `/docs/overview/administration/workspaces/api-keys.md`), reached from
   `https://elevenlabs.io/docs/llms.txt`.
3. **Live unauthenticated probes** of `api.elevenlabs.io` and `status.elevenlabs.io`, for the
   things a document cannot tell you — which endpoints are public, and what the API actually
   answers when a credential is wrong.

Nothing here came from a third-party integration directory.

## The four findings that shaped this app

### 1. An ordinary read returns the caller's own API key

`GET /v1/user` returns `UserResponseModel`, whose **`xi_api_key`** field is documented as "The API
key of the user" — and the vendor's own schema example carries a full key
(`"xi_api_key": "8so27l7327189x0h939ekx293380l920"`). It is returned to any caller holding that
key, inside what otherwise reads like an ordinary profile lookup.

An action result is persisted in the run record and routinely echoed into logs, previews and
downstream steps, so returning it would copy a working credential into durable storage on every
call. `user-get` deletes it (`stripSecrets` in `lib/client.ts`) and **keeps** the vendor's own
masked `xi_api_key_preview`, so "which key is this connection using?" is still answerable. And
`GET /v1/user` is emphatically **not** the health probe — Follow Up Boss's `/me` and Mailjet's
`/apikey` are the same trap, banned pack-wide.

### 2. A wrong API key answers HTTP **400**, not 401

The vendor's own error table documents `authentication_error` as HTTP `401`, and a request with
*no* credential does answer `401`. But a request carrying a **wrong** key answers **`400`**:

```
$ curl -H 'xi-api-key: sk_0000…00ff' https://api.elevenlabs.io/v1/user/subscription
400 {"detail":{"type":"authentication_error","code":"invalid_api_key",
     "message":"API key is invalid.","status":"invalid_api_key","param":"api_key"}}
```

Measured against `/v1/user/subscription`, `/v1/models` and `/v2/voices` — all three the same. Any
code that decides "is this credential bad?" from `res.status === 401` reports a mistyped key as a
generic bad request and sends the user hunting for the wrong bug. So `classify()` in
`lib/client.ts` reads `detail.type` / `detail.code`, never the status, and `auth/api-key.ts` uses
it.

The same function handles the other trap in this API's errors: `detail` has **two** shapes. It is
an object for anything the API rejected, and a bare **string** for a path the router does not know
(`GET /v1/definitely-not-real-zzz` → `404 {"detail":"Not Found"}`, 22 bytes).

### 3. `GET /v1/voices` is public

It answers `200` with **102,976 bytes** of the default voice catalogue to a request carrying no
credential at all. A health probe against it would pass for a Connection whose key never got
attached. `GET /v1/shared-voices` is partially public for the same reason ("You must be logged in
to fetch more than 3 voices").

So the voice list this app exposes is **`GET /v2/voices`**, which requires a credential (`401`
without one), pages and filters — and the credential probe is neither of them.

### 4. The audio endpoints answer bytes, not JSON

`POST /v1/text-to-speech/{voice_id}`, `POST /v1/sound-generation` and
`GET /v1/history/{id}/audio` each declare exactly one `200` response, content type `audio/mpeg`,
schema `{"type": "string", "format": "binary"}`. `res.json()` throws on the first byte.

`lib/client.ts#binary` reads them as bytes and base64-encodes them — the only lossless projection
into a workflow step's JSON result — and returns the **served** content type verbatim, because
`output_format` can select WAV, PCM, Opus, μ-law or A-law. There is a 20 MiB ceiling on inlining
(base64 inflates by 4/3 and the result is persisted), past which the action fails with an
actionable message rather than writing a payload nothing downstream can handle.

The `/with-timestamps` TTS variant is the exception and usually the better choice: it answers JSON
carrying the same audio already base64-encoded, **plus** per-character alignment, for the same
credit cost.

## Two more things that cost time

- **`GET /v1/usage/character-stats` wants MILLISECONDS.** `start_unix` and `end_unix` are
  documented as "UTC Unix timestamp … in milliseconds", while every other Unix timestamp in the
  covered surface — `date_unix` on a history item, `next_character_count_reset_unix` on the
  subscription, the history date filters — is in **seconds**. Passing seconds returns an empty
  series dated to 1970 rather than an error. Both form labels shout the unit.
- **Speech-to-text is `multipart/form-data`, and you do not have to upload a file.** JSON fails
  validation. But `source_url` takes the HTTPS URL of an audio or video file (hosted media,
  YouTube, TikTok), which is what a workflow step actually has — so this app exposes the URL form
  and never the upload, which also removes the "exactly one of file / URL" conflict. The document
  marks the older `cloud_storage_url` deprecated in favour of `source_url`; this app sends
  `source_url`.

## Auth

| | |
|---|---|
| Method | `api-key` (`type: "apiKey"`) |
| Wire form | `xi-api-key: <key>` header |
| Credential probe | `GET /v1/user/subscription` |

The vendor's authentication reference is explicit: "All API requests should include your API key in
an `xi-api-key` HTTP header", and every operation in the OpenAPI document declares that header
parameter. (There is no `components.securitySchemes` block at all.) A bearer header is *also*
accepted — the credential-less `401` body says "Neither authorization header nor xi-api-key
received" — but this app sends only the documented form, and never a query parameter, because a
workflow host logs request URLs and does not log request headers.

**Why `/v1/user/subscription` is the probe**, chosen by reading the response schema and measuring
the wire rather than by its name:

- **It requires a credential.** `401` unauthenticated, `400 invalid_api_key` with a fake key. Both
  observed live. That rules out `GET /v1/voices`, which is public (finding 3).
- **It returns no credential material** — tier, character counts, voice slots, invoices. Unlike
  `GET /v1/user`, which returns the key itself (finding 1).
- **It answers the quota question in the same call**, which is why `health/quota.ts` reads it too.

**The honest caveat:** every ElevenLabs endpoint is scope-gated (the documented `PermissionType`
vocabulary — `user_read`, `voices_read`, `text_to_speech`, …), so there is no scope-free ping to
prefer. This probe needs whatever scope covers the user endpoints, and a key scoped to
text-to-speech alone will be refused. That is why a `403` is reported as *"the key is live but is
either scoped away from the user endpoints or restricted to an IP allowlist this host is not on"*
rather than as an invalid key — conflating the two sends someone to rotate a perfectly good
credential.

`afterConnect` publishes the plan **tier** as the connection label, read from that same
subscription endpoint. `GET /v1/user` is never called by any auth hook.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | `service` | Is ElevenLabs up? Statuspage summary from `status.elevenlabs.io`. |
| `quota` | `quota` | Is there plan headroom? Characters, voice slots, voice add/edits. |
| `request-rate` | `quota` | **Declared absence** — no request-rate or concurrency headroom is published. |
| `auth:api-key` | derived | Is this credential live? (projected from the `test` hook.) |

### `service` — the status page is real, checked three ways

| Path | Status | Bytes | md5 (first 12) |
|---|---|---|---|
| `/api/v2/summary.json` | 200 | 2,830 | `751cea88bd14` |
| `/api/v2/status.json` | 200 | 209 | `0adab3a5374e` |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | — |

Three different answers, and the nonsense path is refused outright — so this is not a catch-all.
The body parses as the Statuspage v2 schema and self-identifies:
`"page": {"id": "01JJM5RKYAEEAMBKYSDC0AAQ6Y", "name": "ElevenLabs", "url": "https://status.elevenlabs.io/"}`,
with eleven components — Text to Speech, Speech to Text, Conversations, Telephony, RAG, Quality,
UI, Integrations, ElevenCreative, Other API endpoints, Other. Neither unclaimed-host signature
matches (an unclaimed `*.statuspage.io` is ~127,700 B of HTML; an unclaimed `*.instatus.com` is
~216,800 B).

The verdict follows `status.indicator`, ElevenLabs' own roll-up, not the worst component — a
degraded peripheral is not a platform outage. A status page that itself fails reports `unknown`,
never `down`. The status host lives in **this check's own `network.allow`**, not the app's, and the
check is `credential: "none"`: a status host must never see an API key.

### `quota` — plan headroom, with the overage rule

Reads `GET /v1/user/subscription` and reports three dimensions: `characters`
(`character_count` / `character_limit`, with `next_character_count_reset_unix` as `resetAt`),
`voice-slots`, and `voice-add-edits`.

Two readings that would be wrong, and are not:

- **Overage is not exhaustion.** An account at 100% of `character_limit` with
  `can_extend_character_limit` **and** a non-zero `max_credit_limit_extension` keeps generating and
  is billed for it → `degraded`, not `down`. Only an account at its limit that *cannot* extend has
  actually stopped. (`max_credit_limit_extension` is `"unlimited"` for no cap and `0` for
  usage-based billing switched off; the older `max_character_limit_extension` is documented as
  deprecated.)
- **A zero or missing ceiling is "not metered", not "no headroom."** `max_voice_add_edits` is
  nullable.

A `403` here (a scoped key that cannot read the subscription) reports `unknown`, not `degraded` — a
refusal to answer says nothing about headroom.

### `request-rate` — a declared absence, and why

ElevenLabs publishes **no** readable request-rate or concurrency headroom, verified two ways:

1. **Nothing on the wire.** Live responses carried `date`, `server`, `content-length`,
   `content-type`, `vary`, the CORS set, `strict-transport-security`, `x-trace-id`, `x-region`,
   `via` and `alt-svc` — and no `X-RateLimit-*` header of any kind, on neither a `200`
   (`GET /v1/voices`) nor a `401` (`GET /v1/user/subscription`).
2. **Nothing in the documentation.** The errors page says a `429` means either the rate limit or
   the concurrency limit, told apart by the error `code` (`rate_limit_exceeded` vs
   `concurrent_limit_exceeded`), and prescribes exponential backoff. No endpoint reports either
   ceiling or the count against it.

`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up, so at any other severity this would pin the app's verdict
at `unknown` forever.

`GET /v1/usage/character-stats` can be asked for a `concurrency` metric, but that is a historical
series of *observed* concurrency, not the plan's ceiling — reporting it as quota would be inventing
a limit the vendor never published.

## Actions

### Speech (4)

| Key | Type | Endpoint |
|---|---|---|
| `text-to-speech` | perform | `POST /v1/text-to-speech/{voice_id}` → base64 audio |
| `text-to-speech-with-timestamps` | perform | `POST /v1/text-to-speech/{voice_id}/with-timestamps` |
| `speech-to-text` | perform | `POST /v1/speech-to-text` (multipart, `source_url`) |
| `sound-generation` | perform | `POST /v1/sound-generation` → base64 audio |

### Voices (8)

| Key | Type | Endpoint |
|---|---|---|
| `voice-list` | read | `GET /v2/voices` |
| `voice-get` | read | `GET /v1/voices/{voice_id}` |
| `voice-settings-get` | read | `GET /v1/voices/{voice_id}/settings` |
| `voice-settings-default-get` | read | `GET /v1/voices/settings/default` |
| `voice-settings-edit` | perform | `POST /v1/voices/{voice_id}/settings/edit` |
| `voice-library-search` | search | `GET /v1/shared-voices` |
| `voice-add-from-library` | perform | `POST /v1/voices/add/{public_user_id}/{voice_id}` |
| `voice-delete` | perform | `DELETE /v1/voices/{voice_id}` |

### Models, History, Studio, Account (10)

| Key | Type | Endpoint |
|---|---|---|
| `model-list` | read | `GET /v1/models` (a **bare array** — wrapped as `{models: […]}`) |
| `history-list` | read | `GET /v1/history` |
| `history-get` | read | `GET /v1/history/{history_item_id}` |
| `history-audio-get` | read | `GET /v1/history/{id}/audio` → base64 audio, costs no characters |
| `history-delete` | perform | `DELETE /v1/history/{history_item_id}` |
| `studio-project-list` | read | `GET /v1/studio/projects` |
| `studio-project-get` | read | `GET /v1/studio/projects/{project_id}` |
| `user-get` | read | `GET /v1/user` — **`xi_api_key` removed** |
| `subscription-get` | read | `GET /v1/user/subscription` |
| `usage-character-stats-get` | read | `GET /v1/usage/character-stats` (**milliseconds**) |

### Idempotency

Marked honestly, because the runtime retries what is marked safe and **ElevenLabs accepts no
idempotency key of any kind**:

- **`idempotent: false`** — `text-to-speech`, `text-to-speech-with-timestamps`, `speech-to-text`,
  `sound-generation` (each bills characters/credits per call) and `voice-add-from-library` (spends
  a voice slot and an add/edit allowance). A retry after a dropped connection would bill twice.
  `seed` makes the *output* reproducible, not the *request* free.
- **`idempotent: true`** — `voice-settings-edit`, `voice-delete`, `history-delete`. Repeating any
  of these leaves the same state and costs nothing.

### Three paging schemes, which are not interchangeable

- **`/v2/voices`** — opaque `next_page_token` + `has_more`. Page on `has_more`, **not** by counting
  against `total_count`, which the vendor documents as "a live snapshot … may change between
  requests".
- **`/v1/shared-voices`** — zero-based `page` number + `has_more`.
- **`/v1/history`** — a cursor that is an item id: pass the previous response's
  `last_history_item_id` as `start_after_history_item_id`.

`history-list` prefills a page size of 50 against a vendor default of 100 and a ceiling of 1,000 —
a workflow step that silently returns a thousand records is a footgun, not a convenience. Raise it
explicitly when you mean to.

## What is deliberately NOT covered

The API has **364 operations across 285 paths**; this app implements 22. That is a scoping choice,
not an oversight. What was left out, and why:

**Whole product areas, each of which deserves its own app:**

- **Agents / Conversational AI (`/v1/convai/*` — 166 operations, 46% of the API).** Agents,
  conversations, knowledge bases, RAG indexes, MCP servers, phone numbers, telephony (Twilio,
  Exotel, SIP, WhatsApp), batch calling, testing and secrets. It is larger than the rest of the API
  combined and models a different domain (a live conversational agent, not a generation call).
- **Dubbing (`/v1/dubbing/*` — 37 operations).** Projects, per-language transcripts, segment and
  speaker editing, rendering. A long-running editing pipeline with its own state machine.
- **Music (`/v1/music/*` — 13) and Productions (`/v1/productions/*` — 11).**
- **Workspace administration (`/v1/workspace/*` 23, `/v1/workspaces/*` 2, `/v1/service-accounts/*`
  6 — 31 operations).** Members, groups,
  invites, SSO connections, audit logs, resource sharing, webhooks, and API-key management. An
  integration app should not be able to mint or disable API keys.

**Individual endpoints omitted on purpose:**

- **Everything that requires a binary file upload.** Voice cloning (`POST /v1/voices/add`,
  `/v1/voices/pvc/*`), speech-to-speech (`POST /v1/speech-to-speech/{voice_id}`), audio isolation
  (`POST /v1/audio-isolation`), forced alignment (`POST /v1/forced-alignment`) and
  `POST /v1/pronunciation-dictionaries/add-from-file` all take a required `file` part with no URL
  alternative. A workflow step passes a link, not a multi-gigabyte body, and this app has no way to
  obtain one honestly. Speech-to-text is included precisely *because* it offers `source_url`.
- **Every `/stream` variant** (`text-to-speech/{id}/stream`, `music/stream`,
  `speech-to-speech/{id}/stream`, …). An Action returns a value; it cannot hand a chunked stream to
  the next workflow step, and buffering the whole stream is what the non-streaming endpoint already
  does.
- **`POST /v1/speech-to-text` with `webhook: true`.** It answers `202` with no transcript,
  delivering the result to a webhook later. Returning an empty acknowledgement that silently means
  "look somewhere else" is worse than not offering it; webhook ingest is out of scope for this app.
- **`POST /v1/history/download`**, which returns a zip or a single audio file — the same
  binary-payload problem, and `history-audio-get` covers the useful single-item case.
- **Studio writes** (create/update projects, chapters, snapshots, convert, podcasts — 21 of the 23
  `/v1/studio/*` operations). Only the two reads are implemented; the write surface is a
  multi-step editing pipeline that belongs with a dubbing/studio app.
- **`GET /v1/voices` (v1)**, superseded here by `/v2/voices` for the reason in finding 3.
- **The deprecated `optimize_streaming_latency` and `use_pvc_as_ivc` TTS parameters**, and the
  deprecated `with_settings` on `voice-get` (documented as "ignored and will be removed").
- **`format` on the dataset-style reads** and the non-JSON export formats generally: an Action
  returns structured data to the next step, not a file.
- **Text-to-dialogue, text-to-voice (voice design), similar-voices, audio-native, speech-engine,
  single-use tokens and pronunciation dictionaries.** Each is coherent and implementable; none is
  part of the core surface this app was scoped to.

Nothing was omitted because it could not be verified — every endpoint listed above is real and in
the vendor's document. Conversely, **nothing was implemented that could not be verified**: where a
parameter's vocabulary exists only in a prose `description` rather than an OpenAPI `enum` (the
`/v2/voices` `voice_type`, `category`, `sort` filters), `lib/params.ts` says so at the list, because
the API will accept values that description does not name.

## Egress

```jsonc
"network": { "allow": ["api.elevenlabs.io"] }
```

One host, and only the one the app actually calls. `status.elevenlabs.io` is **not** here — it
belongs to the `service` health check's own per-hook `network.allow`, honoured only for an unsigned
posture. No loopback, no placeholders.

## Tests

169 unit tests, all against a mocked `HookContext` (a fake `ctx.fetch` with a per-call response
queue, a no-op `ctx.log`). No network, no server.

```bash
deno task test       # 169 tests
deno task validate   # manifest + sandbox audit — 0 errors, 0 warnings
deno task check      # typecheck
deno task lint
deno task fmt
```

Beyond per-action request/response coverage, `tests/index.test.ts` pins the invariants that are
easy to break by accident, and derives its own candidate sets from the sources so a *new* action is
covered the moment it is written rather than when someone remembers to extend a list:

- no action references a credential, an auth header, or `xi-api-key`;
- no action calls a bare `fetch` or touches `Deno.*`;
- no action contains a host literal (the host set is derived with the auditor's own regex, and the
  derivation is itself tested against a positive and a negative case, so the guard cannot pass
  vacuously);
- **exactly** the actions that touch a secret-bearing path call `stripSecrets` — both directions,
  with the touching set derived from each action's own request paths and asserted to be non-empty;
- the auth probe is pinned to `/v1/user/subscription`, and nothing in `auth/` or `health/` probes a
  publicly-readable path;
- every billing action is `idempotent: false` and every retry-safe one is `true`;
- the declared absence is `informational`, and every egress-widening check is unsigned;
- the icon is the vendor's mark byte-for-byte (158 bytes, md5 `582f077cf9276d910bb367f43e41a62b`).

## Icon

`assets/icon.svg` is the simple-icons ElevenLabs mark, downloaded **verbatim** from
`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/elevenlabs.svg` on 2026-08-11.

- **158 bytes**, md5 `582f077cf9276d910bb367f43e41a62b`
- `viewBox="0 0 24 24"`, `<title>ElevenLabs</title>`, one path: the two-bar "II" mark

It is not edited, re-drawn or re-formatted — which is why `deno task fmt` is scoped to the source
directories and never touches `assets/`, and why a byte-count-and-path assertion guards it.
