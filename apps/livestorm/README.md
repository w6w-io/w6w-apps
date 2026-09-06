# Livestorm

Create and manage Livestorm events, sessions, registrants and webhooks.

- **Categories** — video, communication
- **Auth methods** — apiKey (private API token)
- **Actions** — 40
- **Egress allowlist** — `api.livestorm.co`
- **Website** — https://livestorm.co
- **API docs** — https://developers.livestorm.co/reference/get_ping

## Verification

Every path, verb, query parameter, request/response field and header in this app was
verified 2026-09-06 against the vendor's own OpenAPI 3.0.3 document — embedded server-side as
`document.api.schema` in the page data ReadMe serves for every
`https://developers.livestorm.co/reference/*` page (a live ReadMe-hosted developer portal, not
a third-party integration directory) — plus live, unauthenticated and garbage-credential
probes against `api.livestorm.co` and `status.livestorm.co`. The full endpoint set (27 paths,
39 operations across Identity, Events, Sessions, People, Jobs, Users and Webhooks) was walked
via the embedded schema rather than page-by-page guessing.

## Auth: private API token, not OAuth2

Livestorm documents two security schemes on the SAME `Authorization` header:

- `api_key` — `type: apiKey`, `in: header`, `name: Authorization`. A private token, generated
  in Livestorm's own settings, with no connect flow. This is the headless, server-to-server
  credential and the one this app declares.
- `oauth2` — a Doorkeeper-backed authorization-code flow, for a THIRD PARTY building an
  installable Livestorm integration with its own registered client id/secret/redirect. It is
  not a fit for a workflow host acting on a single workspace's own behalf, so this app does
  not declare it.

## Findings that would have cost a day

1. **A `Bearer ` prefix routes a good private token to the WRONG credential store.** Both
   security schemes read `Authorization`, and Livestorm decides which one checks the value by
   whether it *looks like* a bearer token. Measured live 2026-09-06 against `api.livestorm.co`
   with a garbage value:

   ```
   Authorization: sometoken123        -> 401 {"errors":[{"status":"unauthorized",...}]}
   Authorization: Bearer sometoken123 -> 401, www-authenticate: Bearer realm="Doorkeeper",
                                          error="invalid_token"
   ```

   A perfectly valid private token sent with `Bearer ` is checked against the OAuth2
   (Doorkeeper) token store instead and rejected as an invalid *access token* — not reported
   as a bad private token, which is exactly the kind of failure that reads like "my key must
   be wrong" when it is really a header-formatting bug. `auth/api-key.ts`'s `sign` sends the
   raw value with no prefix.

2. **Registration/update data is a dynamic `fields: [{id, value}]` array, not top-level
   `email`/`first_name` keys.** `POST /sessions/{id}/people`, `PATCH
   /sessions/{period_id}/people/{id}`, and each task inside `POST
   /sessions/{id}/people/bulk` all take `attributes.fields`, where `id` is a People
   Attribute slug — built-in (`email`, `first_name`, `last_name`, …) or custom, listable via
   `people-attribute-list` (`GET /people_attributes`). The vendor's own request schema has NO
   top-level `email` property on these endpoints at all; sending one is simply ignored rather
   than erroring, which makes the mistake invisible until someone notices registrants show up
   with no email address.

3. **`GET /me`'s documented response schema is a copy-paste of `GET /organization`'s.** Both
   the JSON Schema AND the worked example on `/me`'s reference page describe an
   `organizations` resource (`name`/`slug`/`parent_id`) — not a user/person shape. This looks
   like a spec authoring bug rather than the real wire behavior of "get current user," so this
   app's Auth `afterConnect` reads `GET /organization` instead (unambiguously about the
   organization) for the Connection label, and the `me-get` Action still calls the real
   endpoint and returns whatever it actually sends rather than a guessed-at corrected shape.

4. **One path parameter is spelled two ways for the identical resource.** The vendor's own
   OpenAPI document names the session-people path parameter `period_id` on
   `GET /sessions/{period_id}/people(/{id})` (Livestorm calls a session a "period"
   internally) and `id` on the sibling `POST`/`DELETE /sessions/{id}/people...` endpoints —
   both address the same session ID. Nothing here changes; it is worth knowing so a "the ID
   type must be different" theory doesn't cost time.

5. **List pagination is 0-indexed**, confirmed from the vendor's own `GET /events` example
   response (`"current_page": 0`) — not 1-indexed the way several sibling REST APIs in this
   pack are.

6. **Two independent rate-limit windows are reported on every 2xx response**, not one:
   `RateLimit-Monthly-{Limit,Remaining}` and `RateLimit-Interval-{Limit,Remaining}` (the
   interval window is documented as 1 second). A workflow can exhaust the 1-second burst
   budget while the monthly budget is nowhere near its cap, or vice versa near a monthly
   renewal — `health/quota.ts` reports both as separate `quota[]` entries rather than
   collapsing them into one number.

## Deliberately included despite ambiguity

`event-replace`/`session-replace` (`PUT`) sit alongside `event-update`/`session-update`
(`PATCH`) because the vendor documents both as separate, real endpoints with distinct
summaries ("Fully update" vs "Partially update") — but their request schemas are
field-for-field identical (every attribute optional on both) and the vendor states no
difference in how an omitted field is handled. `PATCH` is the recommended default in both
actions' descriptions; `PUT` is included because it is genuinely a documented endpoint, not
because its full-replace semantics could be confirmed live without risking a real event/session.

`DELETE /events/{id}/tags` is documented as **not** deleting the tag itself from the
workspace — only the assignment to that event. `event-tag-remove`'s description says so.

## Deliberately left out

- **The `oauth2` Auth method** — see "Auth" above.
- **Anything requiring the OAuth2 app-install flow specifically** — there is none in the
  Identity/Events/Sessions/People/Jobs/Users/Webhooks surface this app covers; every endpoint
  reads the same `Authorization` header regardless of which scheme issued the value.

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.livestorm.co>

```
GET https://status.livestorm.co/api/v2/summary.json
```

A real, claimed Atlassian Statuspage — `page.name: "Livestorm"`, `page.url:
"https://status.livestorm.co"` — confirmed live 2026-09-06 (the `livestorm.statuspage.io`
custom-domain alias answers the identical page). Livestorm publishes exactly **one**
component, `"Livestorm app"`, covering the whole product; there is no narrower "API"
component to isolate, so `health/service.ts` reports the page-wide indicator.

### Is this credential live?

This is what the Auth `test` hook does. The `api-key` method probes:

```
GET https://api.livestorm.co/v1/ping
```

Chosen because its documented `200` response carries **no body at all** — it is the one
endpoint in this surface that cannot echo back credential or workspace data, unlike `/me` or
`/organization`. Classification reads the JSON:API `errors[0].status` machine code
(`"unauthorized"`) on a 401 and the vendor's own "Workspace blocked" description on a 403,
rather than trusting the bare HTTP status alone.

### Do we have quota left?

```
GET https://api.livestorm.co/v1/ping   (signed — the same call `test` makes)
```

Reads `RateLimit-Monthly-{Limit,Remaining}` and `RateLimit-Interval-{Limit,Remaining}` off
the response headers of the same probe the credential check already pays for. Declared
`informational`: exhausting a burst window is a temporary backpressure signal, not an outage,
and must not pin the whole App at `down`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.livestorm.co` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the auth or quota checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status host.

## Actions (40)

**Identity** — `me-get`, `organization-get`

**Events** — `event-list`, `event-create`, `event-get`, `event-update`, `event-replace`,
`event-delete`, `event-tag-assign`, `event-tag-remove`, `event-people-list`,
`event-person-get`, `event-session-list`, `event-session-create`

**Sessions** — `session-list`, `session-get`, `session-update`, `session-replace`,
`session-delete`, `session-people-list`, `session-person-get`, `session-person-update`,
`session-person-register`, `session-person-remove-by-email`, `session-person-remove`,
`session-people-bulk-register`, `session-chat-messages-list`, `session-questions-list`,
`session-recordings-list`

**People** — `people-list`, `people-get`, `people-attribute-list`

**Jobs** — `job-get`, `job-tasks-list` (poll a `session-people-bulk-register` result)

**Users** — `user-list`, `user-create`, `user-delete`

**Webhooks** — `webhook-list`, `webhook-create`, `webhook-delete`

---

Researched and endpoint-verified 2026-09-06 against the OpenAPI document embedded in
`developers.livestorm.co`'s own page data and live probes against `api.livestorm.co` /
`status.livestorm.co`. Status surfaces move; re-check if a probe starts failing for everyone
at once.
