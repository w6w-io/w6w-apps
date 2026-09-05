# Workable

Manage Workable jobs, candidates, pipeline stages, members and webhook subscriptions, over the
account's own **SPI v3 API**.

- **Categories** — hr
- **Auth methods** — `access-token`
- **Actions** — 15 (9 reads, 6 performs)
- **Health checks** — 3 live (`account`, `quota`, `service`) + the derived `auth:access-token`
  check
- **Egress allowlist** — `*.workable.com`
- **Website** — https://www.workable.com
- **API docs** — https://workable.readme.io/reference/generate-an-access-token

> **Everything below was verified against Workable's own sources on 2026-09-05** — the
> `account-root.json` OpenAPI 3.1 document embedded in every page of `workable.readme.io` (66
> paths, `info.version` `3.16.2`), the "Getting started", "Rate limiting", "What's new in v3" and
> "Webhook Subscriptions - Candidates & Employees" prose guides on that same host, and live probes
> of `*.workable.com` and `workable.statuspage.io`. Nothing here came from a third-party
> integration directory.

## There is no vendor host

Every Workable account is reachable at its own subdomain — `https://<subdomain>.workable.com
/spi/v3/...` — confirmed by the OpenAPI document's own `servers` entry
(`https://{subdomain}.workable.com/spi/v3`) and by every worked curl example in the docs. So the
subdomain is a **Connection field**, collected once at connect time, rather than a fixed hostname
in the manifest — the same posture this pack already uses for `zendesk` and `gorgias`.
`w6w.network.allow` is `["*.workable.com"]`.

## Three things that would cost you a day

### 1. An unauthenticated probe cannot tell a real subdomain from a fake one

Unlike Zendesk and Gorgias, `*.workable.com` resolves through a shared Cloudflare edge for **every**
subdomain — verified live: a made-up subdomain and Workable's own documented example account
(`groove-tech`) resolve to the identical two anycast IPs, and an unauthenticated request to either
answers the **byte-identical** `401`:

```
{"error":{"error":{"error":{"name":"invalid_token","state":"unauthorized"},"reason":"unknown","description":"The access token is invalid"}}}
```

That rules out the "probe unsigned, treat any non-404/5xx as reachable" dependency check this pack
uses for Zendesk and Gorgias — it would report `ok` for a Connection whose subdomain is simply
wrong. `health/account.ts` probes **signed** instead (the same trade `apps/azure-blob` makes for
the same reason): a real access token answers `404` from `GET /accounts/:subdomain` when the
subdomain isn't its own account, which is the one signal Workable actually offers.

### 2. Pagination is a body field, and `/candidates` is account-wide despite its own summary

`GET /jobs` and `GET /candidates` return `{ jobs: [...], paging: { next: "<url>" } }` — the next
page is a full URL **inside the JSON body**, not an RFC 5988 `Link` header the way Greenhouse or
GitHub page. Every list action here accepts that URL back as `pageUrl`, which bypasses every other
filter (Workable already encoded them into it).

Separately: the OpenAPI document's own `summary`/`description` for `GET /candidates` say "Returns a
collection of **the job's** candidates" — but `shortcode` is an *optional* query parameter, and the
docs' own prose says plainly: "If no query parameter is defined, all candidates will be returned."
A caller reading only the one-line summary would assume a job filter is required; it is account-wide
by default.

### 3. Two of the vendor's own worked examples give a wrong path

The prose body for both `job-candidates-create` and `update-candidate` shows a curl example against

```
/spi/v3/accounts/{subdomain}/jobs/{shortcode}/candidates/{candidate_id}
```

— a doubled, `/accounts/{subdomain}`-prefixed path. It matches **none** of: the OpenAPI document's
own `operationId` paths (`POST /jobs/{shortcode}/candidates`, `PATCH /candidates/{id}`), the
"Getting started" guide's own curl sample, or every other reference page's documented path. This app
uses the OpenAPI-declared paths — the machine-checked source every other page agrees with — not the
two stale prose examples.

## Auth

A personal **Access Token** (Settings → Integrations → API in Workable), sent as `Authorization:
Bearer <token>`. Shown once at generation; revocable anytime. There is no OAuth 2.0
authorization-code flow for a general integration — a separate "Partner Token" exists, but it
requires applying to Workable's official third-party partner program (its own `X-WORKABLE-CLIENT-ID`
header and UID) and is out of scope here.

No endpoint in Workable's API answers with zero scope requirement, so there is no true "whoami"
probe. `GET /accounts/:subdomain` needs only `r_jobs` — the scope every recruiting-focused token
effectively needs anyway, since `/jobs`, `/candidates`, `/stages` and `/members` all require it too
— and it doubles as proof the token belongs to the entered subdomain (a wrong pairing answers `404`).
A token deliberately scoped to exclude `r_jobs` will fail `test` even though it may be otherwise
live; this is the cheapest available read, not a scope-free one.

## Actions

All against `https://<subdomain>.workable.com/spi/v3`.

### Jobs

| Action | Endpoint | Notes |
| ------ | -------- | ----- |
| `job-list` | `GET /jobs` | `state`, cursor pagination via `since_id`/`max_id`, `paging.next` |
| `job-get` | `GET /jobs/:shortcode` | Full job detail, including description/requirements/benefits when requested |
| `job-stage-list` | `GET /jobs/:shortcode/stages` | The pipeline stages `candidate-move` and `candidate-create` accept |

### Candidates

| Action | Endpoint | Notes |
| ------ | -------- | ----- |
| `candidate-list` | `GET /candidates` | Account-wide unless filtered — see finding #2 above |
| `candidate-get` | `GET /candidates/:id` | Full detail, incl. education/experience trimmed from the list response in v3 |
| `candidate-create` | `POST /jobs/:shortcode/candidates` | `sourced` decides whether the "thank you for applying" email is sent — see below |
| `candidate-update` | `PATCH /candidates/:id` | Scalar fields only; touches only what you set |
| `candidate-move` | `POST /candidates/:id/move` → `202`, empty body | Requires `member_id`, the acting member |
| `candidate-disqualify` | `POST /candidates/:id/disqualify` → `200`, empty body | Requires `member_id`; reason id from `disqualification-reason-list` |
| `candidate-activity-list` | `GET /candidates/:id/activities` | Stage moves, comments, ratings |

**`sourced` is the pivot the vendor calls out explicitly.** Leave it `true` (the API's own default)
and the candidate lands in `Sourced` with no email; set it `false` and Workable treats them as a
real applicant — moved to `Applied` (unless `stage` overrides it) and sent the "thank you for
applying" email. Getting this backwards is the easiest way to silently email a real applicant's
inbox from a migration script, or silently skip the email for someone who actually applied.

### Account

| Action | Endpoint | Notes |
| ------ | -------- | ----- |
| `member-list` | `GET /members` | The ids `candidate-move`/`candidate-disqualify` need for their Acting Member field |
| `disqualification-reason-list` | `GET /disqualification_reasons` | The vendor's own OpenAPI reference gives no example response for this endpoint (schema is a bare `{}`) — the raw body is forwarded as-is rather than a guessed shape |

### Webhooks

| Action | Endpoint | Notes |
| ------ | -------- | ----- |
| `webhook-subscription-list` | `GET /subscriptions` | This credential's registered subscriptions |
| `webhook-subscribe` | `POST /subscriptions` → `201` | `args` is all-or-nothing — see below |
| `webhook-unsubscribe` | `DELETE /subscriptions/:id` | Target URLs must be unique; a duplicate answers `409` |

**`args` is all-or-nothing, and only for candidate events.** Confirmed from both the endpoint's own
request schema and the "Webhook Subscriptions" guide: `args.account_id` must be present whenever
`args` is sent at all, and once you filter a candidate event by job or stage, **both**
`job_shortcode` and `stage_slug` must be present — the guide's own words: "If you want it for all
jobs and stages, include an empty string as a parameter for each." Employee-related events don't use
`args` at all and are advised to omit it. `webhook-subscribe` builds this correctly: `args` (with
`account_id` filled in from the connection's own subdomain — never asked of the caller) is only sent
when Job Shortcode or Stage Slug is set, and the other half of the pair travels as `""`.

Receiving the event itself (a Trigger, with signature verification of `X-Workable-Signature`,
HMAC-SHA256 over the payload) is out of scope for this version — these three actions only manage the
subscription.

## Deliberately out of scope

- **The HR/Employee endpoints** — `/employees`, time off, time tracking, performance review
  templates, onboarding. A separate product surface (Workable HR) from Recruiting.
- **Requisitions and offers** (`/requisitions`, `/offers`) — headcount/finance workflow, a
  different concern from the recruiting-pipeline actions here.
- **The public unauthenticated Job Board surface** (`/api/accounts/:subdomain`, `.../locations`,
  `.../departments`) — no credential involved; belongs in its own app if ever built.
- **The Job Board / Assessment / Video-Interview / Background-Check partner integration surfaces**
  — vendor-side APIs for approved partners, not customer-side recruiting actions.
- **Talent pool candidates** (`POST /talent_pool/candidates`) — a distinct create path from
  job-scoped candidate creation; may be added alongside a talent-pool read surface later.
- **Receiving webhook events** (a Trigger) — see above.

Nothing was left out because it could not be understood. One genuine gap: the response **shape**
of `GET /disqualification_reasons` could not be confirmed (the vendor's own OpenAPI schema and
example for it are both an empty `{}`), so `disqualification-reason-list` forwards the raw body
rather than declaring a guessed `output`.

## Health checks

| Check | Kind | Scope | Credential | Severity | Min interval | What it answers |
| ----- | ---- | ----- | ---------- | -------- | ------------- | ---------------- |
| `account` | dependency | connection | **signed** | degraded | 120s | Does this token belong to this connection's subdomain? (see finding #1 — cannot be unsigned) |
| `quota` | quota | connection | signed | informational | 60s | `X-Rate-Limit-*` headroom on the 10-req/10s account-token window |
| `service` | service | app | none | degraded | 60s | Workable's own Statuspage, anchored on the "Recruiting and applicant tracking" component |
| `auth:access-token` | credential | connection | signed | fatal | — | Derived from the `access-token` auth method's `test` hook |

### `account` — why this one has to be signed

Every other connection-scoped dependency check in this pack (Zendesk, Gorgias) probes
unauthenticated so a revoked credential does not read as an outage. Workable gives no such signal —
see finding #1. `GET /accounts/:subdomain`, signed, answers `404` when the token and subdomain don't
belong to the same account, `401` when the token itself is dead, and `200` when both are fine. This
overlaps in what it measures with the derived `auth:access-token` check; both exist because a host
may cache the two on different schedules.

### `quota` — built from documented headers, unverified live

The "Rate limiting" guide documents 10 requests / 10 seconds for account tokens (50/10s for OAuth
and Partner tokens — not applicable here), reported via `X-Rate-Limit-Limit` /
`X-Rate-Limit-Remaining` / `X-Rate-Limit-Reset` on every response. This could not be verified
live — no real access token was available while building this app, and an unauthenticated request
carries **none** of these headers (confirmed live: a `401` response has no `X-Rate-Limit-*` at all).
`resetAt` is read as a Unix epoch timestamp, since the guide's own wording ("Timestamp of next
interval") reads as absolute rather than the seconds-from-now form Zendesk's `ratelimit-reset` uses.

### `service` — the recruiting component can outrank a clean page indicator

`status.workable.com` 301s to `workable.statuspage.io`, a real Atlassian Statuspage (verified live
2026-09-05) with a genuine `Workable Recruiting` component group — not an unclaimed decoy. There is
no component named plainly "API"; the closest match to what this app's endpoints touch is
"Recruiting and applicant tracking", so the check folds that component's own state in whenever it
outranks the page-wide indicator, rather than trusting the page-wide indicator alone (Workable runs
several products — HR, e-signatures, job boards — on one status page, and an incident in one of
those would otherwise never move the number this app cares about).

## Icon

`assets/icon.png` — Workable's `apple-touch-icon.png`, taken verbatim from
`https://www.workable.com/apple-touch-icon.png` on 2026-09-05.

- 25,054 bytes, `image/png`, 192 × 192

## Development

```bash
deno task validate   # manifest + sandbox conformance audit
deno task check      # typecheck
deno task lint
deno task fmt        # NOT bare `deno fmt`
deno task test
```
