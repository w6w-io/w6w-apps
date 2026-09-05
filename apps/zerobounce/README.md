# ZeroBounce

Validate email addresses in real time or in batch, and check credit balance and API usage, via
the [ZeroBounce](https://www.zerobounce.net) v2 API.

- **Categories** — email, marketing
- **Auth methods** — api-key (`apiKey`, query string on GET / JSON body on the batch POST)
- **Actions** — 4
- **Egress allowlist** — `api.zerobounce.net`, `api-us.zerobounce.net`, `api-eu.zerobounce.net`
- **Website** — https://www.zerobounce.net
- **API docs** — https://www.zerobounce.net/docs/email-validation-api-quickstart

## Vendor identification

ZeroBounce ("Email Validation Tools & Email List Cleaning") is a real-time and bulk email
validation SaaS. Confirmed live 2026-09-05 against the vendor's own docs page,
`https://www.zerobounce.net/docs/email-validation-api-quickstart` — a server-rendered Next.js
page whose API reference content, including a full Postman collection, is embedded as JSON in the
raw HTML rather than loaded client-side, so it was fetched and grepped directly rather than
inferred. Every endpoint, parameter and response field below is taken from that document, cross-
checked against `https://status.zerobounce.net/api/v2/summary.json` (a genuine, claimed
Atlassian Statuspage instance) for the host names.

## Three findings that would cost someone a day

1. **Three regional hosts, and the API key travels two different ways.** ZeroBounce serves the
   identical v2 surface from `api.zerobounce.net` (default), `api-us.zerobounce.net` (US-only —
   the docs require you to acknowledge US data processing to use it) and `api-eu.zerobounce.net`
   (EU-only), each a real, separately-monitored Statuspage component. Every GET endpoint takes
   `api_key` as a **query parameter**; `POST /v2/validatebatch` takes it as a **field inside the
   JSON body** instead, with no query-string form documented or accepted. A client that always
   appends `api_key` to the query string — the natural generalization from every other endpoint —
   silently sends an unauthenticated batch request. `auth/api-key.ts`'s `sign` hook branches on
   whether the outbound request already carries a JSON body to cover both cases from one Auth
   method.

2. **Errors are a body shape, not a status code.** Nowhere in the vendor's docs is an HTTP status
   named for an error response. The "Error Response" examples for `/v2/getcredits`
   (`{"Credits":-1}`), `/v2/validate` (`{"error":"Invalid API Key or your account ran out of
   credits"}`) and `/v2/validatebatch` (`{"email_batch":[],"errors":[{"error":...,
   "email_address":"all"}]}`) are all shown with no status annotation, right next to a
   "Successful Response" example that also carries none. This app never gates success on
   `res.ok`/the status code alone (`lib/client.ts`'s `request()`, `auth/api-key.ts`'s `test`, and
   `health/quota.ts` all read the JSON body first) — and it means the getcredits probe this app
   uses for credential liveness is safe from the usual "status-code-only" trap even though the
   vendor's own docs never state what status a bad key returns.

3. **The vendor's API is Cloudflare-WAF-gated against cloud/datacenter source IPs, full stop.**
   Every live probe attempted from this sandboxed development environment against
   `api.zerobounce.net` — with a realistic browser `User-Agent`, valid HTTPS, no unusual headers —
   was rejected with a bare `403` and Cloudflare's `error code: 1020` page (a custom WAF rule, not
   a rate limit or an auth failure) for both a valid-shaped and an invalid API key. This is
   unrelated to key validity and will affect any CI/cloud-hosted test harness the same way; the
   vendor's documented request/response *shapes* used throughout this app were verified from the
   docs page itself, not from a live authenticated call, for exactly this reason.

## Actions

| Action | Endpoint | Type | Notes |
|---|---|---|---|
| Validate Email | `GET /v2/validate` | `read` | Single synchronous validation. Returns `status` (`valid`, `invalid`, `catch-all`, `unknown`, `spamtrap`, `abuse`, `do_not_mail`), `sub_status`, and trust signals (domain age, MX record, free/catch-all detection, best-effort name/geo). Docs state it "will never consume a credit for any unknown result" and, as of the endpoint's full history, is "not currently rate-limited". |
| Validate Email Batch | `POST /v2/validatebatch` | `perform`, `idempotent: false` | Validates several addresses in one call. Returns `{email_batch, errors}` verbatim — a mix of per-address results and per-address (or account-wide) failures can appear in the *same* 200 response, so this app does not throw on a partial failure. No documented maximum batch size was found. |
| Get Credits | `GET /v2/getcredits` | `read` | `{"Credits": <number>}`, where `-1` means the API key is invalid per the docs. The same non-consuming, non-echoing call this app uses for the `auth:api-key` credential probe and the `quota` health check. |
| Get API Usage | `GET /v2/getapiusage` | `read` | Date-ranged (`start_date`/`end_date`, `yyyy-mm-dd`, both required — no default range is documented) call-volume report with a `status_*` breakdown per result/sub-status (30+ fields observed; only the handful the docs discuss by name are declared in `output`). |

All four are exactly the paths in the vendor's own Postman collection — nothing here is inferred
or invented.

### Deliberately out of scope

ZeroBounce's docs also cover several adjacent products and flows this app does not implement,
because each would need its own verification pass this task didn't call for:

- **Email Finder API**, **Domain Search API**, **A.I. Scoring API**, **Activity Data API**, **List
  Evaluator API** — separate products with their own endpoints, not part of "email
  validation/verification" proper.
- **CSV file bulk upload** (`POST /v2/sendfile`, `/v2/filestatus`, `/v2/getfile`,
  `/v2/deletefile`) — lives on a fourth host, `bulkapi.zerobounce.net`, and needs multipart file
  handling and (optionally) a webhook callback URL; `validate-batch` covers the equivalent
  synchronous, in-request case instead.
- **Greylist "Pickup"/"Callback" re-validation**, **Website Availability and WHOIS Checker**,
  **Sandbox Mode** test addresses, and the `activity_data`/`verify_plus` flags documented only for
  the batch POST body — none of these change the core validate/validate-batch/credits/usage
  surface and were left out rather than guessed at.

## Auth

**API Key** (`apiKey`) — minted in the ZeroBounce dashboard's API section. Sent as the `api_key`
query parameter on every GET endpoint; sent as an `api_key` field inside the JSON body for
`POST /v2/validatebatch`, which has no query-string form. See finding 1 above and
`auth/api-key.ts`.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Live probe**, `health/service.ts` — `https://status.zerobounce.net/api/v2/summary.json`, a
genuine, claimed Statuspage instance (`page.name: "Status Updates | ZeroBounce"`), verified live
2026-09-05. It carries three components mapping exactly onto this app's three regional hosts —
`API` → `api.zerobounce.net`, `API-US` → `api-us.zerobounce.net`, `API-EU` →
`api-eu.zerobounce.net` — plus several unrelated to API calling (`Website Members Section`,
`Website & Documents`, `Stripe JS`, three named Cloudflare PoPs) that this check ignores. The
default host's (`API`) component decides the overall state.

### Is this credential live?

The Auth `test` hook — `GET /v2/getcredits`, classified from the `Credits` field in the body
(`-1` = invalid key), never from the HTTP status alone (see finding 2). Chosen over any
alternative because it never echoes the caller's own key back, unlike known traps in this pack
(Mailjet's `/apikey`, Follow Up Boss's `/me`).

### Do we have quota left?

**Live probe**, `health/quota.ts` — the same `GET /v2/getcredits` call, reporting the credit
balance as `HealthQuota.remaining`. There is no separate plan-allocation/`limit` field documented
(ZeroBounce sells credits in packs rather than a recurring monthly cap), so no percentage-based
early warning is computed — only `ok` (positive balance), `down` (exactly zero, verified, not
merely a bad key), or `unknown` (the `-1` invalid-key case, deliberately not scored as `down` so
it doesn't double-count the same failure the derived `auth:api-key` check already reports).
`severity: "informational"`.

## Declared health checks

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | `GET https://status.zerobounce.net/api/v2/summary.json` |
| `quota` | quota | connection | signed | informational | `GET /v2/getcredits` |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` auth method's `test` hook (`GET /v2/getcredits`) |

---

Researched and endpoint-verified 2026-09-05 against the vendor's own docs page
(`https://www.zerobounce.net/docs/email-validation-api-quickstart`) and the live Statuspage feed
(`https://status.zerobounce.net/api/v2/summary.json`). Live authenticated calls could not be
made from this environment (see finding 3); status surfaces and documented shapes move — re-check
if a probe starts failing for everyone at once.
