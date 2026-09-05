# AgencyZoom

Manage leads, customers, policies, tasks and pipelines in **AgencyZoom**, the insurance agency
management CRM, over its **API v1**.

- **Categories** — crm, project-management
- **Auth methods** — login (username + password, exchanged for a JWT)
- **Actions** — 23
- **Health checks** — 2, both declared absences (`service`, `quota`) + the derived `auth:login`
- **Egress allowlist** — `api.agencyzoom.com`
- **Website** — https://agencyzoom.com/
- **OpenAPI** — https://app.agencyzoom.com/openapi/agencyzoom.yaml

> **Everything below was verified against AgencyZoom's own sources on 2026-09-05** — its
> machine-readable OpenAPI 3.0 document
> ([`app.agencyzoom.com/openapi/agencyzoom.yaml`](https://app.agencyzoom.com/openapi/agencyzoom.yaml),
> 316,160 bytes, `info.version` `1.0.0`) plus live probes against `api.agencyzoom.com`. Nothing here
> came from a third-party integration directory.

## The things most likely to cost someone a day

### 1. Auth is a login exchange, not an API key — and there's no refresh endpoint

AgencyZoom has no API-key concept for third-party integrations. `POST /v1/api/auth/login` takes a
plain `{username, password}` — the same credential a human types into the product — and returns
`{jwt, ownerAgent}`. Every other call carries that JWT as `Authorization: Bearer <jwt>`. The
document's own words: *"the permissions afforded to the caller are the same as those for the logged
in user"*, and its own recommendation is to use **the agency owner's** login if the integration
needs everything.

There is no documented refresh endpoint and no `expiresIn`/`expiresAt` on the login response. This
app's `refresh` hook (`auth/login.ts`) does the only thing available — it re-runs the same login
with the stored password — which is why the password is kept in the credential rather than discarded
after connecting.

A live probe against `POST /v1/api/auth/login` also turned up `access-control-expose-headers:
jwtrefresh` — a response header the server explicitly CORS-allowlists but that appears nowhere in the
OpenAPI document, circumstantial evidence the vendor's own web app silently rotates the JWT via that
header on some calls. With no documented shape or trigger to verify it against, this app does not
depend on it and re-logs in on demand instead.

### 2. One endpoint demands a second, undocumented header

`POST /v1/api/policies/create` documents a required `X-Api-Token` header **in addition to** the usual
`bearer` security — the only endpoint in the entire 316 KB document that does (confirmed: exactly one
match for `X-Api-Token` across the whole file). Nothing else in the API names a distinct "API token"
concept — no such field on the login response, no settings-page token. `auth/login.ts`'s `sign` hook
stamps this header with the same JWT that signs everything else, specifically for requests to this
one path, so the quirk lives next to the credential it concerns rather than inside the action.

### 3. Two error shapes coexist, and the OpenAPI document only names one

Every documented `400`/`500` response is `{"error", "fieldErrors"}`. But a live `401` — which no path
in the document declares as a possible response at all — answers a completely different,
undocumented shape:

```json
{"name":"Unauthorized","message":"Your request was made with invalid credentials.","code":0,"status":401}
```

That's a framework-level auth filter answering before the request reaches AgencyZoom's own error
handler. `lib/client.ts`'s `formatAgencyZoomError` tries both shapes.

### 4. Money is in cents, and the vendor is inconsistent about saying so

`PolicyUpdateRequest.premium`/`.brokerFee` are documented explicitly as "in cents". `Lead.premium`
and `Lead.quoted` carry **no such note** but are the same figure on the same object graph — a lead's
premium becomes a policy's premium the moment it's sold. Every premium/fee field in this app says "in
cents" in its label, even where the vendor's own schema does not.

### 5. Dates are free-text strings in at least three different formats

There is no date type in this API. The document's own examples disagree endpoint-to-endpoint, and
sometimes field-to-field within the same endpoint:

| Format | Used by |
|---|---|
| `YYYY-MM-DD` | Lead/customer/task search filters (`startDate`, `endDate`, `contactDate`, `soldDate`, `xDate`, `quoteDate`) |
| `MM/dd/YYYY` | Policy and opportunity dates (`effectiveDate`, `expiryDate`, `soldDate` on `PolicyUpdateRequest`) |
| `mm/dd/yy` | `birthday`, `nextExpirationDate` |
| `YYYY-MM-DD HH:mm:ss` | `Task.dueDatetime` |

Every date param in this app carries its own vendor-documented format in its `hint` rather than one
shared assumption.

### 6. The rate limit is prose only

The document states "120 calls per minute" (raised twice in its own change log), but no path
documents a `429` response, and a live probe carries no `X-RateLimit-*`/`Retry-After` header of any
kind. `health/quota.ts` declares this unavailable rather than guessing at a header that doesn't
exist.

### 7. A documented response schema doesn't match its own description

`GET /v1/api/customers/{customerId}/policies`'s response schema is a single flat `WrittenPolicy`
object — not an array — even though its description reads "The list of policies' information" and a
customer commonly has more than one policy. `actions/customer-policy-list.ts` normalizes defensively
(bare array, `{policies: [...]}` wrapper, or a single flat object all become one array) rather than
trusting either reading blindly.

### 8. `/csrs` breaks the reference-lookup envelope pattern

`/carriers`, `/employees`, `/lead-sources` and `/locations` all answer a bare JSON array. `/csrs`
answers `{"csrs": [...]}` instead. Copying the bare-array unwrap for it type-checks and silently
returns `undefined`.

## Auth

**Login (username + password → JWT).** Enter the AgencyZoom login email and password used to sign
in to the product. AgencyZoom's own guidance is to use the agency owner's login for a connection that
needs unrestricted access — there is no scoped/service-account credential. See finding #1 above.

## Health checks

Both declared checks in this app are absences, not gaps:

- **`service`** — AgencyZoom publishes no status page. `status.agencyzoom.com` does not resolve, and
  `agencyzoom.statuspage.io` is the unclaimed-Statuspage decoy (a `302` to statuspage.io's own
  marketing page) — this pack's other apps have already documented the same pattern for Apollo,
  Aweber and others.
- **`quota`** — see finding #6. No readable rate-limit signal exists.

Both are `severity: "informational"`, so they never pin the app's health verdict at `unknown`. The
derived `auth:login` check (`GET /v1/api/employees`, the cheapest authenticated read in the surface)
is the automatable signal for "is this working" for anyone with a live session.

## Actions

**Reference lookups** (for populating dropdowns the write actions need):
`pipeline-list`, `pipeline-stage-list`, `lead-source-list`, `carrier-list`, `employee-list`,
`csr-list`.

**Leads**: `lead-list` (search), `lead-get`, `lead-create`, `lead-update` (⚠️ full replace — see the
action's own doc comment), `lead-note-create`, `lead-change-status`, `lead-sold` (marks a lead sold,
creating a customer and one or more policies).

**Customers**: `customer-list` (search), `customer-get`, `customer-policy-list`.

**Policies**: `policy-create`, `policy-update-status`.

**Tasks**: `task-list` (search), `task-create`, `task-get`, `task-complete`, `task-delete`.

## Not covered

Scoped out to keep this app focused on the core lead → customer → policy → task loop. None of these
are hard to add later; they just aren't here yet:

- **Business/commercial leads** (`POST /leads/create-biz-lead`, `PUT /leads/{leadId}/update-biz-lead`)
  — a parallel create/update flow with a different, business-specific field set.
- **Opportunities/quotes as their own resource** beyond `lead-sold` — `POST/PUT/GET` on
  `/leads/{leadId}/opportunities`, `/leads/{leadId}/quotes`, and vehicle/driver sub-resources under
  `/opportunities/{opportunityId}/...`.
- **AMS-synced policies** (`GET /customers/{customerId}/ams-policies`) — policies read from a
  connected external agency management system, distinct from `customer-policy-list`'s
  AgencyZoom-written policies.
- **Policy update/endorsement** (`PUT /policies/{policyId}`, `POST /policies/endorse`,
  `POST /policies/update-tags`) — only create and status-update are covered.
- **Email/text threads** (`/email-thread/*`, `/text-thread/*`) and **file uploads**
  (`/leads/upload-file`, `/customers/{customerId}/files/{fileId}`).
- **Life & health quoting** (`/v1/api/life`) and **service tickets** (`/serviceTicket/*`) — separate
  product areas with their own object graphs.
- **Contact management** (`/contact/batch-create`) and **customer create/update**
  (`/customers/create`, `PUT /customers/{customerId}`).
- **Configuration reference lookups** beyond the six covered: `/product-categories`,
  `/product-lines`, `/life-professionals`, `/lead-source-categories`, `/service-categories`,
  `/service-priorities`, `/service-resolutions`, `/assign-groups`, `/locations`, `/loss-reasons`,
  `/custom-fields`, `/department-groups`, `/tags`, `/get-classifications`.
- **V4 SSO login** (`/auth/ssologin`, `/v4sso/*`) — a separate, OAuth-shaped login flow this app does
  not implement alongside the plain username/password exchange.
- **Task batch-delete, reopen** (`/tasks/batch-delete`, `/tasks/{taskId}/reopened`) and
  **dashboard/analytics data** (`/dashboard-data/sales-data`).
