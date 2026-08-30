# Microsoft Power BI

List, refresh and export Power BI workspaces, reports and datasets through the **Power BI REST
API** (`api.powerbi.com`) — a separate surface from Microsoft Graph, with its own Azure AD
resource and its own error contract.

- **Categories** — analytics, productivity
- **Auth methods** — oauth2
- **Actions** — 18
- **Egress allowlist** — `api.powerbi.com` (`login.microsoftonline.com` is allowed implicitly for
  OAuth)
- **Website** — https://powerbi.microsoft.com
- **API docs** — https://learn.microsoft.com/en-us/rest/api/power-bi/ (TOC fetched 2026-08-30)

## This is NOT Microsoft Graph

This pack's other Microsoft apps (`sharepoint`, `teams`) call `graph.microsoft.com`. Power BI's
REST API lives at its own host, `api.powerbi.com/v1.0/myorg`, and authenticates against its own
Azure AD **resource** (`https://analysis.windows.net/powerbi/api`), not the implicit Graph
resource — see `auth/oauth2.ts` for what that means for scope strings, and `lib/client.ts` for
what it means for the error contract. Confusing the two is the single easiest way to lose a day
wiring this up: a Graph-shaped scope (`Sites.Read.All`) or a Graph-shaped token silently fails
against `api.powerbi.com` with no explanation, because it was never asked for the right resource
in the first place.

## "My workspace" is a path segment, not a separate API

Every non-admin Power BI resource in this App is reachable two ways — `GET /reports` and
`GET /groups/{groupId}/reports`, for example — and the reference documents **identical required
scopes** for each pair. The only difference is whether a `/groups/{id}` segment is present. Every
action here takes an optional **Workspace ID**: leave it empty and the call reaches "My
workspace" (the caller's own, license-scoped workspace); set it to reach a shared workspace
instead. `lib/client.ts`'s `groupPath()` is the one place that decision is made — the same shape
this pack's `sharepoint` App uses for "tenant root site vs. a named site".

Admin-only operations (tenant-wide inventory, activity events, encryption keys, the `Admin`
operation group) are out of scope: every one of them needs a Fabric/Power BI tenant-admin role,
a different trust level from the workspace-level scopes this App's OAuth requests.

## Findings that would have cost a day

1. **Power BI's scopes are full resource-qualified URLs, not bare permission names.** Verified
   against Microsoft's own official sample repo
   (`microsoft/PowerBI-Developer-Samples`, `.NET Core/Embed for your organization/UserOwnsData/
   appsettings.json`): a Power BI scope is
   `https://analysis.windows.net/powerbi/api/Workspace.Read.All`, not `Workspace.Read.All` on its
   own. The same sample also configures the OAuth tenant segment as `common`, not `organizations`
   — a deliberate departure from this pack's `sharepoint` App, which needs `organizations` because
   every SharePoint permission table explicitly states "Not supported" for a personal account;
   Power BI's own reference carries no such blanket statement.

2. **An auth failure carries no JSON body at all — the vendor's error code is in a response
   HEADER.** Verified live 2026-08-30: a request with no `Authorization` header, and one with a
   syntactically-bogus bearer token, both come back `403` with `content-length: 0`. The one signal
   Power BI actually sends is the `x-powerbi-error-info` response header (e.g. `InvalidToken`).
   Code written to parse a Graph-shaped `{"error":{"code":...}}` body — the pattern this pack's
   other Microsoft apps use — would see nothing and report a bare, unexplained 403.
   `lib/client.ts`'s `describeFailure()` reads the header first and falls back to a JSON body for
   the *other* real shape Power BI uses: a validation failure (bad request body, a bad DAX query)
   answers with a genuine `PowerBIError` JSON envelope, `{"error":{"code":"...", "pbi.error":
   {...}}}`.

3. **A vendor status page naming your product isn't automatically a statement about your API** —
   confirmed twice over for Power BI specifically. `azure.status.microsoft` is a real,
   server-rendered status grid (not a client SPA) that names **two separate rows**: "Power BI" and
   "Power BI Embedded". It even publishes a genuine incident RSS feed. But a live-confirmed
   incident item (23 Jul 2026, "Issues connecting to resources in West US") tags its affected
   services via RSS `<category>` elements — `Power BI Embedded` was one that day — while its
   *title and body never mention either service by name*. This pack's `feed`-backed health-check
   mechanism (`core/packages/types/src/health.ts`) does not surface `<category>` to a check hook
   at all, only `title`/`summary`/`link`/`date` — so a check built to substring-match the title for
   "Power BI" would have missed that incident silently, and even a check that *could* see the
   category would still need to tell "Power BI" apart from "Power BI Embedded" (an Azure capacity
   resource, not the general SaaS surface this App calls). See `health/service.ts` for the full
   trail, including the `status.cloud.microsoft` client-rendered-SPA trap this pack's
   `sharepoint`/`teams` Apps already hit for the same underlying Microsoft 365 dashboard.

4. **One documented response example contradicts its own type annotation.** `Create Group`'s
   reference page labels its `200 OK` response type `Group` (a single object), but **both** of its
   own live-tagged JSON examples on that same page show `{"value": [ {...} ]}` — the
   collection-wrapped shape `Get Groups` returns. `actions/create-workspace.ts` trusts the two
   concrete examples over the abstract type label, unwrapping `value[0]`, but falls back to the
   raw body if a response ever *is* the bare object the docs claim — see the action's doc comment.

## Health check

Three different questions, kept apart:

### Is the vendor up?

**Declared absent** (`health/service.ts`). See finding 3 above for the full trail — the short
version: no surface exists that is simultaneously documented, machine-readable, reachable without
tenant-admin consent, *and* correctly scoped to the right "Power BI" (not "Power BI Embedded",
not the Microsoft 365 Workspace assistant).

### Is this credential live?

The Auth `test` hook probes `GET /availableFeatures` — the reference states plainly "This API call
doesn't require any scopes," so a credential that legitimately carries none of this App's four
workspace scopes (a brand-new consent, still propagating) still reports as live rather than as
broken. It also carries no credential material of its own: a list of feature-flag names and
states, nothing else. Power BI's REST API has no `/me`-shaped identity endpoint, so this is the
closest thing to a whoami this vendor offers — which is also why `auth/oauth2.ts` declares no
`afterConnect`: there is nothing to label a connection from.

### Do we have quota left?

**Declared absent** (`health/quota.ts`). Verified live 2026-08-30: no `x-ratelimit-*` header on
any response, rejected or not. Throttling is reactive — `429` with `Retry-After` — per the
reference's own "Throttling" section. Two documented, non-quantified ceilings are recorded for an
operator diagnosing a failure even though no probe can measure headroom against either: at most 8
dataset-refresh requests/day on a Shared-capacity workspace, and 120 DAX
query-execution requests/minute per user across every dataset.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | _declared absent — no surface is simultaneously documented, unauthenticated, and correctly scoped_ |
| `quota` | quota | connection | signed | informational | _declared absent — no headroom endpoint or headers_ |
| `auth:oauth2` | credential | connection | signed | fatal | derived from the `oauth2` auth method's `test` hook (`GET /availableFeatures`) |

Both declared absences carry `severity: "informational"` — an `unavailable` entry always reports
`unknown`, and `unknown` outranks `ok` in the roll-up, so anything less would pin this App's
verdict at `unknown` forever.

## Actions

**Workspaces** (`resource: "workspace"`)
- **List Workspaces** (`list-workspaces`) — `GET /groups`
- **Create Workspace** (`create-workspace`) — `POST /groups?workspaceV2=True`
- **Delete Workspace** (`delete-workspace`) — `DELETE /groups/{groupId}`
- **List Workspace Users** (`list-workspace-users`) — `GET /groups/{groupId}/users`
- **Add Workspace User** (`add-workspace-user`) — `POST /groups/{groupId}/users`

**Reports** (`resource: "report"`)
- **List Reports** (`list-reports`) — `GET [/groups/{groupId}]/reports`
- **Get Report** (`get-report`) — `GET [/groups/{groupId}]/reports/{reportId}`
- **Delete Report** (`delete-report`) — `DELETE [/groups/{groupId}]/reports/{reportId}`
- **Export Report To File** (`export-report-to-file`) — `POST .../reports/{reportId}/ExportTo`
- **Get Export Status** (`get-export-status`) — `GET .../reports/{reportId}/exports/{exportId}`
- **Get Export File** (`get-export-file`) — `GET .../exports/{exportId}/file` (base64)

**Datasets** (`resource: "dataset"`)
- **List Datasets** (`list-datasets`) — `GET [/groups/{groupId}]/datasets`
- **Get Dataset** (`get-dataset`) — `GET [/groups/{groupId}]/datasets/{datasetId}`
- **Refresh Dataset** (`refresh-dataset`) — `POST .../datasets/{datasetId}/refreshes`
- **List Refresh History** (`list-refresh-history`) — `GET .../datasets/{datasetId}/refreshes`
- **Execute Dataset Query** (`execute-dataset-queries`) — `POST .../datasets/{datasetId}/executeQueries` (a single DAX query)

**Dashboards** (`resource: "dashboard"`)
- **List Dashboards** (`list-dashboards`) — `GET [/groups/{groupId}]/dashboards`
- **List Dashboard Tiles** (`list-dashboard-tiles`) — `GET .../dashboards/{dashboardId}/tiles`

## Scope — what's deliberately left out

- **Admin operations** (`Admin` operation group — tenant-wide inventory, activity events,
  encryption keys, capacity administration). Every one needs a Fabric/Power BI tenant-admin role.
- **Dataflows, Gateways, Pipelines, Push Datasets, Template Apps, Goals/Scorecards (Preview),
  Embed Token generation.** Real Power BI resource families with real reference pages, left out of
  this first cut to keep the surface to the four core resources every non-admin automation needs.
  Nothing here was guessed at — each is a genuine, separate operation group in the reference TOC,
  simply not yet built.
- **Enhanced-refresh fields modeled individually** (`applyRefreshPolicy`, `commitMode`,
  `effectiveDate`, `maxParallelism`, `objects`, `retryCount`, `timeout`, `type`). `refresh-dataset`
  accepts them as a single raw JSON `options` object instead — see the action's doc comment for
  why (they're mutually exclusive with the always-required `notifyOption`, and Premium-only).

## Icon

`assets/icon.svg` — Microsoft's modern Power BI mark ("PBI Logo", per its embedded `<title>`),
downloaded verbatim from Wikimedia Commons
(`https://commons.wikimedia.org/wiki/Special:FilePath/New Power BI Logo.svg`).

- **2,569 bytes**, `image/svg+xml`, 630×630 viewBox
- three amber/gold gradient bar shapes with a drop-shadow — Microsoft's real, current mark, not an
  invented placeholder

---

Researched and endpoint-verified 2026-08-30 against the live REST API reference TOC and
individual endpoint pages, plus live probes of `api.powerbi.com`. Re-verify against the same
reference if a probe starts failing for everyone at once.
