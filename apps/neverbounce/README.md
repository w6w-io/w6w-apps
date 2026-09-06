# NeverBounce

Verify email addresses one at a time or in bulk jobs, and check credit balance, via the
[NeverBounce](https://neverbounce.com) v4.2 API.

- **Categories** — email, marketing
- **Auth methods** — api-key (`apiKey`, query string on GET / JSON body on every POST)
- **Actions** — 10
- **Egress allowlist** — `api.neverbounce.com`
- **Website** — https://neverbounce.com
- **API docs** — https://developers.neverbounce.com/docs/api-getting-started

## Vendor identification

NeverBounce ("Real Time Email Verification") is an email verification SaaS, now a ZoomInfo
product. Confirmed live 2026-09-06 directly against the vendor's own OpenAPI 3.1 definition —
`https://developers.neverbounce.com/docs/api-getting-started` names "OpenAPI" but links no
download; the actual spec is embedded by ReadMe.io directly in each `/reference/*` page's
server-rendered HTML (`<script id="ssr-props" type="application/x-ssr-props">` →
`document.api.schema`), and one page (`/reference/account-info`) carries the **entire** spec —
every path, parameter and response shape below is read straight out of that JSON, not inferred
from prose. Cross-checked against `https://status.zoominfo.com/api/v2/summary.json` (a genuine,
claimed Atlassian Statuspage instance) for the vendor's real operating name and status surface.

## Three findings that would cost someone a day

1. **The API key travels two different ways depending on the verb, and the OAS security scheme
   only documents one of them.** The spec's `securitySchemes` declares a single `apiKey`-in-query
   parameter named `key` — accurate for `GET /single/check`, `GET /jobs/status`, etc. But every
   documented **POST** example (`/jobs/create`, `/jobs/parse`, `/jobs/start`, `/jobs/delete`) sends
   `key` as a field **inside the JSON request body** instead, not as a query parameter. A client
   that always appends `key` to the query string — the natural generalization from the OAS security
   scheme alone — would silently send an unauthenticated POST. `auth/api-key.ts`'s `sign` hook
   branches on whether the outbound request already carries a JSON body, exactly the fix this pack
   already shipped once before for ZeroBounce's identical split.

2. **Nearly every error is a 200 with a `status` field, not an HTTP status code.** Per
   `docs/error-handling`: *"All 2xx level responses will contain a `status` property... When an
   error does occur a `message` property will be included... **these error messages will be
   returned with a 200 level status code.**"* The documented `status` values are `success`,
   `general_failure`, `auth_failure`, `temp_unavail`, `throttle_triggered`, and `bad_referrer` —
   none assigned a distinct HTTP code anywhere in the docs or the OAS response examples. This app
   never gates success on `res.ok` alone (`lib/client.ts`'s `request()`, `auth/api-key.ts`'s
   `test`, and `health/quota.ts` all read the JSON body's `status` field first) — the credential
   probe this app uses is safe from the usual "status-code-only" trap even though the vendor never
   states what HTTP code a bad key returns. A genuine transport-level exception still exists and is
   separately documented (`413 Entity Too Large` on an oversized `/jobs/create` body).

3. **`GET /jobs/download` isn't JSON at all, and the OAS spec itself says so.** It returns
   `application/octet-stream` (a CSV file); the vendor's own docs state *"Because of this, the API
   explorer is not available"* and the embedded OAS marks this path's `validation.status` as
   `"invalid"` — *"Unable to locate the API definition for this file"* — because ReadMe's tooling
   can't model a non-JSON response either. `jobs-download` is the one action that reads the fetch
   response as raw text instead of JSON (`lib/client.ts`'s `downloadCsv`), and still has to guard
   against a JSON *error* body (e.g. `{"status": "auth_failure"}`) landing in the same code path.

## Actions

| Action | Endpoint | Type | Notes |
|---|---|---|---|
| Verify Email | `GET /single/check` | `read` | Single synchronous verification. Returns `result` (`valid`, `invalid`, `disposable`, `catchall`, `unknown`), diagnostic `flags`, and optional `address_info`/`credits_info` breakdowns (sent as `1`/`0` query flags, not real booleans, per the OAS). |
| Create Job | `POST /jobs/create` | `perform`, `idempotent: false` | Creates a bulk job from a remote CSV URL or supplied rows. Supplied rows are sent as an array of `{id, email, name}` objects — the shape every vendor SDK sample (Node.js, Python, C#) accepts, taken from the OAS's own "cURL Supplied Data" JSON example. |
| Parse Job | `POST /jobs/parse` | `perform`, `idempotent: true` | Begins parsing a job created without Auto-Parse. Returns a `queue_id`, not a result — parsing is asynchronous. |
| Start Job | `POST /jobs/start` | `perform`, `idempotent: false` | Begins processing a parsed job. Also returns a `queue_id`. |
| Get Job Status | `GET /jobs/status` | `read` | Job lifecycle state (`job_status`), `percent_complete`, and result totals by category. |
| Get Job Results | `GET /jobs/results` | `read` | Paginated per-row verification results (`page`/`items_per_page`, documented 1–1000, left unenforced locally rather than inventing a hard cap). |
| Download Job Results | `GET /jobs/download` | `read` | Downloads the job as a raw CSV string (see finding 3). Only the documented Segmentation flags (`valids`/`invalids`/`catchalls`/`unknowns`/`disposables`/`include_duplicates`/`only_duplicates`/`only_bad_syntax`) plus the `email_status` Append are modeled — the vendor documents several more Append/Settings options (`bad_syntax`, `free_email_host`, `role_account`, `addr`, `host`, `binary_operators_type`, and others) left out to keep the action's surface reasonable. |
| Delete Job | `POST /jobs/delete` | `perform`, `idempotent: true` | Permanently deletes a job and its results. |
| Search Jobs | `GET /jobs/search` | `read` | Lists/filters jobs on the account by id, filename (exact match), status, with pagination. `job_status` has no documented closed enum, so it stays free-text rather than an invented `select`. |
| Get Account Info | `GET /account/info` | `read` | Credit balance (`credits_info`) and job counts (`job_counts`). The same call this app uses for the `auth:api-key` credential probe and the `quota` health check. |

All ten are exactly the paths declared in the vendor's own OpenAPI 3.1 definition — nothing here is
inferred or invented.

### Deliberately out of scope

- **`POST /poe/confirm`** (`operationId: widget-poe-confirm`) — exists in the OAS, but it's the
  server-side confirmation half of NeverBounce's client-side JS **verification widget** flow. Its
  required `transaction_id`/`confirmation_token` pair is minted by that widget running in an end
  user's browser as part of a signup form, not something a workflow action could supply on its own
  — the whole flow assumes a browser-embedded script this app has no access to.
- **Additional `jobs-download` Append/Settings parameters** — see the Actions table above.

## Auth

**API Key** (`apiKey`) — a static key minted per `docs/authentication` by creating a "Custom
Integration App" in the NeverBounce dashboard (`secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`). Sent as
the `key` query parameter on every GET endpoint; sent as a `key` field inside the JSON body for
every POST endpoint, which has no query-string form in the vendor's own examples. See finding 1
above and `auth/api-key.ts`.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Live probe**, `health/service.ts` — `https://status.zoominfo.com/api/v2/summary.json`. Verified
live 2026-09-06: `status.neverbounce.com` 301s straight to `status.zoominfo.com` (NeverBounce is a
ZoomInfo product) and `neverbounce.statuspage.io` is the unclaimed-Statuspage decoy pattern (302s
to Atlassian's own marketing page). The real page is a genuine, claimed Statuspage instance
(`page.name: "ZoomInfo"`) carrying a component literally named `NeverBounce` (id `tzcx0fl6mw4m`)
among a dozen unrelated ZoomInfo products (Sales, Enrich, Talent, Chorus, Datanyze, ...) — this
check reads only that one component, never the page-level rollup, since a Sales or Talent incident
says nothing about this app's API.

### Is this credential live?

The Auth `test` hook — `GET /account/info`, classified from the `status` field in the body
(`auth_failure` = invalid key), never from the HTTP status alone (see finding 2). Chosen because it
never echoes the caller's own key back, unlike known traps in this pack (Mailjet's `/apikey`,
Follow Up Boss's `/me`) — the response carries only `credits_info` and `job_counts`.

### Do we have quota left?

**Live probe**, `health/quota.ts` — the same `GET /account/info` call, summing
`credits_info.paid_credits_remaining` + `credits_info.free_credits_remaining` as
`HealthQuota.remaining`. There is no separate plan-allocation/`limit` field documented (NeverBounce
sells credits in packs, not a recurring monthly cap), so no percentage-based early warning is
computed — only `ok` (positive balance), `down` (exactly zero, verified), or `unknown` (an
`auth_failure` status, deliberately not scored as `down` so it doesn't double-count the same
failure the derived `auth:api-key` check already reports). `severity: "informational"`.

## Declared health checks

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | `GET https://status.zoominfo.com/api/v2/summary.json`, scoped to the `NeverBounce` component |
| `quota` | quota | connection | signed | informational | `GET /account/info` |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` auth method's `test` hook (`GET /account/info`) |

## Icon

`assets/icon.png` is NeverBounce's own favicon, downloaded verbatim from their developer portal's
own hosted branding asset: `https://files.readme.io/7680b5d-small-new_favicon.png` (32×32 PNG,
the checkmark-in-envelope mark also used, at larger size, in the portal's `NeverBounce by
ZoomInfo` full logo). No SVG version of the mark could be found — `neverbounce.com`'s and
`www.neverbounce.com`'s own pages 403 to automated requests (Cloudflare bot protection), so their
rendered `<link rel="icon">` tags couldn't be read directly, and no NeverBounce entry exists in
simple-icons or n8n's `nodes-base` icon set.

---

Researched and endpoint-verified 2026-09-06 against the vendor's own OpenAPI 3.1 definition
(embedded in `https://developers.neverbounce.com/reference/*`) and the live Statuspage feed
(`https://status.zoominfo.com/api/v2/summary.json`). Status surfaces and documented shapes move —
re-check if a probe starts failing for everyone at once.
