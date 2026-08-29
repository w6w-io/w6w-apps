# Bannerbear

Generate images and videos from templates: render, poll, batch, and manage templates, webhooks,
assets, and multi-step workflows, on the **Bannerbear V5 API**.

- **Categories** — marketing, video, developer-tools
- **Auth methods** — bearer-token
- **Actions** — 61
- **Health checks** — 2 (`quota`, ~~`service`~~) + the derived `auth:bearer-token`
- **Egress allowlist** — `api.bannerbear.com`, `sync.api.bannerbear.com`
- **Website** — https://www.bannerbear.com/
- **API docs** — https://developers.bannerbear.com/v5/
- **OpenAPI** — https://api.bannerbear.com/v5/openapi.json
- **Status page** — https://status.bannerbear.com/ (linked from Bannerbear's own site, but not
  usable — see [Health checks](#health-checks))

Bannerbear turns a design built in its dashboard editor — an **Image Template** or **Animation
Template** — into a rendering API: send it modifications (swap in text, images, colors) and get back
a finished JPG/PNG/PDF or MP4/MOV. This app covers the full v5 REST surface.

> **Everything below was verified against Bannerbear's own sources on 2026-08-29** — its
> machine-readable OpenAPI 3.0 document
> ([`api.bannerbear.com/v5/openapi.json`](https://api.bannerbear.com/v5/openapi.json), 183,305
> bytes, `info.title` "Bannerbear V5 API"), the prose reference it renders from
> ([`developers.bannerbear.com/v5/`](https://developers.bannerbear.com/v5/), 327,992 bytes), and
> live probes against `api.bannerbear.com`, `bannerbear.com`, and `status.bannerbear.com`. Nothing
> here came from a third-party integration directory or an older Bannerbear API version.

## The things most likely to trip up an integration

### 1. v5 has no `/movies` or `/collections` — those are a different API version

Bannerbear's older API versions used those names. **v5 does not.** The nearest equivalents actually
present in the v5 OpenAPI document are:

| Older-version concept | v5 endpoint     | Notes                                                            |
| ---------------------- | --------------- | ----------------------------------------------------------------- |
| "movie" / video render  | `POST /animations` | Renders from an **Animation Template**, always async, MP4/MOV output |
| "collection" (multi-image) | `POST /batches`   | Up to 100 image renders in one call, `type: "images"` only        |

Every action in this app is named after the v5 resource it actually calls (`animation-create`,
`batch-create`, …), not a name carried over from a different version.

### 2. Two hosts, and only one endpoint uses both

The OpenAPI document declares two servers:

- **`api.bannerbear.com`** — the async host. Every action in this app reaches it. A render
  (`POST /images`, `POST /animations`, `POST /batches`, any `/tools/*`, `POST /workflow_runs`) is
  accepted with a `202` and a `pending`/`queued` record; poll the matching `GET` endpoint, or
  register a Webhook, to learn when it finishes.
- **`sync.api.bannerbear.com`** — the sync host. It accepts **only** `POST /images`, and answers
  `200` with the finished image inline instead of a pending record — or `408` if the render runs
  long. `image-create` exposes this as a `useSyncHost` toggle; every other render stays async
  because sync has no equivalent for animations, batches, tools, or workflow runs.

### 3. A credential-shaped secret exists, but only at one moment

`POST /instant_urls` with `security: "signed"` returns a `signing_key` — the HMAC key used to
validate requests against that Instant URL. The vendor's own docs are explicit: **"The signing key
is only returned once — store it immediately."** No `GET` (list or single) ever returns it again.

`instant-url-create.ts` surfaces it in its output and says so in its description. Every other
action in this app is checked (`tests/index.test.ts`) to never reference `signing_key` at all — a
future `GET`/list path that started echoing it would be an actual regression, since the API itself
never repeats it.

This is a different shape from a *leaked* credential (Apify's `proxy.password` problem, or Mailjet's
`/apikey`): the key is Bannerbear's own intended one-time output of a create call the caller
requested, not a secret smuggled into an unrelated read. Nothing here needed stripping.

### 4. Two template types, two very different write surfaces

Both `image_templates` and `animation_templates` have `POST`/`PATCH`/`DELETE`. But diffing their
request schemas: **only `image_templates` accepts a `config` field** (the canvas layer array).
`animation_templates`' create and update bodies carry `name`/`description`/`tags`/`width`/`height`/
`frame_rate` and nothing else — there is no way to author an Animation Template's timeline/layers via
this API at all; that step is dashboard-only. `animation-template-create.ts` and
`-update.ts` say so.

### 5. The per-layer modification schema is enormous, and deliberately not a generated form

A single image or animation render (`modifications.objects[]`) can target any of twelve
discriminated layer shapes — text, rectangle, circle, image container, SVG shape, QR code, bar code,
rating, Lottie, group — and the **text** shape alone documents 60+ properties (position, every
typography field, background/gradient/blend modes, AI background removal and generation,
QR/barcode/rating-specific fields, Lottie playback). Modelling that as a generated form would mean
showing barcode fields on a template with no barcode layer. `image-create`, `animation-create`,
`image-template-create/update` all expose this as a single `modifications`/`config` **JSON** param
instead — same reasoning this pack already applies to Apify's Actor input.

### 6. Error shape is uniform, and the vendor's own status table is worth having memorized

Every failure across every endpoint is `{"message": "..."}` with a 4xx/5xx status —
`lib/client.ts`'s `formatBannerbearError` adds the vendor's own fix for each documented code: 401
(bad key), 402 (quota exhausted), 403 (`api_write_access` refuses this key), 404 (not found *in this
workspace* — a uid from elsewhere 404s the same way), 408 (sync render timed out — retry async), 413
(asset too large), 415 (unsupported upload content type), 422 (validation failure), 423 (template
`api_write_access: "nobody"` — owner must unlock via dashboard), 429 (rate limited), 502/503
(vendor-side).

**The rate limit has no header to poll.** Bannerbear states a flat **60 POST requests per 10-second
window** in prose, with no `X-RateLimit-*` response header of any kind on success or failure — unlike
several vendors in this pack, there is nothing here to read for early warning, so no `request-rate`
health check is declared.

## Assets: the one raw-binary endpoint

`POST /assets` is the sole endpoint whose **request** body is raw bytes rather than JSON — the
`Content-Type` header is the file's own MIME type, chosen from a fixed list (image/jpeg, image/png,
image/webp, image/gif, video/mp4, video/webm, video/quicktime, audio/mpeg, audio/wav, audio/mp4,
audio/webm, audio/ogg, application/pdf). `asset-upload` takes the file as base64 (or a `data:` URI —
a workflow cannot attach bytes it never had) and decodes it before sending.

It is the one `perform` action marked `idempotent: true` despite creating something: Bannerbear
de-duplicates by content hash, so uploading the same bytes twice returns the **existing** asset
(`200`) instead of a new one (`201`). `POST /assets/check` (`asset-check`) lets a workflow check up
to 100 SHA-256 hashes against already-uploaded assets before uploading anything at all.

## Tools: 16 standalone utilities, one shared response shape

`/tools/*` is a family of one-off image/video utilities that do not touch a Template at all —
background removal, AI image generation, text-to-speech, subtitle burn-in, trim/crop/resize/concat,
overlays, color filters, GIF previews, and more. All 16 are async and answer the identical `ToolJob`
shape (`uid`, `tool`, `status`, `progress`, `inputs`, `outputs`, `metadata`, timestamps,
`error_message`) — only `outputs`' concrete keys differ per tool, documented per action. Poll with
`tool-job-get`, or subscribe a `resource: "tool_job"` Webhook.

One subtlety worth flagging: `tool-subtitle-video`'s `alignment` field uses the **SSA/ASS numpad
convention** (`7`/`8`/`9` top row, `4`/`5`/`6` middle, `1`/`2`/`3` bottom, left/center/right — `2`
bottom-center is the vendor's own default) — reproduced verbatim rather than renamed, since that is
the literal value the API expects.

## Workflows: multi-step pipelines, run-only from this API

`workflows` chain several tool/image/animation steps together server-side, each step's output
addressable by later steps via `{{steps.<key>.<output>}}` template references. Like Animation
Templates, a Workflow's steps can only be **authored** in the Bannerbear dashboard — this app can
list them, read their declared inputs (`workflow-get`), and **run** them (`workflow-run-create`),
but not create or edit one. The vendor's own note is worth repeating: *"A run charges nothing
itself: each step is billed as the resource it creates, so a run costs exactly what running its
steps individually would."* To process many rows, start one run per row.

## Actions (61)

| Resource | Actions |
| --- | --- |
| Account | `account-get` |
| Image templates | `image-template-list`, `-get`, `-create`, `-update`, `-delete` |
| Images | `image-create`, `-get`, `-list` |
| Batches | `batch-create`, `-get`, `-list` |
| Animations | `animation-create`, `-get`, `-list` |
| Animation templates | `animation-template-list`, `-get`, `-create`, `-update`, `-delete` |
| Webhooks | `webhook-list`, `-get`, `-create`, `-update`, `-delete` |
| Assets | `asset-list`, `-get`, `-upload`, `-check` |
| Publications | `publication-list`, `-get`, `-install` |
| Instant URLs | `instant-url-list`, `-get`, `-create`, `-update`, `-delete` |
| Tools | `tool-remove-bg`, `-generate-ai-image`, `-generate-voiceover`, `-subtitle-video`, `-create-pdf`, `-trim-video`, `-concat-videos`, `-resize-video`, `-crop-video`, `-overlay-video`, `-overlay-image`, `-add-audio`, `-add-cover-art`, `-create-video-slideshow`, `-apply-color-filter`, `-soften-video`, `-create-gif-preview` |
| Tool jobs | `tool-job-list`, `-get` |
| Workflows | `workflow-list`, `-get`, `workflow-run-create`, `-get`, `-list` |

## Auth

**`bearer-token`** — `Authorization: Bearer <api key>`. Bannerbear publishes no OAuth surface for
third-party apps; the key is the whole story. Keys are creatable/scopeable/restrictable at
`app.bannerbear.com/v5/api_keys` — a key scoped to only the resources a workflow needs (e.g.
`images:write` only) is a documented, supported configuration and must be treated as healthy.

The credential probe is `GET /account`. It was chosen by reading the scope vocabulary rather than
convenience: Bannerbear's scopes are entirely `resource:read`/`resource:write` pairs for eleven
catalogued resources (`images`, `image_templates`, `animations`, `animation_templates`, `batches`,
`webhooks`, `instant_urls`, `publications`, `assets`, `tools`, `workflows`) — account metadata
belongs to none of them, so the narrowest usable scoped key still reaches it. A resource list would
be exactly the kind of call such a key may legitimately be refused, which would report a working
Connection as broken. `/account`'s response (`{uid, workspace, plan, quota, api_key: {name, scopes,
allowed_origins}}`) also carries no credential material — `api_key` here is the calling key's own
declared metadata, never the key value.

## Health checks

Two declared checks plus the derived `auth:bearer-token`.

### `quota` — a live probe, because render headroom *is* readable

`GET /account` returns `quota: {max, current, remaining}` directly, no separate limits endpoint to
call and no header to read instead — the vendor's own reference states "usage resets at the start
of every month." This check reads it as one `HealthQuota` reading (`ok` under 90% consumed,
`degraded` at 90%+, `down` at 100%). A `max` of 0 or absent — Pay As You Go plans meter against a
purchased credit balance rather than a fixed cap — is read as "no ceiling to report against," not
"zero renders left," since the opposite reading would report every such workspace as permanently
exhausted.

It shares its probe endpoint with the `bearer-token` auth check, deliberately: `/account` is
simultaneously the narrowest-scope liveness probe and the only source of render headroom.

### `service` — declared unavailable, and here is why

`status.bannerbear.com` is genuinely linked from Bannerbear's own site (confirmed via
`curl -sL https://bannerbear.com/` → 301 → `www.bannerbear.com` → `<a href="https://status.bannerbear.com/">`
in the page's own footer), so this is not a guessed or decoy host. But the page itself is a stale
client-rendered SPA:

| Path                   | Status | Content-Type | Bytes | Note                        |
| ----------------------- | ------ | ------------- | ----- | ---------------------------- |
| `/`                     | 200    | text/html     | 2,532 | `last-modified: Oct 2023`    |
| `/status.json`          | 200    | text/html     | 2,532 | identical bytes to `/`       |
| `/api/status.json`      | 200    | text/html     | 2,532 | identical bytes to `/`       |
| `/api/v2/summary.json`  | 200    | text/html     | 2,532 | identical bytes to `/`       |
| `/index.json`           | 200    | text/html     | 2,532 | identical bytes to `/`       |

Every candidate path answers the **identical** 2,532-byte HTML shell — the SPA's own catch-all —
which is the tell that none of them is a real route; the page's own script bundle names itself
`webpackJsonphyperping-status-page`, so this is a Hyperping-hosted page whose current deployment
does not expose Hyperping's usual `/status.json` JSON API (contrast `lemlist` elsewhere in this
pack, whose `status.lempire.com/status.json` answers genuine `application/json`). Same shape as this
pack's `checkly` finding — an SPA-only page with no reachable feed.

Declared `unavailable` with `severity: "informational"` per `HEALTHCHECKS.md`: a positive fact, not
a silent gap, and without the explicit severity a permanently `unknown` check would pin this App's
roll-up there forever.

No `request-rate` check is declared either — see finding 6 above; Bannerbear's flat 60-POST/10s
limit has no header to poll.

## Icon

`assets/icon.svg` embeds Bannerbear's own apple-touch-icon (`www.bannerbear.com/images/touchicon.png`,
1060×1060, confirmed linked from bannerbear.com's own `<link rel="apple-touch-icon">` tag),
downsized to 128×128 with ImageMagick for a reasonable asset size — the artwork is Bannerbear's own,
only re-encoded and resized, never redrawn.

## Not covered, and why

- **Animation Template / Workflow authoring** — the v5 API has no endpoint for either; both are
  dashboard-only (see findings 4 and the Workflows section above).
- **A `request-rate` health check** — no rate-limit header exists to read (finding 6).
- Every other documented v5 endpoint has a corresponding action in this app: the OpenAPI document
  declares 44 paths / 61 operations total (`python3 -c "import json; d=json.load(open('openapi.json'));
  print(len(d['paths']), sum(len(v) for v in d['paths'].values()))"` against the fetched
  `openapi.json`), and this app ships exactly 61 actions.
