# AssemblyAI

Transcribe audio and video and run Audio Intelligence on the result, on the **AssemblyAI
Speech-to-Text API v2**.

- **Categories** — ai, developer-tools
- **Auth methods** — api-token
- **Actions** — 11
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-token`
- **Egress allowlist** — `api.assemblyai.com`, `api.eu.assemblyai.com` (the `service` check adds
  `status.assemblyai.com` to its own hook allowlist, never to the app's)
- **Website** — https://www.assemblyai.com/
- **API docs** — https://www.assemblyai.com/docs/
- **Machine-readable spec** — https://www.assemblyai.com/docs/openapi.json
- **Status page** — https://status.assemblyai.com/

> **Everything below was verified against AssemblyAI's own sources on 2026-08-29** — its
> machine-readable OpenAPI document (`www.assemblyai.com/docs/openapi.json`, Fern-generated,
> `info.version` 1.3.4), its hand-written docs (`assemblyai.com/docs/api-reference/*`,
> `.../pre-recorded-audio/*`, `.../pii-redaction`, `.../llm-gateway/*`,
> `.../getting-started/error-handling`), and live probes against `api.assemblyai.com` and
> `status.assemblyai.com`. Nothing here came from a third-party integration directory.

## The four things most likely to go wrong

### 1. No `Bearer` prefix

AssemblyAI's OpenAPI security scheme is a bare header: `Authorization: <api-key>` — not
`Authorization: Bearer <api-key>`. This is easy to get wrong by pattern-matching on every other
vendor in this pack; AssemblyAI's own error-handling reference even calls it out: "Double-check
there's no `Bearer` prefix." `auth/api-token.ts` declares `type: "apiKey"` with no `prefix` and
stamps the raw key directly.

### 2. No upload action — local file bytes don't survive this sandbox

`POST /v2/upload` takes a raw `application/octet-stream` body (the file's actual bytes). This
app's sandbox coerces every `ctx.fetch` body to a string en route to the network — the same
constraint this pack's `box`, `documenso` and `cloudconvert` apps document for their own upload
endpoints. **Every action in this app works with a publicly reachable audio/video URL instead**
(`audio_url`, up to 5 GB / 10 hours per AssemblyAI's own documented limit) — the path AssemblyAI's
own docs present as the normal one alongside upload, not a workaround invented here.

### 3. No synchronous host — polling is real, not a workaround

Unlike CloudConvert's `sync.api.cloudconvert.com` (the identical paths, blocking until terminal),
AssemblyAI offers **no** "submit and block until done" endpoint at all. Its own docs' worked
examples poll `GET /v2/transcript/{id}` on an interval instead, so `transcript-wait` and
`transcript-submit-and-wait` do the same — a real `setTimeout` loop inside the action, the same
pattern this pack's `twitter` app uses for its own media-processing poll (`lib/client.ts`), not a
placeholder for a call AssemblyAI doesn't offer. A Webhook URL on `transcript-submit` (`{transcript_id,
status}` posted to your own endpoint) avoids polling entirely when that fits the workflow better.

### 4. A `401` is not always "bad key"

AssemblyAI's own error-handling reference lists **three** causes for a `401`: "Missing/invalid
Authorization, disabled account, or insufficient balance." There is no API-readable balance
endpoint (see `health/quota.ts`) to tell these apart, so `auth/api-token.ts`'s `test` failure
message says so explicitly rather than only pointing at the key — a correctly-copied key on a
zero-balance account would otherwise get a misleading "check your key" message.

Measured live on 2026-08-29: an **unauthenticated** and an **invalid-key** `GET /v2/transcript`
both answer the identical `401 {"error":"Authentication error, API token missing/invalid"}` —
AssemblyAI does not distinguish "no credential" from "wrong credential" either.

## Auth

One method: `api-token`, type `apiKey` — `Authorization: <key>` (no prefix). An AssemblyAI key is
**unscoped**: it authenticates the whole account for every endpoint, unlike CloudConvert's six
independent key scopes elsewhere in this pack — so there is no "this key may lack a capability"
caveat to carry here.

### The probe is `GET /v2/transcript?limit=1`

AssemblyAI publishes no account/whoami endpoint at all (nothing like Apify's
`/v2/users/me/limits` or CloudConvert's `/v2/users/me`), so `test` probes the cheapest real read
instead: a one-result transcript list. The response (transcript summaries: `id`, `status`,
timestamps, `audio_url`) carries no secret. `afterConnect` is not implemented — there is no
account field to publish that isn't already the credential itself.

## Actions

11 actions, all grouped under the `transcript` resource.

| Key | Type | Endpoint |
| --- | --- | --- |
| `transcript-submit` | perform | `POST /v2/transcript` |
| `transcript-submit-and-wait` | perform | `POST /v2/transcript` + poll `GET .../{id}` |
| `transcript-get` | read | `GET /v2/transcript/{id}` |
| `transcript-wait` | read | poll `GET /v2/transcript/{id}` |
| `transcript-list` | search | `GET /v2/transcript` |
| `transcript-delete` | perform | `DELETE /v2/transcript/{id}` |
| `transcript-sentences-get` | read | `GET /v2/transcript/{id}/sentences` |
| `transcript-paragraphs-get` | read | `GET /v2/transcript/{id}/paragraphs` |
| `transcript-subtitles-get` | read | `GET /v2/transcript/{id}/{srt\|vtt}` |
| `transcript-word-search` | search | `GET /v2/transcript/{id}/word-search` |
| `transcript-redacted-audio-get` | read | `GET /v2/transcript/{id}/redacted-audio` |

Every action takes an advanced `region` param (`us` default / `eu`) — see "Two regions" below.

### Idempotency

`transcript-submit`, `transcript-submit-and-wait`: **not idempotent.** AssemblyAI documents no
idempotency key for transcript creation; every call starts a new, separately billed job.

`transcript-delete`: **idempotent.** The end state (data gone, transcript marked deleted) is the
same regardless of call count — AssemblyAI does not document a distinct "already deleted" error,
and the operation is a state transition to a terminal state, the same reasoning this pack's
`cloudconvert` app applies to its own delete actions (not independently re-verified against a
live second delete call here).

### Audio Intelligence is a set of flags on the submit call, not separate actions

Per this project's brief, every add-on is a parameter on `transcript-submit` /
`transcript-submit-and-wait`, transcribed from AssemblyAI's `TranscriptOptionalParams` schema:

- **Speaker diarization** (`speakerLabels`, `speakersExpected`) — requires Punctuate.
- **Key phrases** (`autoHighlights`, formerly "Auto Highlights").
- **Content moderation** (`contentSafety`, `contentSafetyConfidence`).
- **Topic detection** (`iabCategories`) — IAB taxonomy classification.
- **Entity detection** (`entityDetection`).
- **Sentiment analysis** (`sentimentAnalysis`) — requires Punctuate.
- **PII redaction** (`redactPii`, `redactPiiPolicies` — the full 52-value catalog, `redactPiiSub`,
  and optionally `redactPiiAudio`/`redactPiiAudioQuality` for a beeped-out audio copy) — requires
  Format text.
- **Language** (`languageCode`, `languageDetection`, `languageConfidenceThreshold`).
- **Model selection & prompting** (`speechModels`, `domain` (Medical Mode), `prompt`,
  `keytermsPrompt` — the last two Universal-3.5 Pro only).
- **Webhooks** (`webhookUrl` + optional custom auth header name/value).

**Deprecated fields are NOT exposed**: `auto_chapters`, `summarization`, `summary_model`,
`summary_type`, `custom_topics`, `topics`. AssemblyAI's own docs mark all six deprecated in favor
of **LLM Gateway** — see "Deliberately not covered" below.

**Also not exposed**, to keep the param surface reviewable rather than mirroring every nested
object in the schema 1:1: `language_codes` (code switching), `language_detection_options`,
`speaker_options` (a min/max speaker range — `speakersExpected` covers the common single-number
case), `redact_pii_return_unredacted`, `redact_pii_audio_options`, `redact_static_entities`,
`remove_audio_tags`, `temperature`, `custom_spelling`. None of these were left out because they
could not be confirmed — every one is documented in `TranscriptOptionalParams` — they were left
out to keep this app's action surface reviewable; every field IS transcribed correctly for the
ones that ARE exposed.

### Two regions, one contract

AssemblyAI serves the identical `/v2` paths on a second host for EU data residency:
`api.eu.assemblyai.com`. Unlike CloudConvert's sync/async host split (a different *contract* on
the second host), this is purely about where the data and processing live — same behavior, same
shapes. **A transcript submitted on one region's host exists only on that host** — calling
`transcript-get`/`transcript-wait`/etc. with the wrong `region` for a given transcript ID answers
`404`. Keep `region` consistent across a workflow that shares one transcript ID.

### Notes on individual actions

- **`transcript-submit-and-wait` throws on a failed transcription**; `transcript-wait` does not —
  it returns the `error`-status transcript (with the failure in the `error` field), the same
  as `transcript-get` would. The convenience action's whole point is "give me a usable result or
  fail loudly," while the lower-level wait/get actions let a workflow branch on `status` itself.
- **`transcript-word-search`'s `words` param is comma-joined into one query key**
  (`style: form, explode: false` in AssemblyAI's OpenAPI document), not repeated as
  `words=a&words=b` — `toArray()` normalizes the input, the action joins it itself.
- **`transcript-subtitles-get` is the only action whose response is `text/plain`, not JSON** — SRT
  and VTT are plain text; `AssemblyAiClient.text()` is used instead of `.json()`.
- **`transcript-redacted-audio-get`'s URL is only valid for 24 hours** after the transcript
  completes, per AssemblyAI's own docs — it is a pre-signed download link, not a permanent
  resource identifier.
- **`transcript-list`'s pagination is cursor-based on transcript ID** (`before_id`/`after_id`),
  not offset/page, and AssemblyAI states transcripts are retrievable for the last 90 days only.

## Health checks

Two declared checks plus the derived `auth:api-token`.

### `service` — `status.assemblyai.com` is Atlassian Statuspage

Verified live on 2026-08-29: `api/v2/summary.json` answers `200` with the standard Statuspage
document (`page.name: "AssemblyAI"`, `status.indicator`, a component tree including an `APIs`
group with `Asynchronous API` and `Transcription Queue` children). Same shape and rollup
semantics as this pack's other Statuspage-backed checks (mirrored from `anthropic/health/service.ts`
rather than re-derived) — group headers are skipped in favor of their children, and the page's own
`status.indicator` drives the reported state.

### ~~`quota`~~ — a declared absence, at `informational` severity

AssemblyAI exposes **neither** prepaid balance **nor** parallel-transcription rate-limit headroom
through its API — both are dashboard-only (Workspace > Settings > Billing; the Rate Limits page).
There is no `GET` endpoint for either in AssemblyAI's OpenAPI document, and no `X-RateLimit-*`
header on any documented path. Reading rate-limit headroom would mean submitting a real, billed
transcription and checking whether it landed in `queued` — not a side-effect-free probe.
`severity: "informational"` keeps this declared absence from pinning the app's verdict at
`unknown` forever. This matters more than a typical "can't read it" gap: AssemblyAI's own docs
list "insufficient balance" as one of three causes of a `401` (see finding 4 above), and this
check is why the auth `test` message cannot confirm or rule that out on its own.

## Deliberately not covered

- **`POST /v2/upload`** (local file byte upload) — see finding 2 above.
- **LeMUR** — AssemblyAI's own docs: LeMUR "sunset on 2026-03-31" and has fully retired. Any
  reference to it or to `transcript_ids` in a chat-completions call is superseded by **LLM
  Gateway**.
- **LLM Gateway** (`llm-gateway.assemblyai.com/v1/chat/completions`) — real, live, and the
  documented replacement for LeMUR and for the deprecated `auto_chapters`/`summarization` submit
  flags. It is a **separate, general-purpose LLM chat-completions proxy** (arbitrary system/user
  messages, a `model` string from a growing catalog spanning Anthropic/OpenAI/Google/Qwen) — not
  specific to speech-to-text, and a different product surface from the Speech-to-Text +
  Audio Intelligence API this app covers. Out of scope here, not because it couldn't be confirmed.
- **Streaming (real-time) transcription** (`wss://streaming.assemblyai.com/v3/ws`) — a WebSocket
  protocol, a fundamentally different transport from this app's REST actions. Out of scope for
  the same reason as LLM Gateway: a different product surface, not an unconfirmed detail.
- **Voice Agent API, standalone TTS** — separate products per AssemblyAI's own "not supported /
  out of scope" guidance for developers building on top of it.
- The nested/rarer `TranscriptOptionalParams` fields listed in "Also not exposed" above.

## Icon

`assets/icon.png` is decoded, byte-for-byte, from AssemblyAI's own `favicon.ico`
(`https://www.assemblyai.com/favicon.ico`, confirmed linked from the site's own
`<link rel="icon" type="image/x-icon" href="/favicon.ico">`, 16,958 bytes, a single 64×64 32bpp
BITMAPINFOHEADER frame — not a PNG-in-ICO). No standalone SVG icon-only mark exists on
AssemblyAI's site or docs (only full wordmark SVGs, e.g.
`www.assemblyai.com/_aai/images/logos/assemblyai-logo-full-primary.svg`, a 161×28 wordmark, not a
square mark); `apple-touch-icon.png` 404s, AssemblyAI has no simple-icons entry, and no n8n
`nodes-base` node exists for it — the fallback chain in this project's brief was exhausted before
reaching a clean SVG, so the favicon's own 64×64 bitmap frame was decoded (manual BMP→PNG, no
external image library available in the build environment) rather than invented.

## Layout

```
assemblyai/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                 # AssemblyAiClient, the two regions, error formatting
│   └── params.ts                  # shared Param fragments, the submit-flags mapping
├── auth/api-token.ts             # apiKey, no Bearer prefix: sign, test
├── actions/                      # one file per action (11)
├── health/
│   ├── service.ts                 # status.assemblyai.com (Atlassian Statuspage)
│   └── quota.ts                    # declared absence, informational
├── assets/icon.png               # vendor mark, decoded from the real favicon.ico
└── tests/                        # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check       # typecheck
deno task lint
deno task fmt          # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```
