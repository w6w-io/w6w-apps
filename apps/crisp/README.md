# Crisp

Manage conversations, messages, and contact ("people") profiles on Crisp — customer messaging and
support.

- **Categories** — support, communication
- **Auth methods** — basic (Website Token)
- **Actions** — 12
- **Egress allowlist** — `api.crisp.chat`

## Links

| | |
|---|---|
| **Website** | <https://crisp.chat/> |
| **API reference** | <https://docs.crisp.chat/references/rest-api/v1/> |
| **Auth guide** | <https://docs.crisp.chat/guides/rest-api/authentication/website-token/> |
| **Rate limits** | <https://docs.crisp.chat/guides/rest-api/rate-limits/> |
| **Status page** | <https://status.crisp.chat/> |

All content in this app was verified by fetching the pages above directly (2026-09-01), not
inferred from a sibling app or Crisp's marketing pages.

## Auth — Website Token

HTTP Basic **plus a required second header**. Verified against
`guides/rest-api/authentication/website-token/`, whose own worked example is:

```
curl https://api.crisp.chat/v1/website/{website_id} \
  --get \
  --user "{token_id}:{token_key}" \
  --header "X-Crisp-Tier: website"
```

### The trap: Basic auth alone is not enough

The docs are explicit that **both** headers are required together:

> "Also, include the `X-Crisp-Tier` header in your HTTP requests, with the value `website`. This
> lets the REST API know that the token you are using is a website token."

Sending `Authorization: Basic ...` without `X-Crisp-Tier: website` is exactly the kind of thing
that looks correct, compiles, and then 401s in a way that gives no clue which header is missing —
Crisp's error body doesn't distinguish "bad credential" from "credential valid but no tier header".
This app's auth `sign` hook sets both on every signed request, and every other place a request is
built by hand (the `test` and `afterConnect` hooks, which run before `sign` is wired up) sets both
explicitly too. `lib/client.ts`'s `TIER_HEADER_VALUE` constant exists so the value is defined once.

Crisp also offers a **Plugin Token** scheme (Marketplace-issued, multi-workspace, configurable
quota, `X-Crisp-Tier: plugin`) for public integrations. Out of scope here, same as this pack's other
apps that expose only the private, single-workspace credential.

### The other trap: `website_id` is not part of the credential, but every request needs it

A Website Token is scoped to exactly one workspace, and that workspace's `website_id` is a
**required path segment on every single v1 resource** — `/v1/website/{website_id}/...` — not
something the token itself encodes. Since Actions never see the credential (only the auth `sign`
hook does), `websiteId` is collected as its own **non-secret** Auth field and echoed by
`afterConnect` onto the Connection's display data, exactly the pattern `apps/gorgias` uses for its
per-account subdomain. `lib/client.ts`'s `CrispClient` reads it from there.

`identifier` and `key` (the `token_id`/`token_key` pair) are both typed `secret`, even though
Crisp's dashboard shows the identifier unmasked — HTTP Basic has no notion of a public username;
half of `base64(identifier:key)` is still credential material (same rule this pack applies
elsewhere, e.g. `apps/mailjet`).

### Credential probe

`GET /v1/website/{website_id}` — the same endpoint the auth guide's own cURL example uses to
demonstrate a valid token. Confirmed on the wire via the reference's embedded response sample:

```json
{ "error": false, "reason": "resolved",
  "data": { "website_id": "...", "name": "Crisp", "domain": "crisp.chat", "verified": true, "institutional": false } }
```

Classified from the envelope's own `error` field (and `reason` on failure), **never from the bare
status code** — every Crisp error response (`403 not_allowed`, `404 not_subscribed`, `406
domain_restricted`, ...) carries the same JSON envelope shape as success, so a status-code-only
check cannot tell a real failure from a body it never parsed.

## The response envelope

Every v1 response, success or error, is wrapped identically:

```json
{ "error": false, "reason": "resolved", "data": { ... } }
{ "error": true,  "reason": "not_allowed", "data": {} }
```

`lib/client.ts`'s `CrispClient` treats `error: true` as a failure even on a `200` (it can and does
happen), and always surfaces `reason` in the thrown error message.

## Actions

| Group | Actions |
|---|---|
| Website | `get-website` |
| Conversation | `list-conversations`, `get-conversation`, `create-conversation`, `update-conversation-state`, `update-conversation-meta` |
| Message | `list-messages`, `send-message` |
| People | `list-people`, `get-people-profile`, `create-people-profile`, `update-people-profile` |

Notes on the ones with sharp edges:

- **`create-conversation` takes no body and returns only a `session_id`.** Confirmed against the
  reference's embedded example (`{}` in, `{"session_id": "session_..."}` out). Per Crisp's own
  description, the new session "will not be visible in your Crisp Inbox until a message is sent
  with a user `from` value" — follow up with `send-message`.
- **`send-message`'s `content` field is polymorphic by `type`** — a plain string for `text`/`note`,
  an object with its own nested shape for `file`/`animation`/`audio`/`picker`/`field`/`carousel`/
  `event`. This action implements `text` and `note` only (the two whose `content` is a string) —
  see "Not built" below.
- **List endpoints paginate by `page_number`, not offset**, 1-indexed, 20–50 results per page.
  Boolean filters (`filter_unread`, `filter_resolved`, ...) are sent as `1`/`0` query values, not
  `true`/`false` — `lib/client.ts`'s `bitFlag()` does that conversion.
- **`get-people-profile` and `update-people-profile` accept an email in place of the `people_id`**
  UUID — stated directly in the reference ("also allowed: people email").
- **`create-people-profile` is `idempotent: false`.** A duplicate email 409s (`people_exists`)
  rather than upserting, so a blind retry after a timeout is not safe to treat as a repeat.

Every `perform` action declares `idempotent`, which drives the host's retry policy and invocation
dedupe: `create-conversation` and `send-message` are `false` (each call mints a new resource or
delivers a message); `update-conversation-state`, `update-conversation-meta` and
`update-people-profile` are `true` (each sets named state to a fixed value; repeating the same
patch converges).

## Health checks

Three questions, kept apart on purpose: is the *vendor* up, is *this credential* live, and is
there *quota* left.

### Is the vendor up?

**`service`** — `GET https://status.crisp.chat/status/text/`.

Crisp runs its own status page on **Vigil**, an open-source status engine Crisp itself publishes
(github.com/crisp-oss/vigil) — **not** Atlassian Statuspage, so the usual `/api/v2/summary.json`
habit from other apps in this pack does not apply here (it 404s).

Found by reading `docs.crisp.chat`'s own bundled JS: the tiny live status pill in the docs site's
footer sources itself from `{ provider: "vigil", target: "https://status.crisp.chat" }`, whose
`"vigil"` branch does `fetch(target + "/status/text/")` and reads the plain-text body. Confirmed on
the wire 2026-09-01:

```
$ curl -sS https://status.crisp.chat/status/text/
healthy
```

Ruled out as a catch-all the same way this pack checks every status host — a bogus sibling path
404s with 0 bytes rather than echoing the real page:

```
$ curl -sS -o /dev/null -w '%{http_code} %{size_download}\n' \
    https://status.crisp.chat/status/text/nonexistent-bogus-path-xyz
404 0
```

No JSON or per-component variant exists (`/status/json/`, `/badge/`, and every Statuspage-shaped
`/api/v2/*` path all 404), so this check reports only the page-level indicator — no `components`
attribution is possible here, unlike the Statuspage-backed apps elsewhere in this pack.

### Is this credential live?

The auth `test` hook — `GET /v1/website/{website_id}`. See "Auth" above.

### Is there quota left?

**`quota`** — declared `unavailable`, and that is the honest answer rather than a gap.

Crisp's Rate-Limits guide documents daily quotas in **prose only** — "10,000 req/day" for a Website
Token — and states no response header of any kind for reading remaining headroom; it says only
what happens once a limit is hit ("429 Too Many Requests or 420 Enhance Your Calm"). No endpoint in
the reference states remaining quota either — the closest resource, `GET /v1/website/{website_id}`,
returns only `name`/`domain`/`logo`/`verified`/`institutional`.

`severity: "informational"` is load-bearing, not cosmetic: an `unavailable` entry always reports
`unknown`, and at the default `degraded` severity that `unknown` would propagate into every roll-up
and pin this app at `unknown` permanently.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | 60s | `health/service.ts` — `status.crisp.chat/status/text/` (Vigil) |
| `quota` | quota | connection | — | informational | — | declared `unavailable` — Crisp publishes quotas in prose only, no header or endpoint |
| `auth:basic` | credential | connection | signed | fatal | — | derived from the `basic` auth method's `test` hook |

`status.crisp.chat` is deliberately **not** on the app's main egress allowlist — no action has
business calling it. The `service` check widens egress for its own unsigned probe only.

## Not built, and why

Crisp's REST API is much broader than "conversation/people/website" — the reference lists 190+
operations. Left out, and why:

- **Structured message types** (`file`, `animation`, `audio`, `picker`, `field`, `carousel`,
  `event`) — each has its own nested `content` shape (upload URLs, choice lists, carousel targets,
  event namespaces). `send-message` covers `text`/`note`, the two a generic workflow step actually
  needs; the rest would each be closer to its own action than a shared param.
- **Helpdesk** (`/website/{id}/helpdesk/*`, locales, categories, articles, redirections) — a
  separate, large, hierarchical content model (locale → category → section → article) that's
  authored content management, not a workflow step.
- **Campaigns** (`/website/{id}/campaigns/*`, templates, dispatch) — like Mailjet's campaign
  builder elsewhere in this pack, a half-implemented draft → content → schedule → send flow is
  worse than none.
- **Plugins & widgets** (`/plugin/*`, `/website/{id}/widget/*`) — configuring the Crisp app's own
  extension surface, not something a workflow acting *through* Crisp needs.
- **Bucket / Media** (`/bucket/url`, `/media/animation`) — file/asset upload plumbing that only
  matters once structured message types are implemented (see above).
- **Browsing sessions & call sessions** (`/conversation/{id}/session/*`, `/call/*`) — WebRTC/screen-
  share session control; not REST-shaped work a workflow step performs.
- **Plan/subscription management** (`/website/{id}/plan/subscription/*`) — billing operations, not
  automation targets.
- **Spam handling, suggested segments/data keys, identity verification** — operator-console
  workflows with narrow, situational value versus the core conversation/people/website surface.
- **Conversation routing/assignment, participants, verify status, transcripts, feedback requests,
  reminders, tool calls, widget button/data actions** — real endpoints, left out purely on scope —
  the core create/read/send/state/meta loop above is what a first pass needs; these are natural
  follow-ups.
