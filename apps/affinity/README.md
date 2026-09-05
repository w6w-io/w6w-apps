# Affinity

[Affinity](https://www.affinity.co) is a relationship-intelligence CRM built around three
top-level objects — **Persons**, **Organizations**, and **Opportunities** — plus the **Lists**
(spreadsheet-like views) and **Fields** (columns) that organize them.

Every path, verb, query parameter, and body field in this app was verified on 2026-09-05 against
Affinity's own API reference (`api-docs.affinity.co`, 481,906 bytes, titled "Affinity V1 API
Reference") plus live probes against `api.affinity.co` and `status.affinity.co`.

## Authentication

Affinity's docs show the identical v1 API authenticated two ways, side by side:

- HTTP Basic — the API key as the password, **no username**: `curl -u : $APIKEY ...`
- HTTP Bearer — the API key as the token: `curl -H "Authorization: Bearer $APIKEY" ...`

**These are not two API generations.** The reference's own introduction says its v2 API "is not
at feature parity with v1" and documents zero v2 endpoints itself — every endpoint this app calls
(lists, list entries, fields, field values, persons, organizations, opportunities, notes,
webhooks, whoami, rate-limit) is v1. What differs is only how the same key is presented for the
same requests. This app uses the **Bearer** form: it needs no placeholder username, and it is the
form the vendor's own quickstart examples list first for each endpoint.

Get a key from **Affinity Settings > API**. Changes made through the API are attributed to the
person the key belongs to. Affinity lets you scope an API key with an IP allowlist; that is
configured in Affinity itself, not by this app.

### The auth probe

`GET /auth/whoami` is used as the credential-liveness check (`auth/bearer-token.ts`). Its
documented response is `{tenant: {id, name, subdomain}, user: {id, firstName, lastName, email},
grant: {type, scope, createdAt}}` — instance and caller identity, plus authentication *metadata*
(grant type/scope/creation time) — **never the key itself**. It needs no scope beyond "a valid
key" and is explicitly documented as exempt from the account's monthly call quota, so running it
on every health check never eats into the number the `quota` check reports.

### Errors are not reliably JSON

Affinity's docs state "Responses to each request are provided as a JSON object." Measured live on
2026-09-05, that is false for at least two cases: a missing/invalid key against `GET
/auth/whoami` returns `401` with body `Unauthorized API Key.` under `content-type:
text/html;charset=utf-8` — plain text — and an unknown path returns `404 Unknown API endpoint`,
also plain text. `formatAffinityError` (`lib/client.ts`) always falls back to the raw text rather
than assuming a JSON parse will succeed, and both `lib/client.ts` and `auth/bearer-token.ts` have
tests pinning this.

## Actions (39)

**Lists** — `lists-list`, `lists-get`, `lists-create`.

**List Entries** — `list-entries-list`, `list-entries-get`, `list-entries-create`,
`list-entries-delete`. Adding an existing person/organization to a list, or removing one, goes
through here; opportunities cannot be added this way (use `opportunities-create`, since an
opportunity's list is fixed at creation).

**Fields** — `fields-list` (global and/or list-specific fields/columns).

**Field Values** — `field-values-list`, `field-values-create`, `field-values-update`,
`field-values-delete`. A field value's required shape depends entirely on the target field's
`value_type` — a Ranked Dropdown field (e.g. the built-in Status column) needs the numeric `id` of
one of its own `dropdown_options`, never a typed string. `value` is accepted as free-form JSON
rather than this app guessing a shape.

**Persons** — `persons-search`, `persons-get`, `persons-create`, `persons-update`,
`persons-delete`, `persons-fields-list`.

**Organizations** — `organizations-search`, `organizations-get`, `organizations-create`,
`organizations-update`, `organizations-delete`, `organizations-fields-list`.

**Opportunities** — `opportunities-search`, `opportunities-get`, `opportunities-create`,
`opportunities-update`, `opportunities-delete`.

**Notes** — `notes-list`, `notes-get`, `notes-create`, `notes-update`, `notes-delete`. Supports
plain-text and HTML notes, and threaded replies via `parent_id`.

**Webhooks** — `webhooks-list`, `webhooks-get`, `webhooks-create`, `webhooks-update`,
`webhooks-delete`. Affinity allows at most **3** webhook subscriptions per instance. Note the
create path is `POST /webhook/subscribe`, distinct from the `/webhook/{id}` path every other
webhook action uses.

### "Replace, not merge" update endpoints

Persons, Organizations, and Opportunities all document the same warning for their list-valued
fields (`emails`, `organization_ids`, `person_ids`): updating one of these **replaces** the full
list rather than merging into it. To add a value, resend the existing ones too. Reflected in each
relevant action's own description.

### Left out (not out of doubt — out of scope for v1)

**Interactions**, **Reminders**, **Entity Files**, and **Field Value Changes** are all documented
by the vendor but not implemented here. The CRM's core relationship data (lists, entities, fields,
notes) and its automation surface (webhooks) are covered first; these four are candidates for a
follow-up rather than omissions made for lack of confidence in their shape.

### A documentation inconsistency, resolved by the stated method

The "Update an Opportunity" section's example `curl` command uses `-X POST`, while the section's
own heading and every sibling update endpoint (Persons, Organizations, Lists, Notes) say `PUT`.
`opportunities-update` implements `PUT`, matching the endpoint's stated method and the rest of the
API's own convention — noted in that action's own doc comment.

## Health checks

| Check | Kind | Source | Notes |
|---|---|---|---|
| `service` | `service` | [status.affinity.co](https://status.affinity.co/api/v2/summary.json) | Real Atlassian Statuspage — confirmed via a 404 on a nonsense path, `page.name`/`page.url` self-identifying as Affinity, and a component literally named **"External API v1"**, the exact surface this app calls. `affinity.statuspage.io` was checked and rejected as a decoy: a different page id, generically-named components ("Transactions"/"Accounts") that describe no Affinity product, and an `updated_at` frozen at 2023-04-05. |
| `quota` | `quota` | `GET /rate-limit` | Reports both budgets Affinity enforces from one call: the per-minute per-user limit (900/min) and the per-month per-org limit (tier-dependent). `/rate-limit` is itself exempt from the monthly limit it reports. |
| `auth:bearer-token` | `credential` | derived from `Auth.test` | `GET /auth/whoami` — see above. |

Per `HEALTHCHECKS.md`: `service` · `quota` · 1 derived.

## Icon

`assets/icon.png` is the vendor's own favicon asset: `https://www.affinity.co/favicon.ico` 301s to
a 48×48 PNG served from Affinity's CDN (`cdn.prod.website-files.com/.../Light.png`), downloaded
verbatim.
