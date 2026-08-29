# Typefully

Write, schedule, and publish social media drafts across X, LinkedIn, Mastodon, Threads, Bluesky,
and Substack Notes, on the **Typefully Public API v2**.

- **Categories** — social-media, marketing
- **Auth methods** — api-key
- **Actions** — 25
- **Health checks** — 2 (`quota`, ~~`service`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.typefully.com`
- **Website** — https://typefully.com/
- **API docs** — https://typefully.com/docs/api

> **Everything below was verified against Typefully's own sources on 2026-08-29** — the OpenAPI 3.1
> document embedded in the React payload of `https://typefully.com/docs/api` itself (`info.title`
> "Typefully Public API", `info.version` "2.0.0"), extracted from that page's own
> `self.__next_f.push` chunks, plus live probes against `api.typefully.com` and every candidate
> status host. Nothing here came from a third-party integration directory, and nothing here was
> inferred from a sibling app.

Typefully's rendered docs page reads, at a glance, like a small drafts/scheduling API. It is not:
the embedded OpenAPI document covers 25 operations across Users, Social Sets, Drafts, Media, Tags,
Queue, LinkedIn mention resolution, Comment Threads, and Analytics. This app implements all 25.

## The three things most likely to trip up an integration

### 1. `platforms` is one JSON object, not a flat parameter tree

Typefully's `Platforms` request schema is a discriminated union across seven very different
per-platform shapes: `x` (up to 50 posts, each with `media_ids`, `hide_link_preview`,
`quote_post_url`, subscriber/paid-partnership/AI-label flags, plus thread-level
`settings.reply_to_url`/`community_id`), `linkedin` (`@[Name](urn:li:organization:ID)` mention
syntax, `linkedin_reshare_target`), `mastodon`/`threads`/`bluesky` (a shared, simpler
`LinkPreviewPost` shape), `substack` (exactly one note, never a thread), and `x_article` (standalone
Markdown with `<typ:media>`/`<typ:x-post>` block embeds, mutually exclusive with every other
platform).

`draft-create` and `draft-update` take `platforms` as a single `json`-typed parameter rather than
re-specifying that union as a `Param[]` tree — pass it exactly as
[the vendor's own examples](https://typefully.com/docs/api) show. `lib/client.ts` and the two
actions' doc comments carry the full shape breakdown.

### 2. Media upload is two calls, and this app can only make one of them

`media-upload-create` (`POST /media/upload`) returns `{media_id, upload_url}` — a presigned S3 URL
good for **one hour**. Getting the actual bytes there is a second, out-of-band call this app does
not make: a plain `PUT` of the raw file bytes with **no extra headers** (`Content-Type`,
`Authorization`, etc. all cause `403 SignatureDoesNotMatch`, because the signature was computed
without them).

That second call is deliberately not an Action here: `upload_url`'s host is generated per-call (the
vendor's own example is `s3.amazonaws.com`, but the bucket/region is not documented as fixed), and
this app's sandbox egress allowlist (`w6w.network.allow`) is declared statically in the manifest and
cannot name a host that only exists at call time. This pack's `linkedin` app declines LinkedIn's
own Images upload for the identical reason. Hand the returned `upload_url` to an HTTP step (e.g.
`@w6w/http`) or an external tool, then poll `media-status-get` until `status` reads `ready`, and
reference the `media_id` in a post's `media_ids`.

### 3. No vendor status feed exists

Every plausible host was checked live and ruled out on 2026-08-29:

| Candidate                          | Result                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `status.typefully.com`              | Resolves in DNS, but the TLS certificate does not cover the hostname; plain HTTP answers a bare `404` |
| `typefully.statuspage.io`           | The unclaimed-Statuspage decoy — ~127,700 bytes of generic Atlassian HTML, the documented signature of a subdomain nobody has claimed |
| `typefully.betteruptime.com`        | Redirects straight to Better Stack's generic `uptime.betterstack.com` marketing page, not a claimed status page |
| typefully.com marketing site + API spec | No `status.*` reference anywhere in either |

`health/service.ts` declares this as `unavailable` with `severity: "informational"` — a positive,
verified fact rather than a silent gap. Leaving it at the `kind: "service"` default severity
(`degraded`) would pin the whole App's health verdict at `unknown` forever, since an `unavailable`
entry always reports `unknown` and `unknown` outranks `ok` in a roll-up.

## X automation compliance

Typefully's own docs open with a compliance notice this app repeats rather than drops silently:
scheduling to X through this API must follow
[X's automation rules](https://help.x.com/en/rules-and-policies/x-automation) and
[X rules](https://help.x.com/en/rules-and-policies/x-rules), and Typefully's API "is meant to create
personal automations and workflows" — an app built on it to serve X's API to *other people's*
accounts at scale needs [X's own API](https://developer.x.com/en) instead.

## Comment threads and the marker grammar

A draft's `posts[*].text` (and an X Article's `content_markdown`) can carry
`<typ:comment-thread id="…">…</typ:comment-thread>` marker tags anchoring collaborator comments —
structural metadata, not user text. `draft-get` returns them by default; `draft-update` must
preserve every marker it received or the vendor refuses the write with
`409 COMMENTS_MARKER_MISMATCH` (unless `forceOverwriteComments` is set, which resolves the affected
threads server-side instead). The recommended flow, reflected in both actions' doc comments: `GET`
without `excludeCommentMarkers` → edit text while keeping markers intact → `PATCH` with
`forceOverwriteComments: false` (the default). Set `excludeCommentMarkers` only for a read-only
export (LLM context, CSV, dashboard) — never feed that rendering back into `draft-update` unless
resolving or stripping the comment anchors is the actual intent.

## Planning vs. scheduling vs. publishing

A **planned** draft (`planAt`) is dated but inert: it shows on the queue/calendar at that date but
never auto-publishes until later confirmed via `publishAt`. `publishAt` with a future datetime or
`"next-free-slot"` schedules it for real; `publishAt: "now"` publishes **asynchronously** — the
response comes back with `publish_state: "in_progress"` while `status` is still `"draft"` and the
published-URL fields are `null`. That is success, not failure: poll `draft-get` until
`publish_state` reads `"finished"`.

`draft-update` additionally accepts the literal string `"null"` for `publishAt`/`planAt` to mean
"send JSON `null`, clear this date" — distinct from leaving the field blank, which means "don't
touch the date at all."

## Actions

| Resource | Actions |
| --- | --- |
| Users | `user-get` |
| Social Sets | `social-set-list`, `social-set-get` |
| Drafts | `draft-list`, `draft-create`, `draft-get`, `draft-update`, `draft-delete` |
| Media | `media-upload-create`, `media-status-get` |
| Tags | `tag-list`, `tag-create` |
| Queue | `queue-schedule-get`, `queue-schedule-replace`, `queue-get` |
| LinkedIn | `linkedin-organization-resolve` |
| Comment Threads | `comment-thread-list`, `comment-thread-create`, `comment-create`, `comment-thread-resolve`, `comment-update`, `comment-delete`, `comment-thread-delete` |
| Analytics | `analytics-posts-list`, `analytics-followers-get` |

Analytics is documented by the vendor as **X-only today** — both actions expose only `x` as a
platform choice, reflecting that stated current limitation rather than a gap in this app.

## Auth

**`api-key`** (`bearer`) — `Authorization: Bearer <api-key>`, generated from Typefully → Settings →
API. There is no query-parameter form and no OAuth surface for third-party apps. The key inherits
the permissions of the user who created it; access to a given social set is per-user, not per-key,
so there is no narrower scoped-token option to prefer.

The credential-liveness probe is `GET /v2/me` — the one endpoint that requires a credential and
returns only account identity (`id`, `name`, `email`, `profile_image_url`, `signup_date`,
`api_key_label`), no credential material of any kind.

## Health checks

- **`quota`** (`kind: "quota"`, `scope: "connection"`, signed) — reads
  `X-RateLimit-User-Limit`/`-Remaining`/`-Reset`, which Typefully carries on every response,
  off the same cheap `GET /v2/me` the auth probe already calls. Reports `down` at 0 remaining,
  `degraded` at or below 10% of the ceiling, `ok` otherwise. Typefully also rate-limits specific
  operations (e.g. `drafts.create`) **per social set**, surfaced via `X-RateLimit-SocialSet-*`
  headers — but those only appear on the response of the operation they gate, so reading them from
  a health check would mean triggering a real side effect (creating a draft) from a probe. That
  budget is left unprobed rather than faked.
- **`service`** — declared `unavailable`, `severity: "informational"`. See "No vendor status feed
  exists" above.
- **`auth:api-key`** — derived automatically from the Auth method's `test` hook; not written by
  hand here.

## Development

```bash
deno task test      # unit tests (99 assertions, mocked HookContext)
deno task check      # typecheck
deno task lint       # deno lint
deno task fmt        # format (lineWidth 100, semicolons, double quotes)
```

`deno task validate` currently fails pack-wide with an `@w6w/runtime` import-map error unrelated to
this app (reproduces identically on an unmodified `apify`); use
`cd ../../_tools && deno run --no-check -A audit.ts typefully` instead.
