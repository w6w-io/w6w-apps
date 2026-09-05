# Kommo

Kommo (rebranded from **amoCRM** in 2024) is a messenger-based sales CRM built around leads
moving through a pipeline. This app covers the core record CRUD a workflow touches day to day:
leads, contacts and companies.

Every path, parameter and response shape below was verified against Kommo's own developer
documentation, read 2026-09-05 via `developers.kommo.com`'s ReadMe-hosted
`/api/v1/docs/<slug>` JSON endpoint (which returns each reference page's raw method, params and
example bodies) — not inferred from a sibling app or the marketing site.

## Auth: Long-Lived Token

Kommo documents two ways in:

- **OAuth2** — an authorization-code / refresh-token dance against a registered Integration,
  built for a public Marketplace app one account owner installs into another's account.
- **Long-Lived Token** — generated once, by hand, from **Settings → API** inside a **private
  integration** the account's own admin creates.

This app implements only the Long-Lived Token. Kommo's own `long-lived-token` doc recommends it
specifically for a single-account, unattended integration like a workflow Connection: "there's no
need to go through the difficult process of getting an authorization code through the redirect
mechanism [...] the integration will work with your rights." OAuth2's authorization-code flow
needs a browser redirect and a live user session to mint the first token — something an unattended
Connection has neither of.

The token carries the creating admin's own permissions, has **no refresh token and no refresh
endpoint** (nothing to renew — generate a new one by hand before its chosen expiry, 1 day to 5
years, passes), and Kommo documents no endpoint to revoke it either — deleting the private
integration in Settings → API is the only way, same as rotating any other long-lived secret.

To connect:

1. In your Kommo account, go to **Settings → API** and create a private integration.
2. Open its **Keys and scopes** tab and click **Generate long-lived token**. Copy it immediately —
   it is shown once.
3. Paste the token and your account's address into this app's connection form.

## Host shape: every account has its own address — and it isn't always `.kommo.com`

Kommo is multi-tenant SaaS with a per-account subdomain, the same posture this pack already uses
for Zendesk — **except there are two possible apex domains, not one.** New accounts live at
`{subdomain}.kommo.com`, but Kommo's own reference-doc example responses (`get-contact`, among
others) still link back to `https://example.amocrm.com/api/v4/...` — confirming the legacy domain
from before the 2024 rebrand is still live for accounts that never moved. Neither host is knowable
in advance, so the account's address is a connection field (`accountDomain`) rather than a fixed
host, and `w6w.network.allow` lists both `*.kommo.com` and `*.amocrm.com`.

A bare label with no dot (e.g. `acme`) is assumed to be `acme.kommo.com`; type the full
`acme.amocrm.com` host instead if your account is on the legacy domain.

## Actions

| Action | Method | Path |
|---|---|---|
| `lead-list` | GET | `/api/v4/leads` |
| `lead-get` | GET | `/api/v4/leads/{id}` |
| `lead-create` | POST | `/api/v4/leads` |
| `lead-update` | PATCH | `/api/v4/leads/{id}` |
| `contact-list` | GET | `/api/v4/contacts` |
| `contact-get` | GET | `/api/v4/contacts/{id}` |
| `contact-create` | POST | `/api/v4/contacts` |
| `contact-update` | PATCH | `/api/v4/contacts/{id}` |
| `company-list` | GET | `/api/v4/companies` |
| `company-get` | GET | `/api/v4/companies/{id}` |
| `company-create` | POST | `/api/v4/companies` |
| `company-update` | PATCH | `/api/v4/companies/{id}` |

### Three things that go wrong quietly

- **Create takes a JSON array, even for one record.** `POST /leads`, `/contacts` and `/companies`
  all require the body to be an array — Kommo's own `adding-leads` example passes two objects in
  one call — and the response echoes back only `id` / `request_id` / `_links` per created row,
  **never the fields it was given**. `lead-create`/`contact-create`/`company-create` wrap a single
  object in `[...]` for you, but a caller expecting the full created record back needs a follow-up
  `*-get` call — there is no hidden extra request to save you that round trip.
- **Update responds with the collection envelope, even for one ID.** `PATCH /leads/{id}` takes a
  plain object body (unlike create), but Kommo's own `updating-single-lead` response example still
  comes back wrapped as `_embedded.leads[0]`. Worse, that envelope carries only `id` and
  `updated_at` (plus `name` and a couple of flags for contacts/companies) — again, never the rest
  of the record. `lead-update`/`contact-update`/`company-update` unwrap that single row for you.
- **Companies have both a bulk and a single-record update route at the same verb.**
  `PATCH /api/v4/companies` (no ID, array body) is a separate, *bulk* endpoint documented at
  `update-companies` from `PATCH /api/v4/companies/{id}` (one ID, object body) documented at
  `updating-company`. This app implements only the single-record form, matching how
  `lead-update`/`contact-update` already work.

### Where deletion is missing, and why

There is no `lead-delete`, `contact-delete` or `company-delete` action because **Kommo's v4 API
documents no delete endpoint for any of the three.** The reference docs' full method list has
delete routes for custom fields, pipelines, sources, webhooks and templates — but not for a lead,
contact or company. Removing one of those from Kommo (to a restorable trash) is a UI-only action
this API cannot reach either way. This is a genuine gap, not an oversight — it was checked, not
assumed.

Also deliberately out of scope: pipeline/stage/custom-field administration, tasks, notes, tag
administration, the Chats API, the Salesbot builder, and catalogs/lists. Each is its own surface,
and none of it is the record CRUD a workflow touches day to day.

## Health checks

| Check | Kind | What it answers |
|---|---|---|
| `service` | declared absence (`informational`) | Is Kommo up? |
| `account` | dependency | Is *this connection's* account reachable? |
| `auth:long-lived-token` (derived) | credential | Is the token live? |

**`service` is a declared absence, not a gap.** `status.kommo.com` is real — verified 2026-09-05 by
reading the page itself (`og:site_name` "Kommo Status", a live component list covering CRM,
Digital Pipeline, and the Facebook/Instagram/WhatsApp Business integrations, and a genuine incident
history with real timestamps, not a decoy). It is a custom-built page, not
Statuspage/Better Stack/Instatus/status.io, and it publishes **no machine-readable feed of any
kind**: every path other than `/` answered 403, including every shape this pack checks before
giving up — `/api/v2/summary.json`, `/api/v2/status.json`, `/api/v1/summary.json`, `/index.json`,
`/history.atom`, `/history.rss`, `/feed`, `/rss` — and the page's own HTML embeds no API endpoint
to reverse-engineer instead.

**`account` probes the connection's own host, unsigned.** A structured 401/402/403
(`application/problem+json`, per Kommo's own `http-codes` doc) is treated as a **pass** — it proves
the account resolves and Kommo's own API is answering, which is the whole question this check
asks. Whether the token is any good is the derived `auth:long-lived-token` check's job.

## Verified against the wire, not assumed

- The one auth probe (`GET /api/v4/account`) returns `id`, `name`, `subdomain`, `country`,
  `currency` and feature flags — no token, no secret, nothing that traces back to the credential
  itself (the rule this pack learned from Follow Up Boss's `/me` echoing the caller's own key).
- Kommo's rate limit is **7 requests/second per IP**, stated in prose (`limitations`) with no
  `X-RateLimit-*`-style header on any response — so no `quota` health check is declared; there is
  nothing to read. A `429` does carry a `retry_after` field in its body, though.
- Kommo's error envelope is `application/problem+json` — `{ title, type, status, detail }` — with a
  `validation-errors` array bolted on for a `400`. `lib/client.ts`'s `errorMessage` folds both into
  one readable string.
- A Contact has **no top-level `phone` or `email` field** — both are custom fields
  (`custom_fields_values`), confirmed against the `Contact` definition in `add-contacts`'s own API
  settings, which lists `id`, `name`, `first_name`, `last_name`, `responsible_user_id`,
  `custom_fields_values`, `tags_to_add` and nothing else.
