# Datadog

Submit metrics and events to Datadog, query timeseries, and read monitors, downtimes, dashboards,
logs, hosts and users — on any of Datadog's nine sites.

- **App id:** `io.w6w.datadog`
- **Auth:** API key, plus an optional application key, plus the site (`api-key`)
- **Actions:** 22
- **Health checks:** `service` · `api` · ~~`quota`~~ · 1 derived (`auth:api-key`)
- **Egress:** the nine `api.<site>` hosts. Status hosts belong to the `service` check's own
  allowlist, not the app's.

## Where this was verified from

Datadog publishes **machine-readable OpenAPI documents**, and this app was built from those rather
than from the rendered reference. They live in the official client repositories — the same files
`docs.datadoghq.com/api/latest/` and every Datadog SDK are generated from:

| Document | Bytes | Paths |
| --- | ---: | ---: |
| [`datadog-api-client-python/.generator/schemas/v1/openapi.yaml`](https://raw.githubusercontent.com/DataDog/datadog-api-client-python/master/.generator/schemas/v1/openapi.yaml) | 1,664,082 | 150 |
| [`.../schemas/v2/openapi.yaml`](https://raw.githubusercontent.com/DataDog/datadog-api-client-python/master/.generator/schemas/v2/openapi.yaml) | 7,585,237 | 950 |

Both fetched **2026-08-11**, and everything below was cross-checked against live probes of all nine
`api.<site>` hosts and all nine `status.<site>` hosts on the same day. Three of the five findings in
this file are **only** visible in the machine spec — the human reference does not render
per-operation `servers` overrides or per-operation `security` blocks — which is why working from the
YAML mattered.

Nothing here came from a third-party integration directory.

---

## The site decision

**Datadog is nine independent deployments, and this app supports all nine.**

Each site has its own hostname, its own organizations, its own data and its own status page. There
is no cross-site read, no redirect, and no endpoint that tells you which site a key belongs to. A
US1 key presented to `api.datadoghq.eu` does not exist there and comes back `403` — the same status
a revoked key returns.

`network.allow` is a static publish-time list, so the choice was between enumerating the sites and
supporting one. Datadog's site set is fixed and published: it is an `enum` on the `site` server
variable in the vendor's own OpenAPI documents, and the same nine appear in the site selector on
every page of the API reference. So all nine are enumerated:

| Site | API host | Status page | `page.name` (measured) |
| --- | --- | --- | --- |
| US1 | `api.datadoghq.com` | `status.datadoghq.com` | `Datadog US1` |
| US3 | `api.us3.datadoghq.com` | `status.us3.datadoghq.com` | `Datadog US3` |
| US5 | `api.us5.datadoghq.com` | `status.us5.datadoghq.com` | `Datadog US5` |
| EU1 | `api.datadoghq.eu` | `status.datadoghq.eu` | `Datadog EU` |
| AP1 | `api.ap1.datadoghq.com` | `status.ap1.datadoghq.com` | `Datadog AP1` |
| AP2 | `api.ap2.datadoghq.com` | `status.ap2.datadoghq.com` | `Datadog AP2` |
| UK1 | `api.uk1.datadoghq.com` | **none** | — (`404`) |
| US1-FED | `api.ddog-gov.com` | `status.ddog-gov.com` | `Datadog Govcloud` |
| US2-FED | `api.us2.ddog-gov.com` | `status.us2.ddog-gov.com` | `Datadog US2 Fed` |

**A wildcard was rejected on evidence, not taste.** `datadoghq.com` carries a wildcard DNS record,
so `api.zzznotreal.datadoghq.com` and `api.us9.datadoghq.com` both resolve — to
`orange.intake.datadoghq.com`, US1's intake. Resolution proves nothing. What separates a real site
from a typo is the certificate: `api.uk1.datadoghq.com` serves `CN=*.uk1.datadoghq.com` and
completes a handshake; the invented hosts fall back to `CN=*.datadoghq.com`, which does not match a
three-label name, so the connection fails outright. `*.datadoghq.com` in an allowlist would accept
every typo as an egress target.

**The site lives on the Connection, not on an Action.** It is a required `select` field on the auth
method, because a key pair belongs to exactly one site's organization — the site and the keys are
two halves of one credential. `afterConnect` republishes it on `connection.display.site`, which is
how `lib/sites.ts` picks the origin without any Action seeing a credential. Every error message
names the host that refused, because a wrong-site key and a revoked key are byte-identical on the
wire and have completely different fixes.

---

## Findings that would have cost a day

### 1. Two of Datadog's v2 write endpoints are not on `api.<site>`

The rendered reference shows every endpoint as `https://api.<site>/…`. The machine spec disagrees
for two of them, via a per-operation `servers` override:

| Operation | Real host |
| --- | --- |
| `POST /api/v2/events` (publish an event) | `event-management-intake.<site>` |
| `POST /api/v2/logs` (submit logs) | `http-intake.logs.<site>` |

Posting to `api.<site>/api/v2/events` is a 404 that reads like a typo in the path. So this app posts
events through **`POST /api/v1/events`**, which genuinely is on `api.<site>`, is not deprecated, and
needs the API key alone — and neither intake host appears in `network.allow`. A test asserts that no
action reaches either.

### 2. `GET /api/v1/validate` answers **403** where the rest of the API answers **401**

Measured live on `api.datadoghq.com`, 2026-08-11:

| Request | Status | Body |
| --- | --- | --- |
| `GET /api/v1/validate`, no key | `403` | `{"errors":["Forbidden"]}` |
| `GET /api/v1/validate`, well-formed fake key | `403` | `{"errors":["Forbidden"]}` |
| `GET /api/v1/validate`, garbage key | `403` | `{"errors":["Forbidden"]}` |
| `GET /api/v1/monitor`, no keys | `401` | `{"errors":["Unauthorized"]}` |
| `GET /api/v2/current_user`, no keys | `401` | `{"errors":["Unauthorized"]}` |
| `GET /api/v2/current_user`, fake keys | `403` | `{"errors":["Forbidden"]}` |
| `GET /api/v1/definitely-not-real-zzz` | `404` | `{"errors":["Not found"]}` |

The rule "401 means no credential, 403 means bad credential" holds across the API and is exactly
backwards on the one endpoint whose job is validating a credential — where it is also
**byte-identical** for missing and invalid. So no verdict in this app comes from a status code:
`auth/api-key.ts` passes only on `200 {"valid": true}`, and `health/api.ts` accepts **either** 401 or
403 as proof the site is reachable.

(The last row is the control: bogus paths 404, so `api.<site>` is routing rather than blanket-
answering.)

### 3. No Datadog status page has an API component

All eight pages publish 38–39 components and they are all *products* — APM, Log Management,
Monitors, Metrics and Infra Monitoring, Synthetics, RUM, Workflow Automation, `www.datadoghq.com`.
Derived across every page rather than eyeballed:

```sh
for h in status.datadoghq.com status.us3.datadoghq.com status.us5.datadoghq.com \
         status.datadoghq.eu status.ap1.datadoghq.com status.ap2.datadoghq.com \
         status.ddog-gov.com status.us2.ddog-gov.com; do
  curl -s "https://$h/api/v2/summary.json" |
    python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["page"]["name"],
      [c["name"] for c in d["components"] if "api" in c["name"].lower()])'
done
# → every line prints its site name and an EMPTY list
```

A green Datadog status page is therefore **not** a statement that `api.<site>` is answering. That is
why there are two checks here instead of one.

### 4. Two error body shapes

- `APIErrorResponse` — `{"errors": ["Forbidden"]}`, an array of **strings**. All of v1, most of v2.
- `JSONAPIErrorResponse` — `{"errors": [{"status","title","detail","source"}]}`, an array of
  **objects**. The JSON:API v2 resources (downtimes, users, …) — 1,255 `$ref` references in the v2
  document (`grep -c '\$ref:.*JSONAPIErrorResponse' v2/openapi.yaml`).

Code that reads `errors[0]` as a string prints `[object Object]` for half the API.
`datadogErrorMessages` handles both and is tested against both.

### 5. Three incompatible spellings of "when"

| Endpoint family | Format |
| --- | --- |
| v1 timeseries, events, metrics, hosts | POSIX **seconds**, `int64` |
| v2 events (`filter[from]`/`filter[to]`) | **milliseconds**, as strings |
| v2 logs (`filter.from`/`filter.to`) | **date math** — `now-15m`, `now` (the vendor's own defaults) |

Getting it wrong returns an empty result rather than an error. Each param hint states the unit its
own endpoint takes. Metric **submission** has its own version of this: `MetricPoint.timestamp` is
seconds, and `Date.now()` places a point ~55,000 years in the future, where Datadog answers `202`
and drops it. Datadog also refuses points outside "10 minutes ahead to 1 hour behind" — with a
`202`. `normalizeMetricPoints` defaults to seconds and the hint states the window; the action does
**not** clamp, because clamping would move a user's data.

Two smaller ones, same category: `GET /api/v1/monitor` returns a **bare array** and, without a
`page`, "returns all monitors without pagination" (this app prefills `page: 0`); and v2 uses
**three** pagination styles — cursor (events, logs), `page[offset]` (downtimes), `page[number]`
(users).

---

## Auth

Two headers, and they are not interchangeable. Each operation's `security` block says which it
needs:

| `security` | Means | Endpoints here |
| --- | --- | --- |
| `[{apiKeyAuth: []}]` | API key **only** | `GET /api/v1/validate`, `POST /api/v2/series`, `POST /api/v1/events` |
| `[{apiKeyAuth, appKeyAuth}, …]` | **both** | every other action |

So the **application key is optional**. An organization-wide API key is often all a deploy pipeline
is given, and it really is enough to submit metrics and events; demanding an application key anyway
would lock that user out of the two actions they came for. `sign` stamps `DD-APPLICATION-KEY` only
when one is present — an empty header is read by Datadog as a key to reject, which would break the
endpoints that need none.

`test` therefore runs two probes and reports what the connection can actually do:

1. **`GET /api/v1/validate`** — the API key. Datadog's own purpose-built check; requires a
   credential (`403` unauthenticated on all nine hosts); its entire response schema is
   `{"valid": boolean}`, one field, so it cannot echo anything; and it is not a resource, so no
   authorization scope can withhold it.
2. **`GET /api/v2/current_user`** — the application key, and only when one is supplied. The one
   endpoint documented as needing "no additional permissions beyond valid authentication", with no
   `AuthZ` alternative in its `security` block, so the most narrowly scoped application key still
   reaches it. Every alternative (`GET /api/v2/users` needs `user_access_read`, `GET /api/v1/monitor`
   needs `monitors_read`) would report a correctly-scoped key as broken.

A connection with no application key **passes** with a message saying every read will be refused.

**Endpoints that return key material are not in this app at all**: `GET /api/v1/api_key`,
`GET /api/v1/application_key` and `GET /api/v2/current_user/application_keys` all hand back the key
itself — the Mailjet `/apikey` and Follow Up Boss `/me` trap. A test scans every source file for
those paths.

Datadog's deprecated `?api_key=` / `?application_key=` query auth is never used: a workflow host logs
request URLs and does not log request headers.

## Health checks

| Check | Kind | Posture | What it answers |
| --- | --- | --- | --- |
| `service` | `service` | `context`, connection-scoped | Product status from **this connection's own** site status page |
| `api` | `dependency` | `context`, connection-scoped | Is `api.<site>` resolving and answering? |
| ~~`quota`~~ | `quota` | declared absent, `informational` | — |
| `auth:api-key` | derived | — | Are the keys live? (from `test`) |

**`service` is per-connection**, which is unusual for a vendor status check and is forced by finding
3's neighbour: there are eight status pages, one per site, and reading US1's for an EU1 connection
would report the wrong continent. It reads `page.url` to guard against a redirect pointing the probe
at another product's page, excludes `group: true` containers, and reports `unknown` — never `down` —
when the status page itself fails.

**UK1 reports `unknown` here, permanently, and says so.**
`status.uk1.datadoghq.com/api/v2/summary.json` returns `404 {"errors":["Not found"]}` — Datadog's
own error envelope, so the hostname resolves into Datadog's infrastructure with no status page
mapped behind it. That is stated rather than papered over; a UK1 connection's live signal is the
`api` check, which works on every site.

**`api` is deliberately unauthenticated, which makes a 401 or 403 a PASS.** It proves the host
resolves, terminates TLS and answers in Datadog's error grammar. Whether the keys are good is the
derived `auth:api-key` check's job — conflating the two is how "the org was renamed" gets
misreported as "your token expired". A `200` to an unsigned probe reports `unknown`, not `ok`:
Datadog never validates an anonymous request, so something else is answering.

**`quota` is a declared absence, and the reason names what *is* reachable.** Datadog's
`X-RateLimit-Limit` / `-Period` / `-Remaining` / `-Reset` / `-Name` headers are real and useful, but
they appear only on the response of the endpoint you just called, in a per-endpoint bucket; there is
no aggregate quota endpoint, so any single probe would report one bucket and imply it spoke for all
22 actions. Unauthenticated responses carry none at all (measured on both the `403` from
`/api/v1/validate` and the `401` from `/api/v1/monitor`). Metric and log submission are documented as
not rate limited; event submission is capped at 250,000/minute per org with no header.

Real per-bucket headroom **is** available and this app can already read it: the
`datadog.apis.usage.per_org` / `per_user` / `per_api_key` metrics and their `_ratio` variants are
ordinary timeseries tagged by `limit_name` — point `metric-query` at
`sum:datadog.apis.usage.per_org_ratio{*} by {limit_name}`. That is not the health probe because
querying timeseries needs the `timeseries_query` scope a correctly-narrowed application key may
legitimately lack, and a check that failed such a key would be worse than no check.

## Actions

### Submission — API key alone is enough

| Key | Endpoint |
| --- | --- |
| `metric-submit` | `POST /api/v2/series` |
| `event-post` | `POST /api/v1/events` |

### Metrics

| Key | Endpoint | Scope |
| --- | --- | --- |
| `metric-query` | `GET /api/v1/query` | `timeseries_query` |
| `metric-list` | `GET /api/v1/metrics` | `metrics_read` |
| `metric-metadata-get` | `GET /api/v1/metrics/{metric_name}` | `metrics_read` |

### Events

| Key | Endpoint | Scope |
| --- | --- | --- |
| `event-search` | `GET /api/v2/events` | `events_read` |
| `event-get` | `GET /api/v2/events/{event_id}` | `events_read` |

### Monitors and downtimes

| Key | Endpoint | Scope |
| --- | --- | --- |
| `monitor-list` | `GET /api/v1/monitor` | `monitors_read` |
| `monitor-get` | `GET /api/v1/monitor/{monitor_id}` | `monitors_read` |
| `monitor-search` | `GET /api/v1/monitor/search` | `monitors_read` |
| `downtime-list` | `GET /api/v2/downtime` | `monitors_downtime` |
| `downtime-get` | `GET /api/v2/downtime/{downtime_id}` | `monitors_downtime` |
| `downtime-schedule` | `POST /api/v2/downtime` | `monitors_downtime` |
| `downtime-cancel` | `DELETE /api/v2/downtime/{downtime_id}` | `monitors_downtime` |

### Dashboards, logs, infrastructure, account

| Key | Endpoint | Scope |
| --- | --- | --- |
| `dashboard-list` | `GET /api/v1/dashboard` | `dashboards_read` |
| `dashboard-get` | `GET /api/v1/dashboard/{dashboard_id}` | `dashboards_read` |
| `log-search` | `POST /api/v2/logs/events/search` | `logs_read_data` |
| `host-list` | `GET /api/v1/hosts` | `hosts_read` |
| `host-totals-get` | `GET /api/v1/hosts/totals` | `hosts_read` |
| `validate` | `GET /api/v1/validate` | none |
| `current-user-get` | `GET /api/v2/current_user` | none |
| `user-list` | `GET /api/v2/users` | `user_access_read` |

Only `downtime-cancel` is `idempotent: true`, and it genuinely is — Datadog retains a cancelled
downtime for about two days, so a retry addresses the same inactive record. That matters: it is the
step that un-mutes production. Nothing else in this app has an idempotency key of any kind, so
`metric-submit`, `event-post` and `downtime-schedule` are all `false`.

## What is deliberately excluded

- **Log submission** (`POST /api/v2/logs`). It lives on `http-intake.logs.<site>`, nine more
  hostnames for a shipping path a workflow host is not the right vehicle for. Log *search* is
  included.
- **Incidents.** `GET/POST /api/v2/incidents` and the whole `incidents/*` tree carry `x-unstable` in
  Datadog's spec ("This endpoint is in public beta"), the official clients gate them behind an
  explicit unstable-operations opt-in, and they additionally require Incident Management to be
  enabled on the org. The schema is under active change, so modelling it now would ship an action
  whose fields drift.
- **Writes to monitors and dashboards** (create / update / delete). Reads and downtimes cover the
  operational workflows; a monitor or dashboard definition is a large nested document better managed
  as code.
- **Recurring downtime schedules** (`recurrences` with RRULEs). One-time windows are what a deploy
  workflow needs; the recurring form is a second `oneOf` branch with its own RRULE grammar and no
  test vehicle here.
- **Key management, org management, integrations, Synthetics, SLOs, RUM, CI Visibility, security.**
  Out of the coherent core this app scopes to.
- **v1 downtimes.** Deprecated by Datadog in favour of v2, which is what this app uses. Even
  `POST /api/v1/host/{host}/mute` is documented as creating a Downtime v2 behind the scenes.

## Icon

`assets/icon.svg` is the Datadog mark from
`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/datadog.svg`, downloaded verbatim on
2026-08-11: 2,998 bytes, `<title>Datadog</title>`, `viewBox="0 0 24 24"`. A test asserts the byte
length and the title, so a redraw fails the suite. `datadoghq.com` itself serves a catch-all HTML
page for every asset path, so it is not a usable source.

## Development

```sh
deno task validate   # manifest + sandbox rules (@w6w/validator via ../../_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt        # never bare `deno fmt` — the task's file list keeps assets/ out
deno task test       # 187 unit tests across 29 files, all with a mocked HookContext
```
