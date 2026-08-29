# Readwise

Create, list and export highlights and books, manage highlight/book tags, and read or complete the
Daily Review, on the classic **Readwise API v2**.

- **Categories** — productivity
- **Auth methods** — access-token
- **Actions** — 20
- **Health checks** — 1 (declared absence: `service`, `informational`) + the derived `auth:access-token`
- **Egress allowlist** — `readwise.io` (there is no separate `api.readwise.io`)
- **Website** — https://readwise.io/
- **API docs** — https://readwise.io/api_deets

Readwise aggregates highlights and notes from Kindle, Instapaper, Pocket, Twitter, Apple Books and
dozens of other reading apps into one account, then resurfaces them for spaced-repetition review.

> **Everything below was verified against Readwise's own reference on 2026-08-29** —
> `readwise.io/api_deets` (confirmed 200 OK, 159,497 bytes) — plus live, unauthenticated probes
> against `readwise.io`. Nothing here came from a third-party integration directory.

## Not the Reader API

Readwise runs a **second**, separate product — Reader — with its own `api/v3` surface, linked from
`/api_deets` itself: "Looking for the API docs for Reader? See here." This app implements only the
classic Highlights/Books surface `/api_deets` documents. The two products are not interchangeable:
different auth scopes, different resource models. Nothing from Reader's v3 API is used here.

## The three things most likely to go wrong

### 1. The auth scheme is `Token`, not `Bearer`

The docs say it plainly — "Set a header with key 'Authorization' and value: 'Token XXX'" — but the
instinct to reach for `Bearer` is strong, and Readwise does not error informatively about it. **A
live probe on 2026-08-29 confirmed `Authorization: Bearer <token>` is indistinguishable from sending
no credential at all**: both answer `401 {"detail": "Authentication credentials were not provided."}`.
Only the literal `Token ` prefix works. `auth/api-token.ts` declares
`apiKey: { in: "header", name: "Authorization", prefix: "Token " }` for exactly this reason.

### 2. The vendor gives you a dedicated, non-leaking auth check — use it

Readwise names its own liveness probe: `GET /api/v2/auth/`, answering `204` with **no body** on
success. That matters more than it looks: a `204` cannot echo the caller's own token back the way a
whoami-shaped endpoint could, so there was no "avoid the endpoint that leaks a credential" trade-off
to make here, unlike this pack's Apify or Follow Up Boss apps. Measured live on 2026-08-29:

| Credential           | Status | Body                                                          |
| --------------------- | ------ | -------------------------------------------------------------- |
| None                  | 401    | `{"detail": "Authentication credentials were not provided."}`  |
| Wrong / revoked token | 401    | `{"detail": "Invalid token."}`                                 |
| Live token            | 204    | *(empty)*                                                       |

### 3. Two response envelopes, and the export endpoint uses the other one

Every list endpoint except one answers Django REST Framework's standard offset-page envelope,
`{count, next, previous, results}`. **`GET /export/` pages by an opaque cursor instead** —
`{count, nextPageCursor, results}` — with no `next` URL and no `page` number at all. `lib/client.ts`
types the two separately (`ReadwisePage<T>` vs `ReadwiseExportPage<T>`) rather than forcing one shape,
and `highlight-export.ts` surfaces `nextPageCursor` for the caller to pass back on the next call,
matching the vendor's own recommended sync loop rather than looping internally.

## Auth

One method: `access-token`, type `apiKey`.

Readwise publishes no OAuth surface for third-party apps — a single access token
(`readwise.io/access_token`) is the whole authentication story. The probe is
`GET /api/v2/auth/` (see finding 2 above); it never calls a whoami-shaped endpoint, so there is
nothing here that could leak the account's own token back through a health check or an Action result.

## Actions

20 actions, covering highlights, their tags, books, their tags, and the Daily Review.

| Key                     | Type    | Endpoint                                                |
| ------------------------ | ------- | -------------------------------------------------------- |
| `highlight-create`       | perform | `POST /api/v2/highlights/`                                |
| `highlight-list`         | search  | `GET /api/v2/highlights/`                                  |
| `highlight-get`          | read    | `GET /api/v2/highlights/<id>/`                             |
| `highlight-update`       | perform | `PATCH /api/v2/highlights/<id>/`                           |
| `highlight-delete`       | perform | `DELETE /api/v2/highlights/<id>/`                          |
| `highlight-export`       | search  | `GET /api/v2/export/`                                      |
| `highlight-tag-list`     | search  | `GET /api/v2/highlights/<id>/tags`                         |
| `highlight-tag-get`      | read    | `GET /api/v2/highlights/<id>/tags/<tag id>`                |
| `highlight-tag-create`   | perform | `POST /api/v2/highlights/<id>/tags/`                       |
| `highlight-tag-update`   | perform | `PATCH /api/v2/highlights/<id>/tags/<tag id>`              |
| `highlight-tag-delete`   | perform | `DELETE /api/v2/highlights/<id>/tags/<tag id>`             |
| `book-list`              | search  | `GET /api/v2/books/`                                       |
| `book-get`               | read    | `GET /api/v2/books/<id>/`                                  |
| `book-tag-list`          | search  | `GET /api/v2/books/<id>/tags`                              |
| `book-tag-get`           | read    | `GET /api/v2/books/<id>/tags/<tag id>`                     |
| `book-tag-create`        | perform | `POST /api/v2/books/<id>/tags/`                            |
| `book-tag-update`        | perform | `PATCH /api/v2/books/<id>/tags/<tag id>`                   |
| `book-tag-delete`        | perform | `DELETE /api/v2/books/<id>/tags/<tag id>`                  |
| `daily-review-get`       | read    | `GET /api/v2/review/`                                      |
| `daily-review-complete`  | perform | `POST /api/v2/review/complete/`                            |

### Trailing-slash inconsistency, transcribed verbatim

Readwise's own "Request:" lines are inconsistent about trailing slashes, and this app follows them
exactly rather than guessing at a single convention: the tag **LIST**/**DETAIL**/**UPDATE**/**DELETE**
paths carry no trailing slash (`.../tags`, `.../tags/<tag id>`), but tag **CREATE** does
(`.../tags/`). Both forms were confirmed live on 2026-08-29 (each returns `401`, not `404`, so both
routes exist); the doc's own "Request:" line was taken as authoritative over its sometimes-inconsistent
JavaScript/Python examples.

### Idempotency

Readwise's own docs state real retry-safety for some endpoints, which is what backs `idempotent: true`
rather than a guess:

- **`highlight-create`** — "we de-dupe highlights by title/author/text/source_url... it will do
  nothing rather than create a 'duplicate'." A stated vendor guarantee, not an assumption.
- **`highlight-update`, `book-tag-update`, `highlight-tag-update`** — a `PATCH` applying the same
  values twice leaves the same state.
- **`highlight-delete`, `book-tag-delete`, `highlight-tag-delete`** — a delete's end state is the same
  however many times it runs.
- **`daily-review-complete`** — marking an already-completed review complete again leaves
  `review_completed: true` either way.

**`highlight-tag-create` and `book-tag-create` are `idempotent: false`.** Unlike Highlight CREATE, the
docs state no de-duplication rule for adding a tag — a retry may genuinely create a second tag of the
same name, so this app does not claim otherwise.

### Notes on individual actions

- **`highlight-create` sends one highlight per call.** The endpoint technically accepts an array, but
  every other Action in this app is one operation — chain a loop upstream to create several. The
  response's `modified_highlights[0]` is lifted to `highlightId` for convenience, since almost every
  next step (tagging, updating, reading) needs it.
- **`highlight-create` doubles as an update.** Passing the same `highlight_url` again with new `text`
  updates that highlight instead of creating another — the vendor's own words.
- **`highlight-list` is rate-limited to 20 requests/minute**, a fifth of the 240/minute default that
  applies everywhere else — call it in a loop with care. `book-list` shares the same restriction.
- **`highlight-export` vs `highlight-list`.** The vendor steers most integrations toward `export` for
  bulk sync/backup and reserves the `highlights` endpoint ("Advanced API") for filtered, one-off
  queries needing `book_id` or a precise date range. Both are provided; which to use is the caller's
  choice, not this app's.
- **`highlight-update`'s `location` field is sent as a number.** The vendor's own parameter table lists
  it as type `string` on UPDATE but `integer` on CREATE for what is plausibly the same field; this app
  sends a number to match CREATE and what `location_type: "time_offset"` documents (a count of
  seconds).
- **`book-list`'s `category` filter accepts `supplementals`**, a value Highlight CREATE's own
  `category` field does not document — the two option lists are kept separate rather than shared, since
  sending `supplementals` back to CREATE is unverified.
- **`daily-review-get` and `daily-review-complete` take no parameters** — the Daily Review is a
  singleton per day, addressed implicitly by the caller's own token.

## Health checks

One declared entry, plus the derived `auth:access-token`.

### `service` — a declared absence, checked against every plausible host

No public, machine-readable Readwise status page could be found on 2026-08-29. Every plausible
candidate was checked and ruled out:

| Candidate                          | Result                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `readwisestatus.com`                | DNS does not resolve                                                    |
| `status.readwise.io`                | DNS does not resolve                                                    |
| `status.readwise.app`               | DNS does not resolve                                                    |
| `readwise.statuspage.io`            | Unclaimed Atlassian Statuspage signature — 200, 127,696 B, redirects to `atlassian.com/software/statuspage` |
| `readwisehq.statuspage.io`          | Same unclaimed signature                                                |
| `readwise.freshstatus.io`           | Freshstatus's own 404: `{"detail": "Account with the subdomain does not exist"}` |
| `readwise.instatus.com`             | Resolves to Instatus's own marketing site, not a claimed page           |
| `readwise.betteruptime.com`         | Resolves to Better Stack's own marketing site                           |
| `status.readwise.com`               | Redirects straight to `readwise.io`                                     |
| `readwise.io/status`                | `404`                                                                    |
| `readwise.io/help/en/articles`      | `404`                                                                    |

Stated as a positive fact rather than a silent gap, per `HEALTHCHECKS.md`. `severity: "informational"`
is load-bearing: an `unavailable` entry always reports `unknown`, which outranks `ok` in a roll-up, so
anything less would pin this app's verdict at `unknown` forever.

### No `quota` check, and why

Readwise gives no proactive rate-limit signal on a normal response — a live probe on 2026-08-29 showed
no `X-RateLimit-*` header on either a `401` or a `204` from `/api/v2/auth/`. The only signal the vendor
documents is a `Retry-After` header on an **already-returned** `429`, which is not something a health
check can read in advance. Rather than fabricate a quota reading from nothing, this app declares none.

## Deliberately not covered

- **The `?token=` query authentication form.** Documented and functional, but deliberately unreachable
  — the vendor's own security note against it applies here just as it does to every header-based
  scheme: "URLs are often stored in browser history and server logs."
- **Webhooks.** `/api_deets` names the feature and links out to a separate webhooks doc and an account
  settings page, but states no endpoint paths, payload shapes or event types on the page this app was
  built against. Per the house rule against inferring an undocumented endpoint, nothing was built for
  it.
- **The Reader product's `api/v3` surface.** A different product with a different auth/resource model
  — see "Not the Reader API" above.

## Icon

`assets/icon.svg` is Readwise's own mark: the `mask-icon` SVG linked from `readwise.io`'s own `<head>`
(`safari-pinned-tab.fea64b2bbb1d.svg`, confirmed 200 OK from `d34adp677peecb.cloudfront.net`, the same
CDN path serving Readwise's other favicons), re-framed onto this pack's normalized `0 0 100 100` canvas
by `_tools/icon-normalize.ts` — the artwork itself is untouched. `assets/icon.dark.svg` is the pack's
standard reversed-ink variant (`_tools/icon-legibility.ts fix`), needed because the mark is a single
solid colour that disappears on the dark tile.

## Layout

```
readwise/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # ReadwiseClient, the two page envelopes, error formatting
│   └── params.ts                # shared Param fragments and the vendor's enums
├── auth/api-token.ts            # apiKey (Token scheme): sign, test
├── actions/                     # one file per action (20)
├── health/
│   └── service.ts               # declared absence, informational
├── assets/
│   ├── icon.svg                 # vendor mark, verbatim (re-framed)
│   └── icon.dark.svg            # reversed-ink variant for the dark tile
└── tests/                       # entry module, every action, auth, lib, health
```

## Development

From this directory, inside the `api` container:

```bash
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt`
deno task test
```

`deno task validate` currently fails identically on this app and on the unmodified `apify` app in this
pack with `Import "@w6w/runtime" not a dependency and not in import map` — a pre-existing property of
how `_tools/audit.ts` resolves its own import map, not of this app. Run the auditor directly instead:

```bash
cd ../../_tools && deno run --no-check -A audit.ts readwise
```
