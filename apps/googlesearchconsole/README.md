# Google Search Console

Manage Search Console sites and sitemaps, run Search Analytics queries, and
inspect a URL's index status.

- **Categories** — marketing, analytics
- **Auth methods** — oauth2
- **Actions** — 10
- **Egress allowlist** — `searchconsole.googleapis.com`
- **Website** — https://search.google.com/search-console/about
- **API docs** — https://developers.google.com/webmaster-tools/v1/api_reference_index

## Setup

### OAuth (Sign in with Google)

The only auth path Search Console offers. Requires a Google Cloud project with
the Search Console API enabled and OAuth client credentials configured on this
w6w installation (`client_id` / `client_secret` / `redirect_uri` live on the
w6w server, not in this package). The connecting Google account must be a
verified owner or user of the site(s) to be managed.

- Authorize — `https://accounts.google.com/o/oauth2/v2/auth` (PKCE, with
  `access_type=offline` and `prompt=consent`)
- Token / refresh — `https://oauth2.googleapis.com/token`
- Revoke — `https://oauth2.googleapis.com/revoke`
- Scopes — `webmasters` and `webmasters.readonly`

`access_type=offline` + `prompt=consent` are load-bearing: without both,
Google does not reliably return a refresh token, the connection dies in an
hour and scheduled runs stop.

**Site URL** is a connection field, set automatically at connect time from the
first verified site the grant can see. Every action can override it, because
one account commonly has several verified properties. It is either a
URL-prefix property (`https://www.example.com/`, protocol and trailing slash
both significant) or a domain property (`sc-domain:example.com`) — Search
Console has no numeric id to normalize a pasted value onto, so it is passed
through as typed.

## Actions

| Key | Type | Description |
|---|---|---|
| `site-list` | read | List every site this account can access |
| `site-get` | read | Read the account's permission level for one site |
| `site-add` | perform | Add a site (URL-prefix or `sc-domain:`) to the account |
| `site-delete` | perform | Remove a site from the account's own property list |
| `sitemap-list` | read | List a site's submitted sitemaps, or an index's entries |
| `sitemap-get` | read | Get one sitemap's processing status and error/warning counts |
| `sitemap-submit` | perform | Submit a sitemap for a site |
| `sitemap-delete` | perform | Remove a sitemap from the Sitemaps report |
| `search-analytics-query` | read | Query clicks, impressions, CTR and position |
| `url-inspection-inspect` | read | Check a URL's index coverage, canonical, robots.txt state |

### One host, two path prefixes

Not a detail an action can hide:

- `sites.*`, `sitemaps.*` and `searchanalytics.query` live under
  `webmasters/v3/...` — Search Console still serves these from the legacy
  Webmaster Tools API name.
- `urlInspection.index.inspect` lives under `v1/urlInspection/...` — the
  newer, actually-`v1`-versioned surface.

Both share the same host, `searchconsole.googleapis.com`, verified against
Google's discovery document (`rootUrl: https://searchconsole.googleapis.com/`,
`servicePath: ""` — every method's own `path` carries its full prefix). That
is the only entry on the egress allowlist; `www.googleapis.com`, the namespace
Google's scope identifiers are spelled in, is never fetched and is
deliberately absent.

### A site is addressed by its exact string, not a normalized id

Unlike GA4's numeric property id or Google Ads' numeric customer id, a Search
Console site has no canonical form to collapse variants onto — a
URL-prefix property's trailing slash and protocol are both significant to
which property you address, and a domain property's `sc-domain:` prefix isn't
optional. `requireSiteUrl`/`resolveSiteUrl` only trim whitespace and require a
non-empty value; they do not guess at what you meant.

### `site-add` never falls back to the connection's own site

Every other action treats a blank `siteUrl` as "use the one on the
connection," because that is nearly always what a caller wants. `site-add`
does the opposite on purpose: it provisions a *new* property, so defaulting
to the connection's existing site would silently re-add that site instead of
the new one the caller meant to register. `siteUrl` is `required` on this
action alone.

### Search Analytics has no relative date shorthand

GA4's `report-run` (this pack's sibling app) accepts `yesterday`/`NdaysAgo`;
Search Console's discovery document marks `startDate`/`endDate` `[Required]`
plain `YYYY-MM-DD` strings in PST with no relative forms at all, so
`search-analytics-query` takes them as required strings with no default.

### Dimensions are typed as names, filters as JSON

`search-analytics-query` takes dimensions as a comma-separated list
(`date,query,page,country,device,search_appearance,hour`) and expands it into
the API's `string[]` — the same convention this pack's `google-analytics` app
uses for GA4 dimension/metric names. `dimensionFilterGroups` stays JSON: it is
a nested AND/OR expression tree over dimension values, and flattening it into
form fields could only express the single-filter case.

### `AUTO` and `FINAL` are the API's own defaults, and are sent as absent

`aggregationType: "AUTO"` and `dataState: "FINAL"` are what Google assumes
when the fields are omitted, so the action omits them rather than sending the
literal string back — one less way for a later API default change to surface
as a silent behavior change here.

### `url-inspection-inspect`'s mobile-usability field is inert

`InspectUrlIndexResponse.inspectionResult.mobileUsabilityResult` still appears
in Google's own discovery document, but is flagged `"deprecated": true` there
— it dates from before the Mobile-Friendly Test tool's retirement (below) and
is passed through undeclared rather than promoted into this action's `output`.

### Deliberately out of scope

- **`urlTestingTools.mobileFriendlyTest.run`.** Still listed in the discovery
  document, but Google retired the Mobile-Friendly Test tool and its backing
  API on 2023-12-01
  (`developers.google.com/search/blog/2023/11/mobile-friendly-test-tool-retirement`).
  Verified live 2026-09-05: an unauthenticated call to this method answers
  `403 PERMISSION_DENIED — Method doesn't allow unregistered callers (callers
  without established identity)`, which is what a method gated behind an API
  key rather than OAuth looks like, not a normal auth challenge a signed call
  would clear. Shipping a method the vendor has shut down would be worse than
  leaving it out.

## Health check

Three questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota*
left.

### Is the vendor up?

**No usable signal — declared, not omitted.** Checked live 2026-09-05 against
every Google-published incident feed this pack's other `google-*` apps use:

```
GET https://www.google.com/appsstatus/dashboard/products.json
    -> 37 Google Workspace products (Gmail, Drive, Docs, Sheets, Chat, …)
       and no Search Console / Webmaster Tools entry
GET https://ads.google.com/status/publisher/products.json
    -> 16 products (Google Ads, the Ads API, Google Analytics, Campaign
       Manager 360, Display & Video 360, …) — no Search Console entry
GET https://status.cloud.google.com/incidents.json
    -> no affected_products entry names Search Console
```

Search Console is not a Workspace product, not an Ads/Analytics-family
product, and not Cloud infrastructure — it falls in the gap between all three
Google status surfaces this pack draws on. `health/service.ts` declares
`unavailable` with `severity: "informational"`, so this app's overall health
verdict is never pinned at `unknown` by a check that can never run.

### Is this credential live?

`GET webmasters/v3/sites` — the one Search Console endpoint that needs no
site id, needs only `webmasters.readonly`, and returns every site the
credential can see. An account with zero verified sites still answers `200`
with no `siteEntry` key, which is a working connection with nothing behind
it, and is reported as such. Verified live 2026-09-05: an unsigned call to
this same path answers a schema-correct
`{"error":{"code":401,"status":"UNAUTHENTICATED"}}` — the body names no
credential value, so there was no echo risk to route around.

### Do we have quota left?

**Declared unavailable.** Search Console meters hard — Search Analytics has
short-term (10-minute) and long-term (1-day) load quotas plus per-site/
per-user/per-project QPS/QPM/QPD ceilings, and URL Inspection has its own
separate per-site and per-project QPM/QPD budget — but Google's limits
documentation (`developers.google.com/webmaster-tools/limits`, fetched
2026-09-05) states plainly that current usage is read in "the quota tab of
[the] Google API Console project," not through the API itself. A live
unsigned request to `webmasters/v3/sites` (2026-09-05) carries no
`ratelimit`/`quota` response header of any kind.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Declared | Severity | Probe |
|---|---|---|---|---|
| `service` | service | unavailable | informational | none — no vendor status signal exists |
| `quota` | quota | unavailable | informational | none — Google exposes no quota endpoint or header |
| `auth:oauth2` | credential | live | fatal | derived from the `oauth2` method's `test` hook |

## Icon

`assets/icon.png` — Google's own Search Console product mark, from
<https://www.gstatic.com/images/branding/product/2x/search_console_48dp.png>,
downloaded 2026-09-05 (96×96 PNG, md5 `314aec08d689f8c7bdebf593f67228e2`).
Stored as the raster PNG rather than converted to this pack's SVG canvas — no
vendor-published SVG source exists for this mark, the same situation as this
pack's `google-business-profile` and `affinity` apps, which use the same
`appearance.icon.url` shape for the same reason.

---

Researched and endpoint-verified 2026-09-05 against Google's own discovery
document for the Search Console API v1
(`www.googleapis.com/discovery/v1/apis/searchconsole/v1/rest`), plus live
probes of every candidate Google status feed and of the retired
Mobile-Friendly Test endpoint. The OAuth shape and scope-namespace convention
follow this pack's other `google-*` apps. Status surfaces move; re-check if a
probe starts failing for everyone at once.
