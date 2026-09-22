# Qualtrics

Read the surveys, contact pools and distributions in a Qualtrics account, and
export the responses they collect.

- **Categories** — forms, analytics
- **Auth methods** — api-token
- **Actions** — 15
- **Egress allowlist** — `*.qualtrics.com`
- **Website** — https://www.qualtrics.com
- **API docs** — https://api.qualtrics.com/

## How this app was verified

Everything endpoint-related here was confirmed against the **live production
API**, unauthenticated, on 2026-09-22. That is possible and safe — no data is
exposed — and it is the method to trust for this vendor, because Qualtrics' own
docs site is a client-rendered SPA: every sub-page of `https://api.qualtrics.com/`
returns a **generic 404** to a plain HTTP client (byte-for-byte identical to a
request for a nonexistent random path), so a docs-only integration would be
verifying against nothing.

The method is the **400-vs-404 split**:

- an unauthenticated request to a **real** route hits the auth check first and
  answers `400`/`401` in Qualtrics' own error envelope;
- a request to a route that does **not** exist answers a **different** `404`
  body: `{"meta":{"httpStatus":"404 - Not Found","error":{"errorMessage":"The
  requested resource does not exist."}}}`.

Every path below was confirmed to answer the first shape before an action was
written against it. A route that only returned 200 would prove nothing — HTTP 200
is not evidence of a real endpoint — which is why none of this list rests on one.

## The host is per-account, not global

Qualtrics is **datacenter-sharded**. Every account is pinned to one regional pod
— `iad1`, `fra1`, `syd1`, `yul1`, `ca1`, `gov1`, … — and the API is reachable
only at:

```
https://<datacenterId>.qualtrics.com/API/v3/<resource>
```

The id is not derivable from the credential (auth here is a static API token, not
an OAuth exchange), so it is a connect-time field the user copies from **Account
Settings → Qualtrics IDs**. `afterConnect` records it on the connection's
redacted `display`; `lib/client.ts` reads it from there and builds every request
URL. Action code never sees a credential.

`w6w.network.allow` therefore declares the **wildcard** `*.qualtrics.com` — the
same mechanism `runtime.ts#hostAllowed()` implements for any per-tenant host —
rather than `"*"` or an enumerated (and immediately stale) host list.

## Auth

A **static API token** in the `X-API-TOKEN` header. Qualtrics publishes no OAuth
surface for third-party apps, so the token is the whole authentication story.

The failure shapes were read off the wire, and they are the reason **nothing in
this app classifies a failure from the status code alone**:

| Situation        | Status | `meta.error.errorCode` | `meta.error.errorMessage`                        |
| ---------------- | ------ | ---------------------- | ------------------------------------------------ |
| No header at all | 400    | `ATP_2`                | `Expected authorization in headers, but none…`   |
| Bad token value  | 401    | `DCD_7`                | `Unrecognized X-API-TOKEN.`                      |

Two statuses, two different problems, two different fixes. Flattening them would
tell a user to rotate a token that was simply never attached.

### The probe is `GET /API/v3/whoami`, and it does not leak the credential

It is a real route (it answers `400 ATP_2` unauthenticated, not a 404), it
requires the credential, and its response is the caller's **own profile** —
`userId`, `userName`, `firstName`, `lastName`, `email`, `brandId`, `language`,
`accountType`, … — and **never the API token itself**. That is what makes it safe
where a `/me`- or `/apikey`-shaped probe (Follow Up Boss, Mailjet) would copy a
live credential into the health surface on every check.

## Pagination — documented, not wire-verified

An unauthenticated call 400s/401s before pagination is reachable, so this one
fact comes from public Qualtrics documentation rather than this app's live probe:

> List responses carry `result.nextPage`: a full URL to fetch for the next page,
> or `null`/absent when there are no more pages.

There is **no documented offset/limit query-parameter scheme**, so no action
assumes one. Every list action follows `result.nextPage` **verbatim** up to a
`maxPages` cap (default 10) and returns the combined `elements` plus the
remaining `nextPage`. A one-page response costs exactly one request.

## Actions

| Action | Type | Route |
| --- | --- | --- |
| `survey-list` | search | `GET /surveys` |
| `survey-get` | read | `GET /surveys/{surveyId}` |
| `distribution-list` | search | `GET /distributions?surveyId=…` |
| `response-export-start` | perform | `POST /surveys/{surveyId}/export-responses` |
| `response-export-status` | read | `GET /surveys/{surveyId}/export-responses/{progressId}` |
| `response-export-file-get` | read | `GET /surveys/{surveyId}/export-responses/{fileId}/file` |
| `directory-list` | search | `GET /directories` |
| `directory-contact-list` | search | `GET /directories/{directoryId}/contacts` |
| `directory-contact-get` | read | `GET /directories/{directoryId}/contacts/{contactId}` |
| `mailing-list-list` | search | `GET /mailinglists` |
| `mailing-list-contact-list` | search | `GET /mailinglists/{mailingListId}/contacts` |
| `library-list` | search | `GET /libraries` |
| `user-list` | search | `GET /users` |
| `organization-get` | read | `GET /organizations/current` |
| `event-subscription-list` | search | `GET /eventsubscriptions` |

### The response-export flow

Qualtrics exports are a three-beat flow, modelled end to end because it is where
an automation gets real value without polling a UI:

1. **`response-export-start`** posts `{"format": "json|csv|tsv|xml"}`. Confirmed
   the route exists — a bodyless POST gets an HTTP-layer `411 Length Required`
   before app logic runs, which still proves the route is registered. The body
   shape is per public docs. Each call starts a **new job** and returns a new
   `progressId`, so the action is `idempotent: false`: retrying would turn one
   dropped connection into two jobs against the account's export allowance.
2. **`response-export-status`** polls that `progressId` and returns
   `{percentComplete, status, fileId?}`; `fileId` appears once `status` is
   `complete`.
3. **`response-export-file-get`** downloads the finished file and returns it
   **base64-encoded** with its transport content type, because the response is
   bytes (a ZIP), not JSON — the same shape `boldsign`, `signnow` and
   `dropbox-sign` already use in this pack for a file crossing the worker
   boundary.

### Contacts are scoped, not top-level

Contacts live under a directory (`/directories/{id}/contacts`) or a mailing list
(`/mailinglists/{id}/contacts`). A bare top-level `/contacts` **404s** — it was
probed and confirmed not to exist — so there is no such action.

## Health checks

Three declared checks plus the derived `auth:api-token`.

| Key | Kind | Scope | Credential | Severity | Probe |
| --- | --- | --- | --- | --- | --- |
| `service` | service | app | none | degraded (default) | `health/service.ts` |
| `quota` | quota | connection | signed (default) | informational | _declared absent_ |
| `auth:api-token` | credential | connection | signed | fatal | derived from the `api-token` auth method's `test` hook |

### `service` — the status page, scoped to the API component

Qualtrics runs a real Atlassian Statuspage at `status.qualtrics.com`, verified
live on 2026-09-22: `GET /api/v2/summary.json` answers `200`,
`application/json`, and the body self-identifies as
`"page": {"id": "zzbcdhb83d4t", "name": "Qualtrics"}` with 36 named components.

The page carries UI and delivery surfaces that say nothing about the REST API —
`Survey Taking`, `Logins`, `Live Support`, `Email`, `SMS (Text)`,
`Product Documentation` — and a page-level worst-of across all 36 would report
"Qualtrics is degraded" for a bad day at `Logins`. The component that speaks for
this app is:

```
"0g83y8c83cyz" → "API / Developer Platform"
```

so the check reads **that** component and reports its state, not the page
indicator. A page that stops self-identifying as Qualtrics' (a redirect, a
rebrand) or that drops the component reports `unknown`, never `down`.

### `auth:api-token` — derived, and informational for the unavailable case

The credential check is the auth method's `test` hook (`GET /API/v3/whoami`),
projected automatically into the health surface as `auth:api-token`. The app
declares no separate credential check, because the reserved `auth:` key is
derived rather than authored.

> **Note on severity.** The contract for this app asked for `informational`
> severity "for the unavailable/unreachable case". In this pack the *only* thing
> that reports `unknown` and can pin an app's roll-up is an `unavailable`
> declaration, and the derived `auth:*` check's severity is set by the loader
> (`fatal`) and is not author-controllable. So the `informational` requirement is
> honoured where it can be — on the declared-absence `quota` check below — and
> the credential check stays the derived `fatal` one, as every other app in the
> pack does.

### `quota` — a declared absence, at `informational` severity

Qualtrics publishes **no rate-limit response headers**. The live
`GET /API/v3/whoami` response (queried 2026-09-22, unauthenticated) was inspected
directly for `X-RateLimit-*`, `RateLimit-*`, `Retry-After` and anything else that
counts requests: none were present. Qualtrics documents a `429` as the refusal,
without a readable remaining count or reset, and no endpoint in the covered
surface reports plan limits, remaining calls, contact allowances or response
counts. The app therefore declares the *absence* rather than guessing at a header
name — the pack's `~~quota~~` form.

`severity: "informational"` is load-bearing and not cosmetic: an `unavailable`
entry always reports `unknown`, `unknown` outranks `ok` in the roll-up, and at
any other severity saying "this vendor publishes nothing" would pin the app's
verdict at `unknown` forever.

## Deliberately not covered

- **Every write.** Qualtrics' create/update/delete surface (surveys, contacts,
  distributions, mailing lists, webhooks) is large and none of it was verified
  live, so none of it shipped. The app's value is the read-and-export path.
- **`POST /surveys/{id}/export-responses` body options beyond `format`** —
  labels, display order and the rest are documented but were not verified, so
  only `format` is exposed.
- **Qualtrics' webhook *triggers*** — `event-subscription-list` reads existing
  registrations, but subscribing to a Qualtrics event (creating a subscription,
  verifying a callback) is a Trigger surface this app does not open.
- **`/brands`, `/divisions`, `/workspaces`, `/surveys/{id}/responses`,
  `/response-exports`** — every one of these was probed and **404s** on the live
  API. They are not merely unimplemented; they are not real routes. Responses are
  reached through the export flow, not a `/responses` read.

## Icon

`assets/icon.png` is Qualtrics' own mark, downloaded **verbatim** from
`https://www.qualtrics.com/apple-touch-icon.png` on 2026-09-22 — 16,886 bytes,
`image/png`, `192×105`. (The vendor's `favicon.svg` **404s**; do not reach for
it.) It is stored as a PNG rather than an SVG, matching the pack's convention for
a vendor that publishes only a raster mark — the manifest declares it under
`appearance.icon.url`. It is not touched by `deno task fmt`, whose file list
names only the `.ts` directories, and a test asserts the PNG signature and size
so a redraw or a rename fails the suite.

## Layout

```
qualtrics/
├── package.json                     # manifest — the `w6w` identity block
├── index.ts                         # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                    # QualtricsClient, the {meta,result} envelope, nextPage paging, error formatting
│   └── params.ts                    # shared Param fragments
├── auth/api-token.ts                # X-API-TOKEN: sign, test (/whoami), afterConnect (datacenterId)
├── actions/                         # one file per action (15)
├── health/
│   ├── service.ts                   # status.qualtrics.com, scoped to the API component
│   └── quota.ts                     # declared absence, informational
├── assets/icon.png                  # vendor mark, verbatim
└── tests/                           # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```

Endpoint verification and status surfaces move; if a probe starts failing for
everyone at once, re-check against the 400-vs-404 method above before assuming
the app is wrong.
