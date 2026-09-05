# LearnWorlds

Manage LearnWorlds courses, users, enrollments, tags and payments for your
online school.

- **Categories** — crm, commerce
- **Auth methods** — client-credentials (OAuth2 Client Credentials grant)
- **Actions** — 12
- **Egress allowlist** — `*` (per-school domain — see below)
- **Website** — https://www.learnworlds.com
- **API docs** — https://www.learnworlds.dev/docs/api (a JavaScript-rendered
  Stoplight portal, project `learnworlds/api:main/2951998` — confirmed as the
  live reference by matching that project id embedded in the page's own
  source); https://support.learnworlds.com "LearnWorlds API documentation"
  and "How to Request your API Keys and Access Tokens"; live-verified against
  a real production school (`academy.learnworlds.com`, 2026-09-05).

## Setup

### API Credentials (Client Credentials grant)

1. In your school: **Settings → Developers → API → Request API keys**. This
   requires the **Learning Center** or **High Volume & Corporate** plan — API
   access is not available on Starter or Pro Trainer.
2. Copy the **Client ID**, **Client Secret**, and the **API URL** shown
   alongside them (your school's own domain, e.g.
   `yourschool.learnworlds.com`, or a connected custom domain) into the
   connection.

### Why the base URL is a connection field

LearnWorlds is multi-tenant SaaS, but **there is no shared API gateway** —
every school is served from its own subdomain or a fully custom domain, and
the API lives on that domain (`https://{school}/admin/api/v2/...`). Requesting
the literal host `api.learnworlds.com` (used as the example host in
LearnWorlds' own now-retired v1 docs) 302s to a "this school was deleted"
marketing page — it was itself once a real school subdomain, not a
placeholder for a fixed gateway. So the base URL is a connection field and the
egress allowlist is `*`, the posture this pack already uses for `mautic`,
`gitea` and `bubble`.

### Two headers, every request — one of them not `Authorization`

LearnWorlds' spec states plainly: **every** request, including the token
exchange itself, must carry both `Authorization: Bearer {token}` **and**
`Lw-Client: {client_id}`. Miss the second one and the response is a
schema-correct `400 {"errors":[{"code":400,"context":"client_id","message":
"Missing client_id or client cannot be found."}],"success":false}` — not a
401. This was verified live against `academy.learnworlds.com`, a real
production school, on 2026-09-05. Because `Lw-Client`'s value is the OAuth
client id — part of the credential — it is set in `sign` alongside
`Authorization`, never inside an Action.

### No refresh token for this grant

The client-credentials token response carries only `tokenData.access_token`,
`tokenData.token_type` and `tokenData.expires_in` — no `refresh_token` (that
field only exists on the password grant this app does not implement). So
`refresh` just re-mints a fresh token from the stored client id and secret,
the same fallback `mautic`'s client-credentials auth uses.

## Actions

| Key | Type | Description |
|---|---|---|
| `courses-list` | search | The school's courses, most recently created first |
| `course-get` | read | A single course by its titleId |
| `course-contents-get` | read | A course's sections and learning units |
| `users-list` | search | The school's users, filterable by status, role, and tags |
| `user-get` | read | A single user by id or email |
| `user-create` | perform | Create a new user |
| `user-update` | perform | Update an existing user's information |
| `user-tags-update` | perform | Attach or detach one or more tags on a user |
| `user-enrollments-list` | search | The products (courses, bundles, subscriptions) a user is enrolled in |
| `user-enroll` | perform | Enroll a user in a course, bundle, or subscription |
| `user-unenroll` | perform | Unenroll a user from a course, bundle, or subscription |
| `payments-list` | search | Payment transactions, most recently created first |

Deliberately out of scope for this first pass: course/bundle/subscription-plan
creation beyond reading the catalog, promotions and coupons, affiliates,
certificates, community spaces and posts, user groups and roles, seats, and
webhooks — each is its own surface in LearnWorlds' 94-operation v2 API, left
for a future pass rather than guessed at.

## Two things that would have cost someone a day

### 1. The API is per-school, not per-vendor — and the docs' own example host proves it the hard way

Every sibling with a "per-tenant subdomain" shape in this pack (`mautic`,
`bubble`, `tableau`) makes that call explicitly in its own docs. LearnWorlds'
current (v2) reference is a JavaScript-rendered Stoplight SPA that renders
**the same generic landing-page markup for every route** when fetched without
executing its JS — including `/docs/api/*-api-authentication`, whose static
HTML shell is byte-for-byte the workspace's landing page, not the
authentication article. Confirming the actual base-URL shape took reading
LearnWorlds' now-retired **v1** docs (archived, `docs.learnworlds.com`,
Wayback Machine), which used `api.learnworlds.com` as an example host — and
then discovering, from a **live** request to that literal host, that it 302s
to a "this school was deleted" page. That is not a placeholder gateway; it was
a real (later-deleted) school subdomain used in a documentation example. The
only way to be sure the real shape is "per-school domain, no shared gateway"
was to cross-reference LearnWorlds' own help-center article ("How to Request
your API Keys and Access Tokens", which describes copying an **API URL** per
school) against a live, unsigned probe of a real production school
(`academy.learnworlds.com`) — which answered the exact documented v2 error
shape at `/admin/api/v2/courses`, confirming the path pattern.

### 2. `Lw-Client` is required on the token exchange itself, not just on calls after it

Every OAuth2-flavoured API in this pack signs outbound calls with a bearer
token and stops there. LearnWorlds also requires a second header —
`Lw-Client`, the client id — on **every** request, the token-minting `POST
/admin/api/oauth2/access_token` included. Skip it on the token request and the
response looks exactly like a bad client id or secret (`400 "Missing
client_id or client cannot be found."`), not like a missing header — a
misdiagnosis that sends a debugging session toward regenerating credentials
that were never the problem. `auth/client-credentials.ts`'s `requestToken`
sets `Lw-Client` on the exchange itself for exactly this reason.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is LearnWorlds-the-vendor up? (status.learnworlds.com) |
| `school` | dependency | Is **this connection's** school domain reachable? |
| `quota` | quota | Declared unavailable — no rate-limit header or endpoint is documented |

`service` reads `status.learnworlds.com`'s Statuspage summary (verified live,
real JSON, not the unclaimed-Statuspage decoy shape) and trusts the page-level
`status.indicator` as the roll-up across all 9 components (Video Service,
Email Service, Course Hub, Analytics, Account, Google Cloud, Cloudflare,
Databases, Schools) — the same reasoning `apify`'s `service` check uses,
because deriving a verdict from one component instead would report LearnWorlds
down for, say, a `Google Cloud` blip alone.

`school` sends an **unsigned** `GET /admin/api/v2/courses` (with
`redirect: "manual"`, so a deleted school's redirect to a marketing page is
seen and reported as `down` rather than silently followed into a 200) and
reads the response body/status rather than assuming failure: the documented
`400 "Missing client_id or client cannot be found."` body is a **pass**, proof
the school's own API gateway is answering — the same reasoning `freshdesk`'s
`domain` check applies to an unsigned 401. Whether the credential itself is
good is the derived `auth:client-credentials` check's job.

`quota` is declared `unavailable` at `severity: "informational"`: LearnWorlds'
spec states a fixed prose rate limit ("30 requests / 10 sec") and a `429`
error shape, but documents no response header or endpoint exposing remaining
headroom anywhere across all 94 v2 operations.
