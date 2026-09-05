# OpusClip

Turn a long-form video into short, viral, vertical clips with AI curation, on the **OpusClip Clip
API**.

- **Categories** — video, ai, social-media
- **Auth methods** — api-key (bearer)
- **Actions** — 22
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.opus.pro` (the `service` check adds `status.opus.pro` to its own hook
  allowlist, never to the app's)
- **Website** — https://www.opus.pro/
- **API docs** — https://help.opus.pro/api-reference/overview
- **OpenAPI** — https://help.opus.pro/api-reference/openapi.json
- **Status page** — https://status.opus.pro/

OpusClip identifies the most compelling hooks in a long-form video, extracts highlights, and
arranges them into short clips with captions, an optional AI-generated headline, and a brand
template applied. Every submitted video is tracked as a **project**; a completed project produces
one or more **clips**.

> **Everything below was verified against OpusClip's own sources on 2026-09-05** — its
> machine-readable OpenAPI 3.0 document
> ([`help.opus.pro/api-reference/openapi.json`](https://help.opus.pro/api-reference/openapi.json),
> 103,310 bytes, `info.title` "Clip API", `info.version` "1.0"), the narrative docs it links
> (Quickstart, Create a Project, Social Posting, Limitations, Webhook, Brand Template), and live
> probes against `api.opus.pro` and `status.opus.pro`. Nothing here came from a third-party
> integration directory. The OpusClip **MCP server** (`mcp.opus.pro`, documented at
> `api-reference/agent-setup`) exposes a wider tool catalog — including clip editing
> (`opusclip_edit_clip`) and live usage reads (`opusclip_get_usage`) — but that is a separate,
> OAuth-based surface with no REST counterpart in the OpenAPI document this app was built from, so
> it is not reproduced here.

## The three things most likely to cost you a day

### 1. A plain-text, non-JSON 401

Live-probed on 2026-09-05: `GET /api/social-accounts` with no `Authorization` header, and again
with a syntactically plausible but fake bearer token, both answered `401` with
`content-type: text/plain` and a body that is literally the 12-byte string `Unauthorized` — not the
`{"errorName", "errorMessage"}` shape the OpenAPI document uses for other 4xx responses (e.g. `402
QuotaExceed` on `POST /api/collections`, `400` on `GET /api/collections`). Code that assumes every
error body is JSON will throw a parse error on exactly the response it most needs to read.
[`lib/client.ts`](lib/client.ts)'s `formatOpusError` parses opportunistically and falls back to the
raw text.

### 2. Two response envelopes, not one

Roughly half the endpoints (social posting, collections, collection contents) answer
`{"data": ...}`. The other half — clip projects, exportable clips, brand templates, censor jobs, and
generative jobs — answer the **bare resource**, no envelope at all. `lib/client.ts` exposes
`.data()` (unwraps) and `.json()` (does not) rather than guessing per call.

### 3. A status-page component's own field lies about its incident

`status.opus.pro` (Instatus-hosted, confirmed via `page.name` and DNS — a CNAME to
`cname.instatus.com`) returned, live on 2026-09-05, a component reading `status: "OPERATIONAL"`
while it carried an **open `MAJOROUTAGE` incident** in its own `activeIncidents` array. A health
check that trusts `component.status` alone would report OpusClip fully healthy during a real major
outage. [`health/service.ts`](health/service.ts) instead takes the worse of a component's own
`status` and the worst `impact` across its `activeIncidents`. The same investigation also found that
Instatus's `/api/v2/*` surface does not reliably route by the requesting hostname — one documented
sibling path (`incidents/unresolved.json`) answered with a **completely different tenant's** status
page — so this check calls only the two paths verified to answer for `status.opus.pro` itself
(`summary.json`, `components.json`) and guards `page.name` before trusting anything else.

## Auth

**`api-key`** (`type: "bearer"`) — one field, `apiKey`. Generate it from the OpusClip dashboard
(`clip.opus.pro/dashboard`, lower-left corner); it looks like `sk-...`. Sent as
`Authorization: Bearer <key>`, per the OpenAPI document's `securitySchemes.bearer`
(`{scheme: "bearer", bearerFormat: "JWT"}`) — despite a couple of the vendor's own curl examples
dropping the `Bearer ` prefix or the header's colon (typos, confirmed against the security scheme
and every other documented example).

API access requires the **Pro (Beta)**, **Max**, or **Business** plan.

The credential-liveness probe is `GET /api/social-accounts?q=mine`: it needs no other resource to
exist (no project, clip, or collection id), returns no credential material, and is the vendor's own
documented first step for social posting. See [`auth/api-key.ts`](auth/api-key.ts) for the full
reasoning against the alternatives.

**Webhook signing** (for `conclusionActions` of type `WEBHOOK` on `clip-project-create`): OpusClip
signs each webhook delivery with `X-Opus-Signature` (`HMAC-SHA256(secretKey, body + salt)`),
`X-Opus-Salt`, and `X-Opus-Timestamp`. The signing `secretKey` is your **Opus API secret key** — if
your workspace has more than one API key, the **first one created** is the one used for signing.
Verifying that signature is done at the receiving webhook endpoint, outside this app's scope; see
[the vendor's webhook doc](https://help.opus.pro/api-reference/webhook) for the full recipe.

## Actions (22)

**Brand templates**
- `brand-template-list` — list your account's brand templates

**Clip projects**
- `clip-project-create` — submit a long-form video for AI clipping
- `clip-project-get` — read a project's current stage/state
- `clip-project-update-visibility` — share a project (`DEFAULT`/`PUBLIC`)
- `clip-list` — list the clips a project or collection produced

**Collections**
- `collection-create`, `collection-list`, `collection-delete`
- `collection-export` — HD download links for every clip in a collection
- `collection-content-add`, `collection-content-remove` — manage collection membership

**Censor jobs** (bleep/mask flagged content)
- `censor-job-create`, `censor-job-get`

**Social posting**
- `social-account-list` — connected destinations available for posting
- `social-copy-job-create`, `social-copy-job-get` — generate platform-tuned captions
- `post-task-create` — publish a clip immediately
- `publish-schedule-create`, `publish-schedule-cancel` — schedule / cancel a future post

**Generative (experimental, per the vendor)**
- `generative-job-create`, `generative-job-get` — AI thumbnail generation (7 credits/call)

**Transcripts**
- `transcript-get` — a project's trimmed source-video transcript

### Bare clip id vs the composite `id`

`clip-list`'s `id` field is the composite `{projectId}.{curationId}` (e.g. `P0000000demo.CUexample1`).
The social-posting actions (`social-copy-job-create`, `post-task-create`,
`publish-schedule-create`) want the **bare** clip id instead — use `clip-list`'s `curationId` field
directly rather than parsing `id`, per the vendor's own warning.

### `clip-project-create`'s scope

`CreateClipProjectCommand`'s `curationPref`/`renderPref` carry a much wider surface than is exposed
here — `RenderPreferenceDto` alone has per-layout toggles, font, stroke and shadow settings. This
action exposes exactly what the vendor's own Quickstart and Create-a-Project docs demonstrate as the
common path: a curation model (`ClipBasic`/`ClipAnything`), one clip-duration range, topic keywords
or a custom prompt, a curation time window, genre, the auto-headline and skip-curation flags, source
language, one output aspect ratio, and webhook/email conclusion actions. Fine-grained caption/font
styling is what `brandTemplateId` is for — configure it in the dashboard (or use a preset id like
`preset-fancy-Karaoke`) rather than passing it inline.

Not implemented, and left out rather than guessed at: uploading a **local** video (there is no
documented multipart/upload endpoint for `clip-projects` in this OpenAPI document — only a
`videoUrl` to an already-hosted video), and `generative-job-create`'s `referenceImageUri`/
`maskImageUri` inputs likewise require an already-hosted image URL, since the upload endpoint the
vendor's own field description references (`POST /api/upload-links`) is not itself documented in
the OpenAPI reference this app was built from.

## Health checks

- **`service`** (`kind: "service"`, unsigned, app-scoped) — `status.opus.pro`'s page-level status
  plus per-component detail, folding in each component's open incidents (see finding #3 above).
- **`quota`** (`kind: "quota"`) — declared `unavailable`, `severity: "informational"`. OpusClip
  enforces its monthly cap (900 credits / 15h per workspace on Pro Beta/Max) and its concurrency
  limit (4 or 50 simultaneous projects) purely by refusal (`403 API_MONTHLY_CAP_REACHED`, `429` with
  `X-Cap-Reason: concurrent`) and publishes no endpoint that reads remaining headroom in advance.
- **`auth:api-key`** — derived automatically from the Auth method's `test` hook.

## Limits worth knowing (from the vendor's own Limitations page)

- **Rate limit**: 30 requests/minute/API key on the core project and clip APIs; social posting
  endpoints have their own per-endpoint limits (documented on `social-copy-job-create`,
  `post-task-create`, etc.).
- **Monthly cap**: Pro Beta/Max get 15 hours / 900 credits of API usage per calendar month per
  workspace; Business is per contract. Hitting it returns `403 API_MONTHLY_CAP_REACHED`
  (deliberately not `429`, so retry-on-429 agent loops don't spin).
- **Per-project minimum**: an API-submitted project has a 10-credit minimum (~10 minutes of clip
  time); web-app submissions are unaffected.
- **Concurrency**: 4 projects in parallel (Pro Beta/Max), 50 (Business).
- **Video limits**: up to 10 hours / 30GB per source video.
- **X (Twitter) posting**: each post (instant or scheduled) costs 1 credit.
