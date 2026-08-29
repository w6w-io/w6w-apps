# Hunter

Find and verify professional email addresses, enrich people and companies, and manage the
Hunter Leads CRM, against `api.hunter.io/v2`.

- **Categories** — email, marketing, crm
- **Auth methods** — api-key
- **Actions** — 20
- **Egress allowlist** — `api.hunter.io`
- **Website** — https://hunter.io
- **API docs** — https://hunter.io/api-documentation/v2 (verified 2026-08-29 against the
  rendered reference — it is a client-rendered page, so the text was read from its DOM, not
  guessed from a sibling integration)

## Actions

Twenty actions across Hunter's core lookup and lead-management surface.

| Resource | Actions |
|---|---|
| Finder & Verifier | domain-search, domain-finder, email-finder, email-verifier, email-count |
| Enrichment | email-enrichment, company-enrichment, combined-enrichment |
| Account | account-get |
| Lead | lead-list, lead-get, lead-create, lead-upsert, lead-update, lead-delete |
| Leads list | leads-list-list, leads-list-get, leads-list-create, leads-list-update, leads-list-delete |

### Endpoint slugs are not uniform — a gotcha worth stating up front

Most endpoints are hyphenated (`domain-search`, `email-finder`, `email-verifier`,
`email-count`, `domain-finder`), but the three Enrichment endpoints are nested resources
instead — `GET /people/find`, `GET /companies/find`, `GET /combined/find` — and the Leads
surface uses an **underscore** (`leads_lists`), not a hyphen. Getting any of these wrong is a
plain 404. `lib/client.ts` documents this in full; every action spells its own path as a
literal rather than composing one, so a typo in one action can't spread to another.

### Deliberately out of scope

- **Discover**, and the Beta **Discover People** / **Multi-Domain Search** — an AI-assisted
  company-search surface (natural-language `query`, a large and still-changing filter
  grammar: `headquarters_location`, `industry`, `headcount`, `technology`, `funding`, …) that
  is a different product surface from the finder/verifier/enrichment/leads surface this app
  targets, and whose Beta parameters may still change shape.
- **Sequences**, **Email Accounts**, **Messages** — these manage a *connected mailbox* (SMTP
  warmup, health reports, send scheduling) rather than lookup or lead data, and would need
  their own credential story — an email-account id, not just the API key.
- **Lead Tags**, **Custom Attributes** (list/create/update/delete the attribute
  *definitions* — this app still lets an action *set* a custom attribute's value on a lead),
  **Leads list folders/favorites**, **Bulk lead/company move-delete**, **Companies**/
  **Company Lists**/**Company Tags**, **Connected Apps**, **API keys management**,
  **Webhooks**, **Team members** — real, documented endpoints, held out to keep the action
  count to the core lookup + lead-management surface rather than every CRUD corner of the
  account-admin API.
- **Author Finder** — does not exist in the current v2 API. It is not referenced anywhere in
  Hunter's own reference docs (checked against the full rendered text, 2026-08-29), so rather
  than guess at a shape for a retired or renamed endpoint, it is left out.

### Two vendor gotchas baked into the params, not just the docs

- **Two different `verification_status` vocabularies.** Domain Search's is `valid` /
  `accept_all` / `unknown` (three values, describing a fresh search hit). The Leads list
  filter's is wider — `valid`, `accept_all`, `invalid`, `unknown`, `webmail`, `disposable`,
  `pending` (describing a saved lead's stored verification). `lib/params.ts` keeps them as
  two separate constants rather than one shared list.
- **Comma-string filters vs. bracket-array filters.** Domain Search's `seniority` /
  `department` / `type` / `verification_status` are single comma-delimited **strings**
  (`"senior,junior"`). The Leads list endpoint's `verification_status[]` (and Hunter's wider
  Beta filter set: `position[]`, `sending_status[]`, `tags[]`, …) are **repeated bracket-array**
  params instead. Mixing the two forms up returns a silent empty result, not an error —
  `lead-list`'s `verificationStatus` filter is deliberately sent via `arrayQuery`
  (`HunterClient`'s bracket-array path), not `compact()`'s comma-join.

### `email-verifier`'s three status codes

`GET /email-verifier` can run for up to 20 seconds and answers **202** if it hasn't finished
(poll the same call again — Hunter counts this as one request total, not one per poll) or
**222** when the remote SMTP server misbehaved in a way outside Hunter's control. Both fall
inside the 200–299 range a plain `Response.ok` check treats as success, so this one action
uses `HunterClient.raw` (status-aware) instead of `HunterClient.request` (throws on
non-2xx), and returns `{ pending, smtpIssue, data, meta }` rather than making a caller
inspect a raw status code.

## Auth

One method: **api-key** (`apiKey`, `in: "query"`) — an API key from *Account Settings → API*.

Hunter's docs document three equally-supported transports: the `api_key` query parameter, an
`X-API-KEY` header, or `Authorization: Bearer <key>`. This app standardises on the query
parameter — it is the form used in every single request example throughout Hunter's own
reference, and it means one `sign` hook covers every GET/POST/PUT/DELETE without a
header-vs-query branch.

`test` probes `GET /v2/account` and requires `data.email` to actually be present in the body
— not just a 2xx status — before calling the credential live, per the house rule against
classifying credential validity from a status code alone. The probe is chosen because it
needs a credential, is reachable on every plan including Free (Account Information is
explicitly documented as a free call), and returns nothing that is itself a working
credential: name, email, plan and usage counters, never an API key.

A special value, `test-api-key`, validates parameters and always returns the same dummy
response on Domain Search, Email Finder and Email Verifier — useful for testing a workflow
without spending real credits.

## Health check

Three different questions, kept apart:

### Is the vendor up?

**Service status** — declared absent. `status.hunter.io` exists (linked from Hunter's own
homepage) but is a client-rendered Nuxt/Vercel single-page app: `/api/v2/summary.json`,
`/api/v2/status.json` and `/api/v2/components.json` all answer `200` with the **identical**
~1,223-byte HTML shell (`content-type: text/html`) — the SPA's own client-side-routing
fallback, not a JSON API. A same-named lookalike at `hunter.instatus.com` *does* serve real
JSON (`page.name: "Hunter"`), but its `/components.json` lists `["Test", "App", "Website"]` —
a component literally named "Test" is the signature of an unclaimed or never-configured
Instatus default page, not an operator's live monitoring, so this app does not trust it
despite the name match. See `packages/apps/HEALTHCHECKS.md`'s guidance on HTTP 200 not
implying a real endpoint.

### Is this credential live?

The derived `auth:api-key` check, projected automatically from `auth/api-key.ts`'s `test`
hook.

### Do we have quota left?

**quota** (`kind: "quota"`, informational) — `GET /v2/account`'s `data.requests` bucket:
`credits`, `searches` and `verifications`, each with `used` / `available` (period allocation
plus any extra credit packs — never shrinks mid-period) / `remaining` (the live balance,
matching the dashboard). No endpoint in this app's surface publishes a rate-limit response
header of any kind (checked against every endpoint section, 2026-08-29), so this monthly
balance is the only headroom signal Hunter exposes — there is no separate per-second/-minute
`request-rate` check to add, unlike apps whose vendor does publish `X-RateLimit-*`.

## Testing

```
deno task validate && deno task check && deno task lint && deno task test
```
