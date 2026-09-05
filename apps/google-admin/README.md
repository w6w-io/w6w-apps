# Google Workspace Admin

Manage Google Workspace users, groups and organizational units via the Admin SDK Directory API.

- **Categories** — security, productivity
- **Auth methods** — oauth2, service-account
- **Actions** — 18
- **Egress allowlist** — `admin.googleapis.com`
- **Website** — https://admin.google.com
- **API docs** — https://developers.google.com/workspace/admin/directory

## The one thing that will cost you a day: this API has no lower-privilege mode

Both auth methods require an actual Google Workspace **admin identity**, not just a valid
credential. There is no service-account key or OAuth token that works "as itself" — verified
against Google's own docs (`developers.google.com/identity/protocols/oauth2/service-account`,
fetched 2026-09-05):

- **`oauth2`** — the Google account that completes the consent screen must be a Workspace
  **super admin**, or hold a delegated admin role covering Users, Groups and Org Units. A
  non-admin Google account can authorize the app (Google doesn't refuse the OAuth flow itself)
  but every Directory API call it then makes comes back a structured 403 — the scopes granted are
  irrelevant if the account itself isn't an admin.
- **`service-account`** — a plain service account has **no Workspace identity at all**, so the
  Directory API refuses it outright. It only works via **Domain-Wide Delegation**: a super admin
  must go to Admin console → Security → Access and data control → API Controls → Domain-wide
  delegation → *Add new*, enter the service account's numeric **Client ID**, and authorize the
  exact comma-delimited scope list this app requests (see `auth/service-account.ts`). The
  credential's `subject` field (the user to impersonate) is then **required** — omit it and Google
  mints a token for the service account's own non-Workspace identity, which every call refuses.
  `subject` must itself be a super admin or delegated admin; impersonating an ordinary user fails
  every call with a 403 even though the JWT signs and exchanges successfully. This is the failure
  mode that looks like a bug in the app but is a one-time admin-console step nobody did yet.

Both paths are unusual in the same way: **the credential can be syntactically perfect and still
be refused for every call**, because privilege lives on the identity being impersonated, not on
the token's scopes. If every action returns 403 immediately, check the identity first before the
scopes.

## Scope of this app

The Directory API is large (`chromeosdevices`, `mobiledevices`, `roles`, `roleAssignments`,
`domains`, `schemas`, `asps`, `tokens`, `resources`, `privileges`, `verificationCodes`,
`twoStepVerification`, `channels`, …). This app scopes to the clearly load-bearing directory
primitives — Users, Groups (incl. membership) and Org Units — verified action-by-action against
the live Discovery Document (`https://admin.googleapis.com/$discovery/rest?version=directory_v1`,
386,772 bytes, fetched 2026-09-05):

| Resource | Actions | Not covered (left out deliberately) |
|---|---|---|
| Users | list, get, insert, update, delete | `signOut`, `makeAdmin`, `undelete`, `createGuest`, `watch` (push notifications need a callback URL this sandbox has no way to expose) |
| Groups | list, get, insert, update, delete | — |
| Group members | list, add (insert), remove (delete) | `get`, `patch`/`update` (role change on an existing member), `hasMember` — add/remove covers the load-bearing membership-sync case; these are straightforward additions if a workflow needs them |
| Org Units | list, get, insert, update, delete | — |
| Everything else in the Discovery doc | — | Chrome/mobile device management, custom schemas, delegated admin roles, domain/domain-alias management, app-specific passwords, 2-step verification enforcement, calendar/printer resources — each is its own admin surface with its own privilege model, out of scope for this app |

## Key formats

- `userKey` / `groupKey` / `memberKey` accept an email address, alias, or the resource's immutable
  `id` — Google resolves whichever is given.
- `customer` / `customerId` defaults to the `my_customer` alias everywhere it appears, which
  resolves to the connected account's own Workspace customer — no separate lookup needed for the
  common single-customer case.
- `orgUnitPath` is **the path minus its leading slash** per Google's own parameter description,
  and slashes inside it are literal separators, not something to escape (`Sales/Support`, not
  `Sales%2FSupport`) — this app accepts either a leading-slash or bare form and normalizes it
  (`lib/client.ts#encodeOrgUnitPath`).

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://www.google.com/appsstatus/dashboard/incidents.json
```

Filtered to the `"Admin Console"` service name — verified present in a live fetch of the feed on
2026-09-05 (alongside `Gmail`, `Google Drive`, `Google Chat`, etc.). The Admin console UI and the
Directory API share the same backend, so an Admin Console incident is the right signal even though
no entry is named "Directory API" specifically.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

| Auth method | Probe |
|---|---|
| `oauth2` | `GET /admin/directory/v1/users?customer=my_customer&maxResults=1` |
| `service-account` | `POST https://oauth2.googleapis.com/token` (JWT grant, `sub`=impersonated admin) |

The `oauth2` probe is the least-scope whoami available: there is no `/about` or `/me` endpoint on
this API, so the cheapest real call is listing at most one user for the caller's own customer —
it needs only the `admin.directory.user[.readonly]` scope this app already requests, and a
non-admin token comes back a structured 403 rather than an empty 200, so the probe actually
distinguishes "bad credential" from "valid but unprivileged."

The `service-account` method proves the credential (and the Domain-Wide Delegation authorization,
and the impersonated `subject`'s admin privilege) all in one shot, by minting a real access token
— there is no user token to inspect, and a failure at any of those three steps surfaces as a
distinct, non-overlapping error from `exchangeForAccessToken`.

### Do we have quota left?

No headroom endpoint or rate-limit headers. Verified against Google's own
`developers.google.com/workspace/admin/directory/v1/limits` (fetched 2026-09-05): the default is
2,400 queries/minute/project, visible only in the Google Cloud console, and exhaustion surfaces as
403 `userRateLimitExceeded` / `quotaExceeded` or 429 `rateLimitExceeded`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |
| `auth:service-account` | credential | connection | signed | fatal | — | derived from the `service-account` auth method's `test` hook |

The host `www.google.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

**`quota` is declared absent.** Google publishes no headroom endpoint or rate-limit headers for
this API. A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-09-05 against the live Discovery Document and Google's own
Admin SDK / OAuth documentation. Status surfaces and quota error codes move; re-check if a probe
starts failing for everyone at once.
