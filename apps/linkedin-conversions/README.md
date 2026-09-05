# LinkedIn Conversions

Stream server-side conversion events to LinkedIn and manage the **LinkedIn Conversions API**:
Conversion Rules, their association with Campaigns, and the events themselves.

- **Categories** — marketing, analytics
- **Auth methods** — `oauth2` (`rw_conversions`, `r_ads`)
- **Actions** — 7
- **Health checks** — 1 (`service`) + ~~`quota`~~ (declared absence) + 1 derived (`auth:oauth2`)
- **Egress allowlist** — `api.linkedin.com` (the `service` check adds `www.linkedin-apistatus.com`
  to its own hook allowlist, never to the app's)
- **Website** — https://www.linkedin.com/marketing/
- **API docs** — https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversions-api
- **Status page** — https://www.linkedin-apistatus.com/

> **Everything below was verified against LinkedIn's own sources on 2026-09-05** — Microsoft
> Learn's LinkedIn Marketing docs (`integrations/ads-reporting/conversions-api`,
> `integrations/ads-reporting/conversions-api-schema`,
> `integrations/ads-reporting/conversion-tracking`, and `marketing/versioning`) plus live,
> unauthenticated probes against `api.linkedin.com` and `www.linkedin-apistatus.com`. Nothing here
> came from a third-party integration directory.

## This is not `linkedin` or `linkedin-ads`

This pack already ships two other LinkedIn apps: [`apps/linkedin`](../linkedin/README.md) (the
member/social Posts API) and [`apps/linkedin-ads`](../linkedin-ads/README.md) (campaign
management — Ad Accounts, Campaigns, Creatives, Ad Analytics, Matched Audiences). This app is the
**Conversions API**: server-side conversion-event reporting, so an advertiser can measure and
attribute conversions that happen off-site or after the fact (a server-side purchase, a CRM lead
qualification, an offline sale) — regardless of whether a client-side pixel could ever have seen
them. It shares a host and Rest.li transport conventions with the other two, and its icon is
byte-identical to both siblings' — same vendor mark — but every endpoint, scope and schema field
below was verified independently against the Conversions-API-specific docs, not copied from either
sibling.

The three apps are also gated **independently**: being approved for `linkedin-ads`'s Advertising
API program does not imply approval for the Conversions API, and vice versa. This app requests its
own, narrower scope pair — `rw_conversions` and `r_ads` — not `linkedin-ads`'s `rw_ads`/
`r_ads_reporting`.

## Three findings worth knowing before you build on this

### 1. Two different LinkedIn URN namespaces, and mixing them up doesn't fail loudly

Every Ad Account/Campaign URN in this API uses LinkedIn's familiar `li` namespace
(`urn:li:sponsoredAccount:...`, `urn:li:sponsoredCampaign:...`). A **Conversion Rule's own id**
does not — it's `urn:lla:llaPartnerConversion:{id}`, the `lla` namespace. `lib/client.ts`'s
`llaPartnerConversionUrn()` exists specifically because pattern-matching the wrong sibling app's
`toUrn()` helper here would silently build a syntactically plausible but wrong URN — LinkedIn
rejects it with a generic "Invalid Urn format. Invalid prefix" error, not a helpful "wrong
namespace" message.

### 2. A Conversion Rule has no documented delete — only a soft "stop matching"

Only the **association** between a Campaign and a Conversion Rule (`campaignConversions`) has a
documented `DELETE`. The Conversion Rule itself does not — there is no `DELETE /rest/conversions/{id}`
anywhere in the vendor's docs. `conversion-rule-update` can set `enabled: false`, which the schema
docs describe as stopping the rule from matching new conversions, but the rule and its event
history remain. No `conversion-rule-delete` action is included here because there's nothing to
call; inventing a "delete" that's actually an update would be exactly the kind of undocumented
behavior this pack avoids. See `lib/client.ts` for the same note in code.

### 3. The version header, and why 202608 — plus a type enum with a version floor

Every `/rest/` call must carry `Linkedin-Version: YYYYMM`. LinkedIn publishes a new version monthly
and supports each for a minimum of one year before sunsetting it on a rolling schedule — the
versioning page itself carries a live deprecation banner. `202608` (August 2026) was that page's
documented "Latest Version" on 2026-09-05; **this is a maintenance item, not a constant** — check
https://learn.microsoft.com/en-us/linkedin/marketing/versioning before it goes stale, the same
caution `linkedin-ads` already documents for its own pinned version.

The version pin also has a direct functional consequence here: the Conversion Rule `type` schema
adds `MARKETING_QUALIFIED_LEAD` and `SALES_QUALIFIED_LEAD` starting at exactly `202608` — a version
bump forward is safe, but rolling the pin *back* below `202608` would need those two values dropped
from `lib/params.ts`'s `conversionTypeOptions` too, or LinkedIn will reject them for a stale
version's semantics.

## Auth

One `oauth2` method, the standard Authorization Code flow against
`https://www.linkedin.com/oauth/v2/authorization` / `.../accessToken`, PKCE off (LinkedIn's
documented request/response shapes for this flow carry no `code_challenge`/`code_verifier`,
mirroring both sibling LinkedIn apps).

**Scopes**: `rw_conversions` (read/write conversion data) and `r_ads` (read access to the
authenticated member's ad accounts) — both requested together, per the docs' own Permissions
section: "The following conditions must be met for a successful call: Scope permissions to
rw_conversions, r_ads."

**Beyond OAuth, an ad account role also gates every call.** The docs add a second, non-OAuth
condition: the authorizing user must hold one of `ACCOUNT_BILLING_ADMIN`, `ACCOUNT_MANAGER`,
`CAMPAIGN_MANAGER` or `CREATIVE_MANAGER` on the ad account — a plain `VIEWER`, even with
`rw_conversions` granted, cannot create or edit conversion rules. LinkedIn's own error table maps
this to a **403 `USER_NOT_AUTHORIZED`**, not a 401.

**Access is approval-gated**, the same caveat `linkedin-ads` documents for its own program: a
correctly-configured Developer app can still fail here until LinkedIn approves it for the
Conversions API. LinkedIn gates most of its Marketing APIs behind partner/product access approval
this way — it does not block *building* this connector, only *using* it live.

**The probe, and why it's not a whoami.** LinkedIn's Conversions API has no whoami endpoint that
needs no scope — every candidate is one of the resources this app manages. `oauth2.test` calls
`GET /rest/conversions?q=account&account=urn:li:sponsoredAccount:0` — `q=account` is the *only*
documented finder for Conversion Rules and mandatorily requires an account URN. A syntactically
valid but non-existent account id (`0`) is used deliberately, the same reasoning `linkedin-ads`'s
`oauth2-audiences.test` uses: a live token still gets back an empty `elements` array rather than an
error, without depending on the caller having created a rule yet. It needs only `r_ads`, and the
response carries nothing secret.

| Code | Status | Reported as |
| --- | --- | --- |
| `EMPTY_ACCESS_TOKEN` | 401 | credential missing (checked client-side before any request) |
| `INVALID_ACCESS_TOKEN` | 401 | the token is wrong, expired or revoked |
| `USER_NOT_AUTHORIZED` | 403 | missing app approval or ad account role |

## Actions

7 actions across 3 resources. `resource` groups them in the editor.

| Key | Type | Endpoint |
| --- | --- | --- |
| `conversion-rule-create` | perform | `POST /rest/conversions` |
| `conversion-rule-get` | read | `GET /rest/conversions/{id}?account=...` |
| `conversion-rule-list` | search | `GET /rest/conversions?q=account&account=...` |
| `conversion-rule-update` | perform | `POST /rest/conversions/{id}?account=...` (`PARTIAL_UPDATE`) |
| `campaign-conversion-associate` | perform | `PUT /rest/campaignConversions/(campaign:...,conversion:...)` |
| `campaign-conversion-delete` | perform | `DELETE /rest/campaignConversions/(campaign:...,conversion:...)` |
| `conversion-event-report` | perform | `POST /rest/conversionEvents` (single, or `BATCH_CREATE` for 2+) |

### Idempotency

`conversion-rule-create` is **not** idempotent — LinkedIn documents no create-time dedupe key, so a
retry creates a second rule. `conversion-rule-update` **is** — a `$set` patch's end state doesn't
depend on how many times it ran. `campaign-conversion-associate` **is** — a repeated `PUT` of the
same pair is a plain re-assert, not an error. `campaign-conversion-delete` is **not** — a repeat
delete of an already-removed association is a caller-visible failure rather than a confirmed silent
no-op, the same reasoning `linkedin-ads`'s `audience-segment-delete` uses. `conversion-event-report`
is **not** — the vendor's own `eventId` field is documented as enabling deduplication, but it's
optional, so a bare retry without one (or under a fresh one) reports a second event.

### Notes on individual actions

- **`conversion-rule-create` pins `conversionMethod: "CONVERSIONS_API"`.** The schema docs are
  explicit: "For streaming conversions via API, the only supported value is CONVERSIONS_API." The
  same underlying `/rest/conversions` resource also backs LinkedIn's older, Insight-Tag-based
  (client-side pixel + URL match rules) conversion tracking — a different `conversionMethod` value
  this app doesn't expose, since it's a different tracking mechanism entirely (see "Deliberately
  not covered").
- **`conversion-rule-create`'s `type` enum omits `value`/currency fields.** The schema docs
  describe `valueType: "FIXED"` as using "the conversion value," but the Conversions API's own
  schema table for a conversion rule does not name a `value` field anywhere, and the vendor's
  create sample never sends one — only the older Insight-Tag conversion schema shows a `value:
  {amount, currencyCode}` object. Rather than guess at an undocumented field name/shape for this
  resource, it's left out; `valueType` is still exposed since it *is* in this resource's own schema
  table.
- **`conversion-rule-list`'s `conversionOwnershipTypes` filter needs API version 202605+** (this
  app pins 202608). Omitted, only conversion rules owned by the queried account are returned — the
  vendor's own default — not rules shared from another account under the same Business Manager.
- **`conversion-event-report` accepts `events` as free-form JSON, not a generated form.** A single
  event's `user` object alone has four optional, combinatorially-interacting sub-shapes (`userIds[]`,
  `userInfo`, `lead`, `externalIds` — e.g. "if you include userInfo/externalIds/lead without any
  valid idType in userIds, you must use an empty list [] for userIds"), the same class of
  complexity that makes `linkedin-ads`'s `campaign-create` leave `targetingCriteria` as free-form
  JSON rather than modeling it as generated Params. LinkedIn's own **Payload Builder** tool exists
  specifically because this shape is best assembled once and pasted in.
- **`conversion-event-report` picks single-create vs. `BATCH_CREATE` from `events.length`.** One
  event uses the vendor's flat single-event body; two or more use `X-RestLi-Method: BATCH_CREATE`
  with an `{ elements: [...] }` wrapper — the two different documented request shapes, selected
  automatically so a caller doesn't need to know which form to build. LinkedIn allows up to 5,000
  events per batch request; this action does not chunk a larger array for the caller.
- **`conversionHappenedAt` must be within the past 90 days**, per the vendor's own input
  validation rules — not validated client-side, since LinkedIn's own rejection message
  (`INVALID_CONVERSION_TIME_FIELD_VALUE`) already names the actual constraint.
- **`campaign-conversion-associate`/`campaign-conversion-delete` address a compound key**, not a
  single id: `(campaign:{urn},conversion:{urn})`, percent-encoding only the URN colons — see
  `lib/client.ts`'s `campaignConversionKey()`.

## Health checks

One live check plus a declared absence, plus the auth method's derived `auth:oauth2` check.

### `service` — the vendor's own developer API status page

`https://www.linkedin-apistatus.com/api/v2/summary.json` — an Atlassian Statuspage instance, the
same one both sibling LinkedIn apps in this pack already probe (page name "LinkedIn API", distinct
from the generic consumer-site `linkedin-status.com` tracker). This app reuses that same approach
rather than re-researching a status page from scratch — LinkedIn's status coverage is generic
platform-wide, and publishes no feed scoped to the Conversions API specifically, so this remains
the best available signal for "is LinkedIn's API infrastructure up." `severity` is left at the
`degraded` default and `credential` is explicitly `"none"` — the precondition for widening
`network` to the status host, declared on the check's own hook allowlist, never on the app's.

### ~~`quota`~~ — a declared absence, `informational`

The Conversions API docs name a hard ceiling — "a maximum of 600 requests per minute... and a
maximum of 500,000 requests per day" per access token — but expose **no response header and no
endpoint** that reports remaining headroom for either. Live probes run for this app
(`GET /rest/conversions?q=account`, `GET /rest/conversionEvents`, both unauthenticated and with a
garbage bearer token, 2026-09-05) carried none of the `X-RateLimit-*` headers this pack's other
apps read for a `quota` check — only LinkedIn's internal routing/tracing headers (`x-li-fabric`,
`x-li-pop`, `x-li-uuid`, …). `severity: "informational"` is load-bearing: an `unavailable` entry
always reports `unknown`, and `unknown` outranks `ok` in a roll-up, so at any other severity this
would pin the app's verdict at `unknown` forever.

## Deliberately not covered

- **Batch create for Conversion Rules** (`X-RestLi-Method: BATCH_CREATE` on `POST /rest/conversions`,
  up to 100 rules per request) — real and documented, but `conversion-rule-create` covers the
  single-rule case that a workflow node naturally maps to; a dedicated batch action is left for a
  future addition rather than added just because the endpoint exists.
- **Batch get / batch partial update for Conversion Rules** (`GET .../conversions?ids=List(...)`,
  `POST .../conversions?ids=List(...)` with `BATCH_PARTIAL_UPDATE`) — `conversion-rule-get` and
  `conversion-rule-update` cover the single-item forms; the batch variants are a real but separate
  surface.
- **Batch associate / batch delete for Campaign Conversions** (`PUT`/`DELETE .../campaignConversions?ids=List(...)`)
  — `campaign-conversion-associate`/`-delete` cover the single-pair forms.
- **Find Campaign Conversions by campaign** (`GET /rest/campaignConversions?q=campaigns&campaigns=List(...)`)
  — real and documented, but reading which campaigns are already associated with a rule is
  available from `conversion-rule-get`'s own `campaigns`/`associatedCampaigns` response fields,
  which don't need a second finder for the common case.
- **Insight Tag / client-side conversion tracking** (`insightTags`, `insightTagDomains`,
  `insightTagsPermission`, and the older URL-match-rule flavor of `conversions`) — a JavaScript
  pixel-based tracking mechanism, a genuinely different integration surface (browser-side, not
  server-side) from the Conversions API this app covers, even though both happen to share the
  `/rest/conversions` resource for their respective rule types.
- **Path to Conversion pixel collection** (`https://px.ads.linkedin.com/collect/`) — a
  browser-embedded tracking pixel endpoint, not a `/rest/` API call, and on a different host this
  app's `network.allow` doesn't cover.

Nothing was left out because it could not be confirmed: every endpoint above is documented on
Microsoft Learn's LinkedIn Marketing pages and was read there.

## Icon

`assets/icon.svg` is LinkedIn's own mark, copied **verbatim** from the sibling `apps/linkedin` app's
committed icon — byte-identical (confirmed by a test in `tests/index.test.ts`), since it's the same
vendor mark for the same company. Not modified, not regenerated.

## Layout

```
linkedin-conversions/
├── package.json                    # manifest — the `w6w` identity block
├── index.ts                        # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                   # LinkedInConversionsClient, URN builders, error formatting
│   └── params.ts                   # shared Param fragments and the vendor's enums
├── auth/
│   └── oauth2.ts                   # Conversions API: rw_conversions, r_ads
├── actions/                        # one file per action (7)
├── health/
│   ├── service.ts                  # www.linkedin-apistatus.com
│   └── quota.ts                    # declared absence, informational
├── assets/icon.svg                 # vendor mark, verbatim (= apps/linkedin's)
└── tests/                          # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```

`deno task validate` passes `--config ./deno.json` explicitly — without it, `_tools/audit.ts` picks
up `_tools/deno.json` instead and cannot resolve the `@w6w/types` value imports this app's
`health/service.ts` and `lib/client.ts` use; this reproduces identically for the sibling `apify`,
`paddle` and `linkedin-ads` apps, so it is a property of how the tool is invoked, not of this app.
