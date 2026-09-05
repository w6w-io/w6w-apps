# Zoho Calendar

List, read, create, update and delete calendars and events in Zoho Calendar; search event titles;
read a group's RSVP status for an event; check a user's free/busy availability.

Scoped to **Zoho Calendar specifically**. This pack already ships `zoho` (Zoho CRM), `zohobooks`
and `zohodesk`, separate products with separate API surfaces — do not confuse the four, and do not
modify any of those apps from here.

- **Categories** — calendar, productivity
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 13
- **Egress allowlist** — `calendar.zoho.com`, `calendar.zoho.eu`, `calendar.zoho.in`,
  `calendar.zoho.com.au`, `calendar.zoho.jp`, `calendar.zohocloud.ca`, `calendar.zoho.com.cn`,
  `calendar.zoho.sa`
- **Website** — https://www.zoho.com/calendar/
- **API docs** — https://www.zoho.com/calendar/help/api/introduction.html

## Actions

| Resource   | Actions                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| Calendar   | list, get, create, update, delete                                       |
| Event      | list, get, create, update, delete, search, get group attendees          |
| Free/Busy  | get                                                                     |

Deliberately absent:

- **File attachments** (`attach-file`/`delete-attachment`) — both need a multipart file upload,
  outside this app's JSON-only action set.
- **Move Event** — a non-standard `MOVE` HTTP verb Zoho documents for moving an event between
  calendars; left out rather than guessed at.
- **The `conference` field** on Create/Update Event — attaching a live Zoho Meeting link needs the
  separate `ZohoMeeting.meeting.ALL` OAuth scope, which this app does not request (see "OAuth
  scopes" below). Adding the field without the scope would ship an action that silently fails for
  every connection.

## Write payloads are a JSON-encoded QUERY PARAMETER, not a request body

Every documented `POST`/`PUT` sample request for Calendars and Events encodes its whole payload as
`?calendarData={...}` / `?eventdata={...}` — a JSON string in the URL, **not**
`application/json` in the body. This is unlike every other Zoho product this pack ships (CRM,
Books, Desk all take a real JSON body) and is the easiest assumption to carry over wrong: a JSON
body posted to these endpoints is simply never read, and the request fails as if the mandatory
field were missing. `lib/client.ts#jsonParam` + `ZohoCalendarClient` bake this in so no action file
has to get it right on its own.

## Updating an event REPLACES it — it does not patch

Zoho's own doc for `put-update-event.html` says so in as many words: "The update operation
replaces the entire event resource, overwriting all existing fields with the values provided in
the request." `event-update`'s description repeats this loudly and requires the same `start`/`end`
fields Create Event does, but it cannot stop a caller from omitting a field they meant to keep — a
call that sends only a new `title` will clear `location`, `attendees`, `reminders` and everything
else already on the event. **Fetch the event first (`event-get`) and pass the full desired state.**
Update Calendar, by contrast, is a genuine partial patch — send only what changed.

## `etag` is a real precondition, not an incidental field

Both `event-update` and `event-delete` require the event's current `etag` (from `event-get`) and
reject a stale one. This is optimistic concurrency control, not a formality — a workflow that
caches an `etag` across a long-running process risks the update/delete failing outright once
someone else has touched the event in between.

## OAuth scopes

`ZohoCalendar.calendar.ALL` (calendars), `ZohoCalendar.event.ALL` (events),
`ZohoCalendar.search.ALL` (`/search`) and `ZohoCalendar.freebusy.ALL` (`/calendars/freebusy`) — the
union every action in this app needs. Zoho Calendar's scope vocabulary is per-resource with
`.ALL`/`.READ`/`.CREATE`/`.UPDATE`/`.DELETE` suffixes, the same shape as Zoho Books' and Zoho
Mail's. `ZohoMeeting.meeting.ALL` is needed only for the `conference` field this app leaves out —
see "Deliberately absent" above.

## Regional data centres (all eight)

Zoho hosts every account in one of **eight** regional data centres — United States, Europe, India,
Australia, Japan, Canada, China, Saudi Arabia. Zoho Calendar's own docs
(`introduction.html`) name only `calendar.zoho.com` and never mention a second host — but an
OAuth token is only valid against the API host matching the *authorizing* account's data centre, so
scoping this app to that one host would silently fail for every non-US account. Verified live
2026-09-05 by probing `https://calendar.zoho.<tld>/api/v1/calendars` unauthenticated on all eight
candidate hosts: every one is a real, distinct Zoho Calendar deployment, answering the documented
error envelope (`{"error":[{"error_code":"INVALID_TICKET",...}]}`) rather than a generic 404 or an
unrelated service. Zoho Calendar follows Zoho Mail's `<product>.zoho.<tld>` naming convention, not
CRM/Books' shared `www.zohoapis.<tld>`.

Because the OAuth host is baked into the authorization flow itself (the browser is redirected to a
specific accounts host before any in-flow field could be read), a single `oauth2` auth method with
a "data centre" selector cannot express this — RFC `auth.md`'s `oauth2.authorizationUrl` /
`tokenUrl` are static per method. So `auth/oauth2.ts` declares **one `AuthDefinition` per data
centre** instead (`oauth2-us`, `oauth2-eu`, `oauth2-in`, `oauth2-au`, `oauth2-jp`, `oauth2-ca`,
`oauth2-cn`, `oauth2-sa`) — the user picks the method matching their account's data centre when
connecting, and `w6w.network.allow` lists every corresponding API host so any of the eight can be
used.

**Canada breaks the naming pattern on BOTH the API host and the accounts host — not just the
accounts host, like this pack's other Zoho apps.** `zohobooks`/`zohodesk` only need their *accounts*
host corrected for Canada (`accounts.zohocloud.ca`, not `accounts.zoho.ca`); their own API host
still follows the plain `<tld>` pattern (`www.zohoapis.ca`). Zoho Calendar's API host does not:
`calendar.zoho.ca` fails to resolve at all —

```
$ curl -v https://calendar.zoho.ca/api/v1/calendars
* Could not resolve host: calendar.zoho.ca
```

— while `calendar.zohocloud.ca` resolves and answers the documented error shape. Same story on the
accounts side: `https://accounts.zoho.ca/oauth/v2/auth` fails to connect at all, while
`https://accounts.zohocloud.ca/oauth/v2/auth` answers `302` (a real redirect to the Zoho login
page) for the same syntactically-valid authorize request. Assuming the `<tld>` pattern for all
eight regions — the easy mistake, since seven of the eight DO follow it — breaks **both** ends of
OAuth for this one region, in a way that looks like a typo rather than a design fact. `oauth2-ca`
and `lib/regions.ts` use `calendar.zohocloud.ca` / `accounts.zohocloud.ca` deliberately.

Each `oauth2-<region>` method's `afterConnect` records that region's fixed `apiHost` on the
connection unconditionally — `lib/client.ts#apiHostFromConnection` reads it back on every action.

## The error envelope is `{"error":[{...}]}`, an ARRAY

Unlike Zoho CRM's/Books'/Desk's flat `{"code","message"}` object, Zoho Calendar wraps every error in
an array under `error`. Confirmed live 2026-09-05:

| Request                                  | HTTP | `error_code`        | Meaning                                    |
| ------------------------------------------ | ---- | -------------------- | -------------------------------------------- |
| No `Authorization` header at all           | 400  | `INVALID_TICKET`     | No usable token reached the request          |
| `Authorization: Zoho-oauthtoken garbage`   | 401  | `INVALID_OAUTHTOKEN` | The token is syntactically present but dead  |

`lib/client.ts#formatCalendarError` and `auth/oauth2.ts`'s `test` hook both key off `error_code`,
not the bare HTTP status.

## Collection and single-record responses both wrap under one array key

A list is `{"calendars": [...]}` / `{"events": [...]}`; a get/create/update/delete of one record
is the *same* shape holding a single-element array — never a bare object. `lib/client.ts#unwrapFirst`
always takes the first (and only) entry for the singular cases; `unwrapArray` reads a genuine list.

## No documented pagination

`GET /calendars` returns every calendar in one response — Zoho documents no `page`/`per_page` for
it, and a user's calendar count is small. `GET .../events` has no pagination parameters either; it
is bounded instead by the mandatory `range` window, which Zoho caps at **31 days**.
`GET .../search` is bounded similarly, capped at **3 months**. This app does not enforce either
cap client-side — a wider window simply gets Zoho's own rejection.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zoho` (Zoho
CRM), `zohobooks` and `zohodesk` apps read.

```
GET https://us.zohostatus.com/rss
```

The RSS feed lists every Zoho product on one page as one item per component, titled
`"{component} - {status}"`. `health/service.ts` declares this as a `feed` check and finds the
entry whose component name is exactly `"Zoho Calendar"` — confirmed live 2026-09-05
(`"Zoho Calendar - Operational"`, distinct from the generic Zoho umbrella entries on the same
page).

| StatusIQ status      | Mapped state |
| --------------------- | ------------ |
| Operational           | ok           |
| Under Maintenance     | degraded     |
| Degraded Performance  | degraded     |
| Partial Outage        | degraded     |
| Major Outage          | down         |

### Is this credential live?

This is what each `oauth2-<region>` method's `test` hook does — the app's own health check, and the
only one of the three it performs itself, derived per region into `auth:oauth2-us`,
`auth:oauth2-eu`, etc.

```
GET /calendars
```

The cheapest authenticated call this app knows: it needs only `ZohoCalendar.calendar.READ` and no
path parameters at all. Classified by the vendor's own `error_code`, not by HTTP status alone —
see "The error envelope..." above for the two codes and what each means.

### Do we have quota left?

**Declared unavailable.** `GET /calendars`, checked both unauthenticated and with a dead OAuth
token, carries no `X-RateLimit-*`, `RateLimit-*`, `Retry-After` or similarly named header on either
response, and Zoho's own docs (`introduction.html`, `response-codes.html`) never mention a
rate-limit surface for this API at all — unlike CRM's `X-API-CREDITS-REMAINING`. `health/quota.ts`
states this as a positive absence with `severity: "informational"` (required — an `unavailable`
check always reports `unknown`, which outranks `ok`, so any other severity would pin the App's
verdict at `unknown` forever) rather than leaving a silent gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                    | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                        |
| ----------------------- | ---------- | ---------- | ---------- | -------------- | ------------ | -------------------------------------------------------------- |
| `service`               | service    | app        | none       | degraded       | 300s         | `health/service.ts` (feed)                                     |
| `quota`                 | quota      | —          | —          | informational  | —            | ~~declared unavailable~~ (`health/quota.ts`)                    |
| `auth:oauth2-<region>`  | credential | connection | signed     | fatal          | —            | derived from each region's `oauth2-<region>` `test` hook (8)   |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

## Findings worth a day saved

1. **The API host is `calendar.zoho.<tld>`, not `www.zohoapis.<tld>`.** Zoho Calendar's own docs
   name only `calendar.zoho.com`; carrying over the `www.zohoapis.<tld>` assumption from this
   pack's other Zoho apps would silently misroute every non-US connection. See "Regional data
   centres" above.
2. **Canada breaks the naming pattern on BOTH hosts, not just the accounts host.** Every other Zoho
   app in this pack that documents the Canadian quirk only needs its *accounts* host corrected;
   Zoho Calendar's own *API* host (`calendar.zoho.ca`) doesn't resolve at all either — the real one
   is `calendar.zohocloud.ca`. See "Regional data centres" above.
3. **Write payloads are a query parameter, not a request body.** Every Create/Update sample
   request in Zoho's own docs encodes the payload as `?calendarData=`/`?eventdata=` in the URL. A
   JSON body posted instead is simply never read. See "Write payloads..." above.
4. **`PUT` (Update Event) replaces the whole event.** Sending only the field you meant to change
   clears everything else — there is no partial-update path for events (Update Calendar, by
   contrast, genuinely is one). See "Updating an event REPLACES it" above.

---

Researched and endpoint-verified 2026-09-05 against
`https://www.zoho.com/calendar/help/api/introduction.html` and the pages it links to (calendars-api
+ its five method pages, events-api + its method pages, search-api, freebusy-api,
response-codes), plus live probes against all eight regional API hosts, their accounts hosts, and
`us.zohostatus.com`. Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a
probe starts failing for everyone at once.
