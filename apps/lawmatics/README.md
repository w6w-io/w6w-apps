# Lawmatics

Legal-industry CRM and intake automation. Manage Matters, Contacts, Tasks, Notes and Events over
Lawmatics' REST API v1.

## Verified against the vendor

Everything here was checked against Lawmatics' own Postman collection ("Lawmatics OAuth API
v1.22.0"), published at [docs.lawmatics.com](https://docs.lawmatics.com/) — a Postman Documenter
page, fetched via its own data endpoint (`docs.lawmatics.com/api/collections/{ownerId}/{publishedId}`,
1.29 MB) rather than guessed from the marketing site or a sibling integration. **`api.lawmatics.com`
is a single, fixed, shared host across every customer — confirmed live in the collection's saved
request/response examples (`https://api.lawmatics.com/v1/...`), not a per-tenant subdomain.**

## Findings that would have cost someone a day

1. **The wire name is not the product name.** Lawmatics' UI calls the intake-through-case record a
   "Matter"; the API calls it `Prospect` everywhere (`/v1/prospects`, `type: "prospect"`). This
   app's actions say "Matter" in their titles and `/prospects` in their requests, and note the
   mismatch once in `actions/list-matters.ts` rather than in every file.
2. **The OAuth token never expires and cannot be revoked via the API.** Lawmatics states outright
   ("Getting Started With Auth"): no `refresh_token` is ever issued because access tokens don't
   expire, and there is no deauthorization endpoint. `auth/oauth2.ts` deliberately has no `refresh`
   or `revoke` hook — adding either would be dead code against a documented guarantee.
3. **The one rate-limit signal is reactive, not proactive.** A 50 req/min per-firm ceiling is
   documented (429 + `Retry-After: 60` on breach), but no response anywhere in the collection — 2xx
   or error alike — carries a rate-limit header. `health/quota.ts` declares this unavailable rather
   than inventing a reading that doesn't exist.
4. **The health probe had to avoid a credential echo.** `GET /v1/users/me` was picked because its
   response is only `{name, email, created_at, updated_at}` — no scope exists to gate it (Lawmatics
   has no scopes at all), and it never echoes the token back, unlike a "whoami" trap this pack has
   hit before (Follow Up Boss's `/me`, Mailjet's `/apikey`).

## Auth

**OAuth (Sign in with Lawmatics)** — Authorization Code against a Lawmatics Developer App (a firm
registers one at `app.lawmatics.com/settings/developers`). Classic `client_secret` exchange; PKCE is
left off since the docs describe no `code_challenge`/`code_verifier` step. Lawmatics grants full CRUD
access with no scopes to request.

## Actions

**Contacts**

- `list-contacts` (read) — `GET /v1/contacts`, paginated, filterable/sortable.
- `get-contact` (read) — `GET /v1/contacts/:id`.
- `create-contact` (perform) — `POST /v1/contacts`.
- `find-contact-by-email` (search) — `GET /v1/contacts/find_by_email/:email`.

**Matters** (Lawmatics' `Prospect`)

- `list-matters` (read) — `GET /v1/prospects`, paginated, filterable/sortable.
- `get-matter` (read) — `GET /v1/prospects/:id`.
- `create-matter` (perform) — `POST /v1/prospects`, optionally filed under a Company by name.

**Tasks / Notes / Events** — each attaches to a Matter, Contact, Company or Client (Events: Matter,
Contact or Client only — Lawmatics doesn't offer Company there).

- `create-task` (perform) — `POST /v1/tasks`.
- `create-note` (perform) — `POST /v1/notes`.
- `create-event` (perform) — `POST /v1/events`.

**Users**

- `list-users` (read) — `GET /v1/users`, for resolving the User IDs Tasks/Events assign to.

## Left out, deliberately

- **Update/delete actions** for every resource, and reading Tasks/Notes/Events/Companies. All are
  real, documented endpoints — left out to keep this batch focused on the create-and-look-up path an
  intake workflow needs first, not because anything here is unconfirmed.
- **Nested `notes: [...]` on `create-contact`/`create-matter`.** The vendor's sample body supports
  creating a Note inline on those two calls; `create-note` (which attaches to any of the four record
  types) covers the same need without duplicating the shape per resource.
- **`recurrence_rule` on `create-task`.** Documented only as prose describing a nested JSON object's
  fields (daily/weekly/monthly/yearly variants) with no confirmed example response to verify a
  round-trip against — left out rather than guessed at.

## Health checks

| Check | Kind | What it does |
|---|---|---|
| `service` | `service` | Reads `status.lawmatics.com/index.json` (Better Stack), scoped to the "Lawmatics OAuth2.0 API" resource specifically — not the page's aggregate, which mixes in the main app, e-sign and marketing site. `lawmatics.statuspage.io` is confirmed an unclaimed-Statuspage decoy (302s to Atlassian's own page). |
| `quota` | `quota` | Declared `unavailable`, `informational` — no rate-limit header exists on any response to read proactively; see finding 3 above. |
| `auth:oauth2` | derived | Projected automatically from `auth/oauth2.ts`'s `test` hook (`GET /v1/users/me`). |

See `packages/apps/HEALTHCHECKS.md` for the pack-wide conventions this follows.
