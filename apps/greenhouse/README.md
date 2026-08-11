# Greenhouse

Read and write Greenhouse Recruiting data — candidates, applications, jobs, interviews, scorecards
and offers — on the **Harvest v3 API**.

- **Categories** — hr
- **Auth methods** — `oauth-client-credentials`, `api-key` (transitional)
- **Actions** — 24 (17 reads, 7 writes)
- **Health checks** — 3 live (`service`, `api`, `quota`) + 1 declared absence (~~`silo`~~) + the two
  derived `auth:*` checks
- **Egress allowlist** — `harvest.greenhouse.io`, `auth.greenhouse.io` (the `service` check adds
  `status.greenhouse.io` to its own hook allowlist, never to the app's)
- **Website** — https://www.greenhouse.io/
- **API docs (v3)** — https://harvestdocs.greenhouse.io/
- **API docs (v1/v2, deprecated)** — https://developers.greenhouse.io/harvest.html
- **Status page** — https://status.greenhouse.io/

Greenhouse is an applicant tracking system. Its data model has one shape worth internalising before
anything else: a **candidate** is a person, an **application** is that person's journey on one job,
and almost every other resource hangs off the application — stages, scorecards, offers, interviews,
attachments, notes. Nearly every workflow against this API is therefore "find the applications
matching X, then do Y to them", and this app's centre of gravity is exactly that path.

> **Everything below was verified against Greenhouse's own sources on 2026-08-11** — its
> machine-readable OpenAPI 3.1 document for Harvest v3 (`info.version` `v3`, 134 paths / 185
> operations, served inside every page of `harvestdocs.greenhouse.io`), the prose guides on that same
> site, the v1/v2 reference at `developers.greenhouse.io/harvest.html` (1,636,662 bytes,
> md5 `858db4086ef0949862309e786707f96f`), and live probes against `harvest.greenhouse.io`,
> `auth.greenhouse.io` and `status.greenhouse.io`. Nothing here came from a third-party integration
> directory.

## Scope: Harvest only, and Harvest v3 only

**Greenhouse publishes several separate APIs, and this app implements exactly one of them.** Not
implemented, and each a distinct product with its own host, auth and docs:

| API | What it is | Why not here |
| --- | ---------- | ------------ |
| **Job Board API** | Public, unauthenticated job listings for a careers site | Different host and no credential; belongs in its own app |
| **Ingestion API** | Bulk candidate ingestion for sourcing vendors | Partner-registered surface |
| **Onboarding API** | Greenhouse Onboarding, a separate product | Separate product |
| **Assessment API** | For assessment vendors to return results into Greenhouse | Vendor-side, not customer-side |
| **Audit Log API** | Organisation audit events | Separate entitlement |
| **Recruiting / Onboarding Webhooks** | Inbound event delivery | Triggers, not actions — see `rfcs/trigger.md` |

And within Harvest, **this app calls `/v3` exclusively**, which is a decision rather than a default.

## The six things most likely to cost you a day

### 1. Harvest v1/v2 is removed on 31 August 2026 — and v3 is not a rename

Every page of the v1/v2 reference carries this banner:

> ⚠️ The Harvest v1/v2 API is deprecated and will be removed on August 31, 2026. Please migrate to
> [Harvest v3](https://harvestdocs.greenhouse.io).

v1 still answers today. `GET https://harvest.greenhouse.io/v1/candidates` returns a real JSON 401,
and its HTTP Basic auth (API key as the username, empty password) works exactly as documented. An app
built on it would also stop working on a date already published, which is why this one does not use
it.

v3 is a different API, not a versioned path. Compared with v1 it changes:

| | v1/v2 | v3 |
| --- | ----- | -- |
| Auth | HTTP Basic, API key as username | Bearer JWT, minted by OAuth 2.0 |
| Pagination | `page` + `per_page`, `Link` with `next`/`prev`/`last` | Opaque cursor, `Link` with `next` only |
| Single-record reads | `GET /v1/candidates/{id}` | *Gone* — filter the list with `ids=` |
| Write actor | `On-Behalf-Of` header | The token's `sub` claim |
| Permissions | Per-endpoint grants on the key | OAuth scopes + the acting user's Greenhouse permissions |

### 2. There are two ways to connect, and one of them expires with v1

**`oauth-client-credentials` — the durable path, and the one to prefer.** Self-serve: the customer
opens API Credentials in Greenhouse, creates a credential, picks **Harvest V3 (OAuth)**, chooses
scopes, and is shown a Client ID and Client Secret. No partner registration, no Greenhouse approval,
no redirect URI. The app posts them to `https://auth.greenhouse.io/token` with
`grant_type=client_credentials` and gets a short-lived JWT.

Modelled as `type: "custom"` rather than `"oauth2"` because this is the machine-to-machine grant, not
the browser authorization-code flow — which is what keeps it working in scheduled and background
runs. The authorization-code flow exists but Greenhouse reserves it for listed partners integrating
with *mutual* customers, and gates scope changes behind Partner Support.

**`api-key` — transitional.** Most Greenhouse customers already hold a Harvest API key from a decade
of v1 integrations, created in a different screen (Dev Center › API Credential Management). Rather
than demand a brand-new credential before anyone can connect, this method exchanges that key for a
v3 token at `https://harvest.greenhouse.io/auth/token`, and then calls **the same v3 endpoints** — the
key never touches a v1 request. Greenhouse's own OpenAPI description of that endpoint says how long
it lasts:

> This endpoint is only accessible with Harvest API keys (non-OAuth) to support migrations into
> Harvest v3. We will deprecate this endpoint when Harvest v1/v2 is deprecated.

So a connection made this way should be replaced with an OAuth one before the sunset. Because both
methods produce the same v3 bearer token, that swap changes nothing about the workflows built on top.

Note also that the **two token endpoints name the TTL field differently** — `expires_in` (integer
seconds) from `auth.greenhouse.io`, `expires` (a string of unstated format) from the transition
endpoint. Reading only one produces a connection that works for an hour and then silently stops
refreshing; [`auth/token.ts`](auth/token.ts) reads both and falls back to the documented one-hour
example.

### 3. Rejecting a credential is 400 in one case and 401 in another

Measured against `auth.greenhouse.io/token` on 2026-08-11, with no valid credential in existence:

| Sent | Status | Body |
| ---- | ------ | ---- |
| nothing | 401 | `{"message":"Unauthorized","errorId":"err-…"}` |
| client id `notaclient` | **400** | `{"message":"client_id=notaclient does not contain a valid client ID suffix","errorId":"err-…"}` |
| well-formed but unknown client id/secret | 401 | `{"error":"invalid_client"}` |
| no `grant_type` | 400 | ``{"message":"Must include `grant_type` parameter in /token request"}`` |
| `grant_type=not_a_grant` | 400 | `{"message":"grant_type=not_a_grant is invalid, please use one of: authorization_code, refresh_token, client_credentials, urn:ietf:params:oauth:grant-type:token-exchange"}` |

Three things follow. One: a status-code classifier calls the malformed client id a *server* problem
and the missing credential a *bad* one, both wrong. Two: the body shape is RFC 6749 (`{error}`) in
one case and Greenhouse's own (`{message, errorId}`) in the others, and on the Harvest hosts it is
`{message}` (v1) or `{message, errors[]}` (v3) — four shapes across one vendor. Three, and worst:

> **`client_id=notaclient does not contain a valid client ID suffix` echoes your client id back.**

A `test` result is persisted and rendered in the health surface, so passing that message through
unfiltered would copy half a credential into it on every failed check. `auth/token.ts#scrub` strips
every secret the app holds out of any string before it leaves an auth hook, matching on the *values*
rather than on a pattern — a regex tuned to today's wording stops working the day Greenhouse rewrites
the sentence, and the failure mode of that is a credential in a stored report.

### 4. A 403 is a normal, expected condition — never a bad credential

Harvest v3 authorises in two independent layers:

1. **The JWT must decode.** If it does not, you get 401.
2. **The granted scopes, *and* the Greenhouse user the token acts as, must cover the call.** If they
   do not, you get 403.

Both layers legitimately refuse a perfectly live credential. Scopes are per-endpoint
(`harvest:candidates:list` and 150 others), and Greenhouse's own guidance for an OAuth credential is
to grant only what is needed. On top of that, the list-endpoints guide states flatly:

> GET endpoints are only accessible by site admin users. All other user types will not return
> results.

So a credential whose `sub` is a recruiter rather than a Site Admin is valid and will 403 (or return
nothing) on every read in this app. The `sub` field's hint says so where someone filling in the form
will see it.

Consequently **`test` treats a 403 as a pass**, reporting "credential is live, but its scopes or
acting user do not cover this read". The alternative — probing `/v3/candidates` and failing on 403 —
reports every correctly-scoped integration as broken, which is the exact trap that made HubSpot and
Shopify probes wrong elsewhere in this pack.

The same reasoning picks the probe: **`GET /v3/user_roles?per_page=1`**, the smallest read in the
covered surface. It is not chosen because it is universally permitted — nothing is — but because a
403 from it is already handled as a pass, so the only thing the probe has to distinguish is
"the token decoded" from "it did not". It returns role names and no credential material of any kind.

The v1 API key has the same property from a different direction: keys carry per-endpoint permissions,
and the v1 reference is blunt about the consequence — "Access to data in Harvest is binary: everything
or nothing. Harvest API keys should be given to internal developers with this understanding and to
third parties with caution."

### 5. A list response is a bare array, and the cursor lives in a header

`GET /v3/<collection>` answers a **bare JSON array**. No envelope, no `records` key, no `total`, no
page metadata in the body at all. The only way to reach page two is the RFC 5988 `Link` header:

```
Link: <https://harvest.greenhouse.io/v3/jobs?cursor=…>; rel="next"
```

v3 emits `next` and nothing else — no `prev`, no `last` — so there is no way to learn the total or to
jump to the end. When the header is absent you are on the last page. Every list action here therefore
returns `items`, `hasMore`, `nextCursor` and `nextUrl`; a client that only read the body would be
unable to page at all.

**And a cursor must travel alone.** The pagination guide is explicit — "When you pass a cursor, it
must be the only query parameter" — and gives `GET /v3/jobs?cursor=…&per_page=50` as an example that
fails with 422. The cursor already encodes the filters and page size of the request that produced it.
This is invisible from a form where a page-size box sits next to a cursor box, so
[`lib/client.ts#buildListQuery`](lib/client.ts) refuses the combination locally with a message naming
exactly which fields to clear, and no list action prefills `per_page` — a default there would break
page two of every paged workflow, and only on the second run.

Two smaller shapes in the same family:

- **Date filters use a pipe**: `created_at=gte|2024-01-01T00:00:00Z`. The OpenAPI document types
  these as objects with `style: "pipeDelimited"`. It is not `created_at[gte]=`, not
  `created_at_after=`, and not a bare timestamp. Greenhouse also asks that you not combine a
  `created_at` filter with an `updated_at` filter in one request.
- **`ids` is capped at 50** per request, comma-separated with `explode: false`. That cap is enforced
  locally rather than spent on a 422.

### 6. `status` on an application means two different things

The OpenAPI document declares two enums for one field name on one endpoint:

| | Vocabulary |
| --- | ---------- |
| `status` **query parameter** | `active` · `rejected` · `hired` · `converted` |
| `status` **response property** | `in_process` · `rejected` · `hired` · `converted` |

They differ by exactly one member. You filter for `active`, and every row that comes back says
`in_process`. Both halves bite: filtering on `in_process` is a 422, and a downstream step comparing
the returned `status` to `active` never matches anything. The option label in the editor says
"Active — in process (returned as `in_process`)" so the mismatch is visible at the point of choosing.

Notes have the same split in the other direction — `publicly_visible` / `privately_visible` /
`admin_only_visible` when reading, `public` / `private` / `admin_only` when creating — so a value
copied out of a `list-notes` result into `create-note` is a 422. The two option lists are kept
deliberately apart in [`lib/params.ts`](lib/params.ts).

Offer statuses are Capitalised (`Created`, `Accepted`, `Rejected`, `Deprecated`), unlike every other
status vocabulary in this API.

## Actions

Twenty-four, all against `harvest.greenhouse.io/v3`. Each list action carries the shared `cursor`,
`perPage`, `ids`, `createdAt`/`updatedAt` and `fields` filters plus its own.

### Candidates and their applications

| Action | Endpoint | Notes |
| ------ | -------- | ----- |
| `list-candidates` | `GET /candidates` | Filter by `email` to answer "do we already have this person?" before creating a duplicate |
| `list-applications` | `GET /applications` | Two different stage-id filters — see below |
| `list-application-stages` | `GET /application_stages` | The stage-history fact table; `current` gives the stage an application is in now |
| `list-attachments` | `GET /attachments` | URLs are signed and short-lived — see "Attachments expire" |
| `list-notes` | `GET /notes` | Thirteen note types; three are creatable |

### Jobs

| Action | Endpoint | Notes |
| ------ | -------- | ----- |
| `list-jobs` | `GET /jobs` | `department_id` and `office_id` are **scalar** here while nearly every other parent filter is a list |
| `list-job-posts` | `GET /job_posts` | `active`, `live` and `internal` are three independent booleans, not one state |
| `list-job-interview-stages` | `GET /job_interview_stages` | The job's stage *definitions* — the ids a move uses |
| `list-openings` | `GET /openings` | `ids` matches the numeric primary key, `opening_id` matches the customer-facing label ("ENG-12") |

### Interviewing and offers

| Action | Endpoint | Notes |
| ------ | -------- | ----- |
| `list-interviews` | `GET /interviews` | A `starts_at` filter silently excludes every all-day interview, which carries `all_day_start_on` instead |
| `list-scorecards` | `GET /scorecards` | Interviewer and submitter are different people; `draft` scorecards are included unless filtered out |
| `list-offers` | `GET /offers` | Offers are **versioned** — without `current_only`, superseded drafts are counted too |

### Organisation reference data

| Action | Endpoint | Notes |
| ------ | -------- | ----- |
| `list-users` | `GET /users` | Service accounts are hidden by default; omitting `deactivated` includes leavers |
| `list-departments` | `GET /departments` | Nested via `parent_id`; `external_id` hooks into an HRIS |
| `list-offices` | `GET /offices` | Same shape. A job has `office_ids` (plural) but one `department_id` |
| `list-sources` | `GET /sources` | The lookup for `source_id` — attribution must be an id, not a label |
| `list-rejection-reasons` | `GET /rejection_reasons` | Greenhouse's built-in reasons are excluded unless `include_defaults` is on |

### Writes

| Action | Endpoint | Idempotent | Notes |
| ------ | -------- | :--------: | ----- |
| `create-candidate` | `POST /candidates` → 201 | no | Optional nested `application` creates the person and their first application in one call, as Greenhouse documents |
| `update-candidate` | `PATCH /candidates/{id}` → 200 | **yes** | Contact and tag fields **replace** the whole collection |
| `create-application` | `POST /applications` → 201 | no | A `oneOf` with two arms: candidate (`job_id`) or prospect (`prospect: true`) |
| `create-note` | `POST /notes` → 201 | no | `EMAIL` notes require four extra fields; the others reject them |
| `move-application` | `POST /applications/{id}/move` → **204** | no | `from_stage_id` is a compare-and-swap guard |
| `reject-application` | `POST /applications/{id}/reject` → **204** | no | The rejection e-mail can be scheduled for a future timestamp |
| `hire-application` | `POST /applications/{id}/hire` → **204** | no | Also closes the named opening |

Four of the seven answer **204 with no body**, so there is no updated record to inspect — read it back
with a list action if you need the new state.

**Harvest v3 accepts no idempotency key on any endpoint**, so a retry is a second real call. Only
`update-candidate` is marked idempotent, and only because a PATCH that touches the keys present in
the body genuinely leaves the same end state when repeated. Everything else would produce a duplicate
person, a duplicate note, or a 422.

### Three write-side traps worth naming

**`update-candidate` replaces collections.** `email_addresses`, `phone_numbers`, `tags` and friends
are whole-collection fields: sending one address does not add an address, it makes that the
candidate's only address. There is no append endpoint, so anything meaning to append has to read the
current list and send it back with the addition. The params are named `replace…` and say so in
capitals, because silently deleting someone's work e-mail is not recoverable.

**`move-application`'s `from_stage_id` is a guard, not a description.** It must match the stage the
application is in *right now*; Greenhouse uses it as a compare-and-swap and refuses a stale move
rather than applying it to the wrong stage. That makes the action safe against stale data and unsafe
to retry — the second call finds the application no longer in `from_stage_id`. A successful move also
fires the job's stage-transition rules, **including automated candidate e-mail**.

**Attachments expire.** Greenhouse hosts them on S3 behind signed links, and its general-considerations
note says "URLs to external resources are valid for 7 days" and that users "should download these
documents immediately after the request is made and should not rely on these URLs to be available for
future requests". `list-attachments` returns metadata and the link, logs a warning at run time, and
downloads nothing — fetching the bytes is a separate step that should happen immediately.

## What is deliberately left out

Harvest v3 has 134 paths. The ones not modelled here, and why:

- **Bulk endpoints** (`/candidates/bulk`, `/users/bulk`, `/openings/bulk`, …) — they return a
  `bulk_action_uuid` to be polled through `/bulk_requests`, which is an asynchronous job pattern
  worth its own design rather than a bolted-on action.
- **Custom-field administration** (`/custom_fields`, `/custom_field_options`, and the department and
  office variants) — organisation configuration, not recruiting operations.
- **Approval flows, approver groups and approvers** — a coherent sub-product of its own with
  ordering, thresholds and sequential/parallel semantics; half of it would be worse than none.
- **`unreject`, `convert_to_candidate`, `delete`** — the remaining application lifecycle verbs. Real
  and documented; omitted only to keep this app's first surface tight, and each is a small addition
  alongside the three lifecycle actions already here.
- **Candidate educations, employments and applied tags** — separate sub-resources
  (`/candidate_educations`, `/candidate_employments`, `/applied_candidate_tags`) rather than fields on
  the candidate.
- **Two-sided date ranges.** The single-operator form (`created_at=gte|…`) is the only one Greenhouse
  documents anywhere. OpenAPI's `pipeDelimited` object rules imply `gte|…|lte|…` would work, but that
  spelling appears in no vendor document and could not be tested without a credential, so this app
  does not emit it and no action offers a second operator.

Nothing was left out because it could not be understood — everything above is documented and could be
added. Two things genuinely could **not** be confirmed and are flagged rather than guessed:

- **The exact body of a 403 from a permission-denied v1 key or an out-of-scope v3 token** was never
  observed on the wire, because no credential was available. The handling is built from Greenhouse's
  own error table (401 = invalid key, 403 = "You don't have access to that record") and from the v3
  troubleshooting guide, both of which are unambiguous about the *meaning*; only the body's shape is
  inferred, and nothing branches on it.
- **The transition endpoint's `expires` format** is declared only as `type: "string"`. Both plausible
  readings are handled and an unreadable value falls back to the documented hour.

## Health checks

| Check | Kind | Credential | What it answers |
| ----- | ---- | ---------- | --------------- |
| `service` | service | none | Is Greenhouse up, per its Statuspage? |
| `api` | dependency | none | Is the v3 API answering, and does the route still exist? |
| `quota` | quota | signed | How much of the 30-second rate-limit window is left? |
| ~~`silo`~~ | dependency | — | Which silo is this organisation on? *Greenhouse does not publish it* |
| `auth:oauth-client-credentials`, `auth:api-key` | credential | signed | Derived from each `test` hook |

### `service` — the verdict comes from the Harvest group, not the page indicator

`status.greenhouse.io` is a real Atlassian Statuspage, verified three ways on 2026-08-11:

| Path | Status | Bytes |
| ---- | ------ | ----- |
| `/api/v2/summary.json` | 200 | 52,224 |
| `/api/v2/definitely-not-real-zzz.json` | **404** | **0** |

`page.name` is `"Greenhouse"`, `page.url` is `https://status.greenhouse.io`, and neither
unclaimed-host signature matches (an unclaimed `*.statuspage.io` is ~127,700 B of HTML, an unclaimed
`*.instatus.com` ~216,800 B; this is 52,224 B of JSON).

It carries **118 components**, and the design decision is which of them speak for this app:

- **Thirty-nine are not Greenhouse** — 22 Fastly CDN points of presence, 17 AWS components — and a
  `Third-Party Integrations` group adds LinkedIn, Slack, Calendly, BambooHR, OpenAI and Adobe
  Acrobat Sign. `status.indicator` rolls up all of them, so deriving the verdict from it would report
  the Harvest API down because a Fastly PoP in Perth is having a bad afternoon.
- **Eleven sit inside a group named exactly `Greenhouse Harvest API`** — Silo 1–9, 101, 201. Those
  are the components that answer the question this check is asked, so they set the state. The page
  indicator goes in the message, and every component is still published so a reader can see the rest.

The AWS components are reported rather than filtered out for a documented reason: Greenhouse's own
note says "In the event AWS S3 is experiencing issues, document attachments will not be available in
Harvest." An S3 incident really is a Greenhouse incident — just not one that makes the API
unreachable, which is precisely the difference between a component report and a verdict.

One implementation detail that would silently drop two thirds of the rows if missed: **component
names are not unique.** "Silo 1" appears three times, under `Greenhouse Recruiting`,
`Greenhouse Harvest API` and `Greenhouse Business Intelligence Connector`, with three different ids
and three independent statuses. Components are keyed by the vendor's id, and each message reads
`<group> — <name>` so a reader can tell which one they are looking at.

### `api` — an unsigned probe that can tell "removed" from "unauthorised"

This is the check that earns its place on *this* vendor, because v3 and v1 order their routing and
authentication oppositely. Measured unauthenticated on 2026-08-11:

| Request | Status | Body |
| ------- | ------ | ---- |
| `GET /v3/candidates` | 401 | `{"message":"Unauthorized","errors":["Token could not be decoded. …"]}` |
| `GET /v3/definitely-not-real-zzz` | **404** | `{"message":"Resource not found"}` |
| `GET /v1/candidates` | 401 | `{"message":"Invalid Basic Auth credentials"}` |
| `GET /v1/definitely-not-real-zzz` | **401** | `{"message":"Invalid Basic Auth credentials"}` |

On v1 the auth gate runs first, so a nonsense path and a real one are byte-identical and an unsigned
probe proves nothing about routing. **On v3 they differ**, so an unauthenticated request to a
documented path distinguishes three states that matter: the route is alive (401), the route is gone
(404), or Greenhouse is not answering (5xx).

A **401 here is a pass** — it proves DNS, TLS, CloudFront, the router and the v3 auth layer are all
working, and that the endpoint this app's actions call still exists. The *body* is checked as well as
the status, because a 401 from a corporate proxy or a CDN error page is not a 401 from Harvest. And
if an unauthenticated read ever returned 200, the check reports `unknown` rather than `ok`: at that
point the probe has stopped proving that a credential is required, which is the failure mode that
made ElevenLabs' `/v1/voices` and Apify's `/v2/store` unusable as probes.

Given a v1/v2 removal date on the calendar, this is the check that notices — a status page reports
incidents, not planned removals, and it will read "All Systems Operational" on the day an endpoint
stops existing.

### `quota` — the window, read from headers present on every response

Greenhouse meters requests and nothing else: no monthly allowance, no record quota. The Rate Limiting
guide describes a **fixed 30-second window** with `X-RateLimit-Limit`, `X-RateLimit-Remaining` and
`X-RateLimit-Reset` (UTC epoch seconds) returned "in **every** API response", and a 429 carrying
`Retry-After` in seconds. Token requests are metered separately on a 60-second window. No numeric
ceiling is published — it is per-integration and discoverable only from the header, which is why
reading the header *is* the check.

"Every response" is what makes it robust: a connection whose scopes do not cover `/v3/user_roles`
gets a 403 and **still** reports real headroom, rather than a permanent `unknown`. A depleted window
reports `degraded` and never `down` — 30 seconds refills itself, and that is a burst, not an outage.

### ~~`silo`~~ — a declared absence, with `severity: "informational"`

The status page does not report "the Harvest API" as one component; it reports eleven silos, because
Greenhouse shards its customers across independent stacks and an incident usually hits one. The
useful question is therefore "is *my* silo up?", and it cannot be answered: no v3 endpoint returns
the organisation's silo, and there is no organisation resource at all in the 134-path document.

The number does appear as a `silo` claim inside the access token in Greenhouse's own published
example JWT. It is not a route to an answer here for two independent reasons: reading it would mean
parsing a credential outside the `sign` hook, which is the one place permitted to see one and is
network-less precisely so it cannot act on it; and nothing published states that the claim's value
maps to the status page's `Silo N` component names — an extremely plausible inference, and still an
inference.

Stated as a declared absence rather than silently omitted, so the next person to notice the eleven
silos knows the question was asked. `severity: "informational"` is required rather than stylistic: an
`unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in a roll-up, so at any
other severity this honest statement would pin the app's verdict at `unknown` forever.

## Development

```bash
deno task validate   # manifest + sandbox conformance audit
deno task check      # typecheck
deno task lint
deno task fmt        # NOT bare `deno fmt` — that rewrites assets/icon.svg
deno task test       # 238 tests
```

The icon is the Greenhouse mark from [Simple Icons](https://simpleicons.org/), taken verbatim
(936 bytes, md5 `503eae18e5712bc3fcf4bbcc5eb90f9f`, `<title>Greenhouse</title>`). `greenhouse.io`
serves a catch-all HTML page for every asset path, so the vendor-favicon route is closed.
