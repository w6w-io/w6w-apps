# SimplyBook.me

Book, read, update, cancel, approve and decline SimplyBook.me bookings; list services, providers
(staff/units), locations and clients; check available slots before offering a time.

- **Categories** — calendar
- **Auth methods** — login (custom)
- **Actions** — 14
- **Egress allowlist** — every host `https://simplybook.me/api/swagger-admin`'s `servers` array
  names (see below)
- **Website** — https://simplybook.me
- **API docs** — https://simplybook.me/api/doc (Swagger UI shell; the real spec is fetched at
  runtime from `https://simplybook.me/api/swagger-admin`)

## Actions

| Key | Resource | Endpoint |
|---|---|---|
| `booking-get-many` | booking | `GET /admin/bookings` |
| `booking-get` | booking | `GET /admin/bookings/{id}` |
| `booking-create` | booking | `POST /admin/bookings` |
| `booking-update` | booking | `PUT /admin/bookings/{id}` |
| `booking-cancel` | booking | `DELETE /admin/bookings/{id}` |
| `booking-approve` | booking | `PUT /admin/bookings/{id}/approve` |
| `booking-decline` | booking | `PUT /admin/bookings/{id}/decline` |
| `client-get-many` | client | `GET /admin/clients` |
| `client-get` | client | `GET /admin/clients/{id}` |
| `client-create` | client | `POST /admin/clients` |
| `service-get-many` | service | `GET /admin/services` |
| `provider-get-many` | provider | `GET /admin/providers` |
| `location-get-many` | location | `GET /admin/locations` |
| `schedule-available-slots-get-many` | schedule | `GET /admin/schedule/available-slots` |

Not modelled: invoicing/payments (`/admin/invoices/*`, terminal payments), memberships, packages,
promotions/gift-cards, calendar notes, the medical-testing status endpoint, webhooks management,
and service/provider/location **create/update** (the API's own docs mark those "simple" write
methods that "do not support all available settings"). All of that stays specific to each
company's billing and settings setup — additive follow-ups, not omissions with silent data loss.

## Auth

**`login`** (custom) — company identifier + admin login + password (or an **API User Key**, minted
at Settings → API User Keys, which the endpoint's own description recommends for integrations
because it bypasses IP-allowlist verification). Verified 2026-09-05 against the live OpenAPI
document.

- `POST /admin/auth` exchanges `{company, login, password}` for a `TokenEntity`
  (`token` + `refresh_token`); every subsequent call carries `X-Company-Login` + `X-Token` headers
  instead of the typed credential.
- `POST /admin/auth/refresh-token` renews the token from the stored `refresh_token` — a real,
  documented refresh flow, so the password itself is never retained past the initial exchange.
- **Two-factor authentication cannot complete headlessly.** A password login on a 2FA-enabled
  account returns `require2fa: true` with an empty `token`/`refresh_token` — completing it needs a
  second interactive round trip (`POST /admin/auth/2fa` with an SMS/Authenticator code nobody was
  asked for). `exchange` fails loudly with this explained rather than silently storing an unusable
  empty token; an API User Key sidesteps the whole issue.

### The API host is not decidable from the credential

The fetched OpenAPI document lists **thirteen** `servers` — a default global host
(`user-api-v2.simplybook.me`) plus regional (`.it`, `.asia`, `.vip`, `.cc`, `.us`, `.pro`) and
Enterprise/white-label hosts (`enterpriseappointments.com`, a Webnode integration host,
`servicebookings.net`, and three UK-registrar hosts). Nothing in the auth response says which one a
given company is hosted on — there is no discovery endpoint. `apiBase` is therefore a connect-time
field (default the global host), validated against exactly this server list and echoed into the
connection's display metadata by `afterConnect` so every action reads it back — the same shape this
pack's `auth0` app uses for its per-tenant domain.

```
"network": {
  "allow": [
    "user-api-v2.simplybook.me", "user-api-v2.simplybook.it", "user-api-v2.simplybook.asia",
    "user-api-v2.simplybook.vip", "user-api-v2.simplybook.cc", "user-api-v2.simplybook.us",
    "user-api-v2.simplybook.pro", "user-api-v2.enterpriseappointments.com",
    "user-api-v2.simplybook.webnode.page", "user-api-v2.servicebookings.net",
    "user-api-v2.booking.names.uk", "user-api-v2.booking.lcn.uk",
    "user-api-v2.booking.register365.ie"
  ]
}
```

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second is something
the app itself performs on every workflow run (via `Auth.test`); the others are declared checks.

### Is the vendor up?

**Declared absence.** No usable machine-readable status feed was found (checked live 2026-09-05):
`status.simplybook.me` and `status.simplybook.it` both 404, and `simplybook.statuspage.io` is the
unclaimed-Statuspage decoy (302 to statuspage.io's own marketing page, no component data) this
pack's other apps have already documented for their own vendors. No `instatus.com`, `status.io`, or
Better Stack page, and no Atom/RSS feed, was found either.

### Is this credential live?

This is what the `login` method's `test` hook does:

```
GET /admin/services
```

Chosen because every SimplyBook.me admin credential can read services (they underpin every
booking), unlike `/admin/clients` or `/admin/tariff/current`, which document their own narrower
`AccessDenied` cases. A `401`/`403`/`419` is reported as an expired-or-revoked token; SimplyBook.me
answers expired tokens with **HTTP 419** ("Token Expired") rather than 401 on every endpoint that
can fail on auth — a historical status code (Laravel's "Page/Token Expired") most HTTP clients do
not special-case.

### Do we have quota left?

**Declared absence.** Neither fetched OpenAPI document (`swagger-admin`, `swagger-public`) names a
rate-limit response header, a `429`, or a headroom endpoint. `GET /admin/tariff/current`
(`CompanyTariffEntity`) looked like the candidate — it's literally named "tariff" — but only carries
the subscription plan's name and expiry, never a request budget. A `CompanyTariff_LimitEntity`
schema (`key`/`total`/`rest`) exists in the document's `components/schemas` but is **never
referenced by any path or embedded in `CompanyTariffEntity`** — an orphan schema, not a wired field.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | `health/service.ts` (declared `unavailable`) |
| `quota` | quota | connection | signed | informational | — | `health/quota.ts` (declared `unavailable`) |
| `auth:login` | credential | connection | signed | fatal | — | derived from the `login` auth method's `test` hook |

## Two findings that would have cost someone a day

1. **The list endpoints lie about their own response shape.** `GET /admin/bookings`,
   `GET /admin/services`, `GET /admin/providers` and `GET /admin/locations` all describe themselves
   in prose as "wrapped into paginated result" — the exact words `GET /admin/clients` uses — and
   `/admin/bookings` even documents real `page`/`on_page` query parameters. But their OpenAPI
   `responses` schema is a bare array; only `/admin/clients` actually returns `{data, metadata}`.
   `client-get-many` is the one action in this app whose output carries `metadata.pages_count`
   (verified against the schema, not the prose) — every other list action here returns a plain
   array and has no way to know how many pages remain.
2. **Expired tokens answer HTTP 419, not 401.** Every write/read endpoint that documents an
   auth-failure response names `419 "Token Expired"` as a distinct case from `403`. `lib/client.ts`
   and the `login.test` hook treat 419 as its own condition (`SimplybookError` still carries the
   status), because a generic "non-2xx ⇒ fail" switch would silently miss the one status code that
   means "call `refresh`, not `reconnect`".
3. **A live probe was needed to learn the actual error body shape.** The OpenAPI document's
   `responses` blocks say nothing more than "Bad request" / "Access denied or Forbidden" for
   400/403 — no error schema is given anywhere. `POST /admin/auth` with a bogus company, probed
   live, answers `{"code":400,"message":"Invalid company","data":[],"message_data":[]}` — a flat
   shape `lib/client.ts` now parses, confirmed to echo none of the submitted credential back.

## Icon

Extracted from `https://simplybook.me/favicon.ico` (200, `image/x-icon`, a single 128×128 32bpp
frame — no multi-frame selection was needed) and converted to PNG.

---

Researched and endpoint-verified 2026-09-05 by fetching the live OpenAPI documents
(`swagger-admin`, `swagger-public`) linked from `simplybook.me/api/doc`'s embedded Swagger UI, plus
live probes of `POST /admin/auth` and the status-page candidates above. Re-verify if a probe starts
failing for everyone at once.
