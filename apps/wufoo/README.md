# Wufoo

Forms, fields, entries and reports on the **Wufoo REST API v3**.

- **Categories** — forms, productivity
- **Auth methods** — api-key
- **Actions** — 8
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `*.wufoo.com`
- **Website** — https://www.wufoo.com/
- **API docs** — https://wufoo.github.io/docs/

> **Everything below was verified against Wufoo's own API documentation on 2026-08-11**
> (`wufoo.github.io/docs/`, the vendor's published reference) plus live probes against `*.wufoo.com`.
> Nothing here came from a third-party integration directory.

## ⚠️ The most important thing in this integration

**`GET /api/v3/users.json` returns every user's API key.** From the vendor's own documented response:

```json
"Users": [
  { "User": "fishbowl", "Email": "fishbowl@wufoo.com", "…": "…",
    "ApiKey": "AOI6-LFKL-VM1Q-IEX9" },
  { "User": "User With No Permissions", "…": "…",
    "ApiKey": "EL2P-RPCO-HD1W-SX96" }
]
```

Not just the caller's key — **every user on the account**. It is the obvious-looking whoami, and it is
the Follow Up Boss `/me` and Mailjet `/apikey` failure mode, only worse, because it discloses other
people's credentials.

So, in this app:

- the auth probe is `forms.json`, never `users.json`;
- there is **no user-listing action**, and there will not be one;
- `afterConnect` makes **no request at all** — the obvious enrichment for a connection label is that
  same user record, so the subdomain (which *is* the account's name) is used instead;
- `tests/index.test.ts` enforces all of the above with a source-grep over the whole app, so a future
  change has to delete a test to reintroduce it.

## The three other things most likely to go wrong

### 1. A rejected submission is HTTP **200**

Wufoo answers a validation failure with a success status code:

```json
{ "Success": 0,
  "ErrorText": "Errors have been highlighted below.",
  "FieldErrors": [ { "ID": "Field105", "ErrorText": "This field is required." } ] }
```

Anything that checks only the status code records a failed submission as a success — the most
damaging way to misuse this API. `entry-create` reads `Success` and throws with the per-field errors
when it is not `1`. It accepts both `0` and `"0"`, because every other scalar in this API is a string.

### 2. Entry submission is form-encoded, not JSON

The vendor's own curl posts `-d "Field1=Wufoo" -d "Field2=Test"`. It is the one call in the app whose
`content-type` is not `application/json`, and fields are keyed by **ID** (`Field105`), never by label.
Run `form-fields` first — it is the only place those ids are published, along with `IsRequired` and
each field's `Type`.

### 3. Filter dates are Pacific time, and a misspelt operator returns nothing

Wufoo's entry filters are numbered query parameters whose *value* is three space-separated parts:

```
?Filter1=Field1+Is_equal_to+Wufoo&Filter2=EntryId+Is_greater_than+1&match=AND
```

`entry-list` takes them as structured `{field, operator, value}` objects and numbers them for you,
validating the operator against the vendor's closed list — because a misspelt operator is **not** an
error at Wufoo: it returns an empty result set, which reads exactly like "no matching entries".

And the vendor's own warning: "We do not adjust your input filter date/time, so all dates/times are
interpreted as PST/PDT (UTC -8/-7)." A workflow filtering on "yesterday" in UTC is off by up to eight
hours. Format is MySQL `YYYY-MM-DD HH:MM:SS`.

## Auth

HTTP **Basic**, with the API key as the **username**:

```bash
curl -u "AOI6-LFKL-VM1Q-IEX9":"footastic" "https://fishbowl.wufoo.com/api/v3/forms.json"
```

The password is ignored — `footastic` is the documentation's placeholder, not a second secret — so
this app sends the same constant and never asks for one.

A key is a 16-character code in four hyphenated groups, from **Form Manager → More → API
Information**. It belongs to one account and authenticates only against that account's subdomain,
which is why the subdomain is an Auth field rather than an action param: they are two halves of one
Connection.

The allowlist is `*.wufoo.com` — the **narrow** wildcard. Unlike this pack's self-hosted apps, every
Wufoo account really is under one apex, so the manifest can say so instead of disabling egress
restriction entirely.

## Actions

| Action | Type | Endpoint |
| --- | --- | --- |
| `form-list` | search | `GET /forms.json` |
| `form-get` | read | `GET /forms/{identifier}.json` |
| `form-fields` | search | `GET /forms/{identifier}/fields.json` |
| `entry-list` | search | `GET /forms/{identifier}/entries.json` |
| `entry-count` | read | `GET /forms/{identifier}/entries/count.json` |
| `entry-create` | perform | `POST /forms/{identifier}/entries.json` |
| `report-list` | search | `GET /reports.json` |
| `report-entries` | search | `GET /reports/{identifier}/entries.json` |

### Notes on individual actions

**Start at `form-list`** — every other action takes a form `Hash`, and that is where hashes come from.
The identifier may also be a form's *title*, which the vendor documents as interchangeable, but the
hash is the stable one: retitling a form silently breaks a workflow keyed on the title.

**Reads are unwrapped.** Wufoo answers with a single-key envelope named after the collection
(`{"Forms": […]}`, `{"Entries": […]}`), which these actions peel so a workflow gets the array
directly. Two deliberate exceptions: `form-get` returns the form itself rather than a one-element
array, and `entry-count` returns `{"EntryCount": "42"}` untouched — it is a value, not a collection,
and the count really is a string.

**`report-entries` takes only paging.** A report already encodes its own filters; adding more would be
fighting the saved view. Use `entry-list` for ad-hoc filtering.

**Paging is `pageStart`/`pageSize`**, where `pageStart` is an offset (not a page number) and
`pageSize` is capped at 100 (default 25).

## Health checks

| Check | Kind | Scope | Severity | What it does |
| --- | --- | --- | --- | --- |
| `service` | service | app | (default `degraded`) | Reads `status.wufoo.com/api/v2/summary.json` |
| `quota` | quota | app | informational | Declared `unavailable` — no readable headroom |
| `auth:api-key` | — | connection | — | Derived from `Auth.test` automatically |

### The status page is real, and it publishes nothing

Checked three ways: `/api/v2/summary.json` returns 286 bytes of JSON while
`/api/v2/definitely-not-real-zzz.json` returns **404 with 0 bytes**; the body is
`application/json` parsing as the Statuspage v2 schema, matching neither known unclaimed-host
signature; and it self-identifies as `page.name: "Wufoo"`,
`page.url: "https://status.wufoo.com"`. (`wufoo.statuspage.io` returns the byte-identical payload —
md5 `eb4af9bb7d25` for both — so it is the same claimed page under its Statuspage-native name.)

The finding that shapes the code: **`components` is empty**. The whole body is a page, three empty
arrays, and a page-level `status: {indicator, description}`. The sibling checks in this pack treat "no
components" as `unknown`, because a page listing nothing has usually broken; here it is the *normal*
state, so this check reads the page indicator as authoritative and only folds in components if Wufoo
ever starts publishing them.

Wufoo is a SurveyMonkey product, and SurveyMonkey runs its own claimed page at
`status.surveymonkey.com`. That page is deliberately **not** used: it describes a different product,
and the check refuses any page that stops self-identifying as Wufoo's.

Severity stays at the `degraded` default — Wufoo is SaaS-only, so an incident really is evidence about
every Connection.

### Why `quota` is unavailable

Wufoo enforces two real limits and publishes neither as a readable number:

- **A per-key daily request allowance that varies by plan** — the vendor's words: "we restrict API
  usage per key, per day. Your API usage is dependent on your plan." That is a pricing-page fact, not
  an API-readable one.
- **50 entry submissions per user per 5-minute sliding window**, which returns
  `{"Text": "Slow Down", "HTTPCode": 429}` once exceeded.

A live response carries no `RateLimit-*`, `X-RateLimit-*` or `Retry-After` header. Both limits are
enforced by refusal, so neither can be read before it runs out.

## Deliberately not shipped

| Surface | Why |
| --- | --- |
| **Users** (`users.json`) | It returns every user's API key. See the top of this file. Not shipped, and banned by test. |
| **Comments** (`comments.json`) | Real and straightforward; left out to keep this first pass reviewable. |
| **Widgets** (`widgets.json`) | Embed-code metadata rather than a workflow step. |
| **Webhooks** (`webhooks.json` PUT/DELETE) | Webhook subscriptions belong to a trigger surface, not an action surface. |
| **Login** (`login.json`) | Exchanges a username and password for an API key — a credential-provisioning flow, and one that would mean handling a password. |
| **Form and report *creation*** | Wufoo's API is read-mostly; building forms is a design-time job done in the UI. |

## Icon

`assets/icon.png` is **Wufoo's own mark**, not a drawing. Wufoo has no SVG in any of the usual
verbatim sources — simple-icons does not carry it — so the mark was taken from n8n's `nodes-base`,
which is where several of this pack's vendor marks come from:

```
https://raw.githubusercontent.com/n8n-io/n8n/master/packages/nodes-base/nodes/Wufoo/wufoo.png
```

It is a 60×60 PNG, unmodified. The App contract accepts `assets/icon.{svg,png}`, and a real
low-resolution mark is a better answer than an invented vector one. Run `deno task fmt`, never bare
`deno fmt`.

## Layout

```
wufoo/
├── index.ts                  # AppDefinition: 8 actions, 1 auth, 2 health checks
├── lib/client.ts             # subdomain → base URL, envelope unwrapping, form-encoded submission
├── lib/filters.ts            # the numbered Filter1/Filter2 syntax and its closed operator list
├── auth/api-key.ts           # Basic with the key as username; forms.json probe; users.json banned
├── actions/                  # one file per action
├── health/                   # service (Statuspage, no components) + quota (unavailable)
└── tests/                    # 72 unit tests against a mocked HookContext
```

## Development

```bash
deno task test     # 72 unit tests
deno task check    # typecheck
deno task lint
deno task fmt      # NEVER bare `deno fmt` — it rewrites assets/
```
