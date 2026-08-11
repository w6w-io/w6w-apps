# Campaign Monitor

Email marketing on the **Campaign Monitor API v3.3**: manage clients and their subscriber lists,
add and import subscribers, build and send campaigns, read campaign reporting, and send
transactional email.

- **API host:** `https://api.createsend.com/api/v3.3`
- **Docs:** <https://www.campaignmonitor.com/api/v3-3/getting-started/>
- **Auth:** HTTP Basic with an API key as the username, **or** OAuth 2.0
- **Egress:** `api.createsend.com` only

> **The host is `createsend.com`, not `campaignmonitor.com`.** The product is Campaign Monitor
> (now a Marigold brand); the API still lives on the company's original domain.
> `www.campaignmonitor.com` serves only documentation, and it is not in `network.allow`.

Every path, verb, parameter, body field, enum and error code below was verified on **2026-08-11**
against the vendor's own reference (eleven section pages under `www.campaignmonitor.com/api/v3-3/`;
`getting-started/` is 197,122 B and the ten resource pages 158,750–307,327 B) plus live probes of
`api.createsend.com`. Nothing came from a third-party integration directory.

---

## The scoping model — read this before picking an action

Campaign Monitor nests **account → client → list → subscriber**, and "client" is its word for a
**sub-account**. An agency account holds many; a direct customer holds exactly one. Lists,
campaigns, templates, segments, journeys, tags and the suppression list all belong to a *client*,
never to the account.

The actions split three ways, and every action's doc comment says which it is:

| Scope | Path shape | Actions |
|---|---|---|
| **Account-level** | no id at all | `client-list`, `billing-details-get`, `system-date-get` |
| **Client-level** | `{clientid}` in the path | all `client-*`, plus `list-create` and `campaign-create` (whose path id is the *client* even though they create something else) |
| **Resource-level** | the resource's own id | all `list-*`, `subscriber-*`, `campaign-*`, `template-get` — the id already identifies its owning client |

### A credential carries a scope too

Campaign Monitor issues API keys at **two** levels:

- an **account key** (Account settings → API keys) sees the whole account; `/clients.json` lists
  every client;
- a **client key** — which is the `ApiKey` field of `GET /clients/{clientid}.json` — is bound to
  one client.

The `/transactional` endpoints branch on which you hold. The vendor's note, repeated on every one
of them: *"if you are using an account API key or OAuth, this is required as you need to specify
the client. This is not necessary if you use a client-specific API key."* **Nothing in a stored
credential reveals which kind it is**, so this app does not guess: the transactional actions expose
`clientId` as an *optional* param with that rule stated at the field.

---

## The four findings that cost the most to learn

### 1. An ordinary read hands back a live credential

`GET /clients/{clientid}.json` is documented as returning *"the complete details for a client
**including their API key**"*, and its published example response opens with:

```json
{ "ApiKey": "639d8cc27198202f5fe6037a8b17a29a59984b86d3289bc9", "BasicDetails": { … } }
```

That value is a **working client-scoped key** — exactly what this app's `api-key` auth method
accepts. A workflow step's result is persisted in the run record and routinely echoed into logs,
other apps and previews, so returning it would turn one read into a durable leak.

`actions/client-get.ts` **deletes** the field (via `lib/client.ts#stripSecrets`) before returning —
deleted, not masked, because a placeholder in a field named `ApiKey` reads like a value and
something downstream will try to use it. The value stays available to its owner in the UI.

That endpoint is therefore also **not** the health probe. See §3 below.

### 2. `401` means five different things, and one of them is not an auth failure

Classify from the body's `Code`, **never** from the status:

| Code | Status | What it actually means |
|---|---|---|
| `100` | 401 | Invalid API key **or no credential at all** — byte-identical either way |
| `120` | 401 | Invalid OAuth token — reconnect |
| `121` | 401 | Expired OAuth token — refresh |
| `122` | 401 | Revoked OAuth token — reconnect |
| `102` | 401 | **Invalid ClientID — the credential is fine, the resource id is wrong** |
| `403` | 403 | "Not allowed for a Non-agency Customer" — **the credential is live**, the endpoint is out of reach |

Measured live: no `Authorization` header at all and `-u notarealkey…:x` both return the identical
40-byte `{"Code":100,"Message":"Invalid API Key"}`, while a bogus bearer returns
`{"Code":120,"Message":"Invalid OAuth Token"}`. Codes `100`, `120`, `121` and `122` are the only
ones this app treats as credential failures — `102` and `403` deliberately are not
(`lib/client.ts#CREDENTIAL_FAILURE_CODES`).

### 3. Neither the API nor the docs site 404s for things that do not exist

**The API checks authentication *before* routing.** All three of these are byte-identical:

```
GET /api/v3.3/clients.json                 → 401 {"Code":100,"Message":"Invalid API Key"}
GET /api/v3.3/definitely-not-real-zzz.json → 401 {"Code":100,"Message":"Invalid API Key"}
GET /api/v3.4/systemdate.json              → 401 {"Code":100,"Message":"Invalid API Key"}
```

So an unauthenticated probe proves **reachability and nothing else** — it cannot tell a real
endpoint from a fabricated one. Every endpoint in this app was taken from the reference, not
confirmed by probing. (`/api/v9.9/…` and `/api/v4.0/…` do 404, so the router is not a blanket
catch-all; it simply runs after the credential check for anything under a `v3.x` prefix.)

**The docs site serves HTTP 200 for versions that do not exist.**
`/api/v3-4/getting-started/`, `/api/v3-5/…` and `/api/v4/…` each return **200** with ~138,980 B of
complete, plausible reference prose. The only thing separating them from the real page is a banner:

> "You're currently veiwing the docs for version 3.4, which is no longer the most up to date API
> version."

— and for `/api/v4/` even the version number interpolates empty. `grep -c "no longer the most up to
date"` is **0** on the v3-3 page and **1** on every other version page; **that count, not the status
code, is what identifies the current version.** v3.3 is current. (A genuinely unknown *leaf* does
404: `/api/v3-3/definitely-not-real-zzz/` → 404.)

**Liveness:** no `deprecat|sunset|will be removed|end of life` marker applies to v3.3. The only two
hits across all eleven pages are a deprecated *parameter* (`Personalize` on send-preview, which this
app therefore does not expose) and error code `110` "Deprecated Method" on `setbasics` (an endpoint
this app does not ship).

### 4. `/transactional` is a different API sharing the hostname

*"Unlike the rest of our API, all /transactional endpoints support only JSON and are subject to rate
limiting."* Concretely:

| | Rest of the API | `/transactional` |
|---|---|---|
| Extension | `.json` **required** (XML is the default otherwise) | **none** — adding `.json` 404s |
| Segments | lowercase (`suppressionlist`) | camelCase (`smartEmail`, `classicEmail`) |
| Client param | `clientid` in the **path** | `clientID` (capital D) in the **query**, optional |
| Rate limiting | none | `X-RateLimit-Limit` / `-Remaining` / `-Reset`, 429 on breach |

`lib/client.ts` exposes `json()` and `transactional()` as separate methods so no call site can get
this wrong.

---

## Actions (42)

### Account-level (3)

| Action | Endpoint |
|---|---|
| `client-list` | `GET /clients.json` |
| `billing-details-get` | `GET /billingdetails.json` |
| `system-date-get` | `GET /systemdate.json` |

`system-date-get` is worth more than it looks: **every date in this API is in the client's timezone,
not UTC and not your workflow's clock** — the `date` filters, `SendDate`, and the list-stats
"today"/"this week" buckets. This returns the clock those are measured against.

### Client-level (11)

| Action | Endpoint |
|---|---|
| `client-get` | `GET /clients/{clientid}.json` — **strips `ApiKey`** |
| `client-lists-get` | `GET /clients/{clientid}/lists.json` |
| `client-lists-for-email-get` | `GET /clients/{clientid}/listsforemail.json?email=` |
| `client-segments-get` | `GET /clients/{clientid}/segments.json` |
| `client-templates-get` | `GET /clients/{clientid}/templates.json` |
| `client-tags-get` | `GET /clients/{clientid}/tags.json` *(new in v3.3)* |
| `client-suppression-list-get` | `GET /clients/{clientid}/suppressionlist.json` |
| `client-suppress` | `POST /clients/{clientid}/suppress.json` |
| `client-unsuppress` | `PUT /clients/{clientid}/unsuppress.json?email=` — note **PUT**, not DELETE |
| `client-campaigns-get` | `GET /clients/{clientid}/campaigns.json` — **paged as of v3.3** |
| `client-drafts-get` | `GET /clients/{clientid}/drafts.json` — **a bare array, not paged** |

The last two are the asymmetry to watch: same client, same noun, two response shapes.

### Lists (6)

`list-create` (`POST /lists/{clientid}.json`), `list-get`, `list-stats-get`,
`list-custom-fields-get`, `list-segments-get`, and `list-subscribers-get`, which folds the five
state paths (`active` / `unconfirmed` / `unsubscribed` / `bounced` / `deleted`) into one action
because the vendor gives them a byte-identical signature and changes them together.

`UnsubscribeSetting` is the consequential field on `list-create`. `OnlyThisList` does something the
name does not suggest: the vendor states it *"will result in this list **not using the suppression
list**"*, so a suppressed address stays subscribed there.

### Subscribers (7)

`subscriber-add`, `subscriber-update`, `subscriber-get`, `subscriber-history-get`,
`subscriber-unsubscribe`, `subscriber-delete`, `subscriber-import`.

Three traps, each documented at its action:

- **`subscriber-add` is queued; `subscriber-import` is synchronous.** The vendor contrasts them
  directly — add "is then passed into a processing queue", import is "instantaneous" and "will only
  return back once all subscribers have been added". A read straight after an add may not find them.
- **`subscriber-update`'s `?email=` is the OLD address**; the body's `EmailAddress` is the new one.
  Passing the new address in both is how you edit the wrong person.
- **A partial bulk import arrives as an *error*.** All succeed → `201`. Some succeed → **`400`** with
  `{"Code":210,…,"ResultData":{…FailureDetails…}}`. This app surfaces `ResultData` verbatim, because
  it is the only record of which addresses landed.

`subscriber-unsubscribe` and `subscriber-delete` also differ in shape *and* in effect: unsubscribe is
a POST with a body and may add the address to the suppression list (depending on the list's
setting); delete is a DELETE with a query parameter and explicitly does **not**.

### Campaigns (8)

`campaign-create`, `campaign-send`, `campaign-send-preview`, `campaign-unschedule`,
`campaign-summary-get`, `campaign-recipients-get`, `campaign-interactions-get`,
`campaign-lists-and-segments-get`.

- `campaign-create` takes an `HtmlUrl` that Campaign Monitor **fetches and imports** — there is no
  way to POST HTML directly — and lists and segments are **mutually exclusive** (*"If you are using
  the SegmentIDs section, remove the ListIDs section"*). This app refuses both rather than letting
  the API decide.
- `campaign-interactions-get` folds `opens` / `clicks` / `bounces` / `unsubscribes` / `spam` into one
  action; they share a signature and an envelope. Its `date` filter has **minute** precision
  (`YYYY-MM-DD HH:MM`), unlike the list endpoints' bare `YYYY-MM-DD`.
- `campaign-recipients-get` is deliberately separate: it has no `date` and orders by `email|list`
  only.
- `campaign-summary-get` returns **both** `TotalOpened` (events) and `UniqueOpened` (people); in the
  vendor's own example they are 345 and 298.

### Templates (1)

`template-get` (`GET /templates/{templateid}.json`). Note the sibling: `POST /templates/{clientid}.json`
**creates** a template — same prefix, different id meaning. Listing is `client-templates-get`.

### Transactional (6)

`smart-email-list`, `smart-email-get`, `smart-email-send`, `classic-email-send`,
`transactional-statistics-get`, `transactional-messages-get`.

- Both sends respond `202` with an **array — one `MessageID` per recipient**, not one per call.
- The 25-recipient ceiling counts `To` + `CC` + `BCC` **together** (code 954); this app checks it
  before spending a request.
- `AddRecipientsToList` is a **list ID string** on `smart-email-get` and a **boolean** on
  `smart-email-send`. Same name, different type, one endpoint apart.
- `transactional-messages-get` pages by **message-ID cursor** (`sentBeforeID` / `sentAfterID` /
  `count`), not by page number — the only endpoint in the API that does. It exposes no `page` param
  for that reason.
- `Group` on `classic-email-send` is a reporting bucket, not a per-message id: *"There is a limited
  number of groups, so this should not be unique or changed frequently."* Use `"Password Reset"`,
  never `"Password Reset 4711"`.

---

## Retries and idempotency

**Campaign Monitor accepts no idempotency key on any endpoint**, so `ctx.invocation.invocationId`
has nowhere to go. Idempotency is therefore a property of each endpoint's own semantics, declared
honestly per action:

| `idempotent: false` | Why |
|---|---|
| `campaign-send` | irreversible and billable; a repeat gets code 331 only *after* the send is accepted |
| `campaign-send-preview` | delivers mail and burns a rationed allowance (15/call, 240 per 24h per client) |
| `smart-email-send`, `classic-email-send` | deliver mail; no "already sent" guard at all |
| `list-create`, `campaign-create` | a repeat with the same title/name is refused (codes 250 / 303) |

| `idempotent: true` | Why |
|---|---|
| `subscriber-add`, `subscriber-update`, `subscriber-import` | upserts keyed on the address; the welcome mail goes to *new* subscribers only |
| `subscriber-unsubscribe`, `subscriber-delete` | state changes; a repeat lands the same state |
| `client-suppress`, `client-unsuppress` | same; unsuppress answers code 176 on a repeat, surfaced verbatim |
| `campaign-unschedule` | the end state is "not scheduled" either way; code 341 on a repeat is surfaced, because it also means "it already went out" |

---

## Authentication

### `api-key` — HTTP Basic, key as the **username**

The vendor: *"you provide your API key as the username and the password portion can be blank or a
dummy value, as it is not used for authentication"*, demonstrated with
`curl -u "dklkmwlmkdy7qwd98y98y98y8d68d9:x"`. So the encoded payload is `` `${apiKey}:x` ``. This
app sends the literal `x` (the vendor's own example value) rather than an empty string; both are
documented as acceptable, and the `x` form cannot be corrupted by an intermediary that trims a
trailing empty field.

`type: "basic"` rather than `type: "apiKey"` because `ApiKeyConfig` can only express "put this value
in this slot with this prefix" — it cannot express "base64 the value with `:x` appended". One field,
not a username/password pair: the password is fixed as ignored by the protocol, so prompting for it
would invite people to type something wrong.

### `oauth2` — the vendor's own preference

*"Authenticating using OAuth is preferred over using an API key with Basic Authentication."*
Three details a generic OAuth2 client gets wrong, all declared rather than hand-rolled:

1. The authorization endpoint is **`/oauth`**, not `/oauth/authorize`, and it is on the API host.
2. **`type=web_server` is a required query parameter** (`extraAuthParams`) and is not part of
   RFC 6749. The alternative `user_agent` selects the implicit flow, which grants no refresh token
   and so is unusable for background runs — it is not offered.
3. **Scopes are comma-separated** (`scopeSeparator: ","`). The vendor's own example is
   `SendCampaigns,ViewReports`; the RFC 6749 space separator produces `unknown_scope`.

`pkce` is **off**: the vendor documents neither `code_challenge` nor `code_challenge_method`, and
the token exchange it does document carries `client_secret` — a confidential client.

All twelve documented permissions are offered (`ViewReports`, `ManageLists`, `CreateCampaigns`,
`ImportSubscribers`, `SendCampaigns`, `ViewSubscribersInReports`, `ManageTemplates`,
`AdministerPersons`, `AdministerAccount`, `ViewTransactional`, `SendTransactional`, `Automation`).
They are *account-level* grants, which is why OAuth is treated like an account key by the
`/transactional` endpoints.

**One detail could not be confirmed, so nothing was invented for it.** The documented refresh
request is a POST to `/oauth/token` with **exactly** `grant_type=refresh_token&refresh_token={…}` —
no `client_id`, no `client_secret` in the documented body. Whether the endpoint also *tolerates*
client credentials there is not stated anywhere in the reference, so no custom `refresh` hook is
shipped and the host's standard refresh against `refreshUrl` is used.

---

## Health checks

| Check | Kind | State |
|---|---|---|
| `api` | `dependency` | live probe |
| ~~`service`~~ | `service` | declared absence, `informational` |
| ~~`quota`~~ | `quota` | declared absence, `informational` |
| `auth:api-key`, `auth:oauth2` | derived | from the two `test` hooks |

### `api` — the only out-of-band signal this app has

An **unsigned** `GET /api/v3.3/systemdate.json`. The expected answer is
`401 {"Code":100,"Message":"Invalid API Key"}`, and **that is a pass**: a schema-correct
authentication error proves the API parsed the request, ran its authenticator, and produced its own
documented error envelope. Whether any *particular* credential works is the derived `auth:*` checks'
job — conflating the two is how a vendor outage gets misreported to every tenant as "your key
expired".

The verdict is driven by the **shape of the body**, never the status: a numeric `Code` → `ok`
(unless 5xx); a 5xx or markup from this host → `down`; a transport failure → `down`; anything it
cannot interpret → `unknown`, because not understanding an answer is not evidence the vendor is
broken. `credential: "none"`, and it declares no extra egress — the probe host is the app's own.

### ~~`service`~~ — the status page exists, and a server-side client cannot read it

**This is a different fact from "no status page", and the distinction matters.**
`status.campaignmonitor.com` is a real, Marigold-branded **StatusCast** page for Campaign Monitor,
it is machine-readable, and **it does cover the API** — the rendered page carries an `API` group
whose components are `API endpoints`, `Transactional SMTP` and `Webhooks`, alongside `Web
application`, `Email sending` and `Help Center`:

```
GET /summary.json → {"PageName":"Campaign Monitor","Domain":"campaignmonitor",
                     "StatusText":"Normal","Status":"Available",
                     "UnresolvedIncidents":[],"UpcomingIncidents":[]}
GET /status.json  → {"StatusText":"Normal","Status":"Available","InEffectSince":"…"}
GET /rss          → 49,196 B of StatusCast RSS
```

But **a WAF answers `403` with a 28-byte `Invalid request blocked (v1)` to every client that does
not present a full desktop-browser `User-Agent`.** Measured across nine UA values against
`/summary.json`, same IP, same minute:

| User-Agent | Status |
|---|---|
| *(absent)*, `curl/8.5.0`, `Deno/2.1.4`, `w6w-healthcheck/1.0`, `node`, `Mozilla/5.0`, `Mozilla/5.0 (compatible; w6w/1.0; …)`, `python-requests/2.31.0`, `Go-http-client/2.0` | **403** |
| full desktop Chrome 126 UA string | **200** |

`Deno/x.y.z` is what `ctx.fetch` sends by default, and the host's `feed:` fetcher is the same stack.
The only thing that gets through is impersonating Chrome, and **this app will not do that**: a probe
whose correctness depends on defeating the vendor's bot filter breaks silently the next time that
filter is tuned, and it misrepresents who is calling.

The obvious alternatives were checked and ruled out:

- `status.campaignmonitor.com/api/v2/summary.json`, `/history.atom`, `/history.rss`, `/index.json` —
  **not a Statuspage**; each 302s to `/errors/404`.
- `campaignmonitor.statuspage.io/api/v2/summary.json` — 302 to `https://www.statuspage.io`, i.e. an
  **unclaimed** Statuspage subdomain.
- `status.createsend.com` — 302 to `…/login?ReturnUrl=%2F`, a login wall.
- `trust.campaignmonitor.com` — 301 to the marketing homepage.

So this is declared `unavailable` at `severity: "informational"` — load-bearing, because an
`unavailable` entry always reports `unknown` and `unknown` outranks `ok` in the roll-up, so at any
other severity it would pin the App's verdict at `unknown` forever. If the WAF is ever relaxed,
reviving this is a two-line change to the URLs above.

### ~~`quota`~~ — the headroom numbers exist and cannot be read safely

Campaign Monitor publishes a *complete* `X-RateLimit-Limit` / `-Remaining` / `-Reset` triple, which
is better than most vendors — but scoped precisely: *"**All /transactional endpoints** are subject to
API rate limiting."* Nothing outside `/transactional` carries the headers, and every transactional
endpoint either **sends email** or is refused with code 980 on accounts without the feature. A health
check that sends mail is not a health check.

The near-miss alternative is `GET /billingdetails.json` → `{"Credits": n}`. It is not headroom: it is
a **balance with no ceiling**, it 403s for a non-agency customer, and it is meaninglessly zero on
monthly-billed plans — reporting it as quota would flag every healthy monthly account as exhausted.
The number is still available on demand as the `billing-details-get` action.

Every other limit is a fixed constant enforced by refusal, never reported as a remaining count:
25 recipients per transactional send (954), 1000 subscribers per import (209), `pagesize` 10–1000
(801), 15 preview recipients (374) and 240 per 24 h (375), 5 clients per 30 minutes (172).

---

## What is deliberately not here

Left out because a detail could not be confirmed, or because shipping it would be wrong:

- **Journeys** (`/clients/{clientid}/journeys.json`, `/journeys/{journeyid}.json`, the five journey
  email reports, `/journeys/{journeyid}/copy.json`, `/events/publish/{clientId}`) — documented and
  real, but automation reporting is a coherent surface of its own and was left for a follow-up rather
  than half-covered.
- **Segment CRUD** (`POST/PUT /segments/{listid|segmentid}.json`, rule groups) — the segment *rule*
  grammar is a nested structure the reference describes in prose across a long section; a wrong rule
  silently selects the wrong subscribers, which is worse than not offering it. Segments are still
  readable (`client-segments-get`, `list-segments-get`) and usable as campaign targets.
- **Account administrators, people, primary contacts, client billing, client create/delete, sending
  domains** — account administration rather than marketing automation, and several are agency-only.
- **Embedded session** (`PUT /externalsession.json`) — requires an `IntegratorID` obtained by
  contacting Campaign Monitor support, so it cannot be exercised or verified here.
- **List webhooks** (`/lists/{listid}/webhooks.json`) — these are the App's `TriggerDefinition`
  surface, not an action surface; adding them means reading `rfcs/trigger.md` first.
- **Template create/update/delete/copy** — `template-get` and `client-templates-get` cover reading;
  authoring templates through an API is not something a workflow step does well.
- **The `Personalize` parameter on send-preview** — the vendor documents it as deprecated and
  ignored, so it is not exposed.
- **XML I/O** — the API supports it; this app pins JSON everywhere (`.json` extension *and*
  `Accept: application/json`, belt and braces, since XML is the documented default).

## Local development

```bash
deno task validate   # audit the manifest and sandbox rules
deno task check      # typecheck
deno task lint
deno task fmt
deno task test       # 230 unit tests, mocked HookContext, no network
```

All hooks reach the network only through `ctx.fetch`, and the raw credential is visible only to each
auth method's `sign` hook. `tests/index.test.ts` enforces both statically, plus a **derived**
invariant: any action whose source builds the path `/clients/{}` must call `stripSecrets`, and any
action that calls `stripSecrets` must have a reason to — so a future read of the client-details
endpoint cannot ship without redaction.
