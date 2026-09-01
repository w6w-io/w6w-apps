# FreshBooks

Manage FreshBooks clients, invoices, expenses, time entries and projects.

- **Categories** — finance
- **Auth methods** — oauth2
- **Actions** — 19
- **Egress allowlist** — `api.freshbooks.com`, `auth.freshbooks.com`
- **Website** — https://www.freshbooks.com
- **API docs** — https://www.freshbooks.com/api/start

## Auth: two ids, two API domains, neither on the token

FreshBooks spreads its REST surface across three independent API "domains" on the
same host, `api.freshbooks.com` (verified against freshbooks.com/api/identity_model
and the per-resource reference pages):

- **`accounting`** — clients, invoices, expenses. Scoped by path to an `accountId`
  (FreshBooks' legacy "account" concept): `/accounting/account/{accountId}/invoices/invoices`.
- **`timetracking`** — time entries. Scoped instead to a `businessId` (FreshBooks'
  newer "business" concept): `/timetracking/business/{businessId}/time_entries`.
- **`projects`** — also scoped to `businessId`: `/projects/business/{businessId}/projects`.

Neither id is on the OAuth token itself. Right after the token exchange,
`auth/oauth2.ts`'s `afterConnect` hook calls:

```
GET https://api.freshbooks.com/auth/api/v1/users/me
Authorization: Bearer <access token>
Api-Version: alpha
```

("Identity Info", documented at freshbooks.com/api/identity_model), which returns
`response.business_memberships[]` — each membership carries a `business.id`
(`businessId`) and a `business.account_id` (`accountId`). Only the first membership
whose role is `owner` (falling back to the first with an `account_id`, then the first
present) is used — FreshBooks' own docs warn "Most users have accounts... but not
all", e.g. a Client-role membership may have no account of its own — the same
"resolve the tenant, then remember it" choice this pack's Xero (`tenantId`) and Jira
(`cloudId`) apps make, except here it's **path** segments two of the three domains use,
not a header, so `lib/client.ts`'s request-builder reads them off `ctx.connection`
rather than `sign` stamping a header.

`sign` stamps only `Authorization: Bearer <access token>` — there is nothing else to
sign, since `accountId`/`businessId` are URL path segments an action's own request
builds, not something `sign` can inject into a header.

`ctx.fetch` is documented as **unsigned** for every auth-phase hook other than `sign`
itself (Hook Runtime RFC sandbox posture table), so both `test` and `afterConnect` set
the `Authorization` header by hand.

### Scopes

| Scope | Covers |
|---|---|
| `user:profile:read` | Added to every app by default; needed for `/me` |
| `user:clients:read` / `user:clients:write` | Clients (list/get/create/update) |
| `user:invoices:read` / `user:invoices:write` | Invoices (list/get/create/update/send) |
| `user:expenses:read` / `user:expenses:write` | Expenses (list/get/create/update) |
| `user:time_entries:read` / `user:time_entries:write` | Time entries (list/get/create/update) |
| `user:projects:read` | Projects (list/get) |

## Actions

| Resource | Actions |
|---|---|
| Client | `client-list`, `client-get`, `client-create`, `client-update` |
| Invoice | `invoice-list`, `invoice-get`, `invoice-create`, `invoice-update`, `invoice-send` |
| Expense | `expense-list`, `expense-get`, `expense-create`, `expense-update` |
| Time entry | `time-entry-list`, `time-entry-get`, `time-entry-create`, `time-entry-update` |
| Project | `project-list`, `project-get` |

Create actions take a small set of named required fields plus an `additionalFields`
JSON param; update actions take a single `fields` JSON param — both carry FreshBooks'
own snake_case field names directly (`organization`, `due_offset_days`, …) rather than
enumerating every field FreshBooks' API accepts, the same approach this pack's Xero and
Jira apps take.

**List filters differ by domain.** `accounting`-domain list actions (`client-list`,
`invoice-list`, `expense-list`) take a `search` JSON param, sent as
`search[<name>]=<value>` — confirmed on the Clients reference page's "Searches /
Filters" section. `timetracking`/`projects`-domain list actions (`time-entry-list`,
`project-list`) take a `filters` JSON param instead, sent as plain query params —
confirmed on the Time Entries reference page's "List Time Entries From A Specific Day"
example (`?started_from=...&started_to=...`). This is a real vendor inconsistency, not
a bug in this app.

**`invoice-send`** exists because FreshBooks creates every invoice in "Draft" status —
not recognized by accounting reports, and not visible to the client — until it is
marked or emailed as sent (the "Sending An Invoice" section of the Invoices
reference). It PUTs `{ "action_mark_as_sent": true }`, or
`{ "action_email": true, "email_recipients": [...] }` when recipients are given.

Deliberately absent: estimates, credits, payments, taxes, bills, vendors, staff/team
management, reports, webhooks and invoice attachments — all real FreshBooks resources,
left out to keep this first pass to the core client/invoice/expense/time-tracking/
project loop.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.freshbooks.com>, a genuine Atlassian Statuspage
instance (verified live 2026-09-01: `GET https://status.freshbooks.com/api/v2/summary.json`
returns `page.name: "FreshBooks"`, a real `status.indicator`, and a `components[]`
array — not an unclaimed decoy). The first component, plainly named "FreshBooks", is
the umbrella product/API component; a separate "FreshBooks.com Website" component
covers only the marketing site and is not treated specially.

### Is this credential live?

This is what the Auth `test` hook does — derived automatically into the `auth:oauth2`
health check.

```
GET https://api.freshbooks.com/auth/api/v1/users/me
Api-Version: alpha
```

The same Identity Info endpoint `afterConnect` uses. Its response body is profile
data (`id`, `first_name`, `email`, `business_memberships`) — never the credential
itself — so the probe is a safe body-based liveness check, not a whoami that leaks
the caller's own key.

### Do we have quota left?

Declared absent. freshbooks.com/api/limits states plainly: "There are no limit[s] on
the number of API requests per day. However, requests will be rate-limited if too many
calls are made within a short period of time." No numeric ceiling and no
`X-RateLimit-*`-shaped response header is documented anywhere in the reference
(clients, invoices, expenses, time_entries, project pages all checked) — throttling
exists but is undocumented, so headroom cannot be read, only budgeted from observed
failures.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | declared absent, `health/quota.ts` |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.freshbooks.com` (for `service`) is reachable **only inside that
hook's worker** — not from any action, and not from the other checks. The spec allows
the widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a
status host.

## Known limitation — token-exchange body format

FreshBooks' own token-endpoint reference examples (freshbooks.com/api/authentication)
show a **JSON** request body:

```
POST https://api.freshbooks.com/auth/oauth/token
{ "grant_type": "authorization_code", "client_id": "...", "code": "...", "client_secret": "...", "redirect_uri": "..." }
```

This host's OAuth2 token exchange (`packages/server/packages/api/oauth-flow.ts`)
sends `application/x-www-form-urlencoded`, per RFC 6749, which most OAuth2 token
endpoints accept even when their own docs show JSON. This is **unverified against
FreshBooks without live credentials** — flag if the authorization-code exchange or
token refresh fails in practice; the fix (accepting a per-manifest content-type
override) lives outside this app package.

## Icon

`assets/icon.png` is the verified verbatim vendor mark — the 96×96 frame of
`https://www.freshbooks.com/favicon.ico`, extracted pixel-exact to PNG (1,436 bytes;
`favicon.svg` and `apple-touch-icon.png` both 404). A test asserts its byte length and
PNG signature so a future edit that regenerates or replaces it fails the suite.

---

Researched and endpoint-verified 2026-09-01 directly against freshbooks.com/api (start,
authentication, identity_model, scopes, clients, invoices, expenses, time_entries,
project, errors, limits pages) and a direct fetch of
`status.freshbooks.com/api/v2/summary.json`. Status surfaces and scope names move;
re-check if a probe starts failing for everyone at once.
