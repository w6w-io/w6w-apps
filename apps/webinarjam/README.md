# WebinarJam / EverWebinar

Read webinars, register attendees, list registrants and unsubscribe leads across WebinarJam
(live webinars) and EverWebinar (automated, scheduled replays) — the same vendor's two
products, over one shared account-wide API key.

- **Categories** — video, marketing
- **Auth methods** — api-key (custom, body-carried)
- **Actions** — 5
- **Egress allowlist** — `api.webinarjam.com`
- **Website** — https://webinarjam.com
- **API docs** — https://support.webinarjam.com/en/collections/19655423-developer-api

## Verification

Every host, path, request field and response shape here was verified 2026-09-05 against the
vendor's own Help Center "Developer API" collection — 17 hand-written articles, not an OpenAPI
spec, at `support.webinarjam.com/en/collections/19655423-developer-api` — plus live,
unauthenticated probes against `api.webinarjam.com` confirming the host, the request/response
shapes and the error envelope. Nothing here came from a marketing page or a third-party
integration directory.

## Findings that would have cost someone real time

1. **One credential, two products, one path prefix apart.** The docs are explicit: "Once
   approved, your API access is valid for both WebinarJam and EverWebinar. Only one set of API
   keys is generated per account." Both products expose the identical five endpoints — verified
   field-for-field against both products' own docs and example payloads — at
   `https://api.webinarjam.com/webinarjam/…` and `https://api.webinarjam.com/everwebinar/…`
   respectively. Every action here takes a `product` selector rather than being duplicated into
   ten near-identical files.
2. **Getting a key is not self-serve, and that's easy to miss until you're stuck.** API access
   requires manually applying (account Profile > API tab), is **paid-plan only**, and is
   **approved by the vendor, typically within two business days**. There is no key to paste
   immediately after connecting this app — `auth/api-key.ts`'s `description` says so up front so
   a user isn't left wondering why there's no "generate key" button.
3. **The docs never show a failure response — only live probing revealed the shape.** Every
   article shows a success example; none shows what a bad request looks like. Probed live
   2026-09-05 against a real endpoint with both a missing and an invalid `api_key`:
   ```
   POST /webinarjam/webinars  (no api_key)        -> 400 {"status":"error","errors":{"api_key":["The api key field is required."]}}
   POST /webinarjam/webinars  (api_key=deadbeef…)  -> 401 {"status":"error","errors":{"api_key":"You must specify a valid API key"}}
   ```
   Same envelope on both products and both failure paths, with no credential material in
   the body — this is what `formatWebinarJamError` and the auth `test` hook classify against,
   never the raw HTTP status alone. Note the value under `errors.api_key` is inconsistently a
   bare string in one case and a one-element array in the other; both are handled.
4. **The registrants list's own field table is wrong.** "Get a list of registrants and
   attendees" documents a flat, all-integer response shape (`webinar`, `schedule`,
   `signup_date`, `attended_live`, … all typed `integer`). That article's own "Example return"
   is a *screenshot*, not rendered text, and it shows something structurally different and
   identical between both products: a Laravel-style paginator
   (`{"registrants":{"current_page":1,"data":[…]}}`) whose rows carry formatted date/attendance
   **strings** ("Fri, 31 Oct 2025, 12:00 PM", `"attended_live": "No"`), plus several fields the
   table never lists at all (`id`, `lead_id`, `event_id`, `event`,
   `links.{live_room,replay_room,unsubscribe}`). `actions/registrant-list.ts` is modelled on the
   actual captured example, not the stale table — see `lib/client.ts` for the full comparison.
5. **A documented endpoint gives two different, inconsistent URLs — left out.** "Get a list of
   countries and states/provinces" states the URL as
   `https://api.webinarjam.com/api/webinarjam/countries` in prose (an extra `/api/` segment none
   of the other five endpoints have), but its own curl example uses
   `https://api.webinarjamdev.com/api/webinarjam/countries` — a non-production `dev` host that
   answers nothing live. Neither form matches the confirmed production host, so per this pack's
   own rule ("if a detail can't be confirmed, leave the action out"), there is no `countries`
   action in this app.

## Deliberately left out

- **The countries/states endpoint** — see finding 5.
- **A `quota` health check** — declared unavailable. The vendor documents only a flat, prose
  ceiling ("a hardcoded limit of 20 API calls per second per user", enforced with a bare `429`);
  there is no usage endpoint, and none of the five real endpoints returned an
  `X-RateLimit-*`/`Retry-After`-shaped header on either success or failure when probed live.
- **Custom registration fields** are exposed as a generic `customFields` JSON passthrough param
  on `registrant-create` rather than fixed fields, because the vendor itself addresses them by a
  per-webinar, user-configured LABEL (see "Pass custom field values in the registration API") —
  there is no fixed set of names to declare ahead of time. Look up a webinar's custom field
  labels (and, for Dropdown fields, their option ids) via `webinar-get` first.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is
the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.webinarjam.com>

```
GET https://status.webinarjam.com/api/v2/summary.json
```

A real, claimed Atlassian Statuspage: `page.name` is exactly `"WebinarJam"`, with thirteen
components across an `APP` group (`WebinarJam App`, `EverWebinar App`, `Live Room`,
`Email Sendout`, and one named exactly **`API`**) and an `INFRASTRUCTURE` group naming the
vendor's own third-party dependencies (SendGrid, Mailgun, Twilio SMS, Twilio Group Rooms,
Firebase Realtime Database). `health/service.ts` tracks the **`API`** component specifically —
not `WebinarJam App` / `EverWebinar App`, which are the end-user web dashboards this app never
touches — so an incident on the dashboard, the live room, or a third-party dependency doesn't
report the developer API as degraded.

### Is this credential live?

This is what the Auth `test` hook does. The `api-key` method probes:

```
POST https://api.webinarjam.com/webinarjam/webinars
```

"List all webinars" — the only endpoint reachable with `api_key` and nothing else, so a fresh
connection with no prior state can still be probed. Since one key covers both products, probing
the WebinarJam path confirms the credential for EverWebinar too.

### Do we have quota left?

Not declared — see "Deliberately left out" above.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | declared unavailable — no usage endpoint or rate-limit header exists |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.webinarjam.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the auth check. The spec allows the widening
precisely because the check is unsigned; pairing an extra host with `credential: "signed"` is
rejected at load time, so the API key can never reach a status host.

---

Researched and endpoint-verified 2026-09-05 against `support.webinarjam.com`'s own Help Center
and live probes against `api.webinarjam.com` / `status.webinarjam.com`. Status surfaces and
undocumented error shapes move; re-check if a probe starts failing for everyone at once.
