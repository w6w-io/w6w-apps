# Formidable Forms

Manage forms, entries and Views on a **self-hosted** Formidable Forms site, through its own
`/frm/v3` REST API on top of WordPress' REST API.

- **Id:** `io.w6w.formidableforms` · **Categories:** `forms`, `productivity`
- **Auth:** `basic` (HTTP Basic — a WordPress Application Password)
- **Actions:** 15 · **Health checks:** `service`, `site`, `quota`

Everything below was verified against the vendor's own documentation on 2026-09-05; the pages used
are listed under [Links](#links). No endpoint, parameter or response key here was written from
memory.

## The self-hosted model — read this first

Formidable Forms is a **WordPress plugin**, not a SaaS. It registers its REST namespace on the
site's own WordPress REST API, so there is no shared vendor host and no shared credential. Every
call this App makes goes to the customer's own server:

```
https://{their-site}/wp-json/frm/v3/...
```

Three consequences shape the whole App, and they are the same ones this pack's `gravityforms` app
works under:

1. **The base URL is per-Connection.** The site URL is collected once as an Auth field, published
   onto the Connection's redacted display data by `afterConnect`, and turned into a base URL in
   `lib/client.ts`. Actions read it from `ctx.connection.display` — they never see the credential.

2. **Subdirectory installs are first-class.** `normalizeSiteUrl()` preserves a subdirectory install's
   path, strips trailing slashes, and tolerates a URL pasted with `/wp-json` or `/wp-json/frm/v3`
   already on the end, so the route is never doubled. Covered directly in `tests/lib/client.test.ts`.

3. **Egress cannot be allow-listed.** The manifest declares `network.allow: ["*"]` — the posture the
   spec names for "the endpoint is a user-supplied URL (a self-hosted install)". There is no
   narrower form that works when the host belongs to the customer.

## Three things that would cost someone a day

1. **The obvious starting point — `/frm/v2` — is a frozen legacy namespace, and the vendor says so
   in its own words.** This app was scoped from `.../knowledgebase/formidable-api/`, which documents
   `wp-json/frm/v2/forms`, `.../forms/{id}/entries`, etc. Reading past that page to
   `.../knowledgebase/formidable-api-rest-endpoints/` turns up the real current guidance: *"Formidable
   API Add-On 2.0 uses `/frm/v3` as the current REST namespace... The add-on keeps `/frm/v2` as a
   frozen legacy namespace for existing integrations. Use `/frm/v3` for new integrations."* `/frm/v2`
   also has no styles, form actions, form style assignment, Applications, Application items or View
   layouts, and per the same page will not get them. Every route in this app is a `/frm/v3` route —
   building against the first page found would have shipped a deprecated integration on day one.

2. **Two different, non-interchangeable credentials share the word "API key", and only one works
   here.** The legacy `frm_api_key` (Formidable → Global Settings → API) authenticates the old
   `/frm/v2` "Send API Data" webhook flow and, per the vendor, "runs a request with administrator
   access" — unscoped, and never documented as valid for `/frm/v3`. `/frm/v3` authenticates with a
   **WordPress Application Password** over HTTP Basic instead, scoped to whatever Formidable
   permissions its WordPress user carries. Reusing the legacy key against `/frm/v3` fails in a way
   that looks like a wrong URL, not a wrong credential kind.

3. **The `/frm/v3` reference documents no response bodies at all.** Every route in the endpoint
   table is a route + query/body parameters; the only worked examples are four request-only `curl`
   calls (create a style, assign a style, create a View, create a View layout) — none show what comes
   back. Declaring an `output` shape for any action here would be guessing rather than reading, so
   none do (see [Response shapes](#response-shapes-are-not-documented), below).

## Two prerequisites that make every action 404 like a wrong URL

- **Formidable Forms Pro + the "Formidable API" add-on (2.0+)** must both be installed and active,
  on a plan that includes the API add-on (Business or higher, per the vendor's current
  knowledgebase).
- **`REST API` must be switched on** at `Formidable → Global Settings → API`. The vendor's own words:
  "When REST API is off, Formidable does not register the `/frm/v2` or `/frm/v3` routes." The `site`
  health check below distinguishes this from a genuinely offline site.

## Auth

`/frm/v3` authenticates with **HTTP Basic using a WordPress Application Password** — the WordPress
username plus a generated Application Password (`Users → Profile → Application Passwords`), carrying
that user's own Formidable permission set (`Formidable → Global Settings → Permissions`). This is the
route the vendor's own current docs recommend for "REST API v3, Abilities API, and MCP requests,"
explicitly over the legacy API key.

Connect-time fields: **WordPress Site URL**, **WordPress Username**, **Application Password**.

`test` probes `GET /frm/v3/forms` — the cheapest authenticated read the reference documents, needing
only the "View Forms List" permission. Reaching it proves four things a transport check would
conflate: the site resolves, the WordPress REST API is on, `REST API` is switched on under
Formidable's own settings, and the credential is live. A 404 names the settings toggle; a 403 names
the missing permission.

## Actions

| Key                  | Type    | Endpoint                                    | Notes                                                             |
| --------------------- | ------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `form-get-many`       | search  | `GET /forms`                                 | `page`, `page_size`, `order`, `order_by`, `search`                 |
| `form-get`            | read    | `GET /forms/{id}`                            | ID or form key                                                     |
| `form-create`         | perform | `POST /forms`                                | `name`, `description`, `status`, raw `options`; no field creation  |
| `form-update`         | perform | `PATCH /forms/{id}`                          | Same fields as create; sends only what's set                       |
| `form-delete`         | perform | `DELETE /forms/{id}`                         | Permanent — gated behind `confirm`                                 |
| `field-get-many`      | read    | `GET /forms/{form_id}/fields`                | Every field on a form                                               |
| `entry-get-many`      | search  | `GET /entries` or `GET /forms/{form_id}/entries` | Scoped route when a Form ID is given                            |
| `entry-get`           | read    | `GET /entries/{id}`                          | One entry                                                           |
| `entry-create`        | perform | `POST /forms/{form_id}/entries`              | Writes a row directly — see below                                  |
| `entry-update`        | perform | `PATCH /entries/{id}`                        | Only the field values sent are touched                             |
| `entry-delete`        | perform | `DELETE /entries/{id}`                       | Permanent — gated behind `confirm`                                  |
| `stats-get`           | read    | `GET /stats/{type}/{field_id}`               | See [Statistics types](#statistics-types), below                   |
| `style-get-many`      | search  | `GET /styles`                                | `page`, `page_size`, `order`, `order_by`, `search`                  |
| `form-style-assign`   | perform | `POST /form-styles/{form_id}`                | `{ style_id }` — the vendor's own worked example                    |
| `view-get-many`       | search  | `GET /views`                                 | `page`, `page_size`, `order`, `order_by`, `form_id`                 |

### `entry-create` writes a row, not a submission

Unlike this pack's `gravityforms` app, `/frm/v3` does not document a separate "run the full
front-end submission pipeline" route the way Gravity Forms exposes `POST /forms/{id}/submissions`.
`entry-create` here calls Formidable's entry-writing route directly, which does **not** run field
validation, spam checks, entry limits, or fire the form's own notification / "Send API Data" actions
— the same caveat this pack's `mautic` app states about its own direct-write actions. Use it for
imports and back-fills, where side effects would be unwanted; there is no documented alternative for
"submit as a real visitor would" to offer instead.

### Statistics types

The `/frm/v3` reference names the `stats-get` route's shape — "Statistic type and one field ID,
field key, or comma-separated list" — without re-listing the type names. Those come from the frozen
`/frm/v2/stats/{type}/{field_id}` routes documented in the vendor's older Form Webhooks API article:
`total`, `count`, `average`, `median`, `star`, `maximum`, `minimum`, `unique`, `deviation`. This
action offers them as options on the understanding that they describe the same underlying statistics
concept the v3 route carries forward; the v3 page itself does not independently re-confirm the list.

### Response shapes are not documented

The `/frm/v3` endpoint reference gives route tables and four request-only `curl` examples, with no
response body shown for any route (unlike the legacy `/frm/v2` webhook article, which does show
concrete entry JSON). Every action therefore returns the response verbatim rather than declaring a
guessed `output` shape — the same choice this pack's `mautic` app makes for routes its own vendor
doesn't spell out.

### Not implemented, and why

Real `/frm/v3` routes this App deliberately leaves out — listed so the omission is a decision rather
than a gap:

- **Field write routes** (`POST`/`PUT`/`PATCH`/`DELETE` on `/forms/{form_id}/fields[/{id}]`). The
  reference's main inputs — "Field type, label, order, required state, choice options, and field
  options" — describe a large per-type schema with no worked example. `field-get-many` covers the
  read side; writing one wrong risks corrupting a form with no documented recovery path.
- **Form actions** (`/form-actions[/{id}]`). The reference states plainly: "The payload depends on
  the action type," with no schema given for any type.
- **Applications and Application items** (`/applications[/{id}]`, `/applications/{id}/items`). No
  request-body example is given for creating one beyond a bare `name`.
- **Views beyond listing** (`GET`/`POST`/`PUT`/`PATCH`/`DELETE` on `/views/{id}`, and View layouts).
  The reference's own limitations section flags "a current permission limitation for non-administrators"
  on the get-one View route, and warns that View-layout `data` needs its rows read back and verified
  rather than assumed — both signal a surface still settling, not one safe to automate blind.
- **Styles beyond listing** (`POST`/`PUT`/`PATCH`/`DELETE` on `/styles/{id}`). The vendor's own words:
  "Do not guess internal style property names" — get a known style's `post_content` first and start
  from that, which is a workflow of "read this site's own style, then edit it," not a generic
  create/update action.

## Health checks

| Key       | Kind       | Scope      | Credential | Verdict                           |
| --------- | ---------- | ---------- | ---------- | ---------------------------------- |
| `service` | service    | app        | none       | **`unavailable`** (informational) |
| `site`    | dependency | connection | `context`  | live probe                        |
| `quota`   | quota      | connection | none       | **`unavailable`** (informational) |

**`service` — declared unavailable, honestly.** There is no vendor platform in the request path.
Formidable Forms is a plugin the customer installs on their own site, so nothing Strategy11 operates
sits between a workflow and its data. `formidableforms.com` exists — it sells licences, serves
plugin updates and hosts the docs — but its uptime is not this App's uptime, and pointing a `service`
check at it would report a marketing site's availability as if it were the API's.
`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up, so at any other severity a declared absence would pin every
verdict at `unknown` forever.

**`site` — the check that actually answers "is this working?"** It probes the unauthenticated
WordPress discovery document, `GET {site}/wp-json/`, and is `credential: "context"`: it needs the
Connection to know _which_ host to call, and no credential to interpret the answer, so `sign` never
runs. It widens no egress — the site is already reachable under the app's own allowlist. It is
deliberately not pointed at a `frm/v3` route, because every one of those is permission-gated and an
authenticated probe would conflate "the site is down" with "this credential lacks a permission". The
discovery document separates three failures instead:

1. transport failure or 5xx → the site is gone or broken (`down`)
2. 401 / 403 / 404 on the REST root → the WordPress REST API is disabled or a security plugin is
   blocking it (`down`)
3. 200, but `namespaces` does not list `frm/v3` → WordPress is fine, but Formidable's `REST API`
   setting is switched off, or the API add-on isn't active (`degraded`, with that instruction in the
   message)

(3) is the interesting one: the vendor's own reference says it plainly, and it is completely
invisible to a plain reachability check. `namespaces` is treated as advisory rather than
authoritative — a site can legitimately filter it — so its _absence_ reports `ok`, and only a
present-but-missing entry reports `degraded`.

**`quota` — declared unavailable.** The `/frm/v3` REST API rides on the site's own WordPress REST
API. Neither the endpoint reference nor the Application Password auth guide documents a rate limit
or usage-headroom headers; the only ceiling is whatever the customer's web host, PHP configuration or
a security plugin imposes, and none of those publish a number. Declared rather than omitted so a host
can tell "we cannot know" from "nobody looked".

The credential check comes free: the runtime derives an `auth:basic` check from the Auth `test` hook,
which is what reports an Application Password that has been revoked. `site` exists to tell that apart
from a site that has gone away.

## Development

```sh
cd apps/formidableforms
deno task test    # unit tests
deno task check
deno task lint
deno task fmt
```

Tests call every hook with a mocked `HookContext` (`tests/_helpers.ts`) — a queued fake `ctx.fetch`
and a no-op `ctx.log`. No network, no server.

## Icon

`assets/icon.png` is the vendor's own favicon, fetched directly from
`https://formidableforms.com/favicon.ico` (2026-09-05, 26,227 bytes, `image/x-icon` content type —
the bytes themselves are a 400×400 PNG, saved here with a matching `.png` extension rather than
renamed to disguise the real format).

## Links

Only URLs verified on 2026-09-05 are listed.

- **Vendor:** <https://formidableforms.com/>
- **REST API v3 endpoint reference (primary source for every route used here):**
  <https://formidableforms.com/knowledgebase/formidable-api-rest-endpoints/>
- **Application Password authentication:**
  <https://formidableforms.com/knowledgebase/using-application-passwords-for-api-authentication/>
- **Legacy `/frm/v2` "Send API Data" article** (read only to confirm what `/frm/v2` is and is not,
  and for the `stats` type names it still documents):
  <https://formidableforms.com/knowledgebase/formidable-api/>
