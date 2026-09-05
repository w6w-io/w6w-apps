# Manus

Create and drive Manus AI agent tasks — start one from a prompt, poll its event stream, send
follow-ups, confirm the actions it pauses on — plus the platform features a workflow actually
touches: projects, files, webhooks, connectors, skills, custom agents, online browser clients,
credit/usage accounting, and the websites a task can build and publish. Built on Manus's **API v2**
(`api.manus.ai`).

- **Categories** — ai, productivity
- **Auth methods** — api-key (`x-manus-api-key` header)
- **Actions** — 32
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.manus.ai` (the `service` check adds `status.manus.im` to its own hook
  allowlist, never to the app's)
- **Website** — https://manus.im/
- **API docs** — https://open.manus.ai/docs/v2/introduction
- **Status page** — https://status.manus.im/

> **Everything below was verified on 2026-09-05** against Manus's own documentation
> (`open.manus.ai/docs/v2/*` — Mintlify-hosted; every page also answers as clean markdown at its
> own `.md` suffix, e.g. `open.manus.ai/docs/v2/task.create.md`, which turns a rendered HTML shell
> into a page an agent can actually read) plus the machine-readable OpenAPI document the docs
> themselves publish at `open.manus.ai/docs/v2/openapi_v2.json` (`servers: [{ url:
> "https://api.manus.ai" }]`), plus live, unauthenticated and invalid-key probes against
> `api.manus.ai`. Nothing here came from a third-party integration directory.

## Four findings worth recording

### 1. v1 is explicitly, vendor-labeled deprecated — this app is built entirely against v2

`open.manus.ai/docs/llms.txt` lists a full parallel v1 surface (`v1/create-task`, `v1/get-task`,
`v1/create-project`, an OpenAI-SDK-compatibility shim, per-connector guides for Gmail/Notion/Google
Calendar, …) alongside v2. The v1 overview page states outright:

> You are viewing API v2 — the latest version... API v1 has been deprecated and will be removed in
> the future.

**No v1 endpoint is implemented, referenced, or called anywhere in this package** — every path,
verb, query parameter and body field here was read out of the v2 OpenAPI document
(`openapi_v2.json`) and cross-checked against the v2 guide pages, deliberately never the v1 ones.

### 2. The Mintlify `.md`-suffix trick makes an otherwise-opaque docs site fully readable

`open.manus.ai/docs` is a Mintlify-hosted React app — fetching a guide page's normal URL returns a
client-rendered shell, not the content. Every page also answers as clean markdown at its own
`.md`-suffixed URL (`open.manus.ai/docs/v2/task.create.md` instead of
`open.manus.ai/docs/v2/task.create`), which is how this app's author read the authentication,
task-lifecycle, rate-limits and webhook-security guides. Better still, Manus's docs publish a full
machine-readable OpenAPI document directly (`open.manus.ai/docs/v2/openapi_v2.json`) — every action
in this app was built by reading that document's request/response schemas directly, with the guide
pages used for narrative context (pagination conventions, auth precedence, rate-limit numbers) the
OpenAPI document itself does not state.

### 3. Auth: a plain header, API key over OAuth2 — and a key is not scoped at all

Every v2 endpoint accepts either `x-manus-api-key: <key>` or `Authorization: Bearer <access_token>`
for a third-party "Open App" acting on behalf of a *different* team's users (its own consent screen,
scopes like `create_task`/`manage_all_tasks`, Team-account-only). This app implements only the
API-key method: it models unattended, server-to-server access to **one's own** account — exactly
what Manus's own docs recommend the header for ("your own integrations and scripts") — while OAuth2
here is a distinct delegation use case with its own flow this app does not attempt to drive.

Unlike some vendors, a Manus API key carries **no scope at all**: "each key provides full access to
your Manus account." So there is no permission model to route around when picking a health/liveness
probe — every read endpoint is equally reachable by any key. `usage.availableCredits` is used for
both the Auth `test` probe and the `quota` health check (see below) because it needs no query
parameters and costs no credits to call, not because it is narrower than any alternative.

### 4. Two distinct meterings, only one of which is probeable in advance

`open.manus.ai/docs/v2/rate-limits` documents fixed per-endpoint request-per-minute ceilings
(`task.create`: 10/min, `task.detail`: 100/min, …) — but publishes no `X-RateLimit-*`/`RateLimit-*`
response header alongside them, only a `429 rate_limited` error once a caller is already over. That
half is not probeable in advance and is left out of this app's `quota` health check entirely.
Credit balance, read from `GET /v2/usage.availableCredits`, **is** probeable and is what actually
gates whether a task can run at all — see [Health checks](#health-checks) below.

## What isn't here, and why

- **v1's entire surface**, including its OpenAI-SDK-compatibility shim and per-connector setup
  guides (Gmail, Notion, Google Calendar) — see finding 1.
- **Uploading a file's bytes.** `file-upload` creates the file record and returns a presigned S3
  `upload_url`, but does not `PUT` the bytes itself: that URL points at a per-request,
  vendor-controlled storage host that cannot be named in advance, so it cannot be declared in
  `w6w.network.allow` the way every other host this app calls can (the same reasoning this pack's
  `devin` app documents for its own attachment-download URLs). A workflow needs an HTTP action built
  for an arbitrary caller-supplied URL to actually upload the bytes, within the 3-minute expiry,
  before referencing `file.id` from `task-create`/`task-send-message`.
- **The full `ContentPart` schema.** `Message.content` can carry an arbitrary array of `text`/
  `file`/`voice` parts, each providable by id, URL, or inline base64 data. `task-create` and
  `task-send-message` cover the common case a workflow step can actually compose from form fields —
  a text prompt plus at most one file attachment (by id or URL) — not every combination the schema
  allows (multiple files, voice input, inline base64 data).
- **The Open App / OAuth2 flow.** A distinct delegation use case (a third-party app acting on behalf
  of a different team's users) with its own consent screen and scopes — see finding 3.
- **`structured_output_schema`'s guided authoring.** `task-create` and `task-send-message` accept the
  raw JSON Schema object Manus's Structured Output feature expects, rather than a guided builder.

## Health checks

- **`service`** (`kind: service`, unsigned) — reads `status.manus.im`'s real Atlassian Statuspage
  feed (confirmed real: self-identifies as `"Manus"`, and a nonsense sibling path answers 404 rather
  than the same 200 every real path gets — checked against the unclaimed `manus.statuspage.io` decoy,
  which answers with Statuspage's own `"API (example)"`/`"Management Portal (example)"` placeholder
  components). Tracks **two of its three components** — `api.manus.im` and `manus computer` (the
  sandboxed environment a task's browser/code actions actually execute in, the same reasoning this
  pack's `devin` app uses for Devin's "Cloud Agent" component) — and excludes `manus.im` (the web
  app), which this app never touches.
- **`quota`** — reads `GET /v2/usage.availableCredits`'s `total_credits` (the schema's own
  "authoritative spendable balance"). Reports `down` at zero credits, since `task-create` and every
  subsequent turn spend from this balance — an account at zero cannot do the one thing this app
  exists for, independent of how healthy the API itself is. Request-rate headroom is NOT probed —
  see finding 4.
- **`auth:api-key`** (derived) — the same `usage.availableCredits` call the Auth `test` hook makes;
  see finding 3 for why that endpoint and not some other read.

## Actions (32)

**Tasks** — `task-create`, `task-detail`, `task-list`, `task-update`, `task-stop`, `task-delete`,
`task-send-message`, `task-list-messages`, `task-confirm-action`
**Projects** — `project-create`, `project-list`
**Skills** — `skill-list`
**Agents** — `agent-list`, `agent-detail`, `agent-update`
**Files** — `file-upload`, `file-detail`, `file-delete`
**Webhooks** — `webhook-create`, `webhook-list`, `webhook-delete`, `webhook-public-key`
**Browser** — `browser-online-list`
**Usage** — `usage-list`, `usage-team-statistic`, `usage-team-log`, `usage-available-credits`
**Connectors** — `connector-list`
**Website** — `website-status`, `website-list-checkpoints`, `website-publish`, `website-update`

This is a near-complete surface: Manus's v2 API is small (32 endpoints total, all covered here) and
entirely workflow-relevant — unlike some vendors, there is no separate enterprise-admin surface
deliberately left out.

## Icon

`https://manus.im/favicon.ico` (confirmed real: `manus.ai` redirects there with a 302, and that
domain's own `favicon.ico`/`apple-touch-icon.png` paths 404). It is a multi-resolution `.ico`
container whose larger frames are directly embedded PNGs (no re-encoding); the 128×128 and 48×48
PNG frames were extracted byte-for-byte and used as `assets/icon.png`/`assets/icon-48.png`. The mark
is single-colour black, which disappears on this pack's dark tile — `assets/icon.dark.png` /
`icon-48.dark.png` are the same artwork re-inked to white (RGB channels set to `255,255,255`
wherever the source pixel's alpha is non-zero; alpha itself untouched), the same "reversed mark"
treatment the app-pack tooling (`_tools/icon-legibility.ts`) automates for SVG icons but cannot for
a raster source.
