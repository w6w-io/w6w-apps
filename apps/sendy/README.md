# Sendy

Manage subscribers and send campaigns on a self-hosted Sendy newsletter
installation.

- **Categories** — email, marketing
- **Auth methods** — api-key
- **Actions** — 8
- **Egress allowlist** — `*` (self-hosted — see below)
- **Website** — https://sendy.co
- **API docs** — https://sendy.co/api (no OpenAPI/Swagger document; verified
  directly against this page, 2026-09-01, "currently version 7.1.4")

## Setup

1. In your Sendy installation, go to **Settings** and copy the **API Key**.
2. Paste it into the connection, along with your installation's
   **Installation URL** — the address Sendy is reachable at, including any
   subdirectory it's installed under (e.g. `https://example.com/sendy`, not
   just the domain).

## Actions

| Key | Type | Description |
|---|---|---|
| `subscriber-subscribe` | perform | Add a subscriber to a list, or update one already on it |
| `subscriber-unsubscribe` | perform | Unsubscribe an email from a list |
| `subscriber-delete` | perform | Delete a subscriber off a list |
| `subscriber-status` | read | A subscriber's current status in a list |
| `subscriber-active-count` | read | A list's active subscriber count |
| `list-list` | read | Every list (id, name) belonging to a brand |
| `brand-list` | read | Every brand (id, name) in the installation |
| `campaign-create` | perform | Create a draft campaign, or create and send/schedule one |

## Why the allowlist is `*`

Sendy is self-hosted by design: `sendy.co` is the vendor's marketing site and
license portal, not an API host — every call an operator's workflow makes
targets *their own* installation, running against their own Amazon SES
account. So the installation URL is a connection field and the egress
allowlist has to be open, the same posture this pack already uses for
`gitea`, `ghost`, `grafana` and `jenkins`.

Unlike most of those, a Sendy installation's own address is not fixed to a
domain root: operators commonly install it in a subdirectory (Sendy ships as
a PHP application, not a container with its own domain), so `normalizeBaseUrl`
here **keeps the URL's path** rather than collapsing to a bare origin, which
is what `gitea`'s equivalent helper does (its API is always fixed at
`/api/v1` regardless of where the instance root is).

## The API key lives in the POST body, and status codes lie

Every documented endpoint is a `POST` with an
`application/x-www-form-urlencoded` body — Sendy's own docs put it plainly:
"Sendy's API is based on simple HTTP POST." The key travels as an `api_key`
form field, never an `Authorization` header, so this app's `sign` hook parses
whatever form body the action already built and merges `api_key` on top —
the same pattern this pack's `mandrill` app uses for a JSON-body key, adapted
to form encoding.

More importantly: **verified against the docs, every one of these calls
answers HTTP 200 whether it succeeded or not.** There is no non-2xx failure
path documented anywhere on the reference page. So every action here
classifies success or failure from the response body's exact, documented
text — never the status code — matching this pack's rule against guessing
"did this work?" from a status alone. A response outside the endpoint's
documented success literal(s) is surfaced as a thrown error carrying Sendy's
own message text.

## `unsubscribe` alone needs no API key

Sendy's own parameter list for `POST /unsubscribe` is just `email`, `list`
and `boolean` — `api_key` is not among them, unlike every other endpoint.
This action still runs through a Connection (so the installation URL is
known), and the `sign` hook still stamps `api_key` onto the body as it does
for every request; Sendy simply ignores the field it doesn't ask for.

## Left out

- **The `hp` (honeypot) field on `/subscribe`.** Sendy documents it as a
  spambot trap for a public HTML signup form — filling it in makes the call
  silently exit. It has no meaning for a server-to-server workflow call and
  is not exposed.
- **Anything beyond the eight documented endpoints.** Sendy's API reference
  covers subscribers, lists, brands and campaign creation only — no read
  endpoints for campaigns, segments or reports, and no way to fetch a single
  list's own detail beyond what `list-list` returns. If the vendor adds more,
  this app can grow to match; nothing here was inferred beyond what
  https://sendy.co/api states.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `site` | dependency | Is **this connection's** installation reachable? |
| `service` | service | Declared unavailable — the question does not apply |

`site` sends `POST /api/brands/get-brands.php` with **no** `api_key` at all.
Sendy documents the exact response for that case — the literal string
`"API key not passed"` — so seeing it back is proof a live Sendy install
evaluated the request, without needing (or risking) a real credential. The
same "a defined rejection proves liveness" reasoning this pack's `jenkins`
app uses for its own unauthenticated probe. Anything else — a transport
failure, a non-2xx status, or a body that doesn't match — is reported `down`.

`service` is a **declared absence**: Sendy is self-hosted software, so there
is no vendor platform behind a connection for a status page to describe.
Worth recording explicitly: `sendy.statuspage.io` answers HTTP 200, but it is
a **namesake decoy** — verified 2026-09-01, its `page.name` is "Sendy" but
`page.url` is `status.sendy.eu`, and its components are `app.sendy.nl`, "DHL
eCommerce", "Amazon" shipping and similar — an unrelated Dutch
parcel-delivery company, not this vendor. `sendy.co` itself publishes nothing
machine-readable (`/status` and `/health` both 404).

## Vendor API quirks worth knowing before you build on this

1. **HTTP 200 means nothing.** Repeated above because it is the single
   easiest mistake to make against this API: every documented call, success
   or failure, answers 200. Only the body's exact text says which happened.
2. **A Sendy install's address can include a path.** Do not assume the
   installation URL is a bare domain — many operators run Sendy from a
   subdirectory, and every endpoint here is relative to wherever that is.
3. **`subscribe` is also the update path.** Calling it again for an email
   already on the list updates that subscriber rather than erroring, which
   is what makes it safe to mark `idempotent: true`.
