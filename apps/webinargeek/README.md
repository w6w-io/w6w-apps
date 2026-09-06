# WebinarGeek

Manage WebinarGeek webinars, broadcasts and subscribers.

- **Categories** — video, communication
- **Auth methods** — api-key
- **Actions** — 14
- **Egress allowlist** — `app.webinargeek.com`
- **Website** — https://www.webinargeek.com
- **API docs** — https://www.webinargeek.com/api/ (redirects to
  https://webinargeek.docs.apiary.io/) · raw source:
  https://jsapi.apiary.io/apis/webinargeek.apib

## Setup

### API Key

1. In WebinarGeek, go to **account settings → Advanced → API**
   (`https://app.webinargeek.com/admin/integrations/api`).
2. Copy the API key shown there.

WebinarGeek authenticates every request with a single, account-wide key sent
as an **`Api-Token`** header — not `Authorization: Bearer`. There is no OAuth
surface for third-party apps; the key is the whole authentication story, and
it is not scoped, so it gives access to critical parts of the account
(rotate it periodically, never share it).

### The auth error cannot tell "missing" from "wrong" apart

Verified live 2026-09-06 against `app.webinargeek.com`:

```
GET /api/v2/account   (no Api-Token header)
-> 401 {"code":"unauthorized","message":"Key is not provided or does not exists"}

GET /api/v2/account   (Api-Token: bogus-token-12345)
-> 401 {"code":"unauthorized","message":"Key is not provided or does not exists"}
```

Both cases answer the identical body. `auth/api-key.ts`'s `test` hook
classifies by the vendor's own `code` field (`unauthorized`) rather than
guessing from the status alone, and its message says plainly that WebinarGeek
itself does not distinguish the two causes — a caller who copies the key
half-wrong sees the exact same error as one who left the field empty.

## Actions

| Key | Type | Description |
|---|---|---|
| `webinar-list` | search | List the account's webinars |
| `webinar-get` | read | Retrieve a specific webinar, with episodes/broadcasts nested |
| `webinar-series-subscribe` | perform | Subscribe someone to one broadcast of every episode in a series |
| `broadcast-list` | search | List the account's broadcasts |
| `broadcast-get` | read | Retrieve a specific broadcast |
| `broadcast-subscribe` | perform | Subscribe someone to a single broadcast |
| `broadcast-create` | perform | Schedule a new broadcast for a Live/Automated episode |
| `subscription-list` | search | List subscribers, with many filters |
| `subscription-get` | read | Retrieve a subscriber's full detail (poll votes, quiz answers, assessment, payments) |
| `subscription-unsubscribe` | perform | Unsubscribe a subscriber |
| `subscription-payment-list` | search | List completed/refunded payments |
| `message-list` | search | List chat messages, private messages and Q&A-box questions |
| `question-list` | search | List Q&A questions and their text answers |
| `account-get` | read | Read the connected account's company/email |

### Resource model

A **webinar** usually has one **episode** (its content — slides,
interactions); a webinar with several episodes is a "series". An episode has
one or more **broadcasts** — the actual sessions that take place, with a date,
time and status for live/automated webinars, or a single always-on session for
on-demand. A **subscription** is the end-user who registers for (subscribes
to) a broadcast.

### Two date formats coexist in the same API

Nearly every timestamp — `created_at`, `date`, `watch_start`,
`unsubscribed_at`, and so on — is a **Unix timestamp** (integer seconds, UTC),
per the spec's own "Dates and times" section. Two places break that rule and
are documented here exactly as the vendor states them, not normalised into the
other format:

- `subscription-list`'s `watchEndFrom`/`watchEndTo` filters take an
  **ISO-8601** string (`2024-01-15T00:00:00Z`).
- `broadcast-create`'s `date` takes **ISO-8601 with a UTC offset**
  (`2025-07-09T14:30:00+02:00`).

### Two actions are genuinely idempotent — by the vendor's own stated behavior

- `webinar-series-subscribe`: "Trying to create a subscription for a user to a
  broadcast which they are already subscribed to, will silently skip the
  subscription" (the vendor's own words). Retrying a dropped connection with
  the same inputs is therefore safe.
- `broadcast-create`: "Returns the created broadcast, or an existing broadcast
  if the datetime provided matches an existing broadcast for the specified
  episode." Calling it twice with the same episode and date returns the same
  broadcast rather than creating a duplicate.

`broadcast-subscribe` (subscribing to **one** broadcast directly, as opposed
to a whole series) documents no equivalent dedupe behavior, so it is marked
non-idempotent rather than assumed safe. `subscription-unsubscribe` reaches
the same end state (`unsubscribed: true`) whether called once or twice, so it
is treated as idempotent, matching the PUT/DELETE-by-key convention used
elsewhere in this pack.

### Registration fields are not enforced through the API

Per the spec's own "Resource validations & restrictions" section, extra
registration fields and consent fields configured as *required* on a webinar
are **not validated** when a subscription is created through the API — the
subscriber cannot give consent when registered on their behalf, so the
`extraFields`/`consentFields` params on `webinar-series-subscribe` and
`broadcast-subscribe` are both optional free-form JSON, matching WebinarGeek's
own permissive behavior rather than pretending this app can enforce something
the vendor deliberately does not.

### Pagination's ceiling was raised mid-life

Every list action shares one `page` (1-indexed) / `perPage` pair and one
`{ total_count, pages: { next, page, per_page, total_pages } }` response
envelope — unlike many vendors in this pack, WebinarGeek does not vary the
page-size parameter's name per resource. The one thing to know: the
`per_page` ceiling was raised from **100 to 1000 on 2023-05-22** per the
spec's own changelog, so code written against the old limit under-fetches.

### Deliberately out of scope

- **Creating, updating or deleting webinars, episodes, team members or
  departments.** The v2 API is read/subscribe-oriented for these resources —
  only a broadcast can be created (for an existing episode), and only
  subscribers can be subscribed/unsubscribed.
- **The deprecated v1 API** — the spec itself says not to use it anymore.
- **Webhooks** — not documented anywhere in this API Blueprint.

## Health check

Three questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have
*request-rate* headroom left.

### Is the vendor up?

**Declared unavailable — WebinarGeek publishes no public status surface.**
Verified live 2026-09-06:

```
GET https://status.webinargeek.com                    -> 302 to /users/sign_in,
    sets the identical "webinargeek" session cookie the main app sets
GET https://status.webinargeek.com/api/v2/summary.json -> 401
    {"code":"unauthorized","message":"Key is not provided or does not exists"}
    (the SAME body app.webinargeek.com/api/v2 itself returns for a missing key)
GET https://webinargeek.statuspage.io/api/v2/summary.json -> 302 to statuspage.io's
    own marketing page (the unclaimed-Statuspage-page pattern)
GET https://webinargeek.instatus.com                   -> 200, Instatus's own generic
    landing page, not a claimed status page for this vendor
```

`status.webinargeek.com` is not a status page at all — it is a CNAME onto the
product application itself, reachable at a second hostname. No RSS/Atom feed
is linked from WebinarGeek's site or help center either. This app does not
invent a status check to fill the gap; `severity: "informational"` so the
absence never pins the App's roll-up verdict at `unknown` forever.

### Is this credential live?

`GET /account` — "the information is derived from your API key." It needs no
scope beyond the key existing, and its response, `{"company": "...", "email":
"..."}`, carries no credential material of its own.

### Do we have request-rate headroom left?

**Declared unavailable.** WebinarGeek documents fixed numeric ceilings (300
requests/minute, 5,000/hour, 25,000/day; 10/100/500 on a free trial) and
states plainly that exceeding one gets a bare `429` — but neither the spec nor
a live probe exposes anything to read BEFORE that happens. A live 401
response (checked both with no `Api-Token` header and with a wrong one)
carries no `X-RateLimit-*`/`RateLimit-*`-shaped header of any kind. A limit is
not a balance — there is nothing here for a side-effect-free probe to
observe.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | declared `unavailable` — no public status surface exists |
| `quota` | quota | — | — | informational | — | declared `unavailable` — fixed ceilings, no headroom signal |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` method's `test` hook |

## Icon

`assets/icon.svg` — WebinarGeek's own mark, downloaded verbatim 2026-09-06
from `https://www.webinargeek.com/favicon-normal.svg` (linked as
`<link rel="icon" type="image/svg+xml">` on the vendor's own homepage), inked
`#1E69FF`. Re-framed onto the pack's square canvas by
`_tools/icon-normalize.ts`; the path data is the vendor's, verbatim. Legible
on both the light and dark tiles (`_tools/icon-legibility.ts check`) — no dark
variant needed.

---

Researched and endpoint-verified 2026-09-06 against WebinarGeek's own API
Blueprint document (fetched from `https://jsapi.apiary.io/apis/
webinargeek.apib`, the raw source behind the rendered
`webinargeek.docs.apiary.io` page reached via the redirect chain starting at
`https://www.webinargeek.com/api/`), plus live, unauthenticated and
bogus-token probes against `app.webinargeek.com` and `status.webinargeek.com`.
Status surfaces move; re-check if a probe starts failing for everyone at
once.
