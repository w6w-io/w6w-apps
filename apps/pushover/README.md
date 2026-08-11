# Pushover

Push notifications to phones, tablets and desktops on the **Pushover API**.

- **Categories** — communication, monitoring
- **Auth methods** — app-token
- **Actions** — 4
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:app-token`
- **Egress allowlist** — `api.pushover.net`
- **Website** — https://pushover.net/
- **API docs** — https://pushover.net/api

> **Everything below was verified against Pushover's own API documentation on 2026-08-11**
> (`pushover.net/api`, a server-rendered page) plus live probes against `api.pushover.net`.
> Nothing here came from a third-party integration directory.

Pushover is deliberately small: four endpoints, no OAuth, no webhooks to configure. This app is the
same size, and most of what is written down here is about the three places its simplicity is
misleading.

## The four things most likely to go wrong

### 1. The credential is two values, and neither is a header

There is no `Authorization` header. Every call carries two ordinary form fields:

| Field | What it is |
| --- | --- |
| `token` | Your **application's** API token, from `pushover.net/apps/build`. Owns the monthly quota. |
| `user` | The **recipient's** user or group key, from the dashboard. |

Both are 30 characters of `[A-Za-z0-9]`, both are case-sensitive, and the vendor treats a group key
as indistinguishable from a user key on purpose.

That would normally force the credential into the Action, which this pack forbids. It does not,
because `SignableRequest` carries `body` as well as `url` and `headers`: `sign` parses the
form-encoded body the action built, injects the two fields, and re-encodes — and does the same to the
query string on the two GET endpoints. The actions never see either value, and
`tests/index.test.ts` enforces that with guards written for *this* shape rather than the usual
header-only ones.

`sign` also **withholds the user key** from `/1/sounds.json` and `/1/apps/limits.json`, which are
application-scoped: sending the recipient's key to an endpoint that has no use for it would be
gratuitous.

### 2. A 4xx must never be retried

The vendor is unusually direct about this, and it is quoted here because it decides how the actions
declare idempotency:

> If we issue a `4xx` HTTP response, or the `status` parameter is not `1`, your input was invalid …
> **The important part is that repeating your same request will not work, no matter how many times
> you retry it.**

A 5xx is different — retryable, "but no sooner than 5 seconds from your last request". The client's
error message carries that distinction, so a failure says whether trying again could ever help.

A rejection can also arrive as a **200** with `status: 0`; the contract is `status: 1` or it did not
happen, whatever the status line said.

### 3. Emergency priority is a different contract

`priority: 2` makes Pushover repeat the notification every `retry` seconds until the user
acknowledges it or `expire` seconds pass. Both parameters become **required**, `retry` has a floor
of 30 seconds, and the response carries a `receipt` for polling acknowledgement.

`message-send` enforces the pair locally, so the error names the missing parameter instead of
arriving as a generic 4xx — and it refuses `retry`/`expire` on a non-emergency message, which
Pushover would otherwise ignore silently.

### 4. The quota is monthly, per account, and shared

10,000 messages a month on a free account, 25,000 for a Team — and the allowance belongs to the
*account*, shared by every application on it. The vendor's own note explains the misleading header
names: "for historical reasons, the headers refer to 'app' limits but this is now representing the
limit for the entire user or team."

Running out is a hard stop for the rest of the month, not a rate limiter refusing one request. That
is why the `quota` check reports **`down`** at zero rather than `degraded`.

## Auth

One method: **application token + user key**, both `secret` fields.

The user key is arguably a per-message value, and it is a credential field here for two reasons: the
vendor calls it private ("user keys should be considered private and not disclosed to 3rd parties"),
and a Connection that means "notify this person" is the useful unit. `message-send` and
`user-validate` can still name a different recipient per call, so the uncommon case stays possible
without making the common one awkward.

### The probe is `POST /1/users/validate.json`

It is the only endpoint that checks **both** halves of the credential. The two application-scoped
endpoints — `/1/sounds.json` and `/1/apps/limits.json` — validate the token alone, so a wrong user
key would sail past either.

It also answers a question a status check cannot: whether the account has **at least one active
device**. A user key with no device is valid and delivers nothing, which is exactly what the vendor
says this endpoint exists to catch.

Pushover marks the offending field by name — `{"token":"invalid"}` or `{"user":"invalid"}` — so
`test` says *which* of the two was pasted wrong, which is the only question worth answering at
connect time.

`afterConnect` publishes the **count** of active devices. Device names are deliberately not
republished: they are the recipient's own hardware, and a display block is shown wherever the
Connection is.

## Actions

| Action | Type | Endpoint |
| --- | --- | --- |
| `message-send` | perform | `POST /1/messages.json` |
| `user-validate` | read | `POST /1/users/validate.json` |
| `sounds-list` | search | `GET /1/sounds.json` |
| `limits-get` | read | `GET /1/apps/limits.json` |

### Notes on individual actions

**`message-send`** carries the vendor's documented caps as param validation — message 1024 UTF-8
characters, title 250, `url` 512, `url_title` 100 — so a workflow is stopped at the boundary rather
than having its text silently cut. The built-in sound list is offered verbatim as a dropdown; a
custom sound uploaded to the account that owns the application can be typed in instead.

**`user-validate` is a `read`, not a `perform`** — it sends no notification. It is the right call
before storing a user key collected from your own users, and its `devices` array is where
`message-send`'s Device parameter gets its values.

**`sounds-list`** exists for **custom** sounds. The built-ins are a fixed list already offered on
`message-send`; sounds uploaded to the account only appear here.

**`limits-get`** reads the allowance without spending any of it. Every message response also carries
the same three numbers as `X-Limit-App-*` headers, which the client folds into the result — so a
workflow that sends regularly rarely needs this action, and it exists for deciding *before* sending.

## Health checks

| Check | Kind | Scope | Severity | What it does |
| --- | --- | --- | --- | --- |
| `service` | service | app | informational | Declared `unavailable` — no machine-readable feed |
| `quota` | quota | connection | (default) | Reads `GET /1/apps/limits.json` |
| `auth:app-token` | — | connection | — | Derived from `Auth.test` automatically |

### `service` is a declared absence, and the trap is named

`pushover.net` links to `https://status.pushover.net/`, so the page is real and vendor-owned. It is
self-hosted — its assets come from `…/fpsp/statuspage/…`, not Atlassian — and publishes nothing a
host could read:

| Path | Result |
| --- | --- |
| `/` | 200, 21,825 B of HTML |
| `/api/v2/summary.json` | **404** |
| `/history.atom`, `/history.rss`, `/feed.xml`, `/index.json` | **404** |

**The trap:** `pushover.statuspage.io` *does* answer `200` — with **127,697 bytes** of HTML. That is
the signature of an **unclaimed** Atlassian Statuspage subdomain: the generic "create your own status
page" shell served for any unregistered name. It is not Pushover's, it has no component data, and
parsing it as JSON would fail forever while looking like a configured check. `health/service.ts`
names it, and `tests/index.test.ts` bans any fetchable URL to it so a future change cannot quietly
"fix" this by pointing there.

(`updates.pushover.net` does not resolve at all.)

If Pushover ever publishes Atom or RSS, the right fix is a `feed: { url }` declaration — the host
fetches and parses it — not a hand-rolled HTML scraper.

### `quota` is a live probe, which is rare in this pack

Most apps here declare `quota` as `unavailable`. Pushover publishes the allowance two ways, so this
one reads real numbers — from the dedicated endpoint, so the check costs nothing against the
allowance it is measuring.

It keeps the default severity rather than dropping to `informational`, because unlike a "the vendor
publishes nothing" check it always has an answer for every Connection, and an exhausted monthly
allowance is a genuine outage of this integration. Thresholds are proportional: `degraded` below 10%
remaining, `down` at zero.

## Deliberately not shipped

| Surface | Why |
| --- | --- |
| **Receipts** (`GET /1/receipts/{receipt}.json`) | Polls whether an emergency notification was acknowledged, and `message-send` already returns the `receipt`. The endpoint's exact path is documented on a separate page this pass did not fetch, and the rule here is to leave out what could not be confirmed rather than infer it. Worth adding next. |
| **Attachments** | `attachment` is multipart and `attachment_base64` needs a size-limited encode step. Both deserve their own pass. |
| **Subscription API** | Collects user keys from *your* users via a hosted page — a user-facing flow rather than a workflow step. |
| **Groups API** | Managing delivery-group membership is administration; sending to a group already works, since a group key is just a user key. |
| **Glances, Teams, Licensing, Open Client** | Separate product surfaces: desktop widgets, org administration, license provisioning, and the client-sync protocol. |

## Icon

`assets/icon.svg` is **Pushover's own mark**, not a drawing. It was taken verbatim from n8n's
`nodes-base`, which is where several of this pack's vendor marks come from:

```
https://raw.githubusercontent.com/n8n-io/n8n/master/packages/nodes-base/nodes/Pushover/pushover.svg
```

The circle, path and Pushover's brand blue (`#249df1`) are unmodified. Run `deno task fmt`, never
bare `deno fmt` — the latter reformats `assets/` and would rewrite the vendor path.

## Layout

```
pushover/
├── index.ts                  # AppDefinition: 4 actions, 1 auth, 2 health checks
├── lib/client.ts             # form encoding, the status-1 contract, retry-aware errors
├── auth/app-token.ts         # token + user injected into the BODY by sign
├── actions/                  # one file per action
├── health/                   # service (unavailable, trap named) + quota (live)
└── tests/                    # 67 unit tests against a mocked HookContext
```

## Development

```bash
deno task test     # 67 unit tests
deno task check    # typecheck
deno task lint
deno task fmt      # NEVER bare `deno fmt` — it rewrites assets/icon.svg
```
