# FreeAgent

Manage FreeAgent contacts, invoices, expenses, bank transactions, timeslips, projects,
tasks and users.

- **Categories** — finance
- **Auth methods** — oauth2
- **Actions** — 28
- **Egress allowlist** — `api.freeagent.com`
- **Website** — https://www.freeagent.com
- **API docs** — https://dev.freeagent.com/docs

## Auth: OAuth 2.0

Confirmed against `dev.freeagent.com/docs/oauth`. The authorization and token endpoints
are both on the API host itself (unlike most OAuth2 apps in this pack, which split
`login.*`/`identity.*` from `api.*`):

```
Authorize: https://api.freeagent.com/v2/approve_app
Token:     https://api.freeagent.com/v2/token_endpoint
Refresh:   https://api.freeagent.com/v2/token_endpoint  (grant_type=refresh_token)
```

Two things about the flow diverge from the OAuth2 apps elsewhere in this pack:

1. **The refresh response rotates the refresh token.** FreeAgent's own documented
   example response to a `grant_type=refresh_token` request returns a **new**
   `refresh_token` alongside the new access token — not just a fresh access token
   paired with the same refresh token, the pattern Xero, HubSpot and Salesforce all
   follow in this pack. Persisting only the new access token and reusing the old
   refresh token works right up until FreeAgent invalidates that old token
   server-side, at which point every future refresh fails in a way that looks like an
   unrelated outage rather than what it is. No custom `refresh` hook is written here
   — this app's host applies its built-in default refresh handler, which already
   persists whatever the token endpoint returns — but the divergence is called out in
   `auth/oauth2.ts`'s doc comment for anyone tempted to special-case it.
2. **Access tokens last exactly one hour.** FreeAgent's docs are explicit that this is
   a *separate*, much longer window than the fifteen-minute authorization code spent
   immediately during the token exchange — conflating the two under-estimates how
   often a workflow mid-run needs a refresh to fire.

No `revokeUrl` is set: FreeAgent's OAuth and API-secret-rotation docs document no
token-revocation endpoint of any kind.

`sign` stamps one header on every outbound request:

```
Authorization: Bearer <access token>
```

`ctx.fetch` is documented as **unsigned** for every auth-phase hook other than `sign`
itself (Hook Runtime RFC, sandbox posture table), so both `test` and `afterConnect`
set the `Authorization` header by hand.

`afterConnect` calls `GET https://api.freeagent.com/v2/users/me` — "Get personal
profile", which needs only the lowest permission level ("Time") — and records the
connected user's email/name on the Connection's `display` purely for the
`connectionLabel`; nothing in this app's actions reads it back.

## Actions

| Resource | Actions |
|---|---|
| Contact | `contact-list`, `contact-get`, `contact-create`, `contact-update`, `contact-delete` |
| Invoice | `invoice-list`, `invoice-get`, `invoice-create`, `invoice-update`, `invoice-send-email` |
| Expense | `expense-list`, `expense-get`, `expense-create` |
| Bank transaction | `bank-transaction-list`, `bank-transaction-get` |
| Timeslip | `timeslip-list`, `timeslip-get`, `timeslip-create`, `timeslip-update`, `timeslip-delete` |
| Project | `project-list`, `project-get`, `project-create` |
| Task | `task-list`, `task-get`, `task-create` |
| User | `user-list`, `user-get` |

An invoice is always created as `Draft` — FreeAgent requires a separate status
transition or the `invoice-send-email` action to move it on, so there is no
`status`/`draft` param on `invoice-create` itself.

Create/update actions accept an `additionalFields` / `fields` JSON param carrying
FreeAgent's own snake_case field names (`sales_tax_rate`, `payment_terms_in_days`, …)
rather than a fixed param per field, so the action surface doesn't have to enumerate
every field the Company API accepts.

Deliberately absent: credit notes, estimates, bills, capital assets, payroll, sales
tax returns, attachments (multipart upload, which the sandbox's `ctx.fetch` is not
for) and the separate **Accountancy Practice API** (a different product for
accountants managing several clients' books) — all real FreeAgent surfaces, left out
to keep this first pass to the core accounting and time-tracking operations most
workflows need first.

### Two findings that would cost someone a day

1. **Related resources are referenced by full URL, not a bare numeric id.** A
   timeslip's `task` field is `"https://api.freeagent.com/v2/tasks/2"`, never `2` —
   confirmed on every create/update payload across Contacts, Projects, Tasks,
   Timeslips and Invoices. Every action param naming a related resource (`contactId`,
   `projectId`, `taskId`, `userId`, `bankAccountId`) therefore takes a bare id, and
   `lib/client.ts`'s `ref()` builds the URL the API actually expects — a raw id sent
   through fails validation with an opaque 422 that gives no hint what's wrong.
2. **Task creation takes its parent as a query param, not a body field.** Every other
   "create under a parent" endpoint in this API — invoices under a contact, timeslips
   under a project, expenses under a user — puts the parent reference inside the
   create payload. Tasks are the one exception: `POST /v2/tasks?project=:project`,
   confirmed at `dev.freeagent.com/docs/tasks`. Following the pattern from every other
   create action (project reference in the body) creates a project-less task instead
   of failing loudly, which is easy to miss until someone notices tasks aren't showing
   up under their project.
3. **The vendor's own docs contain two copy-paste bugs**, found by cross-checking
   every documented endpoint against the resource it claims to belong to, rather than
   trusting each page in isolation:
   - `docs/tasks`' "Delete a task" section documents `DELETE /v2/users/:id` — the
     wrong resource entirely. This app deletes at `/v2/tasks/:id` instead (though it
     doesn't ship a task-delete action in this first pass; `tests/index.test.ts` pins
     that nothing here ever pairs `/users/` with `DELETE`, so a future addition can't
     silently reintroduce the vendor's mistake).
   - `docs/bank_transactions`' "Delete a bank transaction explanation" section
     documents the singular, non-existent `DELETE /v2/bank_transaction/:id`; the
     correct plural path (`/v2/bank_transaction_explanations/:id`) only appears on the
     separate `docs/bank_transaction_explanations` page. This app implements neither
     delete for this first pass, but the mismatch is recorded in `index.ts`'s doc
     comment so a future addition doesn't copy the broken path.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://status.freeagent.com>, an Atlassian Statuspage instance
(confirmed directly: `GET https://status.freeagent.com/api/v2/summary.json` returns a
real Statuspage payload with a component literally named `API`, measured 2026-09-01 —
not an unclaimed/decoy instance).

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one
of the three it performs itself.

```
GET https://api.freeagent.com/v2/users/me
```

The same "Get personal profile" endpoint `afterConnect` uses. It needs only the
lowest permission level, so it works for a narrowly-scoped token the way `test`
should, and returns no data more sensitive than the connected user's own name and
email — nothing that echoes the credential back.

### Do we have quota left?

**Declared absent.** FreeAgent documents fixed rate-limit ceilings
(`dev.freeagent.com/docs/introduction`: 120 user requests/minute, 3600/hour, 15 token
refreshes/minute) but confirmed no remaining-quota header on any response — success
or 429. The only rate-limit signal a response ever carries is `Retry-After` on a 429
itself, which is a reactive "back off now" instruction after the limit is already
hit, not a forward-looking headroom reading this check could poll cheaply. Declared
`unavailable`, `severity: "informational"` so the absence never pins the app's overall
health at `unknown`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | declared unavailable |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.freeagent.com` (for `service`) is reachable **only inside that
hook's worker** — not from any action, and not from the other checks. The spec allows
the widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a
status host.

## Icon

`assets/icon.svg` — the vendor's current mark, downloaded verbatim from
<https://dev.freeagent.com/icon.svg> on 2026-09-01: 1,028 bytes, `image/svg+xml`, a
rounded blue-gradient square (`#008CFF` → `#0069BF`) with the FreeAgent "f" glyph
cutout in white. `https://www.freeagent.com/apple-touch-icon.png` (2,432 bytes, PNG)
is the same mark at a fixed raster size; the real SVG source above was found instead
and used verbatim, so no PNG tracing/vectorization was needed.

---

Researched and endpoint-verified 2026-09-01 by fetching `dev.freeagent.com/docs/*`
directly for every resource this app touches (oauth, introduction, versioning, users,
contacts, invoices, expenses, bank_transactions, bank_transaction_explanations,
timeslips, projects, tasks), plus a direct fetch of
`status.freeagent.com/api/v2/summary.json`. Status surfaces and rate limits move;
re-check if a probe starts failing for everyone at once.
