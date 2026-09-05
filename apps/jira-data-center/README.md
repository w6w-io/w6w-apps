# Jira Data Center

Create, search and transition issues on a **self-hosted Jira Data Center or Jira
Server** instance — a genuinely different product from the sibling
[`jira`](../jira/README.md) app in this pack, which is Jira **Cloud** only (scoped to
`*.atlassian.net` / `api.atlassian.com`). This app has no vendor host at all: every
customer runs Data Center on their own domain, so the instance URL is a Connection
field, the same posture this pack uses for `gitea`, `mautic` and Tableau Server.

- **Categories** — project-management, developer-tools
- **Auth methods** — personal-access-token (recommended), basic
- **Actions** — 15
- **Egress allowlist** — `*` (the instance address is user-supplied and unpredictable;
  see "There is no vendor host" below)
- **Website** — https://www.atlassian.com/software/jira
- **API docs** — https://developer.atlassian.com/server/jira/platform/rest-apis/

## There is no vendor host

Jira Cloud is a multi-tenant service Atlassian operates at a predictable hostname
shape. Jira Data Center and Jira Server are software a customer installs and runs
themselves — on their own domain, behind their own firewall, sometimes with no public
DNS at all. There is no pattern a manifest could allowlist, so `w6w.network.allow` is
`["*"]`, exactly like this pack's other self-hosted apps (`gitea`, `mautic`) and
Tableau Server.

## `/rest/api/2`, not `/rest/api/3`

The vendor's own reference states the `api` name's "Current version is `2`" — Data
Center has never shipped a v3; that API is Cloud-only. Two real consequences of this,
both differences from the sibling Cloud app worth calling out:

1. **Plain strings, not Atlassian Document Format.** Cloud's v3 requires `description`
   and comment bodies to be ADF objects. Data Center's v2 schemas
   (`CommentJsonBean.body`, the `fields.description` an `IssueUpdateBean` accepts) are
   plain wiki-markup **strings** — this app sends the text a user types straight
   through, with no ADF wrapping at all.
2. **Users are identified by username, not `accountId`.** Jira Cloud replaced
   username/email lookups with an opaque account id for privacy reasons. Data Center
   never made that change: `assignee`/`reporter`, `/user/search` and `/user` all key
   off the login **username** (`UserJsonBean.name`), so `issue-assign` and
   `issue-create` take a username field, not an account id.

Also different: `GET /rest/api/2/project` returns **every** project as a flat JSON
array with no pagination at all, unlike Cloud's paginated `/project/search`.

## Auth

Atlassian's own "Authentication" section on the reference page lists two
**Recommended** methods (OAuth 2.0, Personal Access Token) and two **Other** methods
(OAuth 1.0a — marked "deprecated" — and Basic HTTP, "recommended for tools like
scripts or bots... easier to implement but much less secure").

| Auth method | Header | Notes |
|---|---|---|
| `personal-access-token` | `Authorization: Bearer <token>` | Recommended. Verified against `confluence.atlassian.com/enterprise/using-personal-access-tokens…`; a PAT "incorporates the user account", so there is no separate username field. |
| `basic` | `Authorization: Basic base64(username:password)` | Fallback for instances where PAT creation is disabled. Takes the real account username and password — unlike Cloud, Data Center has no API-token-as-Basic-password convention documented anywhere in the vendor's own docs. |

**OAuth 2.0 is deliberately absent.** It requires registering an application link
inside the *target instance's own admin console* before a single Connection can be
made — a per-instance manual setup step outside what a portable App package can drive.
Personal Access Token covers the same "recommended, not Basic" posture with zero
instance-side setup, so it is the default method here.

**OAuth 1.0a is absent** because the vendor's own docs mark it "deprecated".

## Deliberately out of scope

- **Attachments** — multipart upload, which the sandbox's `ctx.fetch` is not built for
  (same reason the sibling `jira` app skips it).
- **Boards and sprints** — a separate `agile/1.0` API surface with its own resource
  model; a big enough surface to earn its own version rather than a partial
  implementation here.
- **Issue links, worklogs, watchers, votes, remote links.** Real resources this API
  supports, left out of a first version in favor of the create/read/search/transition
  loop a workflow touches most.
- **Every admin-only surface** — issue types, workflow schemes, permission schemes,
  project roles, user anonymisation. Read-only project/user lookups are in; changing
  instance configuration is not.
- **The webhook trigger** — same reasoning as the sibling Cloud app.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and is *this connection's own
instance* reachable.

### Is the vendor up?

There is no vendor to ask — Data Center and Server are self-hosted. The `instance`
check below answers the practical question instead: is the box THIS connection points
at actually up.

### Is this connection's instance reachable?

```
GET {baseUrl}/rest/api/2/serverInfo
```

Sent **unsigned** (`credential: "context"`) — an expired or revoked credential must not
make a healthy instance look down. Classified by the response body, not just the
status: some instances answer `serverInfo` anonymously; others require a session even
for this endpoint. Either way, a schema-correct Jira error envelope
(`{"errorMessages": [...]}`) on a 401/403 still proves the instance is up and serving
Jira, so that reports `ok`, not `down` — only a body that doesn't look like Jira at all
reports `unknown`.

### Is this credential live?

This is what each Auth method's `test` hook does — derived automatically into
`auth:personal-access-token` and `auth:basic`.

| Auth method | Probe |
|---|---|
| `personal-access-token` | `GET /rest/api/2/myself` with the bearer token |
| `basic` | `GET /rest/api/2/myself` with Basic auth |

`/myself` returns the authenticated user's own profile (`name`, `key`, `displayName`,
`emailAddress`) — never the credential itself — and needs no project permission, so a
narrowly-scoped account still passes.

### Do we have quota left?

Declared absent. The vendor's OpenAPI reference documents no `X-RateLimit-*` header and
no usage/limits endpoint anywhere in its ~290 paths — a self-hosted instance's
throughput is whatever its own operator provisioned, not a vendor-metered ceiling.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `instance` | dependency | connection | context | degraded | 60s | `health/instance.ts` |
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:personal-access-token` | credential | connection | signed | fatal | — | derived from `personal-access-token`'s `test` hook |
| `auth:basic` | credential | connection | signed | fatal | — | derived from `basic`'s `test` hook |

`service` and `quota` are both declared absent and therefore `informational` — a
declared absence always reports `unknown`, and at any harsher severity that would pin
this app's verdict at `unknown` forever.

---

Researched and endpoint-verified 2026-09-05 against
`developer.atlassian.com/server/jira/platform/rest-apis/` (redirects to the current
version's OpenAPI reference document) and
`confluence.atlassian.com/enterprise/using-personal-access-tokens…`.
