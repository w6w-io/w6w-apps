# HeyGen

Generate AI avatar videos, translate videos into new languages, synthesize speech, and manage the
avatars, voices, assets and templates that feed those jobs, on the **HeyGen v3 External API**.

- **Categories** — ai, video, marketing
- **Auth methods** — api-key
- **Actions** — 18
- **Health checks** — 3 (`service`, `quota`, ~~`request-rate`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.heygen.com` (the `service` check adds `status.heygen.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://www.heygen.com/
- **API docs** — https://developers.heygen.com/docs
- **OpenAPI** — https://developers.heygen.com/openapi/external-api.json
- **Status page** — https://status.heygen.com/

> **Everything below was verified against HeyGen's own sources on 2026-08-24** — its machine-readable
> OpenAPI document
> ([`developers.heygen.com/openapi/external-api.json`](https://developers.heygen.com/openapi/external-api.json),
> 1,159,990 bytes, `info.title` "HeyGen External API", 98 documented paths), the docs' own
> `llms.txt` index, and live probes against `api.heygen.com` and `status.heygen.com`. Nothing here
> came from a third-party integration directory.

## The findings that would have cost someone a day

### 1. The docs site's own `/api-reference/openapi.json` is a decoy

`developers.heygen.com/api-reference/openapi.json` answers `200 application/json` and looks exactly
like what you'd fetch for the spec — except it's Mintlify's bundled **"OpenAPI Plant Store"** sample
(5,173 bytes, `info.title: "OpenAPI Plant Store"`), shipped by the docs platform itself, not HeyGen's
API. The real document is linked from the docs' own `llms.txt` under "OpenAPI Specs" as
`developers.heygen.com/openapi/external-api.json` — 1.16 MB, 98 paths, `servers: [{"url":
"https://api.heygen.com"}]`. Building against the plausible-looking decoy would have produced an app
with zero real endpoints.

### 2. A missing API key and a wrong one are byte-identical

Measured live: `GET /v3/users/me` with **no** `X-Api-Key` header and the same request with a
syntactically-plausible-but-fake key both answer

```json
{"error":{"code":"unauthorized","message":"Unauthorized","doc_url":"https://developers.heygen.com/docs/error-codes#unauthorized"}}
```

at `401`, with no header or field that distinguishes them — the same failure mode this pack has
already hit with TidyCal. `auth/api-key.ts`'s `test` hook reports both as "HeyGen rejected the API
key" rather than pretending it can tell "the credential never reached the request" apart from "the
credential is wrong".

### 3. List responses use a *different* envelope than every other response

Every single-resource endpoint answers `{"data": {...}}`. Every list endpoint answers
`{"data": [...], "has_more": bool, "next_token": string|null}` — the pagination fields sit **beside**
`data`, not inside it, and there is no wrapper object carrying all three the way some APIs nest a
`meta` block. Treating a list response like a single-resource one (unwrap `data`, look inside it for
a cursor) silently drops `has_more`/`next_token` and breaks pagination on the very first page.
`lib/client.ts` exposes `.data()` and `.list()` as two distinct methods so this can't be done by
accident.

### 4. `GET /v3/assets` (list) requires a `username` query param the API key never supplies

Every other list/get endpoint in this API works off the API key alone. `GET /v3/assets` — and only
that one endpoint — additionally requires a `username` query parameter with no documented way to
derive it from the credential or from `GET /v3/users/me` (whose own `username` field is *account*
identity, not necessarily the *asset owner* identity the endpoint expects in a team workspace). This
app therefore does **not** expose an asset-list action — `asset-get` (by id, returned from
`asset-upload`) and `asset-upload` are the two hooks the credential can actually drive without a
value nobody hands you. If a future version of the API drops that requirement, revisit this.

### 5. `POST /v3/video-translations` answers a *plural*, per-language id array

`{"video_translation_ids": [...]}` — one job id **per target language**, even when only one language
was requested. There is no singular `video_translation_id` fallback field. A caller that requests
three languages and reads `data.video_translation_id` gets `undefined` and two jobs it never learns
the id of. `video-translation-create`'s output and this app's tests both pin the plural shape.

## What this app does not cover, and why

- **Video Agent** (`POST /v3/video-agents`, prompt-to-video) and **Cinematic Avatar**
  (`type: "cinematic_avatar"` on `POST /v3/videos`) are real, documented paths this app leaves out —
  the classic script-driven avatar video (`type: "avatar"`) is the one HeyGen's own docs call the
  non-flagship, deterministic path, and is what `video-create` implements. Same for the `image` and
  `studio` variants of `POST /v3/videos`, and the advanced `engine`/`background`/`caption`/
  `watermark`/`motion_prompt` fields on the `avatar` variant.
- **Workflows** (`/v3/workflows`, `/v3/workflow-runs`) and **HyperFrames** (HTML→video rendering) are
  separate, larger sub-APIs left out entirely.
- **Webhooks** (register/list/rotate) and **Brand Kits/Glossaries** are left out — none of this app's
  actions need them to be useful, and adding them without a way to verify delivery live would be
  guessing at the wire shape.
- **Direct-to-S3 large uploads** (`POST /v3/assets/direct-uploads`, for files over the 32 MB inline
  cap) are left out; `asset-upload` covers the common inline case.
- **Avatar training** (`POST /v3/avatars`, creating a new avatar from footage/an image/a prompt) is
  left out — this app *uses* existing avatars (`avatar-group-list`, `avatar-look-list`) rather than
  creating them, since training is a multi-step, consent-gated flow this app cannot drive end to end.

If a workflow needs one of these, say so and it can be added against the same verified OpenAPI
document — nothing above was dropped for lack of a spec, only for scope.

## Auth

**API key** (`type: "apiKey"`), sent as `X-Api-Key: <key>` — confirmed against
`components.securitySchemes.ApiKeyAuth` in the OpenAPI document and against the vendor's own API Key
guide, which states the header name explicitly. The document also lists a `BearerAuth` (OAuth2)
scheme, but that authenticates the CLI/MCP surface as the user's own web account against
*subscription* credits, sized for a few trial generations; the vendor's own docs steer production,
batch and workflow traffic to an API key instead, which is also the only credential shape a
host-mediated Connection can hold.

The probe is `GET /v3/users/me` — the exact endpoint HeyGen's own API Key guide tells integrators to
call to verify a key ("You can verify your key is working by fetching your account info"). Its
schema (`UserInfoResponse`) carries only `username`, `email`, `first_name`, `last_name` and a
`billing_type`-gated billing block — no credential material — so unlike Apify's `/users/me` or Follow
Up Boss's `/me`, this whoami is safe to use directly as both the liveness probe and the
`afterConnect` label source.

## Actions

| Key | Type | What it does |
|---|---|---|
| `user-get` | read | Profile and billing details (also the auth probe's own endpoint) |
| `video-create` | perform | Generate an avatar video from a script or supplied audio (`POST /v3/videos`, `type: "avatar"`) |
| `video-get` | read | Poll a video's status; download URLs once completed |
| `video-list` | search | List videos, cursor-paginated |
| `video-delete` | perform | Permanently delete a video |
| `video-translation-create` | perform | Translate a video into one or more languages with voice cloning and lip-sync |
| `video-translation-get` | read | Poll a translation job's status |
| `video-translation-list` | search | List translation jobs, cursor-paginated |
| `video-translation-languages-list` | read | The exact target-language names `video-translation-create` expects |
| `avatar-group-list` | search | List avatar groups (characters) |
| `avatar-look-list` | search | List avatar looks (outfits/styles) — a look's `id` is the `avatarId` `video-create` expects |
| `voice-list` | search | List voices, filterable by engine/language/gender |
| `voice-speech-generate` | perform | Text-to-speech via the Starfish engine — synchronous, returns a ready `audio_url` |
| `asset-upload` | perform | Upload a file (image/video/audio/PDF, max 32 MB) and get an `asset_id` |
| `asset-get` | read | Fetch one asset's metadata by id |
| `template-list` | search | List templates created in the HeyGen app |
| `template-get` | read | Fetch a template's variable schema before generating from it |
| `template-video-generate` | perform | Render a template with variable substitutions |

Every `perform` that submits a job or spends credits (`video-create`, `video-translation-create`,
`voice-speech-generate`, `asset-upload`, `template-video-generate`) is `idempotent: false` — retrying
any of them bills and starts a new job. `video-delete` is the one exception (`idempotent: true`):
retrying a delete is safe because the end state (gone) does not change, even though a second call
answers `404` rather than repeating the original `{id, deleted: true}`.

Async jobs (`video-create`, `video-translation-create`, `template-video-generate`) return an id in an
initial status immediately; poll `video-get` / `video-translation-get`, or pass `callbackUrl` for a
webhook, for the finished result. `voice-speech-generate` is the one exception — it is synchronous
and returns a ready `audio_url` directly.

## Health checks

- **`service`** (`kind: "service"`) — `status.heygen.com`, a real Atlassian Statuspage confirmed
  three ways: a nonsense path 404s (not a catch-all), `page.name` is `"HeyGen"`, and one of its six
  components is literally `https://api.heygen.com`. That component anchors the verdict: an outage
  confined to the other five (the marketing site, the app, and the separate **LiveAvatar**
  real-time-streaming product) is reported but capped at `degraded`, never `down`, because this app
  never calls any of them.
- **`quota`** (`kind: "quota"`) — reads `GET /v3/users/me`'s `billing_type`-gated block: a `wallet`
  account's prepaid balance, a `subscription` account's premium/add-on credit pools, or a
  `usage_based` account's spend against its configured cap (when one exists) or its remaining
  credits. None of the three publishes an early-warning threshold, so this reports `down` only once a
  figure is actually exhausted rather than inventing an arbitrary "90%" band.
- **`request-rate`** (declared absence, `severity: "informational"`) — HeyGen sends no
  `X-RateLimit-*` header on any response, success or 429; the only thing a 429 carries is
  `Retry-After` (a retry delay, not a headroom reading). There is nothing to read ahead of hitting the
  limit.
- **`auth:api-key`** — derived automatically from the Auth method's `test` hook.

## Icon

`assets/icon.png`, 192×192 PNG with alpha, downloaded verbatim from HeyGen's own developer-docs
favicon (`developers.heygen.com/mintlify-assets/.../favicon/android-chrome-192x192.png`, md5
`c4e9ff7156b87cab1eebcceb892e4606`) on 2026-08-24 — the cyan/green split-triangle mark used across
HeyGen's docs and app. A raster icon rather than an SVG: no vector source for this mark was found on
`heygen.com`, `app.heygen.com` or `developers.heygen.com` (only PNG/ICO favicons and a raster
wordmark PNG). Checked in both themes with `_tools/icon-legibility.ts`.

## Tests

109 assertions across 23 files: one per action, one for the auth method, one each for the `service`
and `quota` health checks (`quota.test.ts` also covers the `request-rate` declared absence), one for
`lib/client.ts`, and one for `index.ts`.
