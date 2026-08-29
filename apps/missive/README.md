# Missive

Enrich Missive conversations with drafts, posts, and comments; sync contacts, contact books, shared
labels, teams, and canned responses, on the **Missive REST API v1**.

- **Categories** — communication, support, productivity
- **Auth methods** — api-token
- **Actions** — 42
- **Health checks** — 2 (~~`service`~~, ~~`quota`~~), both declared absences, plus the derived
  `auth:api-token`
- **Egress allowlist** — `public.missiveapp.com`
- **Website** — https://missiveapp.com/
- **API docs** — https://missiveapp.com/docs/developers/rest-api
- **Status page** — https://status.missiveapp.com/ (real, but not machine-readable — see Health checks)

Missive is a shared team inbox unifying email, SMS, WhatsApp, Live Chat, and social messages into one
collaborative workspace. Its public API is deliberately narrow next to the product it fronts: there is
no general inbox-browsing surface, just enough reads to sync state plus a solid path for the two things
most integrations actually need — inserting visible content into a conversation, and keeping contacts
and labels in sync with an outside system.

> **Everything below was verified against Missive's own GitBook-hosted docs on 2026-08-29** —
> `missiveapp.com/docs/developers/rest-api`, its `endpoints` (184 KB, "Last updated on September 18th,
> 2025") and `rate-limits` sub-pages — plus live probes against `public.missiveapp.com` and
> `status.missiveapp.com`. Nothing here came from a third-party integration directory.

## The three things most likely to go wrong

### 1. Tokens are personal, not scoped, not organization-bound

Missive's own words: "All API tokens are personal. There is no organization-level or
shared-account-specific token. Your personal token has access to any account you can access in
Missive, including shared accounts." There is no "narrowest usable credential" concept to design an
auth probe around, unlike a vendor with scoped tokens — every token this app can hold reaches
everything its owner can see in the Missive app itself. Generating a token also requires the
organization be on Missive's **Productive** plan.

### 2. A "get one" response is an array for conversations, an object for everything else

`GET /v1/conversations/:id` is documented as `{"conversations": [{...}]}` — an **array** with one
item, because a merge can resolve the requested id to a different surviving conversation. `GET
/v1/messages/:id` and `GET /v1/tasks/:id`, by contrast, are documented as a bare **object**. Several
endpoints (`contact-get`, `response-get`) show no explicit response example at all in the reference.

`lib/client.ts`'s `unwrapSingle()` handles either shape defensively (array → first element, object →
itself) rather than assuming one shape pack-wide or guessing at an undocumented one.

### 3. Both health surfaces are genuinely absent, not just hard to find

- **`status.missiveapp.com` is a real, live status page** — "Missive status", listing components
  including "REST API" — but it runs on **PagerDuty's own status-page product**, not Atlassian
  Statuspage. Verified live: the standard `/api/v2/summary.json` and `/api/v2/status.json` paths both
  404 for real (not a catch-all shell), `/history.atom` and `/history.rss` both answer the page's own
  SPA HTML, and its one same-origin data endpoint (`GET /api/data`) returns only static layout — no
  current incident/component state, which is delivered over an authenticated **Ably realtime
  channel** this app cannot subscribe to from a stateless probe. `api.pagerduty.com` itself answers
  401 without a PagerDuty credential.
- **Rate-limit headers are documented as accompanying only the 429 refusal**, never an ordinary
  response: "When a rate limit is reached, Missive API will return the following HTTP error status
  code: 429 … with the following headers." There is nothing to read ahead of a rejection, and no
  unauthenticated endpoint exists to probe it anyway (verified live: every endpoint answers 401
  without a token).

Both are declared `unavailable` with `severity: "informational"` — a positive, documented fact rather
than a silent gap. `informational` is load-bearing: an `unavailable` entry always reports `unknown`,
and `unknown` outranks `ok` in a roll-up, so at any other severity a declared absence would pin the
app's verdict there forever.

## Auth

One method: `api-token`, type `bearer`. Missive publishes no OAuth surface for third-party apps.

### The probe is `GET /v1/organizations`

Chosen over the more obvious `GET /v1/users`: the latter returns the token owner's own `email` inside
an otherwise ordinary liveness check, which this pack avoids on principle (the same trap as Follow Up
Boss's `/me` and Mailjet's `/apikey`, both banned pack-wide). `/v1/organizations` requires a
credential (verified live: a missing or a syntactically plausible fake token both answer 401) and
returns nothing but organization ids and names.

Both failure modes look identical on the wire, and the probe does not pretend otherwise: a missing
`Authorization` header and an invalid token both answered
`401 {"error":{"message":"Authentication token is invalid or has been revoked"}}` in a live probe on
2026-08-29 — the exact same message either way.

## Actions

42 actions. `resource` groups them in the editor.

| Key                            | Type    | Endpoint                                    |
| ------------------------------ | ------- | -------------------------------------------- |
| `analytics-report-create`      | perform | `POST /v1/analytics/reports`                 |
| `analytics-report-get`         | read    | `GET /v1/analytics/reports/:id`              |
| `contact-create`               | perform | `POST /v1/contacts`                          |
| `contact-update`               | perform | `PATCH /v1/contacts/:id`                     |
| `contact-list`                 | read    | `GET /v1/contacts`                           |
| `contact-get`                  | read    | `GET /v1/contacts/:id`                       |
| `contact-book-list`            | read    | `GET /v1/contact_books`                      |
| `contact-group-list`           | read    | `GET /v1/contact_groups`                     |
| `conversation-list`            | read    | `GET /v1/conversations`                      |
| `conversation-get`             | read    | `GET /v1/conversations/:id`                  |
| `conversation-update`          | perform | `PATCH /v1/conversations/:id`                |
| `conversation-messages-list`   | read    | `GET /v1/conversations/:id/messages`         |
| `conversation-comments-list`   | read    | `GET /v1/conversations/:id/comments`         |
| `conversation-drafts-list`     | read    | `GET /v1/conversations/:id/drafts`           |
| `conversation-posts-list`      | read    | `GET /v1/conversations/:id/posts`            |
| `conversation-merge`           | perform | `POST /v1/conversations/:id/merge`           |
| `draft-create`                 | perform | `POST /v1/drafts`                            |
| `draft-delete`                 | perform | `DELETE /v1/drafts/:id`                      |
| `message-create`               | perform | `POST /v1/messages`                          |
| `message-get`                  | read    | `GET /v1/messages/:id[,:id2,...]`            |
| `message-list`                 | read    | `GET /v1/messages?email_message_id=...`      |
| `organization-list`            | read    | `GET /v1/organizations`                      |
| `response-list`                | read    | `GET /v1/responses`                          |
| `response-get`                 | read    | `GET /v1/responses/:id`                      |
| `response-create`              | perform | `POST /v1/responses`                         |
| `response-update`              | perform | `PATCH /v1/responses/:id`                    |
| `response-delete`              | perform | `DELETE /v1/responses/:id[,:id2,...]`        |
| `post-create`                  | perform | `POST /v1/posts`                             |
| `post-delete`                  | perform | `DELETE /v1/posts/:id`                       |
| `shared-label-create`          | perform | `POST /v1/shared_labels`                     |
| `shared-label-update`          | perform | `PATCH /v1/shared_labels/:id`                |
| `shared-label-list`            | read    | `GET /v1/shared_labels`                      |
| `team-list`                    | read    | `GET /v1/teams`                              |
| `team-create`                  | perform | `POST /v1/teams`                             |
| `team-update`                  | perform | `PATCH /v1/teams/:id`                        |
| `user-list`                    | read    | `GET /v1/users`                              |
| `task-list`                    | read    | `GET /v1/tasks`                              |
| `task-get`                     | read    | `GET /v1/tasks/:id`                          |
| `task-create`                  | perform | `POST /v1/tasks`                             |
| `task-update`                  | perform | `PATCH /v1/tasks/:id`                        |
| `webhook-create`               | perform | `POST /v1/hooks`                             |
| `webhook-delete`               | perform | `DELETE /v1/hooks/:id`                       |

### Idempotency

Every create-shaped action (`contact-create`, `draft-create`, `message-create`, `response-create`,
`post-create`, `shared-label-create`, `team-create`, `task-create`, `webhook-create`,
`analytics-report-create`) is `idempotent: false` — Missive documents no idempotency key of any kind
on any POST endpoint, so a retried call creates a second resource (or, worse, sends a second real
email/SMS/WhatsApp message). `conversation-merge` is likewise `false`: replaying it after a successful
merge targets a source conversation that no longer holds the entries to merge.

Every update and delete (`contact-update`, `conversation-update`, `draft-delete`, `response-update`,
`response-delete`, `post-delete`, `shared-label-update`, `team-update`, `task-update`,
`webhook-delete`) is `idempotent: true` — a `PATCH` reapplies the same target state, and a repeat
`DELETE` leaves the same end state as the first.

### Notes on individual actions

- **`draft-create` is the documented way to send a message.** Set `send: true` to send immediately
  rather than leaving an editable draft; `send_at` schedules it instead. Sending fires any matching
  outgoing-message rules, including scheduled auto-follow-ups (Missive's own "Automated email
  sequences" use case).
- **`message-create` is for custom channels only** — it simulates an *incoming* message from an
  external system integrated as a Missive custom channel. It does not send anything; use
  `draft-create` with `send: true` for that. Missive's own docs make this the load-bearing warning on
  the endpoint.
- **`post-create` is the recommended way to manage conversation state from an integration**, because —
  unlike `conversation-update` — a post leaves a visible entry showing what triggered the change
  (close, move, assign, label). It requires a `notification` object (the vendor's own attributes table
  marks it with a `*`) and at least one of `text`, `markdown`, or `attachments`. There is currently no
  parameter to *archive* a conversation via this API — only move-to-inbox (unarchive), close, and
  reopen exist, per Missive's own docs.
- **`conversation-list` requires exactly one mailbox filter** — Missive's own error otherwise:
  "You need to paginate at least one mailbox." Four of the thirteen mailbox values (`shared_label`,
  `team_inbox`, `team_closed`, `team_all`) additionally need an id, collected in a second param.
- **`message-get` returns an object for one id, an array for several** — Missive's own documented
  shape difference between a single lookup and the comma-separated batch form used to reduce request
  volume against the rate limit.
- **`draft-create` and `message-create` document a request payload but no response example** in the
  reference. Both actions return the response body verbatim (under `drafts`/`messages`) rather than
  guessing a field list.
- **WhatsApp templates** (`draft-create`'s `externalResponseId`/`externalResponseVariables`) are
  required only to initiate a conversation with someone not messaged in the last 24 hours; the `body`
  sent must match the template's rendered result, since Missive shows your `body` but sends the
  template + variables to the provider.
- **`response-create`/`response-update`/`response-delete` cannot touch externally-sourced
  responses** (e.g. a WhatsApp template imported as a canned response) — Missive's own restriction,
  stated verbatim in each action's description.
- **`shared-label-update`'s visibility/sharing fields need an admin/owner token**; `name`/`color`/
  `parent` do not. Same split on `team-create`/`team-update`, which need an admin/owner token
  outright.
- **`webhook-create` creates a Missive *rule* with a webhook action under the hood** — visible and
  editable later in Missive's own Rules settings, per the vendor's own note.
- **`analytics-report-create`/`analytics-report-get` are two-step by design.** Create returns only an
  `id`; Missive's guidance is to poll Get 5 seconds later and every 5 seconds after — most reports
  finish in 2-3 seconds, some take 30+, and a completed report expires 60 seconds later. An
  incomplete, expired, or unknown report answers an empty 404, which surfaces as a thrown error since
  there is no body to distinguish the three cases from.

## Health checks

Both declared absences, at `informational` severity, plus the derived `auth:api-token` check.

### ~~`service`~~ — a real status page, behind a realtime backend this app cannot read

`status.missiveapp.com` is a genuine, PagerDuty-hosted status page (cookie
`pd_status_page_version`, a PagerDuty-format `status_page_id`, client JS referencing
`api.pagerduty.com` and Ably for realtime updates) — not an unclaimed decoy. But its current
incident/component state is delivered over an authenticated realtime channel rather than a static
feed:

| Probe                                    | Result (2026-08-29)                                          |
| ----------------------------------------- | ------------------------------------------------------------ |
| `GET /api/v2/summary.json`                | 404 with a real `Cannot GET …` body — not a catch-all         |
| `GET /api/v2/status.json`                 | 404, same as above                                            |
| `GET /history.atom`, `GET /history.rss`   | 200, but the page's own 5,061-byte SPA HTML shell             |
| `GET /api/data` (the page's own JS calls) | 200, static layout only (component names, page copy) — no state |
| `GET api.pagerduty.com/status-pages/…`    | 401 — requires a PagerDuty API credential                     |

There is nothing left to probe anonymously, so the check is declared `unavailable` rather than
guessed at.

### ~~`quota`~~ — no proactive rate-limit signal exists

Missive's rate-limits page documents `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset` as headers that accompany the **429** response, never an ordinary one. The
ceilings are fixed and published instead: 5 concurrent requests, 300/minute, 900/15 minutes. There is
also no unauthenticated endpoint to probe ahead of time — every endpoint requires a token (verified
live: `GET /v1/organizations` with no header answers 401).

## Icon

`assets/icon.svg` embeds Missive's own apple-touch-icon PNG (`missive-webclip.png`, downloaded
verbatim from `cdn.prod.website-files.com`, linked from missiveapp.com's own `<link
rel="apple-touch-icon">` tag), re-framed onto the pack's normalized `0 0 100 100` canvas by
`_tools/icon-normalize.ts`. A raster embed rather than a redrawn vector: Missive has no simple-icons
entry and no n8n `nodes-base` icon, and the vendor's own SVG-shaped assets are none — only two PNG
favicons, both too small (32×32 and 256×256) to trace cleanly into vector paths.

## Layout

```
missive/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # MissiveClient, unwrapSingle, error formatting
│   └── params.ts                # shared conversation-routing Param fragments
├── auth/api-token.ts            # bearer token: sign, test
├── actions/                     # one file per action (42)
├── health/
│   ├── service.ts               # declared absence, informational
│   └── quota.ts                 # declared absence, informational
├── assets/icon.svg              # vendor mark (raster, normalized)
└── tests/                       # 134 tests: entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt`
deno task test
```

`deno task validate` fails with an `@w6w/runtime` import-map error — a known pack-wide gap, reproduced
identically and unmodified on the sibling `apify` app. Use the audit tool directly instead:

```bash
cd ../../_tools && deno run --no-check -A audit.ts missive
```
