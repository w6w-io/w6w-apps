# Omnisend

Manage contacts, tag them individually or in bulk, and send the customer events that trigger
Omnisend's own automations, segments, and reporting — on the **Omnisend API `2026-03-15`**.

- **Categories** — marketing, email
- **Auth methods** — api-key
- **Actions** — 7
- **Health checks** — `service` + ~~`quota`~~ + the derived `auth:api-key`
- **Egress allowlist** — `api.omnisend.com` (the `service` check adds `status.omnisend.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://www.omnisend.com/
- **API docs** — https://api-docs.omnisend.com/
- **Status page** — https://status.omnisend.com/

> **Everything below was verified against Omnisend's own sources on 2026-09-05** — its
> machine-readable OpenAPI 3.0 reference (published per-endpoint at `api-docs.omnisend.com`,
> `2026-03-15` API version), the authentication and rate-limit reference pages, and live probes
> against `api.omnisend.com` and `status.omnisend.com`. Nothing here came from a third-party
> integration directory.

## The three things most likely to go wrong

### 1. The auth scheme is not Bearer

Omnisend documents two authentication methods: an API key and OAuth 2.0. The API key is **not**
sent as a bearer token — it uses a vendor-defined scheme:

```
Authorization: Omnisend-API-Key <key>
```

This is what [`auth/api-key.ts`](auth/api-key.ts) signs with. OAuth 2.0 (`Authorization: Bearer
<token>`, client-credentials flow against `app.omnisend.com/oauth2/token`) is documented for the
same endpoints but is not implemented here — the API key path needs no redirect flow and covers
every action in this app.

### 2. Every request needs a second, fixed header

Every `2026-03-15` request also requires:

```
Omnisend-Version: 2026-03-15
```

[`lib/client.ts`](lib/client.ts) bakes this in on every call, so it isn't something an action has
to remember, and this app is pinned to that API version deliberately: a future Omnisend release
cannot silently change a response shape underneath a running workflow.

### 3. Batch tagging is async, and rate-limited far tighter than everything else

`POST`/`DELETE /contacts/tags` ([`add-contact-tags`](actions/add-contact-tags.ts),
[`remove-contact-tags`](actions/remove-contact-tags.ts)) return `202 Accepted` with **no body** —
tagging runs asynchronously, so the tags may not be visible immediately after the call returns.
Both are capped at **60 requests/minute**, a sixth of the 400/minute default that covers every
other endpoint in this app. Selectors (`contactIDs`, `emails`, `phones`, `segmentID`) combine
additively: a contact matched by more than one selector is tagged/untagged once, and an email or
phone with no matching contact is silently ignored rather than erroring.

## Auth model

- **Field**: a single `apiKey` secret, pasted from Store Settings → API → API Keys
  (`app.omnisend.com/integrations/api-keys`).
- **`sign`**: stamps `Authorization: Omnisend-API-Key <key>` and `Omnisend-Version: 2026-03-15`.
- **`test`**: calls `GET /brands/current` and classifies success from the **body** — a `brandID`
  field must be present — not from the status code alone. Measured live on 2026-09-05: an
  unauthenticated call and a call with a syntactically plausible but fake key both answer the
  identical `401` body (`{"type":"https://problems.omnisend.com/unauthorized","title":
  "Unauthorized","status":401}`), so Omnisend does not distinguish "no key" from "wrong key" here —
  the failure message surfaces whatever `detail`/`title` the vendor does provide rather than
  inventing a distinction the API doesn't make.
- **`afterConnect`**: reads the same `/brands/current` call and publishes only `id`, `name`,
  `platform` and `website` for the connection label — never anything else the endpoint returns.

## Actions

| Action | Type | Endpoint | Notes |
| --- | --- | --- | --- |
| `list-contacts` | read | `GET /contacts` | Cursor pagination; `tag`/`status` are mutually exclusive, and `updatedAtFrom` can't combine with the other filters |
| `get-contact` | read | `GET /contacts/{id}` | |
| `create-or-update-contact` | perform | `POST /contacts` | Upserts by the email identifier — `201` on create, `200` on update, identical body shape either way |
| `update-contact-by-email` | perform | `PATCH /contacts` | `email` is a **query** param, not a body field; `404` if no contact matches |
| `add-contact-tags` | perform | `POST /contacts/tags` | Batch, async, 60 req/min |
| `remove-contact-tags` | perform | `DELETE /contacts/tags` | Batch, async, 60 req/min — a `DELETE` with a JSON body, not query params |
| `send-event` | perform | `POST /events` | Sends a recommended (e.g. `placed order`) or custom event to trigger automations, segments and reporting |

`send-event` is the one addition beyond the drafted contact-CRUD surface: contacts alone let a
workflow *describe* a customer, but Omnisend's automations are triggered by *events* — this is the
mechanism for a workflow to make something happen in Omnisend when something happens elsewhere.
Recommended events (`added product to cart`, `placed order`, `paid for order`, etc.) unlock
Omnisend's pre-built automation presets and segment templates; custom events are free-form.
Product catalog, campaigns, and segment-membership reads are real, documented surfaces this app
does not yet cover — left out to keep this first pass to a verified, tested core rather than a
half-verified sprawl.

## Health checks

- **`service`** ([`health/service.ts`](health/service.ts)) — reads
  `status.omnisend.com/api/v2/summary.json`, a real Atlassian Statuspage instance (confirmed live:
  a nonsense sibling path 404s, the page self-identifies as `"Omnisend"`, and its components —
  Email, SMS, Push Notifications, the store-platform connectors, and an `API` component — are
  Omnisend's own). Unsigned; the status host is never allowlisted for the app itself.
- **`quota`** ([`health/quota.ts`](health/quota.ts)) — declared `unavailable` at `informational`
  severity. Two live calls to `GET /brands/current` (unauthenticated, and with a fake key) both
  answered `401` with no `X-RateLimit-*`-shaped header of any kind, and Omnisend's own rate-limit
  reference states the only signal is the `429` response itself. The documented ceilings are fixed
  per-endpoint (400/min default; 100/15 per min on `/segments` reads/writes; 60/min on
  `/contacts/tags`; 40/min on content-render; 10/min + 55/day on analytics) and are enforced **per
  brand**, shared across every API key and OAuth token acting on that brand — so there is no
  single connection's headroom to read even if a header existed.
- **`auth:api-key`** — derived automatically from the `test` hook above.

## What was verified and how

Every path, header, and field name in this app was cross-checked against the per-endpoint OpenAPI
3.0 definitions Omnisend publishes at `api-docs.omnisend.com/reference/<operation>.md` (e.g.
[`get_contacts`](https://api-docs.omnisend.com/reference/get_contacts.md),
[`post_contacts-tags`](https://api-docs.omnisend.com/reference/post_contacts-tags.md),
[`post_events`](https://api-docs.omnisend.com/reference/post_events.md)), not just the prose
guides. The error shape (`Problem`/`ValidationProblem`/`RateLimitProblem`, all RFC 9457 Problem
Details) and the `Omnisend-Version` header requirement are declared identically across every one
of those definitions.
