# GoTo Webinar

Schedule and manage GoTo Webinar webinars, registrants, panelists and attendance.

- **Categories** — video, communication
- **Auth methods** — oauth2
- **Actions** — 13
- **Egress allowlist** — `api.getgo.com`
- **Website** — https://www.goto.com/webinar
- **API docs** — https://developer.goto.com/GoToWebinarV2/

## Verification

Every path, verb, query parameter and body field in this app was verified 2026-09-05 against
the vendor's own `GoTo Webinar 2.0 REST API` Postman collection — embedded as
`openApi.postman.collection` in the page-data GraphQL response Gatsby serves for
`https://developer.goto.com/GoToWebinarV2/`, a live developer portal, not a third-party
integration directory — plus live, unauthenticated probes against `api.getgo.com` and
`authentication.logmeininc.com` confirming both hosts answer with real, vendor-shaped errors
(`{"int_err_code":"InvalidToken","msg":"Invalid token passed"}`, an AWS API Gateway
`UnauthorizedException`) rather than a generic SPA `200`.

## Findings that would have cost a day

1. **Three hosts, and the OAuth one doesn't look related.** The product API
   (`api.getgo.com/G2W/rest/v2`) and GoTo's shared Identity/whoami API
   (`api.getgo.com/identity/v1`) live on the same host, so the manifest's `network.allow`
   needs only `api.getgo.com`. But OAuth itself is a THIRD, differently-branded host —
   `authentication.logmeininc.com` — GoTo's former parent company name (LogMeIn), still live
   and still the actual token issuer for every GoTo product. Guessing an `oauth.goto.com` or
   similar from the product name would fail with no obvious reason why.
2. **Pagination is not uniform across endpoints, and the vendor silently ignores the wrong
   key.** Every list is offset-paged with a zero-indexed `page`, but the page-SIZE parameter
   is spelled **`size`** on `GET .../webinars`, `.../sessions` and `.../attendees`, and
   **`limit`** on `GET .../registrants` — for the identical concept. GoTo does not reject an
   unknown query parameter, so sending `size` to the registrants endpoint doesn't error; the
   page just silently reverts to the vendor's own default cap. Listing webinars additionally
   **requires** a `fromTime`/`toTime` ISO-8601 date range — there is no "list all" call, and
   omitting either is a `400`, not an empty result.
3. **The identity whoami answers an EMPTY body on auth failure**, regardless of whether the
   token is missing or garbage (both probed live) — `content-length: 0`. The only
   classification signal on that specific endpoint is the RFC 6750 `WWW-Authenticate`
   challenge header (`error="invalid_token",error_description="..."`). The product API
   itself, by contrast, DOES return a JSON body (`{"int_err_code","msg"}`) on the same class
   of failure — two different services on the same host, two different error shapes.
4. **No product-specific OAuth scope string is documented.** The collection's own note says
   only `` `collab:` must be used when a token is requested from the Authentication API``,
   with no worked example for GoToWebinar, and the `/authorize` endpoint's own `scope`
   parameter doc says an omitted scope receives "all scopes assigned to your client ID" — so
   this app declares no `scopes` and relies on the OAuth client having GoToWebinar enabled as
   a product in GoTo's developer console, rather than guessing a scope string that could
   silently narrow the token away from Webinar.
5. **`userKey` and `organizerKey` are the same value**, per the collection's own top-level
   note — so `auth/oauth2.ts`'s `afterConnect` reads the SCIM identity's `id` field once at
   connect time and stores it on the Connection's `display.organizerKey`, and every action
   defaults to it (an explicit `organizerKey` param still overrides). Without this, a workflow
   author would need to look up their own organizer key by hand before every single call.

## Deliberately left out

- **`sequence`-type webinar creation** — a `recurrenceStart`/`recurrencePattern`/
  `recurrenceEnd` shape distinct from the plain `times` array `single_session`/`series` use.
  Its exact field names were not exercised against a live account, so `webinar-create` covers
  only `single_session` and `series`.
- **A `quota` health check.** No live response from `api.getgo.com` carried an
  `X-RateLimit-*`-shaped header (checked directly against both the identity and product
  APIs), and the vendor's own rate-limit reference page documents only a flat
  "10 requests/second, default" ceiling with no per-request remaining-count header to read.
  Declaring a quota check with fabricated numbers would be worse than not declaring one.
- **Webhooks, user subscriptions, co-organizers, audio settings, `insessionWebinars`, the
  account-wide (`/accounts/{accountKey}/webinars`) list, and recording assets** — all real,
  documented endpoints in the same collection, left out to keep this first pass to the
  everyday webinar/registrant/panelist/attendance lifecycle.

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.goto.com>

```
GET https://status.goto.com/api/v2/summary.json
```

`status.developer.goto.com` (the URL the GoTo developer portal itself links to) answers a
`302` redirect to `https://status.goto.com/` — verified with `curl -D -` 2026-09-05. This app
declares and calls the redirect TARGET directly, the URL actually confirmed working. It is a
real Atlassian Statuspage (`page.name`: "GoTo Status Page") shared across every GoTo product —
~70 components including "GoTo Webinar API" (distinct from "GoTo Webinar", the end-user
product). `health/service.ts` tracks that one named component's own state rather than the
page-wide rollup, so an incident on an unrelated product (Rescue, GoToMyPC, Grasshopper, …)
does not report GoToWebinar as degraded.

### Is this credential live?

This is what the Auth `test` hook does. The `oauth2` method probes:

```
GET https://api.getgo.com/identity/v1/Users/me
```

GoTo's shared SCIM-flavored "whoami" — the narrowest endpoint that still requires a live
credential and needs no product-specific scope, unlike any Webinar-resource path (which all
additionally require an `organizerKey` this hook does not yet have). See finding 3 above for
why classification falls back to a response header rather than a body on this one endpoint.

### Do we have quota left?

Not declared — see "Deliberately left out" above.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.goto.com` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the auth check. The spec allows the widening precisely
because the check is unsigned; pairing an extra host with `credential: "signed"` is rejected
at load time, so a credential can never reach a status host.

---

Researched and endpoint-verified 2026-09-05 against `developer.goto.com`'s own Postman
collections and live probes against `api.getgo.com` / `authentication.logmeininc.com` /
`status.goto.com`. Status surfaces move; re-check if a probe starts failing for everyone at
once.
