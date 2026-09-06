# Patreon

Manage Patreon campaigns, members, posts, and webhooks via the Patreon API v2.

- **Categories** — commerce, crm
- **Auth methods** — oauth2, creator-access-token
- **Actions** — 11
- **Egress allowlist** — `www.patreon.com`
- **Website** — https://www.patreon.com
- **API docs** — https://docs.patreon.com/#api (redirected from
  `patreon.com/platform/documentation/api`)

## Why API v2, not v1

Patreon's **v1 API is being retired on 2026-10-07** (stated at the top of the current
reference), so this app targets **v2 only**. v2 is a genuine [JSON:API](https://jsonapi.org/)
implementation, not a generic REST API shaped like one — every response envelope is
`{ data, included?, meta?, links? }`, and it has one behavior that trips up anyone assuming a
normal REST default: **v2 returns no attributes or relationships unless you ask for them.**
There is no "sensible default" response shape; every field must be named in a
`fields[<type>]=a,b,c` query param and every related resource in `include=a,b`, or the
response comes back with nothing but `{ id, type }`. All bracketed params exist in this app's
actions as ordinary named inputs (`campaignFields`, `include`, …) — the client
(`lib/client.ts`) builds the bracketed key and lets `URLSearchParams` percent-encode it.

Two other quirks worth knowing before touching this app:

- **Pagination is cursor-based**, via `page[count]` and `page[cursor]` — not page numbers or
  offsets. The response's `meta.pagination.cursors.next` is the exact string to pass back as
  `page[cursor]` on the next call; `null`/absent means the last page. List actions here surface
  both as plain params and return the whole envelope (including `meta`) so a workflow can walk
  it itself — nothing paginates automatically.
- **Member vs. user are different resources with different ids.** A campaign's patron is a
  `member` resource (a UUID, one per creator-relationship), separate from the underlying
  `user` resource (their global Patreon account, shared across every campaign they support).
  `get-member` takes the member UUID; passing a user id there 404s.

## Auth: two supported paths, chosen deliberately

Patreon's own OAuth walkthrough explicitly offers a shortcut most vendors don't: *"You can use
your Creator's Access Token you get when registering a Client in place of the token you'd get
back from the OAuth flow to ... build a single creator application or tool."* Registering any
OAuth Client at
[patreon.com/portal/registration/register-clients](https://www.patreon.com/portal/registration/register-clients)
mints, alongside the `client_id`/`client_secret`, a **Creator's Access Token** scoped to the
creator who registered it — and the docs state it "will automatically have all V2 scopes
associated with it."

- **`creator-access-token`** (`bearer`) — paste the token, no redirect_uri, no browser dance,
  no per-installation Client registration on the w6w server. This is the right fit for the
  common case this app pack targets: a workflow that manages the one campaign that minted the
  token.
- **`oauth2`** — the standard authorization-code flow
  (`GET /oauth2/authorize` → `POST /api/oauth2/token`), for a multi-creator integrator building
  a product other creators connect to. **PKCE is explicitly disabled** (`pkce: false`): nothing
  in Patreon's OAuth reference mentions `code_challenge`/`code_verifier`, and the token exchange
  requires a `client_secret` — a confidential-client grant, not a public one PKCE is for. Note
  also that Patreon's authorization endpoint **appends** newly granted scopes to whatever a user
  already approved rather than replacing them, per its own docs — so re-authorizing with a
  narrower scope list does not actually narrow access.

Both `sign` hooks stamp `Authorization: Bearer <token>`; both `test` hooks probe
`GET /api/oauth2/v2/identity`, which every token can reach regardless of which scopes were
granted for it.

## Actions

| Resource | Actions |
|---|---|
| identity | `get-identity` |
| campaign | `list-campaigns`, `get-campaign` |
| member | `list-campaign-members`, `get-member` |
| post | `list-campaign-posts`, `get-post` |
| webhook | `list-webhooks`, `create-webhook`, `update-webhook`, `delete-webhook` |

**Left out, and why:**

- **Livestreams** (`/lives` endpoints) — the reference marks these explicitly:
  *"The Live APIs are early-access, and may be subject to change based on feedback from our
  partners."* An unstable, partner-gated surface is not a safe thing to commit to in a
  published app; left out rather than guessed at.
- **Address/User/Tier/Benefit/Goal/OAuthClient/AccessRule as standalone actions** — these are
  only ever reached via `include=` on `list-campaign-members` / `get-member` / `list-campaigns`
  in the documented API (there is no `GET /addresses/{id}` etc.), so they are covered as
  includes rather than duplicated as separate calls.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.patreon.com> — a genuine, currently-operated Atlassian
Statuspage. Verified (not the unclaimed-Statuspage-decoy pattern): both
`https://status.patreon.com/api/v2/summary.json` and
`https://patreon.statuspage.io/api/v2/summary.json` resolve to the identical page
(`page.id: "wpqzxrmpvdwd"`, `page.name: "Patreon"`).

```
GET https://status.patreon.com/api/v2/summary.json
```

The page lists 24 components spanning the whole company — mobile apps, payouts, the
marketing site, push notifications — almost none of which say anything about the API this
app calls. Rather than trust the page-level `status.indicator` (which would report this app
degraded for, say, an iOS app outage), the check scopes down to the children of the
**"Developer API"** component GROUP specifically: `REST API`, `OAuth Identity Provider`, and
`Webhooks`. Its sibling `Documentation` is reported as a component for visibility but excluded
from the verdict, since the docs site being down does not mean the API is down. The group is
looked up **by name** each run rather than a hardcoded id, so a future Statuspage reshuffle
degrades this check to `unknown` instead of silently watching the wrong group.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

Both auth methods probe:

```
GET /api/oauth2/v2/identity
```

Patreon's whoami, reachable by every token regardless of which v2 scopes were granted for it.
Failures are classified from the JSON:API error body's `errors[0].detail`/`title` where
present, not from the bare HTTP status — Patreon's own rate-limit error responses (`429`)
carry a structured `code_name`/`detail`, and there is no reason to assume other 4xxs don't.
Nothing in `test` ever echoes the credential back in its result message.

### Do we have quota left?

No headroom endpoint or rate-limit-remaining header exists. Patreon documents fixed ceilings
in prose only — "Client: Up to 100 requests every 2 seconds" and "Access Token: Up to 100
requests per minute" — and exhaustion surfaces solely as a `429`, optionally carrying a
`retry_after_seconds` backoff hint (not a counter readable ahead of time). Declared
`unavailable` rather than omitted.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |
| `auth:creator-access-token` | credential | connection | signed | fatal | — | derived from the `creator-access-token` auth method's `test` hook |

The host `status.patreon.com` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the other checks. The spec allows the widening precisely
because the check is unsigned; pairing an extra host with `credential: "signed"` is rejected
at load time, so a credential can never reach a status host.

**`quota` is declared absent.** Patreon publishes no headroom endpoint or rate-limit headers,
only fixed ceilings and a `429` when they're hit. A declared absence always reports `unknown`,
so it carries `severity: "informational"` — otherwise it would pin every verdict for this app
at `unknown` forever.

## Icon

`assets/icon.svg` is **Patreon's own mark**, not a drawing, taken verbatim from
[simple-icons](https://simpleicons.org/):

```
https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/patreon.svg
```

No vendor-hosted SVG was reachable directly (`patreon.com/favicon.svg` 404s; the CDN-hosted
logo assets 403 to unauthenticated requests), so the simple-icons mark is used as documented
fallback. The path data is unmodified. Run `deno task fmt`, never bare `deno fmt` — the latter
reformats `assets/*.svg` and breaks the verbatim-mark claim.

---

Researched and endpoint-verified 2026-09-06 against `docs.patreon.com`'s live v2 reference.
Status surfaces move; re-check if a probe starts failing for everyone at once.
