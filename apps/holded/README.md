# Holded

Holded CRM funnels, leads and calendar events, on the **Holded CRM API v1** (`api.holded.com/api/crm/v1`).

- **Categories** — crm
- **Auth methods** — api-key (an account API key, sent as a raw `key` request header — not `Bearer`)
- **Actions** — 22
- **Egress allowlist** — `api.holded.com`
- **Health checks** — `service` (live, keyed to the "Holded API" status component) · `quota` (declared unavailable) · 1 derived (`auth:api-key`)

## Links

| What | Where |
| ---- | ----- |
| **Website** | <https://www.holded.com/> |
| **Vanity docs domain** | `developers.holded.com` — see the warning below |
| **Real, current API reference** | <https://holded.readme.io/reference/> |
| Status page | <https://holded.statuspage.io/> |

### The candidate entry cited `http://developers.holded.com/` — it no longer serves API docs

Verified on the wire, 2026-09-01: `http://developers.holded.com/` redirects (`301`, via Cloudflare)
to `https://www.holded.com/es/desarrolladores`, a marketing page. That page's own "technical
overview" copy is **wrong** — it shows `Bearer` authentication against `/api/v2/...` paths and claims
`X-RateLimit-*` response headers. None of that matches the live API (see below).

Holded's *actual* API reference is still published, just not at the vanity domain — the underlying
ReadMe.io project, `holded.readme.io`, is still live and serves the real, current OpenAPI documents.
Every path, verb, parameter and field in this app was read from there — specifically the CRM API's
own embedded OpenAPI 3.0 document (`info.title` "CRM API", `info.version` "1.0", declared server
`https://api.holded.com/api/crm/v1`) — and cross-checked against live, unauthenticated probes:

| Request | Status | Body |
| --- | --- | --- |
| `GET /api/crm/v1/funnels`, no `key` header | `401` | `{"status":401}` |
| `GET /api/crm/v1/funnels`, `key: <bogus>` | `400` | `{"status":0,"info":"Invalid key"}` |

Both confirm header-based `key` auth against `/api/crm/v1`, not `Bearer` against `/api/v2/`. Once one
technical claim on the marketing page was proven fabricated, none of its other claims — including the
rate-limit headers — were trusted without independent confirmation. See `lib/client.ts` and
`health/quota.ts`.

## Scope: CRM only

Holded's API is split into separate groups on the same host, each with its own OpenAPI document:
Invoicing (`/api/invoicing/v1` — contacts, products, documents, payments, …), Accounting, Projects,
and Team. This app only reaches `/api/crm/v1` and covers its three core resources in full:

- **Funnels** — the customizable sales pipelines a business defines its own stages for.
- **Leads** — opportunities placed in a funnel stage, with notes, tasks, an adjustable creation date,
  and stage transitions.
- **Events** — calendar events (meetings, calls, reminders), optionally tied to a lead or a contact.

**Bookings** (`/bookings`, `/bookings/locations`) is also part of the CRM API's OpenAPI document but
is deliberately left out. It is a distinct appointment-scheduling flow (locations, available time
slots, cancellation) that was not exercised against a live account in this pass — guessing at its
behaviour from the schema alone would be worse than leaving it for a follow-up once it can be
verified end to end against a real booking calendar.

Holded's **Contacts** live in the Invoicing API group, not the CRM group — `lead.contactId` and
`lead.contactName` reference a contact by id/label, but this app does not create or read contacts
itself. A Holded Invoicing app is the natural home for that surface.

## Authentication

A single account-wide **API key**, generated in the Holded app under Configuration (top bar) > API,
sent as the raw value of a `key` header — confirmed both from the OpenAPI document's
`securitySchemes.Auth` (`{"type":"apiKey","name":"key","in":"header"}`) and from the live probes
above. Unlike some vendors in this pack, Holded's keys are not scoped per-integration: whatever key a
user pastes carries the full read/write access of the account it belongs to.

### The probe

`GET /funnels` (List Funnels). Holded documents no dedicated whoami/ping endpoint anywhere across its
CRM, Invoicing, Projects, Team or Accounting API references. Funnels was chosen over reaching into
Leads or Events because it needs no path parameter, is a plain read with no side effect, and its
response — the account's own sales-pipeline configuration — is not remotely credential-shaped. An
account with zero funnels still answers `200 []`, a normal healthy response.

## No pagination, anywhere

None of the three list endpoints (`GET /funnels`, `GET /leads`, `GET /events`) declares a query
parameter of any kind in the OpenAPI document — no page, no limit, no date range, no `funnelId` or
`stageId` filter. A List action here returns the account's entire collection in one call.

## Two response shapes

A **read** (`GET`) answers the resource itself — a bare array for a list, a plain object for a single
record. A **write** (`POST`/`PUT`/`DELETE`) answers a small envelope, `{status, info, id?}` —
`status: 1` and a short human `info` ("Created", "Updated", "Successfully deleted") on success. The
same `status` field is overloaded for errors: an app-layer rejection carries `status: 0` plus an
explanatory `info` (`{"status":0,"info":"Invalid key"}`), while a gateway-layer rejection that never
reached app code — no credential at all — carries a bare HTTP-style `status` (`{"status":401}`) with
no `info`. `lib/client.ts` treats any non-2xx response as an error regardless of which shape the body
took, and `auth/api-key.ts` reads the difference to give a more specific message.

One write breaks the pattern: `PUT /leads/{leadId}/tasks` (Update Lead Task) is documented with an
**empty** response schema (`{"type":"object","properties":{}}`, no example) rather than the usual
envelope — `actions/lead-task-update.ts` reports the raw response rather than assuming it matches the
others.

## Actions

**Funnels**

| Action | Endpoint |
| --- | --- |
| List Funnels | `GET /funnels` |
| Get Funnel | `GET /funnels/{funnelId}` |
| Create Funnel | `POST /funnels` |
| Update Funnel | `PUT /funnels/{funnelId}` — name, stages, labels, preferences |
| Delete Funnel | `DELETE /funnels/{funnelId}` |

**Leads**

| Action | Endpoint |
| --- | --- |
| List Leads | `GET /leads` |
| Get Lead | `GET /leads/{leadId}` |
| Create Lead | `POST /leads` |
| Update Lead | `PUT /leads/{leadId}` — name, value, due date, custom fields, status |
| Delete Lead | `DELETE /leads/{leadId}` |
| Create Lead Note | `POST /leads/{leadId}/notes` — not idempotent, appends |
| Update Lead Note | `PUT /leads/{leadId}/notes` |
| Create Lead Task | `POST /leads/{leadId}/tasks` — not idempotent, appends |
| Update Lead Task | `PUT /leads/{leadId}/tasks` — response schema is documented empty |
| Delete Lead Task | `DELETE /leads/{leadId}/tasks` — the target is named in the **body** (`taskId`), not the URL |
| Update Lead Creation Date | `PUT /leads/{leadId}/dates` |
| Update Lead Stage | `PUT /leads/{leadId}/stages` — accepts a stage id or its exact name |

**Events**

| Action | Endpoint |
| --- | --- |
| List Events | `GET /events` |
| Get Event | `GET /events/{eventId}` |
| Create Event | `POST /events` — takes `duration` (seconds); reads expose the resolved `endDate` instead |
| Update Event | `PUT /events/{eventId}` |
| Delete Event | `DELETE /events/{eventId}` |

## Health checks

### `service` — live, keyed on one component

Atlassian Statuspage at `https://holded.statuspage.io/api/v2/summary.json`. Unauthenticated,
`credential: "none"`, `scope: "app"`.

Verified real and verified to be Holded's, 2026-09-01: `page.name` is `"Holded"`, `page.url` is
`https://holded.health` (Holded's own domain, not a generic `*.statuspage.io` subdomain anyone could
have claimed), and the components are named `Holded Web`, `Holded API`, `Holded POS App
(iOS/Android)`, `Holded App (iOS/Android)`, plus an `External Services` group for the banks and other
third parties Holded itself depends on.

This app calls exactly one host, `api.holded.com`, so only the **`Holded API`** component (id
`s3bhwxfr5jwy`) feeds the verdict — the web app, the two mobile apps and the external-services group
cover surfaces this app never touches, and rolling up the whole page would report this app degraded
over, say, a POS-app-only incident.

### `quota` — declared unavailable, `severity: "informational"`

See the warning above: the only place a rate-limit claim appears is the fabricated marketing page,
and every other technical claim on that page was wrong. Live probes on 2026-09-01 found no
`X-RateLimit-*` (or any other rate-limit-shaped) header on an unauthenticated `401` or an
invalid-key `400` response — not conclusive, since a real per-key limit could plausibly only surface
on a successfully authenticated response this app has no live key to generate, but there is no
verified header name or field to read, and inventing one to match unverifiable copy would be worse
than declaring the gap honestly.

## Icon

`assets/icon.png` is Holded's own `apple-touch-icon.png` (256×256), fetched directly from
`www.holded.com/assets/favicons/apple-touch-icon.png` — linked from that site's own `<head>`, not a
generic favicon fallback. No SVG mark was found: `app.holded.com/favicon.svg` answers `200` but is
the app's SPA shell, not an image, and neither simple-icons nor n8n's `nodes-base` carries a Holded
node.

## Layout

```
holded/
├── index.ts                  # AppDefinition: 22 actions, 1 auth, 2 health checks
├── lib/client.ts              # base URL, request/write/delete, error taxonomy, JSON helpers
├── auth/api-key.ts            # `key` header; sign / test
├── health/service.ts          # holded.statuspage.io, narrowed to the "Holded API" component
├── health/quota.ts            # declared unavailable, with the evidence
├── actions/*.ts                # 22 actions
└── tests/                      # one file per action, plus lib/auth/health/index
```

## Validation

From this directory, inside the `api` container:

```bash
deno task check
deno task lint
deno task fmt      # NEVER bare `deno fmt`
deno task test
deno task validate
```
