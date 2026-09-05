# Health checks

Every app in this pack answers three separate questions, and they are worth keeping
apart when something breaks:

1. **Is the vendor up?** An out-of-band status service, declared as a `kind: "service"`
   check. It is the first thing to look at when every connection for one vendor fails at
   once.
2. **Is this credential live?** The Auth `test` hook, projected automatically into the
   health surface as a derived `auth:<method>` check.
3. **Do we have quota left?** A `kind: "quota"` check, usually reading response headers
   rather than a dedicated endpoint.

Each is a **declared health check** per [`rfcs/healthcheck.md`][rfc], so a host runs what
the publisher says to run rather than guessing — the old heuristic (invoke the first
`read` action with no required params) tested nothing at all for 9 of these 35 apps, and
for the rest it tested whatever happened to be first in `index.ts`.

[rfc]: https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md

Reading the **Declared checks** column: `` `key` `` is a live probe, ~~`key`~~ is a
declared *absence* (the vendor publishes nothing, stated as a positive fact rather than
left as a gap), and "N derived" counts the `auth:*` checks projected from the app's auth
methods. Sixty-four apps add a fourth question — **is this tenant's own host reachable?** —
as a `kind: "dependency"` check, because "the site is gone" and "the token expired" are
different problems with different fixes.

Across the pack that comes to **947 checks**: 372 live probes, 232 declared absences, and 345
`auth:*` checks derived for free from existing `test` hooks.

Per-app detail, including why each probe was chosen over the obvious alternatives and how
each check is annotated, is in `apps/<app>/README.md`. This table is the index.

| App | Vendor status | Machine-readable? | Credential probe | Quota headroom | Declared checks |
|---|---|:-:|---|:-:|---|
| [activecampaign](apps/activecampaign/README.md) | [Statuspage](https://status.activecampaign.com/api/v2/summary.json) | yes | `GET /contacts?limit=1` | yes | `service` · `quota` · `site` · 1 derived |
| [acuityscheduling](apps/acuityscheduling/README.md) | [Statuspage](https://status.acuityscheduling.com/api/v2/summary.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 2 derived |
| [airbyte](apps/airbyte/README.md) | [Statuspage](https://status.airbyte.com/api/v2/summary.json) — declared `informational`, because much of Airbyte is SELF-MANAGED and because a stale pipeline is usually a paused connection or an expired source credential rather than an outage, which makes a green feed weak evidence for the thing anybody cares about | yes | `GET /v1/health` — UNAUTHENTICATED, which matters because access tokens last THREE MINUTES and a signed check would mostly report on the token; the body is plain text, not JSON | no — Airbyte publishes no rate-limit header; what binds is the source's own limits during a re-read | `service` · `api` · 1 derived |
| [aircall](apps/aircall/README.md) | [Statuspage](https://status.aircall.com/api/v2/status.json) | yes | `GET /v1/ping` | no | `service` · `quota` · 1 derived |
| [airtable](apps/airtable/README.md) | [Statuspage](https://status.airtable.com/api/v2/status.json) | yes | `GET /v0/meta/whoami` | no | `service` · ~~quota~~ · 3 derived |
| [airtop](apps/airtop/README.md) | [Instatus](https://status.airtop.ai/summary.json) — not Statuspage, `/api/v2/summary.json` is an alias of the plain `/summary.json` | yes | `GET /v1/sessions?limit=1` | no — no credit/quota endpoint or rate-limit header exists | `service` · ~~quota~~ · 1 derived |
| [algolia](apps/algolia/README.md) | [JSON](https://status.algolia.com/1/status) (per-cluster; the Statuspage paths are decoys) | yes | `GET /1/keys/{key}` | no | `service` · ~~quota~~ · 1 derived |
| [amplitude](apps/amplitude/README.md) | [Statuspage](https://status.amplitude.com/api/v2/summary.json) — separates Data Reception (ingest) from Web Reporting (query), which fail independently, so the check names which half is affected. Component names repeat across groups, so the keys are group-qualified | yes | `GET /api/2/events/list` (proves BOTH keys — the API key alone cannot query) | no | `service` · ~~quota~~ · 1 derived |
| [anthropic](apps/anthropic/README.md) | [Statuspage](https://status.anthropic.com/api/v2/status.json) | yes | `GET /v1/models` | yes | `service` · `quota` · 1 derived |
| [apify](apps/apify/README.md) | [Statuspage](https://status.apify.com/api/v2/summary.json) | yes | `GET /v2/users/me/limits` | yes | `service` · `quota` · ~~request-rate~~ · 1 derived |
| [apitemplateio](apps/apitemplateio/README.md) | none published | no | `GET /v2/list-templates?limit=1` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [apollo](apps/apollo/README.md) | [Better Stack](https://status.apollo.io/) — confirmed via its own `/index.json`, not the Statuspage-shaped paths (a decoy `apollo.statuspage.io` also exists, unclaimed) — declared `informational` | yes | `GET /api/v1/users/api_profile` | yes | `service` · `quota` · `request-rate` · 1 derived |
| [asana](apps/asana/README.md) | [Statuspage](https://status.asana.com/api/v2/status.json) | yes | `GET /api/1.0/users/me` | no | `service` · ~~quota~~ · 2 derived |
| [ashby](apps/ashby/README.md) | [Statuspage](https://status.ashbyhq.com/api/v2/components.json) — mixes Ashby services with the vendors it depends on; only the former count | yes | `POST /apiKey.info` | no | `service` · ~~quota~~ · `permissions` · 1 derived |
| [assemblyai](apps/assemblyai/README.md) | [Statuspage](https://status.assemblyai.com/) | yes | `GET /v2/transcript?limit=1` | no (no readable balance endpoint — a 401 can mean bad key, disabled account, or insufficient prepaid balance, and the vendor gives no way to tell them apart) | `service` · ~~quota~~ · 1 derived |
| [attio](apps/attio/README.md) | [Statuspage](https://status.attio.com/api/v2/summary.json) | yes | `GET /v2/self` | no | `service` · ~~quota~~ · 1 derived |
| [auth0](apps/auth0/README.md) | none machine-readable (status.auth0.com is an HTML app; its only machine-readable source is a PER-TENANT RSS feed at `/api/rss?domain=…`, whose URL cannot be a static `feed.url`) | no | `GET /api/v2/users?per_page=1` | no | ~~service~~ · `tenant` · 1 derived |
| [aweber](apps/aweber/README.md) | [Statuspage](https://status.aweber.com/api/v2/summary.json), self-identifies as "AWeber" with a component literally named `API` | yes | `GET /1.0/accounts` | no (declared unavailable) | `service` · ~~quota~~ · 1 derived |
| [azure-blob](apps/azure-blob/README.md) | none machine-readable — Azure publishes incident announcements as RSS PROSE with no per-service state, and Storage health is per REGION and per account anyway | no | `GET /?comp=list` (SIGNED — Azure offers no unauthenticated probe, so an outage and a rotated key cannot be fully separated; clock drift presents as a 403) | no — Azure publishes no rate-limit header | ~~service~~ · `account` · 1 derived |
| [azuredevops](apps/azuredevops/README.md) | [structured JSON](https://status.dev.azure.com/_apis/status/health) — per service AND per geography; not a Statuspage | yes | `GET /{org}/_apis/projects` | no (throughput units) | `service` · ~~quota~~ · `organization` · 1 derived |
| [balena](apps/balena/README.md) | [Statuspage](https://status.balena.io/api/v2/summary.json) — weights `API` and reports `Cloudlink (VPN)` separately at no worse than degraded, because the four SUPERVISOR actions travel over the VPN and fail independently of every read; names its own components rather than the feed's worst, which mixes in a dozen `AWS …` entries | yes | `GET /user/v1/whoami` (NOT `/v7/application` — measured, that answers 200 with NO credential at all, returning the platform's public fleets) | no — measured 2026-08-19, no rate-limit header on success or 401; the plan's DEVICE COUNT is the ceiling | `service` · `api` · ~~quota~~ · 1 derived |
| [bamboohr](apps/bamboohr/README.md) | [RSS](https://status.bamboohr.com/pages/54f0de009d6f51e7140002b7/rss) | yes | `GET /api/v1/employees/0` | no | `service` · ~~quota~~ · 1 derived |
| [bannerbear](apps/bannerbear/README.md) | none published — `status.bannerbear.com` is a stale Hyperping SPA whose every JSON path answers the identical HTML shell | no | derived `auth:bearer-token` | no (no rate-limit headers of any kind; the vendor's 60 POST/10s ceiling is prose-only) | ~~service~~ · ~~quota~~ · 1 derived |
| [base44](apps/base44/README.md) | none published — `base44.statuspage.io` is the unclaimed-Statuspage decoy, `status.base44.com` is Cloudflare-gated | no | Monitoring API, falls back to Audit Logs API | no | ~~service~~ · `api` · 1 derived |
| [basecamp](apps/basecamp/README.md) | [Statuspage](https://37signals.statuspage.io/api/v2/summary.json) | yes | `GET launchpad/authorization.json` | no | `service` · ~~quota~~ · 1 derived |
| [baserow](apps/baserow/README.md) | [Better Stack](https://status.baserow.org/index.json) | yes | `GET /api/database/tables/all-tables/` | no | `service` · ~~quota~~ · 1 derived |
| [bigcommerce](apps/bigcommerce/README.md) | [Statuspage](https://status.bigcommerce.com/api/v2/status.json) | yes | `GET /v2/store` | yes | `service` · `api` · `quota` · `store` · ~~plan-limits~~ · 1 derived |
| [bigquery](apps/bigquery/README.md) | [Google Cloud dashboard](https://status.cloud.google.com/incidents.json) (incident feed; `Google BigQuery` only, not the Data Transfer Service) | yes | `GET /projects/{id}/datasets?maxResults=1` | no | `service` · ~~quota~~ · 1 derived |
| [bitbucket](apps/bitbucket/README.md) | [Statuspage](https://bitbucket.status.atlassian.com/api/v2/status.json) | yes | `GET /2.0/user` | yes | `service` · `quota` · 2 derived |
| [bitly](apps/bitly/README.md) | [Atom](https://status.bitly.com/history.atom) | yes | `GET /user` | no | `service` · ~~quota~~ · 1 derived |
| [blandai](apps/blandai/README.md) | [Statuspage](https://status.bland.ai/) | yes | `GET /v1/me` | yes (pay-as-you-go call credit) | `service` · `quota` · 1 derived |
| [bluesky](apps/bluesky/README.md) | none usable — status.bsky.app is an UptimeRobot page whose only JSON route is keyed by a token scraped from its own `pspApiPath` script, and whose monitors are per-PDS-instance | no | `GET /xrpc/com.atproto.server.getSession` | yes (real `ratelimit-*` headers; the ~10/day createSession limit is documented rather than probed, because probing consumes it) | ~~service~~ · `pds` · `quota` · 1 derived |
| [box](apps/box/README.md) | [Statuspage](https://status.box.com/api/v2/summary.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 1 derived |
| [brevo](apps/brevo/README.md) | [Statuspage](https://status.brevo.com/api/v2/status.json) | yes | `GET /v3/account` | yes | `service` · `quota` · 1 derived |
| [browseai](apps/browseai/README.md) | [Statuspage](https://browseai.statuspage.io/api/v2/summary.json) — page-level indicator, not worst-component | yes | `GET /v2/status` (signed) | no — only a `403 credits_limit_reached` refusal at the moment credits run out | `service` · `queue` · ~~quota~~ · 1 derived |
| [buffer](apps/buffer/README.md) | [Statuspage](https://status.buffer.com/api/v2/summary.json) | yes | `{ account { id } }` (GraphQL) | yes | `service` · `quota` · 2 derived |
| [cal](apps/cal/README.md) | [JSON](https://status.cal.com/api/status/summary.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 1 derived |
| [calendly](apps/calendly/README.md) | [Statuspage](https://www.calendlystatus.com/api/v2/status.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 2 derived |
| [callrail](apps/callrail/README.md) | [Statuspage](https://status.callrail.com/api/v2/summary.json) | yes | `GET /v3/a.json` | no | `service` · ~~quota~~ · 1 derived |
| [campaignmonitor](apps/campaignmonitor/README.md) | StatusCast, WAF-blocked to server-side clients | no | `GET /systemdate.json` | no | `api` · ~~service~~ · ~~quota~~ · 2 derived |
| [canny](apps/canny/README.md) | [Pingdom Public Reports](https://status.canny.io) — no JSON/RSS/Atom output of any kind; declared `unavailable` | no | `POST /v1/boards/list` | no (Canny publishes no rate-limit headers) | ~~service~~ · 1 derived |
| [canva](apps/canva/README.md) | [Statuspage](https://www.canvastatus.com/api/v2/summary.json) | yes | `GET /rest/v1/users/me` | no (no rate-limit headers documented) | `service` · ~~quota~~ · 1 derived |
| [chargebee](apps/chargebee/README.md) | [Statuspage](https://status.chargebee.com/api/v2/summary.json) | yes | `GET /customers?limit=1` | no | `service` · ~~quota~~ · 1 derived |
| [chatbase](apps/chatbase/README.md) | none published — `chatbase.statuspage.io` 302s to the unclaimed Statuspage decoy, `status.chatbase.co` has an expired TLS cert on a dead deployment | no | `GET /health` (unauthenticated) | no | ~~service~~ · ~~quota~~ · 1 derived |
| [chatwork](apps/chatwork/README.md) | none published | no | `GET /me` (also feeds `X-RateLimit-*` for quota) | yes | ~~service~~ · `quota` · 1 derived |
| [checkly](apps/checkly/README.md) | none usable (the page is an SPA catch-all; the old Statuspage instance is stale since 2026-04-28) | no | `GET /v1/accounts/me` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [circle](apps/circle/README.md) | [Statuspage](https://status.circle.so/api/v2/summary.json) | yes | `GET /community` | no | `service` · ~~quota~~ · 1 derived |
| [circleci](apps/circleci/README.md) | [Statuspage](https://status.circleci.com/api/v2/summary.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 1 derived |
| [clearbit](apps/clearbit/README.md) | [Statuspage](https://status.clearbit.com/api/v2/summary.json) | yes | `GET /v1/domains/find?name=Clearbit` | yes | `service` · `quota` · 1 derived |
| [clicksend](apps/clicksend/README.md) | [Statuspage](https://status.clicksend.com/api/v2/summary.json) | yes | `GET /account/usage/{year}/{month}/subaccount` | yes — undocumented `x-ratelimit-*` response headers | `service` · `quota` · 1 derived |
| [clickup](apps/clickup/README.md) | [status.io](https://api.status.io/1.0/status/5b6e0963c662144d00913a09) | yes | `GET /user` | yes | `service` · `quota` · 2 derived |
| [clio](apps/clio/README.md) | [incident.io](https://status.clio.com/api/v2/summary.json) — page-level indicator only, no components | yes | `GET /whoami.json` | yes — `X-RateLimit-*`, `unknown` on 401 (token-scoped) | `service` · `quota` · 4 derived |
| [clickhouse](apps/clickhouse/README.md) | [Statuspage](https://status.clickhouse.com/api/v2/summary.json) — separates the CONTROL PLANE from the services (an API outage stops provisioning, not queries) and never claims a full outage, because incidents are regional and this check is app-scoped | yes | `GET /v1/organizations` · `SELECT version()` | no — neither plane publishes a rate-limit header, and the constraints are MEMORY, concurrency and part count rather than request rate | `service` · ~~quota~~ · 2 derived |
| [clockify](apps/clockify/README.md) | none machine-readable | no | `GET /workspaces` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [close](apps/close/README.md) | [Statuspage](https://status.close.com/api/v2/summary.json) | yes | `GET /me/` | yes | `service` · `quota` · 1 derived |
| [cloudconvert](apps/cloudconvert/README.md) | [Better Stack](https://status.cloudconvert.com/) — the Statuspage-shaped paths all 301 to the page root instead | yes | `GET /v2/jobs?per_page=1` | no (~~request-rate~~ — no rate-limit header published) | `service` · `quota` · 1 derived |
| [cloudflare](apps/cloudflare/README.md) | [Statuspage](https://www.cloudflarestatus.com/api/v2/summary.json) | yes | `GET /user/tokens/verify` | yes | `service` · `quota` · 1 derived |
| [cloudinary](apps/cloudinary/README.md) | [Statuspage](https://status.cloudinary.com/api/v2/components.json) (connection-scoped: only THIS cloud's datacenter components — an EU outage leaves a US connection green) | yes | `GET /ping` | yes | `service` · `quota` · 1 derived |
| [coda](apps/coda/README.md) | [Atom](https://status.coda.io/history.atom) | yes | `GET /whoami` | no | `service` · ~~quota~~ · 1 derived |
| [cognitoforms](apps/cognitoforms/README.md) | [Statuspage](https://status.cognitoforms.com/api/v2/summary.json) | yes | `GET /forms` | no — Cognito Forms publishes no rate-limit headers on any response | `service` · ~~quota~~ · 1 derived |
| [companycam](apps/companycam/README.md) | [Statuspage](https://status.companycam.com/api/v2/status.json) | yes | `GET /users/current` | no | `service` · ~~quota~~ · 2 derived |
| [confluence](apps/confluence/README.md) | [Statuspage](https://confluence.status.atlassian.com/api/v2/summary.json) | yes | `GET /wiki/rest/api/user/current` | no | `service` · `site` · ~~quota~~ · 2 derived |
| [connecteam](apps/connecteam/README.md) | [Statuspage](https://connecteam.statuspage.io/) — verified via component-name overlap with this app's own action groups, not just the claimed page name | yes | `GET /users/v1/users?limit=1` | no (no rate-limit headers anywhere, checked signed and unsigned; zero mentions in the 617KB OpenAPI doc) | `service` · ~~quota~~ · 1 derived |
| [constantcontact](apps/constantcontact/README.md) | [Statuspage](https://status.constantcontact.com/api/v2/summary.json) | yes | `GET /contacts?limit=1` | no | `service` · ~~quota~~ · 1 derived |
| [contentful](apps/contentful/README.md) | [Statuspage](https://www.contentfulstatus.com/api/v2/status.json) | yes | `GET /spaces/{spaceId}` | yes | `service` · `quota` · 1 derived |
| [copper](apps/copper/README.md) | [Statuspage](https://status.copper.com/api/v2/summary.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 1 derived |
| [crisp](apps/crisp/README.md) | [Vigil](https://status.crisp.chat/status/text/) (crisp-oss's own status engine, not Statuspage) — plain-text `healthy`, page-level only, no per-component breakdown | yes (plain text) | `GET /v1/website/{website_id}` | no — Crisp's rate limits are prose-only, no readable headroom endpoint or header | `service` · ~~quota~~ · 1 derived |
| [cursor](apps/cursor/README.md) | [Statuspage](https://status.cursor.com/api/v2/summary.json), self-identifies as "Cursor" but names no API/Admin-API component among its 8 (Automations, Review Agents, CLI, Cloud Agents, cursor.com, IDE, Origin, Grok Bot) — read but capped at `degraded`, never `down` | yes | `GET /teams/members` | no — no rate-limit-remaining header or quota endpoint, only fixed per-endpoint ceilings | `service` · ~~quota~~ · 1 derived |
| [customerio](apps/customerio/README.md) | [Statuspage](https://status.customerio.com/api/v2/summary.json) | yes | `PUT /customers/:id` | no | `service` · ~~quota~~ · 1 derived |
| [databricks](apps/databricks/README.md) | none published | no | _varies by method_ | no | ~~service~~ · `workspace` · 1 derived |
| [datadog](apps/datadog/README.md) | [Statuspage](https://status.datadoghq.com/api/v2/status.json) (per site) | yes | `GET /api/v1/validate` | yes | `service` · `api` · ~~quota~~ · 1 derived |
| [dbtcloud](apps/dbtcloud/README.md) | [Statuspage](https://status.getdbt.com/api/v2/summary.json) — indicator only, its components list is EMPTY | yes | `GET /api/v2/accounts/{id}/` | no | `service` · ~~quota~~ · `account` · 1 derived |
| [deel](apps/deel/README.md) | Statuspage exists but is private (401 "page is inactive") | no | `GET /contracts?limit=1` | yes | ~~service~~ · `quota` · 1 derived |
| [deepgram](apps/deepgram/README.md) | [Statuspage](https://status.deepgram.com/api/v2/components.json) — streaming and Voice Agent excluded, being WebSocket surfaces this app cannot reach | yes | `GET /v1/projects` | yes (pre-paid balance) | `service` · `quota` · ~~concurrency~~ · 1 derived |
| [deepl](apps/deepl/README.md) | [JSON](https://api-status.deepl.com/api/status) | yes | `GET /v2/usage` | yes | `service` · `quota` · 1 derived |
| [devin](apps/devin/README.md) | [Statuspage](https://www.devinstatus.com/api/v2/status.json), scoped to the two `Cloud Agent` components only | yes | `GET /v3/self` | no (no rate-limit headroom exposed; ACU consumption is Enterprise-only) | `service` · ~~quota~~ · 1 derived |
| [dialpad](apps/dialpad/README.md) | none published | no | `GET /api/v2/offices` (user-level scope, unlike `GET /api/v2/company` which needs admin) | no | ~~service~~ · ~~quota~~ · 1 derived |
| [digitalocean](apps/digitalocean/README.md) | [Statuspage](https://status.digitalocean.com/api/v2/summary.json) — 256 components in 17 groups, where `Global` appears 15 times and `FRA1` 13, so a component is only identifiable as (GROUP, name); resolved through `group_id` and reported as `Droplets / FRA1` | yes | `GET /v2/account` | YES — a real 5,000/hour per-token budget, but `RateLimit-Reset` is a Unix TIMESTAMP not a delay, and the headers are absent on a 401 | `service` · `quota` · 1 derived |
| [discord](apps/discord/README.md) | [Statuspage](https://discordstatus.com/api/v2/status.json) | yes | `GET /users/@me` | yes | `service` · `quota` · 2 derived |
| [discourse](apps/discourse/README.md) | [status.io](https://api.status.io/1.0/status/5e2141ce30dc5c04b3ac32fc) | yes | `GET /u/{username}.json` | no | `service` · ~~quota~~ · `site` · 1 derived |
| [documenso](apps/documenso/README.md) | none — self-hostable, so the `instance` check reads the connection's own /api/health (database + signing certificate) | no | `GET /api/v2/envelope?perPage=1` | yes | `instance` · `quota` · 1 derived |
| [docusign](apps/docusign/README.md) | [Statuspage](https://status.docusign.com/api/v2/summary.json) | yes | `GET /accounts/{accountId}` | yes | `service` · `quota` · 2 derived |
| [drip](apps/drip/README.md) | [Statuspage](https://status.drip.com/api/v2/summary.json), component "REST and JavaScript APIs" | yes | `GET /v2/user` | yes | `service` · `quota` · 1 derived |
| [dropbox](apps/dropbox/README.md) | [Statuspage](https://status.dropbox.com/api/v2/status.json) | yes | `POST /2/users/get_current_account` | no | `service` · ~~quota~~ · 2 derived |
| [dropbox-sign](apps/dropbox-sign/README.md) | [Statuspage](https://status.hellosign.com/api/v2/components.json) (the signing components — NOT the group named "API", which is outbound callbacks) | yes | `GET /v3/account` | yes | `service` · `quota` · 2 derived |
| [easypost](apps/easypost/README.md) | [Statuspage](https://www.easypoststatus.com/api/v2/components.json) — NOT status.easypost.com, which answers 200 with HTML; carrier outages are named but do not count | yes | `GET /v2/users` | no (burst limit) | `service` · ~~quota~~ · `account` · 1 derived |
| [ebay](apps/ebay/README.md) | [developer.ebay.com/support/api-status](https://developer.ebay.com/support/api-status) is real and API-specific but plain server-rendered HTML (no feed) and the host is edge-blocked for server-side clients — declared unavailable | no | re-runs the `client_credentials` exchange | yes — Developer Analytics API `GET /developer/analytics/v1_beta/rate_limit/` | ~~service~~ · `quota` · 1 derived |
| [elastic](apps/elastic/README.md) | none published | no | `GET /_security/_authenticate` | no | ~~service~~ · ~~quota~~ · `site` · 2 derived |
| [elevenlabs](apps/elevenlabs/README.md) | [Statuspage](https://status.elevenlabs.io/api/v2/summary.json) | yes | `GET /v1/user/subscription` | yes | `service` · `quota` · ~~request-rate~~ · 1 derived |
| [emailoctopus](apps/emailoctopus/README.md) | [incident.io](https://status.emailoctopus.com/api/v2/status.json) | yes | `GET /lists` | yes | `service` · `api` · `quota` · 1 derived |
| [eventbrite](apps/eventbrite/README.md) | [page](https://status.eventbrite.com) | no | `GET /v3/users/me/` | yes | ~~service~~ · `quota` · 2 derived |
| [exa](apps/exa/README.md) | [status.exa.ai](https://status.exa.ai/api/v2/components.json) (custom Vercel-hosted page) | yes | `GET /v0/teams/me` | no | `service` · `quota` · ~~credits~~ · 1 derived |
| [excel](apps/excel/README.md) | none machine-readable | no | `GET /me/drive` | yes | ~~service~~ · `quota` · 1 derived |
| [facebook](apps/facebook/README.md) | none published | no | _varies by method_ | yes | ~~service~~ · `quota` · 2 derived |
| [facebook-conversions](apps/facebook-conversions/README.md) | none published | no | `GET /me` | yes | ~~service~~ · `quota` · 2 derived |
| [facebook-lead-ads](apps/facebook-lead-ads/README.md) | [page](https://metastatus.com) | no | _varies by method_ | yes | ~~service~~ · `quota` · 2 derived |
| [fathom](apps/fathom/README.md) | [Statuspage](https://status.fathom.video/api/v2/summary.json) | yes | `GET /meetings` | yes | `service` · `quota` · 1 derived |
| [figma](apps/figma/README.md) | [Statuspage](https://status.figma.com/api/v2/summary.json) | yes | `GET /v1/me` | no | `service` · ~~quota~~ · 2 derived |
| [fillout](apps/fillout/README.md) | [Statuspage](https://fillout.statuspage.io/api/v2/status.json) (page is branded "Zite" — pinned by id) | yes | `GET /v1/api/forms` | yes | `service` · `request-rate` · ~~plan~~ · 1 derived |
| [fireflies](apps/fireflies/README.md) | none reachable (dangling Freshstatus CNAME) | no | `POST /graphql` `{ user { user_id name email } }` | no | `api` · ~~service~~ · ~~quota~~ · 1 derived |
| [fivetran](apps/fivetran/README.md) | [Statuspage-shaped](https://status.fivetran.com/api/v2/status.json) — only status.json exists; components and incidents both 404 | yes | `GET /v1/account/info` | yes (`X-Rate-Limit` headers) | `service` · `quota` · `connections` · 1 derived |
| [flodesk](apps/flodesk/README.md) | none machine-readable | no | `GET /segments/colors` | yes | ~~service~~ · `quota` · 2 derived |
| [followupboss](apps/followupboss/README.md) | [Statuspage](https://followupboss.statuspage.io/api/v2/summary.json) | yes | `GET /identity` | yes | `service` · `quota` · 1 derived |
| [formstack](apps/formstack/README.md) | [Statuspage](https://www.intellistackstatus.com/api/v2/summary.json) | yes | `GET /forms?pageSize=1` | no | `service` · ~~quota~~ · 1 derived |
| [freeagent](apps/freeagent/README.md) | [Statuspage](https://status.freeagent.com/api/v2/summary.json), component `API` | yes | `GET /v2/users/me` | no | `service` · ~~quota~~ · 1 derived |
| [freshbooks](apps/freshbooks/README.md) | [Statuspage](https://status.freshbooks.com/api/v2/summary.json) | yes | `GET /auth/api/v1/users/me` | no | `service` · ~~quota~~ · 1 derived |
| [freshdesk](apps/freshdesk/README.md) | none published | no | `GET /agents/me` | yes | ~~service~~ · `quota` · `domain` · 1 derived |
| [freshsales](apps/freshsales/README.md) | [Freshstatus](https://freshsales.freshstatus.io) (human incident page only — no JSON API or feed reachable) | no | `GET /contacts/filters` | yes | ~~service~~ · `domain` · 1 derived |
| [freshservice](apps/freshservice/README.md) | [Freshstatus](https://public-api.freshstatus.io/v1/public-components/?account_id=3616) | yes | `GET /api/v2/tickets` | yes | `service` · `quota` · `domain` · 1 derived |
| [front](apps/front/README.md) | [Statuspage](https://www.frontstatus.com/api/v2/components.json) (the API components roll up; the message channels are capped at degraded, since a dead Gmail breaks sending and nothing else) | yes | `GET /me` | yes | `service` · `quota` · 1 derived |
| [gcs](apps/gcs/README.md) | [incident feed](https://status.cloud.google.com/incidents.json) — an ARCHIVE of recent incidents, most already closed, so only entries with no `end` are current. Matched on the product ID, because a multi-product outage is filed under 'Multiple Products' and `Cloud Storage for Firebase` is a different product | yes | `GET /storage/v1/b?project=…` | no — Cloud Storage returns NO rate-limit header, and its real limit is per-OBJECT (~1 write/sec to one name) | `service` · ~~quota~~ · 1 derived |
| [gemini](apps/gemini/README.md) | none published (Workspace and Cloud feeds both cover a *different* Gemini) | no | `GET /v1beta/models` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [gerrit](apps/gerrit/README.md) | none — there is no Gerrit service to have a status: it is Apache-licensed software organisations run themselves (Google, Android, Chromium, Wikimedia), and gerritcodereview.com operates nobody's instance | no | `GET /config/server/version` at the BARE path — the one place this app does not use `/a/`, since Gerrit serves anonymous reads there and an unauthenticated probe answers about Gerrit rather than about the password; the absence of the `)]}'` magic prefix identifies a proxy answering | no — Gerrit publishes no rate-limit header, and a self-hosted instance's limits are whatever its operator configured | ~~service~~ · `instance` · 1 derived |
| [getresponse](apps/getresponse/README.md) | [Statuspage](https://status.getresponse.com/api/v2/summary.json) | yes | `GET /accounts` | no | `service` · ~~quota~~ · 1 derived |
| [ghost](apps/ghost/README.md) | [RSS](https://ghoststatus.org/history.rss) | yes | `GET /users/?limit=1` | no | `service` · ~~quota~~ · `site` · 1 derived |
| [gitea](apps/gitea/README.md) | none — self-hosted software, so there is no vendor instance to watch | no | `GET /api/v1/user` | no | `instance` · ~~service~~ · 1 derived |
| [github](apps/github/README.md) | [Statuspage](https://www.githubstatus.com/api/v2/status.json) | yes | `GET /user` | yes | `service` · `quota` · 2 derived |
| [gitlab](apps/gitlab/README.md) | [status.io](https://api.status.io/1.0/status/5b36dc6502d06804c08349f7) | yes | `GET /user` | yes | `service` · `quota` · 2 derived |
| [gmail](apps/gmail/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `GET /gmail/v1/users/me/profile` | no | `service` · ~~quota~~ · 2 derived |
| [google-ads](apps/google-ads/README.md) | [JSON](https://ads.google.com/status/publisher/incidents.json) | yes | `GET /v25/customers:listAccessibleCustomers` | no | `service` · ~~quota~~ · 1 derived |
| [google-analytics](apps/google-analytics/README.md) | [JSON](https://ads.google.com/status/publisher/incidents.json) | yes | `GET /v1beta/accountSummaries?pageSize=1` | yes | `service` · `quota` · 1 derived |
| [google-business-profile](apps/google-business-profile/README.md) | none published (not on the Workspace dashboard) | no | `GET /v1/accounts?pageSize=1` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [google-calendar](apps/google-calendar/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `GET /users/me/calendarList?maxResults=1` | no | `service` · ~~quota~~ · 2 derived |
| [google-contacts](apps/google-contacts/README.md) | none published | no | `GET /people/me?personFields=names` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [google-docs](apps/google-docs/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | _varies by method_ | no | `service` · ~~quota~~ · 2 derived |
| [google-drive](apps/google-drive/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | _varies by method_ | no | `service` · ~~quota~~ · 2 derived |
| [google-forms](apps/google-forms/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | _varies by method_ | no | `service` · ~~quota~~ · 2 derived |
| [google-maps](apps/google-maps/README.md) | [JSON](https://status.cloud.google.com/maps-platform/incidents.json) — the Maps-specific feed; the Cloud-wide `incidents.json` lists no Maps products at all. An incident with no `end` is open | yes | `GET /maps/api/geocode/json` (a fixed landmark — proves the key AND that Geocoding in particular is enabled) | no | `service` · `apis` · ~~quota~~ · 1 derived |
| [google-sheets](apps/google-sheets/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | _varies by method_ | no | `service` · ~~quota~~ · 2 derived |
| [google-slides](apps/google-slides/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `POST /tokeninfo` | no | `service` · ~~quota~~ · 2 derived |
| [google-tasks](apps/google-tasks/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `GET /users/@me/lists?maxResults=1` | no | `service` · ~~quota~~ · 1 derived |
| [googlechat](apps/googlechat/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `GET /spaces` | no | `service` · ~~quota~~ · 1 derived |
| [gorgias](apps/gorgias/README.md) | RSS/feed-backed | yes | `GET /account` (401 with a real subdomain proves the account is serving; a made-up subdomain 404s instead) | yes | `service` · `quota` · `domain` · 1 derived |
| [grafana](apps/grafana/README.md) | none published | no | `GET /api/org` | no | ~~service~~ · ~~quota~~ · `site` · 1 derived |
| [grain](apps/grain/README.md) | [Statuspage](https://www.grainstatus.com/api/v2/summary.json) — `status.grain.com` 301s here; no component named "API", capped at `degraded` | yes | `POST /_/public-api/v2/teams` | yes | `service` · `quota` · 1 derived |
| [gravityforms](apps/gravityforms/README.md) | none published | no | `GET /gf/v2/forms` | no | ~~service~~ · ~~quota~~ · `site` · 1 derived |
| [greenhouse](apps/greenhouse/README.md) | [Statuspage](https://status.greenhouse.io/api/v2/summary.json) | yes | `GET /v3/candidates` | yes | `service` · `api` · `quota` · ~~silo~~ · 2 derived |
| [grist](apps/grist/README.md) | none machine-readable | no | `GET /api/profile/user` | no | ~~service~~ · ~~quota~~ · `site` · 2 derived |
| [groq](apps/groq/README.md) | [Statuspage](https://groqstatus.com/api/v2/summary.json) (`status.groq.com` redirects here) — ~20 components are per-model, but a plain `API`+`Website` component pair anchors the roll-up so one degraded model doesn't misreport the whole API | yes | `GET /openai/v1/models` | yes (`x-ratelimit-*-{requests,tokens}` headers on every response) | `service` · `quota` · 1 derived |
| [guru](apps/guru/README.md) | [Statuspage](https://status.getguru.com/api/v2/summary.json), self-identifies as "Guru" with 13 components incl. `API` | yes | `GET /api/v1/whoami` | no (no rate-limit headers of any kind) | `service` · ~~quota~~ · 1 derived |
| [gusto](apps/gusto/README.md) | [Statuspage](https://status.gusto.com/api/v2/components.json) (the API and payroll components decide; Gusto's named infrastructure vendors are capped at degraded and its support channels ignored) | yes | `GET /v1/token_info` | no | `service` · `api-version` · 2 derived |
| [harvest](apps/harvest/README.md) | [Statuspage](https://www.harveststatus.com/api/v2/summary.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 2 derived |
| [helpscout](apps/helpscout/README.md) | [Statuspage](https://status.helpscout.com/api/v2/summary.json) | yes | `GET /users/me` | yes | `service` · `quota` · 1 derived |
| [heygen](apps/heygen/README.md) | [Statuspage](https://status.heygen.com/api/v2/summary.json) — anchored on the `api.heygen.com` component | yes | `GET /v3/users/me` | yes — billing-type-gated balance/credits, no early-warning threshold | `service` · `quota` · ~~request-rate~~ · 1 derived |
| [highlevel](apps/highlevel/README.md) | [Atom](https://status.gohighlevel.com/feed.atom) | yes | `GET /locations/{locationId}` | yes | `service` · `quota` · 1 derived |
| [homeassistant](apps/homeassistant/README.md) | [Statuspage](https://status.home-assistant.io/api/v2/summary.json) — covers the PROJECT's infrastructure and Nabu Casa Cloud, not your instance; probed anyway because a Remote UI outage is what makes a healthy instance unreachable. Capped at degraded | yes | `GET /api/` | no | `service` · `instance` · `entities` · ~~quota~~ · 1 derived |
| [housecallpro](apps/housecallpro/README.md) | [Statuspage](https://status.housecallpro.com/api/v2/status.json) (no API component) | yes | `GET /company` | yes | ~~service~~ · `api` · `quota` · 2 derived |
| [hubspot](apps/hubspot/README.md) | [Statuspage](https://status.hubspot.com/api/v2/status.json) | yes | `GET /account-info/v3/details` | yes | `service` · `quota` · 3 derived |
| [hunter](apps/hunter/README.md) | none published — `status.hunter.io` is a client-rendered SPA whose `/api/v2/*.json` paths all answer the identical HTML shell; a same-named `hunter.instatus.com` page serves real JSON but lists a component literally named "Test", the signature of an unclaimed default page, so it is not trusted either | no | derived `auth:api-key` | yes (`GET /v2/account`'s credits/searches/verifications buckets) | ~~service~~ · `quota` · 1 derived |
| [huggingface](apps/huggingface/README.md) | [Better Stack](https://status.huggingface.co/index.json) — NOT Statuspage: every `summary.json`-shaped path answers 200 with 746 KB of the page's own HTML. Capped at degraded, because the router's third-party inference providers are not on it | yes | `GET /api/whoami-v2` | yes (IETF structured fields — `ratelimit: "api";r=494;t=170`, not `X-RateLimit-*`) | `service` · `quota` · 1 derived |
| [insightly](apps/insightly/README.md) | [Statuspage](https://status.insightly.com) — not pod/region-suffixed, so a single-pod outage may not surface | yes | `GET /Users/Me` | yes (`X-RateLimit-Remaining`, daily quota) | `service` · `pod` · `quota` · 1 derived |
| [instantly](apps/instantly/README.md) | none published — no machine-readable feed found | no | `GET /campaigns?limit=1` (403 handled as a distinct "not scoped for Campaigns" case rather than a bad credential) | no (no rate-limit headers of any kind) | ~~service~~ · ~~quota~~ · 1 derived |
| [intercom](apps/intercom/README.md) | [Statuspage](https://www.finstatus.com/api/v2/status.json) | yes | `GET /me` | yes | `service` · `quota` · 2 derived |
| [jenkins](apps/jenkins/README.md) | none published | no | `GET /api/json` | no | ~~service~~ · `site` · 1 derived |
| [jira](apps/jira/README.md) | [Statuspage](https://jira-software.status.atlassian.com/api/v2/status.json) | yes | _varies by method_ | no | `service` · ~~quota~~ · `site` · 2 derived |
| [jira-data-center](apps/jira-data-center/README.md) | none — self-hosted, no vendor to ask | n/a | `GET {baseUrl}/rest/api/2/myself` | no (self-hosted throughput, not vendor-metered) | ~~service~~ · `instance` · ~~quota~~ · 1 derived |
| [jobber](apps/jobber/README.md) | [Statuspage](https://www.jobberstatus.net/api/v2/summary.json) | yes | `query { account }` (GraphQL) | yes | `service` · `quota` · 1 derived |
| [jotform](apps/jotform/README.md) | [Statuspage](https://status.jotform.com/api/v2/summary.json) | yes | `GET /user` | yes | `service` · `quota` · 1 derived |
| [jumpcloud](apps/jumpcloud/README.md) | [Statuspage](https://status.jumpcloud.com/api/v2/components.json) (per-region components; the check reads the CONNECTION's region) | yes | `GET /api/systemusers?limit=1` | no | `service` · ~~quota~~ · 1 derived |
| [kajabi](apps/kajabi/README.md) | [Statuspage](https://status.kajabi.com/api/v2/summary.json) | yes | `GET /v1/me` | no | `service` · ~~quota~~ · 1 derived |
| [keap](apps/keap/README.md) | [Statuspage](https://status.thryv.com/api/v2/summary.json) (Keap group only) | yes | `GET /crm/rest/v2/oauth/connect/userinfo` | yes | `service` · `quota` · ~~spike-rate~~ · 2 derived |
| [kit](apps/kit/README.md) | [Statuspage](https://status.kit.com/api/v2/summary.json) | yes | `GET /v4/account` | no | `service` · ~~quota~~ · 1 derived |
| [klaviyo](apps/klaviyo/README.md) | [Statuspage](https://status.klaviyo.com/api/v2/status.json) | yes | `GET /api/accounts/` | yes | `service` · `quota` · 1 derived |
| [kommo](apps/kommo/README.md) | declared absence — `status.kommo.com` is real (custom-built, live incidents) but publishes no machine-readable feed of any kind (every JSON/Atom/RSS shape checked, all 403 or 404) | no | `GET /api/v4/account` | no | ~~service~~ · `account` · 1 derived |
| [kustomer](apps/kustomer/README.md) | [Statuspage](https://status.kustomer.com/) — one Atom `<entry>` per incident with the full update history concatenated inside, so the check reads the first status word rather than a fixed "Resolved" prefix | yes | `GET /customers` (org-subdomain probe) | no | `service` · ~~quota~~ · `organization` · 1 derived |
| [launchdarkly](apps/launchdarkly/README.md) | [Statuspage](https://status.launchdarkly.com/api/v2/components.json) (the management components; NOT the four named "API", which are SDK delivery) | yes | `GET /api/v2/projects?limit=1` | yes | `service` · `quota` · 1 derived |
| [lemlist](apps/lemlist/README.md) | [Hyperping](https://status.lempire.com/status.json) | yes | `GET /team` | yes | `service` · `quota` · 1 derived |
| [lever](apps/lever/README.md) | [Statuspage](https://status.lever.co/api/v2/summary.json) — 41 components across seven groups where EVERY NAME APPEARS TWICE, once per data centre, so a component is only identifiable as (GROUP, name); resolved through `group_id` for the data centre the connection names, weighting `Integration API & Webhooks` and reporting `Hire` separately since the API and the product fail independently | yes | `GET /users?limit=1`, plus a probe for CONFIDENTIAL access — which Lever grants only at key creation, and whose absence shortens every list silently | no — Lever documents a 429 without stating the budget or window and publishes no header; the real constraint is the OPAQUE pagination cursor, which cannot be parallelised | `service` · ~~quota~~ · 1 derived |
| [line](apps/line/README.md) | [Statuspage](https://api.line-status.info/api/v2/summary.json), scoped to the Messaging API group only (Login/LIFF/Console share the page) | yes | `GET /v2/bot/info` | yes — combined send-quota + consumption reads | `service` · `quota` · 1 derived |
| [linear](apps/linear/README.md) | [page](https://status.linear.app) | no | `POST /graphql  ·  { viewer { id } }` | yes | ~~service~~ · `quota` · 2 derived |
| [linkedin](apps/linkedin/README.md) | [Statuspage](https://www.linkedin-apistatus.com/api/v2/summary.json) | yes | `GET /v2/userinfo` | no | `service` · ~~quota~~ · 2 derived |
| [linkedin-ads](apps/linkedin-ads/README.md) | [Statuspage](https://www.linkedin-apistatus.com/api/v2/summary.json) | yes | `GET /rest/adAccounts?q=search` | no | `service` · ~~quota~~ · 2 derived |
| [linkedin-conversions](apps/linkedin-conversions/README.md) | [Statuspage](https://www.linkedin-apistatus.com/api/v2/summary.json) — same page as the sibling `linkedin`/`linkedin-ads` apps | yes | `GET /rest/conversions?q=account&account=urn:li:sponsoredAccount:0` | no — no rate-limit header, only prose-documented request ceilings | `service` · ~~quota~~ · 1 derived |
| [lokalise](apps/lokalise/README.md) | [Statuspage](https://status.lokalise.com/api/v2/summary.json), verified not a decoy custom domain (byte-identical to `lokalise.statuspage.io`) | yes | `GET /projects?limit=1` | yes — `x-ratelimit-remaining` is genuinely live on every response | `service` · `quota` · `request-rate` · 1 derived |
| [looker](apps/looker/README.md) | none — there is no Looker SERVICE to have a status: every deployment is its own instance (hosted at `{name}.cloud.looker.com` or self-hosted), and a healthy Looker in front of a struggling WAREHOUSE presents to a workflow as a Looker failure, which no status page covers | no | `GET /api/4.0/user` (SIGNED — Looker offers no unauthenticated health endpoint; a connection failure is reported as the self-hosted API PORT 19999, a 401 as a missed refresh of the one-hour token, and a DISABLED user as down rather than ok) | no — Looker rate-limits per instance and publishes no header at all; the ceiling that binds is the database CONNECTION POOL, reported by `connection-list` | ~~service~~ · `instance` · 1 derived |
| [loops](apps/loops/README.md) | [Statuspage](https://status.loops.so/api/v2/components.json) | yes | `GET /v1/api-key` | no | `service` · ~~quota~~ · 1 derived |
| [luma](apps/luma/README.md) | Statuspage exists (`luma.statuspage.io`) but answers 401 on every path — declared `unavailable` | no (claimed but inaccessible) | `GET /v1/users/get-self` | yes — `X-RateLimit-Limit`/`X-RateLimit-Remaining` off the same call | ~~service~~ · `quota` · 1 derived |
| [mailcheck](apps/mailcheck/README.md) | none published | no | `GET /v1/emails/operations?page_size=1` | no | ~~service~~ · 1 derived |
| [mailchimp](apps/mailchimp/README.md) | [page](https://status.mailchimp.com) | no | `GET /3.0/ping` | no | ~~service~~ · ~~quota~~ · 2 derived |
| [mailerlite](apps/mailerlite/README.md) | [Statuspage](https://status.mailerlite.com/api/v2/summary.json) | yes | `GET /api/subscribers?limit=0` | yes | `service` · `quota` · 1 derived |
| [mailgun](apps/mailgun/README.md) | [Statuspage](https://status.mailgun.com/api/v2/summary.json) | yes | `GET /v4/domains?limit=1` | yes | `service` · `quota` · 1 derived |
| [mailjet](apps/mailjet/README.md) | [Statuspage](https://status.mailjet.com/api/v2/summary.json) | yes | `GET /v3/REST/contactslist?Limit=1` | no | `service` · ~~quota~~ · 1 derived |
| [mandrill](apps/mandrill/README.md) | none published | no | `POST /users/ping.json` | yes | ~~service~~ · `quota` · 1 derived |
| [manychat](apps/manychat/README.md) | [Instatus](https://status.manychat.com/v2/components.json) | yes | `GET /fb/page/getInfo` | no | `service` · ~~quota~~ · 1 derived |
| [mastodon](apps/mastodon/README.md) | none — there is no vendor. Mastodon is software thousands of people run, joinmastodon.org does not operate the network, and per-instance status pages have no registry | no | `GET /api/v1/accounts/verify_credentials` | yes (real `x-ratelimit-*`; the reset is an ISO TIMESTAMP, not epoch seconds) | ~~service~~ · `instance` · `quota` · 1 derived |
| [mattermost](apps/mattermost/README.md) | [Statuspage](https://status.mattermost.com/api/v2/summary.json) | yes | `GET /api/v4/users/me` | yes | `service` · `quota` · `instance` · 1 derived |
| [mautic](apps/mautic/README.md) | declared `informational` — self-hosted, no vendor platform behind a Connection; `status.mautic.org` covers only the project's own web/community infra, not any instance | no | unsigned `GET /api/contacts?limit=1`, classified by Mautic's own structured error envelope (`instance` check) | no | `instance` · ~~service~~ · 1 derived |
| [meilisearch](apps/meilisearch/README.md) | [RSS feed](https://status.meilisearch.com/feed.rss) (Cloud only; the JSON paths are an SPA catch-all) | yes | `GET /keys?limit=1` | no | `instance` · `service` · 1 derived |
| [messagebird](apps/messagebird/README.md) | [Statuspage](https://status.bird.com/api/v2/summary.json), scoped to the `SMS - API` + `Voice - API` components | yes | `GET /balance` | no | `service` · ~~quota~~ · 1 derived |
| [metabase](apps/metabase/README.md) | [Statuspage](https://status.metabase.com/api/v2/summary.json) | yes | `GET /api/user/current` | no | `service` · ~~quota~~ · `instance` · 1 derived |
| [microsoft-todo](apps/microsoft-todo/README.md) | none published | no | `GET /me/todo/lists` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [miro](apps/miro/README.md) | [Statuspage](https://status.miro.com/api/v2/status.json) | yes | `GET /v1/oauth-token` | no | `service` · ~~quota~~ · 1 derived |
| [missive](apps/missive/README.md) | none published — `status.missiveapp.com` runs on an authenticated Ably realtime channel with no static feed | no | derived `auth:api-token` (tokens are personal/unscoped by design, so there is no narrower credential to probe) | no (rate-limit headers appear only on the 429 refusal itself, never in advance) | ~~service~~ · ~~quota~~ · 1 derived |
| [mistral](apps/mistral/README.md) | [RSS](https://status.mistral.ai/feed.rss) | yes | `GET /v1/models` | yes | `service` · `quota` · 1 derived |
| [mixpanel](apps/mixpanel/README.md) | [Statuspage](https://www.mixpanelstatus.com/api/v2/components.json) (connection-scoped: this project's region only, split by capability — querying, ingestion and export fail independently) | yes | `GET /api/app/me` (not a query, so it costs nothing from the 60/hour budget) | no | `service` · ~~quota~~ · 1 derived |
| [mollie](apps/mollie/README.md) | [status.mollie.com](https://status.mollie.com/api/v2/components.json) (Instatus-hosted, not Statuspage) | yes | `GET /v2/profiles/me` | no | `service` · ~~quota~~ · 1 derived |
| [monday](apps/monday/README.md) | [Statuspage](https://status.monday.com/api/v2/status.json) | yes | `POST /v2 · { me { id } }` | yes | `service` · `quota` · 2 derived |
| [mongodb-atlas](apps/mongodb-atlas/README.md) | [Statuspage](https://status.mongodb.com/api/v2/summary.json) — covers the CONTROL PLANE only; a driver reaches a cluster over the wire protocol, which does not touch this API at all, so green here is no promise a cluster is reachable | yes | `GET /api/atlas/v2/orgs` | no — 100 req/min per PROJECT is documented and carried by NO header; a 409 from a non-IDLE cluster arrives long before a 429 | `service` · `credential` · ~~quota~~ · 1 derived |
| [motion](apps/motion/README.md) | [Better Stack](https://status.usemotion.com/index.json) (monitors nothing) | yes | `GET /v1/users/me` | no | `service` · `api` · ~~quota~~ · 1 derived |
| [mux](apps/mux/README.md) | [Statuspage](https://status.mux.com/api/v2/components.json) (API and delivery split — they fail independently, so one out is degraded and only both is down) | yes | `GET /video/v1/assets?limit=1` | yes | `service` · `quota` · 1 derived |
| [netlify](apps/netlify/README.md) | [Statuspage](https://www.netlifystatus.com/api/v2/summary.json) | yes | `GET /user` | yes | `service` · `quota` · 1 derived |
| [newrelic](apps/newrelic/README.md) | [Statuspage](https://status.newrelic.com/api/v2/summary.json) — 115 components, each suffixed with its data centre (`APM : US`, `Alerts : Europe`); only the affected ones are reported and the regions named, since an incident in another region is not one for this account | yes | `{ actor { user { name email } } }` | no | `service` · `reporting` · ~~quota~~ · 1 derived |
| [nocodb](apps/nocodb/README.md) | none machine-readable — status.nocodb.com serves an HTML uptime page and `/api/v2/summary.json`, `/api/v1/monitors` and `/badge` all 404; it would also speak only for app.nocodb.com, while NocoDB is self-hosted more often than not | no | `GET /api/v1/health` — UNAUTHENTICATED, so an outage cannot hide behind a revoked token, and it reports the process UPTIME: a repeatedly small one is a container crash-looping, a pattern no single check would show | YES — measured `x-ratelimit-limit: 60` / `x-ratelimit-remaining` on every response, a real and current number, and small enough that one workflow can spend it; the probe costs one of the 60 | ~~service~~ · `instance` · `quota` · 1 derived |
| [notion](apps/notion/README.md) | [page](https://status.notion.so) | no | `GET /v1/users/me` | no | ~~service~~ · ~~quota~~ · 2 derived |
| [odoo](apps/odoo/README.md) | none machine-readable | no | `common.authenticate` (JSON-RPC) | no | ~~service~~ · ~~quota~~ · `instance` · 1 derived |
| [okta](apps/okta/README.md) | [page](https://status.okta.com) | no | `GET /api/v1/users?limit=1` | yes | ~~service~~ · `quota` · 1 derived |
| [omnisend](apps/omnisend/README.md) | [Statuspage](https://status.omnisend.com/api/v2/summary.json) | yes | `GET /brands/current` | no (both unauthenticated and fake-key probes returned no rate-limit header; limits are per-brand, not per-connection) | `service` · ~~quota~~ · 1 derived |
| [oncehub](apps/oncehub/README.md) | none published — `status.oncehub.com` is a bespoke client-rendered app, every JSON/Atom/RSS path 404s | no | `GET /v2/test` | no — documented fixed limits (5 req/s, 200/5min per IP), zero rate-limit headers anywhere | ~~service~~ · ~~quota~~ · 1 derived |
| [onedrive](apps/onedrive/README.md) | none machine-readable | no | `GET /me` | yes | ~~service~~ · `quota` · ~~request-rate~~ · 1 derived |
| [onenote](apps/onenote/README.md) | none machine-readable — same conclusion as sibling Graph apps; OneNote's own throttling reference confirms no `Retry-After` on 429 either | no | `GET /me` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [onepassword](apps/onepassword/README.md) | [Statuspage](https://status.1password.com/api/v2/summary.json) — 88 components grouped by region with names repeating in each, so keys are group-qualified. Nearly irrelevant to a Connect connection, which keeps serving its local vault copy through an outage | yes | `GET /v1/vaults` (Connect) or `GET /api/auth/introspect` (Events) | no | `service` · `surface` · ~~quota~~ · 2 derived |
| [onesimpleapi](apps/onesimpleapi/README.md) | none published | no | `GET /exchange_rate?to_currency=USD` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [onfleet](apps/onfleet/README.md) | none published — the only signal is the credential-safe `GET /auth/test` probe itself | no | `GET /auth/test` (echoes only org id + caller IP, never the key; also carries `X-RateLimit-*`) | yes (org-wide, shared across every key on the account) | ~~service~~ · `quota` · 1 derived |
| [openai](apps/openai/README.md) | [Statuspage](https://status.openai.com/api/v2/status.json) | yes | `GET /v1/models` | yes | `service` · `quota` · 1 derived |
| [openrouter](apps/openrouter/README.md) | none published — both `status.openrouter.ai` (client-rendered SPA) and `openrouter.statuspage.io` (unclaimed, redirects to Atlassian marketing) are decoys | no | `GET /key` | yes (`GET /key`'s `limit`/`limit_remaining` — no rate-limit response headers exist on success) | ~~service~~ · `quota` · 1 derived |
| [outlook](apps/outlook/README.md) | none machine-readable | no | `GET /me` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [paddle](apps/paddle/README.md) | [incident.io](https://paddlestatus.com/api/v2/summary.json) | yes | `GET /event-types` | no | `service` · ~~quota~~ · 1 derived |
| [pagerduty](apps/pagerduty/README.md) | [page](https://status.pagerduty.com) | no | `GET /abilities` | yes | ~~service~~ · `quota` · 2 derived |
| [pandadoc](apps/pandadoc/README.md) | [Statuspage](https://status.pandadoc.com/api/v2/summary.json) | yes | `GET /members/current` | no | `service` · ~~quota~~ · 1 derived |
| [particle](apps/particle/README.md) | [Statuspage](https://status.particle.io/api/v2/summary.json) — separates the `REST API` from DEVICE CONNECTIVITY (cellular, Wi-Fi, per hardware family), which fail independently: a connectivity outage leaves the API answering normally while every affected device is unreachable | yes | `GET /v1/user` (a 403 here is a PRODUCT token, not a failure) | no — no header, limits are per endpoint, and the budget that runs out on a cellular fleet is DATA (`sim-list`) | `service` · ~~quota~~ · 1 derived |
| [paypal](apps/paypal/README.md) | [Atom](https://www.paypal-status.com/feed/atom) | yes | `POST /v1/oauth2/token` | no | `service` · ~~quota~~ · 1 derived |
| [pdfco](apps/pdfco/README.md) | none published — `status.pdf.co` and `pdf-co.statuspage.io` are both unclaimed placeholders | no | `GET /v1/account/credit/balance` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [pdfmonkey](apps/pdfmonkey/README.md) | declared unavailable — `status.pdfmonkey.io` is real (updown.io) but exposes no RSS/Atom/JSON at any conventional path | no | `GET /document_cards` | no (only exposed via an endpoint that risks echoing the credential) | ~~service~~ · ~~quota~~ · 1 derived |
| [pendo](apps/pendo/README.md) | [Statuspage](https://status.pendo.io/api/v2/summary.json) | yes | `GET /api/v1/token/verify` | no | `service` · ~~quota~~ · 1 derived |
| [perplexity](apps/perplexity/README.md) | [Instatus](https://status.perplexity.com/v2/components.json) | yes | `GET /v1/models` | no | `service` · ~~quota~~ · 1 derived |
| [phantombuster](apps/phantombuster/README.md) | [Statuspage](https://status.phantombuster.com/api/v2/summary.json) | yes | `GET /orgs/fetch-resources` | yes | `service` · `quota` · ~~request-rate~~ · 1 derived |
| [pinecone](apps/pinecone/README.md) | [Statuspage](https://status.pinecone.io/api/v2/components.json) (the global components decide; the per-region grid is reported but capped at degraded, since an app-scoped check cannot know which region an index is in) | yes | `GET /indexes` | no | `service` · `indexes` · ~~quota~~ · 1 derived |
| [pinterest](apps/pinterest/README.md) | [Statuspage](https://www.pintereststatus.com/) — 41 components spanning the consumer site, Ads Manager and the developer API; filtered to the 8-component "The Pinterest API" group rather than the page-level indicator | yes | derived `auth:oauth2` | no | `service` · ~~quota~~ · 1 derived |
| [pipedrive](apps/pipedrive/README.md) | [page](https://status.pipedrive.com) | no | `GET /users/me` | yes | ~~service~~ · `quota` · 2 derived |
| [pipefy](apps/pipefy/README.md) | [Statuspage](https://status.pipefy.com/api/v2/summary.json), anchored on the `API (GraphQL)` component specifically | yes | `POST /graphql` (`{ me { id } }`) | no (no rate-limit header of any kind; only query-complexity/depth/time limits) | `service` · ~~quota~~ · 2 derived |
| [plaid](apps/plaid/README.md) | [Statuspage](https://status.plaid.com/api/v2/components.json) (API and Link only — institution connectivity is per Item and lives in `item-get`'s error) | yes | `POST /institutions/get` (needs no Item, so a failure can only be the connection) | no | `service` · `credentials` · 2 derived |
| [podio](apps/podio/README.md) | [Statuspage](https://status.podio.com/api/v2/summary.json) | yes | `GET /oauth/scope` | yes | `service` · `api` · `quota` · 2 derived |
| [postbin](apps/postbin/README.md) | [page](https://www.postb.in) | no | _no credential_ | no | `service` · ~~quota~~ · 0 derived |
| [posthog](apps/posthog/README.md) | none published | no | `GET /api/users/@me/` | no | ~~service~~ · 1 derived |
| [postmark](apps/postmark/README.md) | [JSON](https://status.postmarkapp.com/api/v1/status) | yes | `GET /server` | no | `service` · ~~quota~~ · 1 derived |
| [powerbi](apps/powerbi/README.md) | declared `informational` — `status.cloud.microsoft` is a client-rendered shell; the admin service-health API needs tenant-admin consent this app's scopes don't hold; `azure.status.microsoft` names "Power BI" and "Power BI Embedded" separately but tags incidents via RSS `<category>` this pack's feed hook doesn't surface | no | `GET /availableFeatures` | no (no rate-limit headers on any response — throttling is reactive, a 429 with `Retry-After`) | ~~service~~ · ~~quota~~ · 1 derived |
| [productboard](apps/productboard/README.md) | [Statuspage](https://status.productboard.com/api/v2/status.json) | yes | `GET /v2/entities` | yes | `service` · `api` · `quota` · 1 derived |
| [pushbullet](apps/pushbullet/README.md) | none published | no | derived `auth:access-token` | yes (`X-Ratelimit-Limit/-Remaining/-Reset` on every response; the separate 500-pushes/month free-tier ceiling has no readable counterpart, modeled as a second, declared-absent check) | ~~service~~ · `quota` · ~~push-limit~~ · 1 derived |
| [pushover](apps/pushover/README.md) | [page](https://status.pushover.net) | no | `POST /1/users/validate.json` | yes | ~~service~~ · `quota` · 1 derived |
| [qdrant](apps/qdrant/README.md) | [Better Stack](https://status.qdrant.io/index.json) — NOT a Statuspage; every `summary.json`-shaped path returns the page's own 983,546-byte HTML with a 200. Capped at degraded (an app-scoped check cannot know the connection's region, or whether it is self-hosted at all) except when every region is down | yes | `GET /collections` | no | `service` · `instance` · `collections` · ~~quota~~ · 1 derived |
| [quickbase](apps/quickbase/README.md) | [status.page](https://quickbasestatus.status.page/status.json) | yes | `GET /v1/apps/{appId}` | yes | `service` · `quota` · 1 derived |
| [quickbooks](apps/quickbooks/README.md) | [Statuspage](https://status.developer.intuit.com/api/v2/summary.json) | yes | `GET /v3/company/{realmId}/companyinfo/{realmId}` | no | `service` · ~~quota~~ · 1 derived |
| [quo](apps/quo/README.md) | [Statuspage](https://status.quo.com/api/v2/summary.json) — carries "OpenPhone" branding still, same live page | yes | `GET /phone-numbers` | yes, from the live `ratelimit`/`ratelimit-policy` structured-field headers (undocumented but present) | `service` · `quota` · 1 derived |
| [raindrop](apps/raindrop/README.md) | [Better Stack](https://status.raindrop.io/index.json) | yes | `GET /rest/v1/user` | yes | `service` · `quota` · 2 derived |
| [razorpay](apps/razorpay/README.md) | a Statping instance hiding behind a Statuspage-shaped decoy — every `/api/v2/*.json` guess 200s with an identical HTML shell, the real feed is the unrelated `/api/services` | yes (once found) | `GET /payments?count=1` | no — no `X-RateLimit-*`/`RateLimit-*`/`Retry-After` header on success, only on the `429` itself | `service` · ~~quota~~ · 1 derived |
| [readwise](apps/readwise/README.md) | none published | no | `GET /api/v2/auth/` (204, zero body — a genuinely safe probe) | no | ~~service~~ · ~~quota~~ · 1 derived |
| [reddit](apps/reddit/README.md) | [Statuspage](https://www.redditstatus.com/api/v2/summary.json) | yes | `GET /api/v1/me` | yes | `service` · `quota` · 1 derived |
| [replyio](apps/replyio/README.md) | [Statuspage](https://status.reply.io/api/v2/summary.json) — Cloudflare-gated, needs a distinctive `User-Agent` or it 403s | yes | `GET /v3/whoami` | yes — `x-rate-limit-*` headers off the same call, undocumented but observed live | `service` · `quota` · 1 derived |
| [resend](apps/resend/README.md) | status page is a catch-all HTML route | no | `GET /emails?limit=1` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [retellai](apps/retellai/README.md) | [Statuspage](https://status.retellai.com/api/v2/summary.json) — component named "API" | yes | `GET /get-api-key-info` | yes — `GET /get-concurrency` (no rate-limit response header at all) | `service` · `quota` · 1 derived |
| [ringcentral](apps/ringcentral/README.md) | dashboard only, private feed host | no | `GET /restapi/v1.0/account/~/extension/~` | no | ~~service~~ · `api` · ~~quota~~ · 2 derived |
| [s3](apps/s3/README.md) | [JSON](https://health.aws.amazon.com/public/currentevents) | yes | `GET /` (ListBuckets) | no | `service` · 1 derived |
| [salesforce](apps/salesforce/README.md) | [JSON](https://api.status.salesforce.com/v1/instances) | yes | _varies by method_ | yes | `service` · `quota` · 2 derived |
| [salesloft](apps/salesloft/README.md) | none published | no | derived `auth:api-key`/`auth:oauth2` | yes (`x-ratelimit-remaining-minute`; `limit` deliberately omitted since Salesloft can override the per-team ceiling without notice) | ~~service~~ · `quota` · 2 derived |
| [sanity](apps/sanity/README.md) | [Statuspage](https://www.sanity-status.com/api/v2/components.json) (Content Lake, API, CDN and assets; Studio and the manage dashboard excluded) | yes | `GET /projects/{id}` (management API — no dataset, no GROQ) | no | `service` · `dataset` · 1 derived |
| [segment](apps/segment/README.md) | [Statuspage](https://status.segment.com/api/v2/summary.json) | yes | `POST /v1/identify` | no | `service` · ~~quota~~ · 1 derived |
| [sendblue](apps/sendblue/README.md) | none published — `sendblue.statuspage.io` is the unclaimed decoy, `status.sendblue.com` is real but has no machine-readable feed | no | `GET /api/v2/contacts/count` | no — 429 refusal only, no `X-RateLimit-*` header on any response | ~~service~~ · ~~quota~~ · `lines` · 1 derived |
| [sendgrid](apps/sendgrid/README.md) | [Statuspage](https://sendgrid.statuspage.io/api/v2/status.json) | yes | `GET /v3/scopes` | yes | `service` · `quota` · 1 derived |
| [sentry](apps/sentry/README.md) | [Statuspage](https://status.sentry.io/api/v2/summary.json) | yes | `GET /organizations/{slug}/?detailed=0` | yes | `service` · `quota` · `site` · 2 derived |
| [servicem8](apps/servicem8/README.md) | none published — `servicem8.statuspage.io` is unclaimed, `servicem8.freshstatus.io` is a generic 404 catch page | no | `GET /vendor.json` | no | ~~service~~ · `api` · 1 derived |
| [servicenow](apps/servicenow/README.md) | none published | no | `GET /api/now/table/sys_user_role?sysparm_limit=1` | no | ~~service~~ · ~~quota~~ · `instance` · 2 derived |
| [sharepoint](apps/sharepoint/README.md) | none published — Graph's own service-health API needs tenant-admin consent, `status.cloud.microsoft` is a client-rendered SPA shell (checked 2026-08-11, same conclusion as the sibling onedrive/outlook/excel/teams/microsoft-todo Apps) | no | `GET /me` | yes — `quota` (default document library storage headroom) and `request-rate` (API request-rate headroom) | ~~service~~ · `quota` · `request-rate` · 1 derived |
| [shipstation](apps/shipstation/README.md) | [Statuspage](https://status.shipstation.com/api/v2/summary.json) — the `Companion API V2` component only | yes | `GET /v2/carriers` | no — 200/min burst ceiling, no `X-RateLimit-*` header on any response | `service` · `account` · ~~quota~~ · 1 derived |
| [shopify](apps/shopify/README.md) | [Statuspage](https://www.shopifystatus.com/api/v2/status.json) | yes | `GET /shop.json` | yes | `service` · `quota` · `store` · 1 derived |
| [signnow](apps/signnow/README.md) | [Statuspage](https://status.signnow.com/api/v2/summary.json) — component named "API" directly | yes | `GET /user` | no | `service` · ~~quota~~ · 1 derived |
| [slack](apps/slack/README.md) | [JSON](https://status.slack.com/api/v2.0.0/current) · [Atom/RSS](https://slack-status.com/feed/atom) | yes | `POST /api/auth.test` | no | `service` · `incidents` · ~~quota~~ · 2 derived |
| [smartsheet](apps/smartsheet/README.md) | [Statuspage](https://status.smartsheet.com/api/v2/summary.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 1 derived |
| [snowflake](apps/snowflake/README.md) | [Atom](https://status.snowflake.com/history.atom) | yes | `POST /api/v2/statements` | no | `service` · `account` · 1 derived |
| [snyk](apps/snyk/README.md) | [Statuspage](https://status.snyk.io/api/v2/summary.json) | yes | `GET /self` | no | `service` · `api-version` · ~~quota~~ · 1 derived |
| [splitwise](apps/splitwise/README.md) | [Instatus](https://status.splitwise.com/v2/components.json) | yes | `GET /api/v3.0/get_current_user` | no | `service` · `api` · ~~quota~~ · 1 derived |
| [splunk](apps/splunk/README.md) | [Statuspage](https://status.splunkcloud.com/api/v2/summary.json) | yes | `GET /services/authentication/current-context` | no | `service` · 1 derived |
| [spotify](apps/spotify/README.md) | [Statuspage](https://spotify.statuspage.io/api/v2/summary.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 1 derived |
| [square](apps/square/README.md) | [Statuspage](https://issquareup.com/api/v2/status.json) | yes | `GET /v2/merchants/me` | no | `service` · ~~quota~~ · 1 derived |
| [statuspage](apps/statuspage/README.md) | [Statuspage](https://metastatuspage.com/api/v2/components.json) (Atlassian's own status page is itself a Statuspage — the same document shape this app writes) | yes | `GET /v1/pages` | no | `service` · ~~quota~~ · 1 derived |
| [storyblok](apps/storyblok/README.md) | none machine-readable — `status.storyblok.com` meta-refreshes to `uptime.storyblok.com`, which serves HTML; `/api/v2/summary.json` on both returns the page or a 404. A feed would also be the wrong instrument: the delivery CDN survives outages of the system that fills it, while the Management API IS the application, so the two fail separately | no | `GET /v2/cdn/spaces/me` or `GET /v1/spaces/:id` — whichever API the connection's credential uses, in its REGION; a 401 is equally a wrong token, a wrong credential kind, a `Bearer` prefix, or a space in another region | no — Storyblok publishes no rate-limit header, but the limits are documented and INVERSE: 50/s at 25 per page against 6/s at 100, and 3–6/s on the Management API | ~~service~~ · `api` · 2 derived |
| [strapi](apps/strapi/README.md) | none published | no | `GET /api/upload/files/page` | no | ~~service~~ · ~~quota~~ · `site` · 1 derived |
| [strava](apps/strava/README.md) | [Statuspage](https://status.strava.com/api/v2/summary.json) | yes | `GET /athlete` | yes | `service` · `quota` · 1 derived |
| [streak](apps/streak/README.md) | [Statuspage](https://status.streak.com/api/v2/summary.json) — weighted on the "Streak API" component | yes | `GET /users/me` | no | `service` · ~~quota~~ · 1 derived |
| [stripe](apps/stripe/README.md) | [JSON](https://status.stripe.com/current) | yes | `GET /v1/balance` | no | `service` · ~~quota~~ · 1 derived |
| [supabase](apps/supabase/README.md) | [Atom](https://status.supabase.com/history.atom) | yes | `GET /rest/v1/` | no | `service` · `reachable` · 1 derived |
| [surveymonkey](apps/surveymonkey/README.md) | [Statuspage](https://status.surveymonkey.com/api/v2/summary.json) | yes | `GET /users/me` | yes | `service` · `quota` · 1 derived |
| [systemeio](apps/systemeio/README.md) | none published — both a Statuspage and an Instatus subdomain guess resolve to known-unclaimed signatures | no | `GET /api/contact_fields` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [tableau](apps/tableau/README.md) | none — Tableau Server is self-hosted (no vendor platform behind it) and Tableau Cloud publishes no machine-readable status (`status.tableau.com` doesn't resolve, `trust.tableau.com` redirects to the generic, also pod-hosted `trust.salesforce.com` hub); a dedicated `instance` check (`GET /serverinfo`, unauthenticated, pinned to API 2.4) already asks the only meaningful reachability question for either deployment | no | `GET /projects?pageSize=1` | no — not published | `instance` · ~~service~~ · 1 derived |
| [tailscale](apps/tailscale/README.md) | [Statuspage](https://status.tailscale.com/api/v2/summary.json) — weights `API (api.tailscale.com)`, and reports `Coordination service` and `DERP relay servers` alongside it at no worse than degraded: Tailscale's data plane is PEER-TO-PEER, so an API outage stops CHANGE (devices joining, ACL updates) rather than traffic between peers that already connected | yes | `GET /tailnet/-/devices` | no — measured 2026-08-19, no `RateLimit-*`, `X-RateLimit-*` or `Retry-After` on success or failure; the binding ceiling is the plan's USER and DEVICE count, which `user-list` and `device-list` report | `service` · ~~quota~~ · 2 derived |
| [tally](apps/tally/README.md) | [Better Stack](https://status.tally.so/index.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 1 derived |
| [tapfiliate](apps/tapfiliate/README.md) | SorryApp-hosted page (`status.tapfiliate.com`, not Atlassian Statuspage), anchored on the `Tapfiliate API` component specifically | yes | `GET /programs/` | yes (`X-Ratelimit-{Limit,Remaining,Reset}` on the same call) | `service` · `quota` · 1 derived |
| [teachable](apps/teachable/README.md) | [Statuspage](https://www.teachablestatus.com/api/v2/summary.json), self-identifies with a root-level `developers.teachable.com` component matching this app's own API host | yes | `GET /v1/courses?per=1` | yes (`RateLimit-*` headers, read opportunistically — only documented on a 429) | `service` · `quota` · 1 derived |
| [teamleader](apps/teamleader/README.md) | [Statuspage](https://status.teamleader.eu/api/v2/summary.json), anchored on the "API endpoints" component | yes | `POST /users.me` | yes (`x-ratelimit-*` headers, sliding 1-minute window) | `service` · `quota` · 1 derived |
| [teams](apps/teams/README.md) | none machine-readable | no | `GET /me` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [teamwork](apps/teamwork/README.md) | [Statuspage](https://status.teamwork.com/api/v2/components.json), reading only the "Teamwork Projects" component group (Desk/Chat/Spaces/CRM are separate products on the same page) | yes | `GET /projects/api/v3/people.json?pageSize=1` | yes (`X-Rate-Limit-*` headers, per-account) | `service` · `quota` · 1 derived |
| [telegram](apps/telegram/README.md) | none published | no | `GET /bot{token}/getMe` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [terraform](apps/terraform/README.md) | [Statuspage](https://status.hashicorp.com/api/v2/components.json) — components.json, NOT summary.json: summary returns 25 of 62 components and `HCP Terraform` is the 38th by position, so the conventional probe reports other products' health as Terraform's. Matches EXACT names, because the board repeats region names across products | yes | `GET /api/v2/account/details` | no — the headers exist (`x-ratelimit-limit: 30`) but the window is ONE SECOND, so a sample measures nothing | `service` · `instance` · ~~quota~~ · 1 derived |
| [thinkific](apps/thinkific/README.md) | [Statuspage](https://status.thinkific.com/api/v2/summary.json) | yes | `GET /courses` | no | `service` · ~~quota~~ · 1 derived |
| [thrivecart](apps/thrivecart/README.md) | none published | no | `GET /api/external/ping` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [ticktick](apps/ticktick/README.md) | none published | no | `GET /open/v1/project` | no | `service` · ~~quota~~ · 1 derived |
| [tidycal](apps/tidycal/README.md) | none (statuspage host unclaimed) | no | `GET /api/me` | no | `api` · ~~service~~ · ~~quota~~ · 2 derived |
| [tldv](apps/tldv/README.md) | [Instatus](https://tldv.instatus.com/v2/components.json) | yes | `GET /meetings` | no | `service` · `api` · ~~quota~~ · 1 derived |
| [todoist](apps/todoist/README.md) | [Instatus](https://status.todoist.net/summary.json) | yes | `GET /projects` | no | `service` · ~~quota~~ · 2 derived |
| [toggl](apps/toggl/README.md) | [Statuspage](https://status.toggl.com/api/v2/summary.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 1 derived |
| [trello](apps/trello/README.md) | [Statuspage](https://trello.status.atlassian.com/api/v2/status.json) | yes | `GET /1/members/me` | no | `service` · ~~quota~~ · 1 derived |
| [trustpilot](apps/trustpilot/README.md) | [Statuspage](https://status.trustpilot.com/api/v2/summary.json) | yes | `GET /v1/business-units/search?query=trustpilot&perpage=1` | no | `service` · ~~quota~~ · 2 derived |
| [twilio](apps/twilio/README.md) | [Statuspage](https://status.twilio.com/api/v2/status.json) | yes | `GET /2010-04-01/Accounts/{accountSid}.json` | no | `service` · ~~quota~~ · 1 derived |
| [twitch](apps/twitch/README.md) | [Statuspage](https://status.twitch.com/api/v2/status.json) | yes | `GET id.twitch.tv/oauth2/validate` | yes | `service` · `api` · `quota` · ~~api-status~~ · 2 derived |
| [twitter](apps/twitter/README.md) | [page](https://developer.x.com/status) | no | `GET /2/users/me` | yes | ~~service~~ · `quota` · 1 derived |
| [typeform](apps/typeform/README.md) | [Statuspage](https://status.typeform.com/api/v2/status.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 2 derived |
| [typefully](apps/typefully/README.md) | none published — `status.typefully.com` (bad TLS/404), `typefully.statuspage.io` (unclaimed decoy), `typefully.betteruptime.com` (generic redirect) | no | derived `auth:api-key` | yes (`X-RateLimit-User-*` headers on every response) | ~~service~~ · `quota` · 1 derived |
| [typesense](apps/typesense/README.md) | [Instatus](https://typesense.instatus.com/v2/components.json) — covers TYPESENSE CLOUD only, and Typesense is mostly self-hosted, so it is declared `informational` rather than fatal; a Management Console incident is provisioning and the dashboard, not the search path | yes | `GET /collections` (NOT `/health`, which needs no key and would pass with no credential at all) | YES, and unusually it is the real resource: Typesense serves its index from RAM, so `/metrics.json` memory and disk headroom is the quota, and the failure is WRITES stopping while searches carry on | `service` · `node` · `capacity` · 1 derived |
| [unbounce](apps/unbounce/README.md) | [Statuspage](https://status.unbounce.com/api/v2/summary.json) — scoped to the one `Partner API` component out of 38 (matched by name, not id) | yes | `GET /users/self` | no | `service` · ~~quota~~ · 2 derived |
| [upstash](apps/upstash/README.md) | [Statuspage](https://status.upstash.com/api/v2/summary.json) | yes | `GET /ping` | no | `service` · `host` · 1 derived |
| [uptimerobot](apps/uptimerobot/README.md) | none published | no | `POST /getAccountDetails` | yes | ~~service~~ · `quota` · 1 derived |
| [vanta](apps/vanta/README.md) | [Statuspage](https://status.vanta.com/api/v2/components.json) — an integrations outage is capped at degraded, since the API keeps answering with stale evidence | yes | `GET /v1/frameworks?pageSize=1` | no | `service` · ~~quota~~ · `tenant` · 1 derived |
| [vercel](apps/vercel/README.md) | [Statuspage](https://www.vercel-status.com/api/v2/summary.json) | yes | `GET /v2/user` | yes | `service` · `quota` · 2 derived |
| [videoask](apps/videoask/README.md) | [Statuspage](https://status.videoask.com/api/v2/summary.json), `page.name: "VideoAsk"`, linked from the vendor's own 404 page | yes | `GET /me` | no (no rate-limit headers on any response, confirmed live and against the vendor's own Postman collection) | `service` · ~~request-rate~~ · 1 derived |
| [vimeo](apps/vimeo/README.md) | [Statuspage](https://www.vimeostatus.com/api/v2/status.json) | yes | `GET /me?fields=uri,name` | yes | `service` · `quota` · 1 derived |
| [wave](apps/wave/README.md) | [Statuspage](https://status.waveapps.com/api/v2/summary.json) | yes | `POST` GraphQL `{ user { id defaultEmail } }` | no | `service` · ~~quota~~ · 2 derived |
| [wealthbox](apps/wealthbox/README.md) | `status.wealthbox.com` answers status.io-shaped JSON, but every timestamp is frozen at 2019-02-08 — a stale decoy, not polled | no | `GET /v1/me` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [webflow](apps/webflow/README.md) | [Statuspage](https://status.webflow.com/api/v2/status.json) | yes | `GET /v2/sites` | yes | `service` · `quota` · 2 derived |
| [whatconverts](apps/whatconverts/README.md) | [genuine WhatConverts-branded Statuspage](https://status.whatconverts.com/) with a dedicated `API` component | yes | `GET /leads?limit=1` (classified by `error_message` body text — a missing vs. wrong credential both answer 401) | no (documented prose limits only; no response headers) | `service` · ~~quota~~ · 1 derived |
| [whatsapp](apps/whatsapp/README.md) | [RSS](https://metastatus.com/outage-events-feed-whatsapp-business-api.rss) | yes | `GET /{phone-number-id}?fields=verified_name` | no | `service` · ~~quota~~ · 1 derived |
| [whop](apps/whop/README.md) | none published | no | `GET /permissions` (not `/users/me`, which 404s identically for missing and fake credentials) | no | ~~service~~ · ~~quota~~ · 1 derived |
| [wise](apps/wise/README.md) | [Statuspage](https://status.wise.com/api/v2/summary.json), verdict from `status.indicator`, keyed to the `🔗 API` component | yes | `GET /v1/profiles` | yes | `service` · `request-rate` · 1 derived |
| [wix](apps/wix/README.md) | [Statuspage](https://status.wix.com/api/v2/status.json) | yes | `GET /contacts/v4/contacts` | no | `service` · ~~quota~~ · 1 derived |
| [woocommerce](apps/woocommerce/README.md) | none published | no | `GET /wp-json/wc/v3/system_status` | no | ~~service~~ · ~~quota~~ · `site` · 1 derived |
| [wordpress](apps/wordpress/README.md) | none published | no | `GET /wp-json/wp/v2/users/me` | no | ~~service~~ · ~~quota~~ · `site` · 2 derived |
| [workos](apps/workos/README.md) | [Statuspage](https://status.workos.com/api/v2/components.json) | yes | `GET /organizations?limit=1` | no | `service` · ~~quota~~ · `environment` · 1 derived |
| [wrike](apps/wrike/README.md) | none published — `status.wrike.com` is a client-rendered SPA whose every JSON/RSS route 404s; `wrike.statuspage.io`/`wrike.freshstatus.io` are unclaimed decoys | no | `GET /version` scoped by the account's own host (`www`/`app-eu`/`app-us2`.wrike.com — the wrong one 401s indistinguishably from a bad token, so the host is a connect-time field, never the credential) | no (no rate-limit headers of any kind) | ~~service~~ · ~~quota~~ · `account` · 1 derived |
| [wufoo](apps/wufoo/README.md) | [Statuspage](https://status.wufoo.com/api/v2/summary.json) | yes | `GET /forms.json` | no | `service` · ~~quota~~ · 1 derived |
| [xero](apps/xero/README.md) | [Statuspage](https://status.xero.com/api/v2/summary.json) | yes | `GET /connections` | yes | `service` · `quota` · 1 derived |
| [youcanbookme](apps/youcanbookme/README.md) | none published — every candidate host is an unclaimed/decoy page | no | `GET /{accountId}?fields=id,email` | no — a 429 exists but no readable budget/window/headroom | ~~service~~ · ~~quota~~ · 1 derived |
| [youtube](apps/youtube/README.md) | not on the Workspace dashboard | no | _varies by method_ | no | ~~service~~ · ~~quota~~ · 2 derived |
| [zendesk](apps/zendesk/README.md) | [page](https://status.zendesk.com) | no | `GET /api/v2/users/me.json` | yes | ~~service~~ · `quota` · `account` · 2 derived |
| [zendesk-sell](apps/zendesk-sell/README.md) | `status.zendesk.com` (a Zendesk-built React dashboard, not Atlassian Statuspage) genuinely carries a dedicated `Sell` component via its undocumented internal `GET /api/ssp/services` (service id 63, slug `sell`) | yes (undocumented) | `GET /v2/users/self` | no — vendor states a fixed 36,000/hour ceiling but exposes no remaining-quota header or endpoint | `service` · ~~quota~~ · 1 derived |
| [zoho](apps/zoho/README.md) | [RSS](https://us.zohostatus.com/rss) | yes | `GET /crm/v6/org` | yes | `service` · `quota` · 1 derived |
| [zoho-campaigns](apps/zoho-campaigns/README.md) | [RSS](https://us.zohostatus.com/rss) | yes | `GET /api/v1.1/getmailinglists` (per-region, ×8 DCs) | no | `service` · ~~quota~~ · 8 derived |
| [zoho-invoice](apps/zoho-invoice/README.md) | [StatusIQ RSS](https://us.zohostatus.com/rss) — matched on the exact "Zoho Invoice" component | yes | `GET /organizations` (per-region, ×8 DCs) | no | `service` · ~~quota~~ · 8 derived |
| [zohobooks](apps/zohobooks/README.md) | [StatusIQ RSS](https://us.zohostatus.com/rss) — matched on the exact "Zoho Books" component | yes | `GET /organizations` (per-region, ×8 DCs) | no | `service` · ~~quota~~ · 8 derived |
| [zohodesk](apps/zohodesk/README.md) | [StatusIQ RSS](https://us.zohostatus.com/rss) — matched on the exact "Zoho Desk" component | yes | `GET /organizations` (per-region, ×10 DCs) | no | `service` · ~~quota~~ · 10 derived |
| [zohomail](apps/zohomail/README.md) | [StatusIQ RSS](https://us.zohostatus.com/rss) | yes | `GET /api/accounts` | no | `service` · ~~quota~~ · 8 derived |
| [zoom](apps/zoom/README.md) | [Statuspage](https://status.zoom.us/api/v2/status.json) | yes | `GET /v2/users/me` | yes | `service` · `quota` · 2 derived |

## What the research turned up

- **22 of 45 vendors use Atlassian Statuspage**, so one client handles them all:
  `GET https://<host>/api/v2/status.json` → `status.indicator` of `none` / `minor` /
  `major` / `critical`. `summary.json` adds components and open incidents.
- **Four run their own JSON APIs**, each shaped differently: Slack
  (`/api/v2.0.0/current`), Stripe (`/current`, which reports `api` and `webhooks`
  separately — the API can be healthy while webhooks are degraded), Salesforce Trust
  (per-*instance* status, which is the granularity that actually matters), and Google
  Workspace (an incident feed rather than a current-state rollup).
- **Six publish nothing machine-readable** — Notion, Linear, Mailchimp, Zendesk,
  Eventbrite and Meta — and **Telegram publishes nothing at all**. For those, the
  credential probe is the only automatable signal.
- **Two vendors ship a purpose-built health endpoint**: Mailchimp's `GET /3.0/ping` and
  Dropbox's `POST /2/check/user` echo. Everyone else is probed with a whoami.
- **GitHub's `/rate_limit` is the best-designed probe of the set** — it is documented as
  not counting against the rate limit, works unauthenticated, and reports quota in the
  same call.
- **Salesforce's `/limits` answers questions 2 and 3 at once**, which is why it is the
  probe rather than an identity call.

## What got declared

Transcribing the research above into declared checks turned up a few things worth
recording:

- **The `summary.json` variant is free.** Every Statuspage service check reads
  `/api/v2/summary.json` rather than `status.json`: identical request cost, but it carries
  the per-component breakdown. That is the difference between "Zoom is up" and 143
  independently-reported components — one probe, many components, which is exactly the
  shape the RFC is built around.
- **`unknown` is doing real work.** A status page that itself 500s tells you nothing about
  the vendor, so every check reports `unknown` there rather than `down`. Salesforce leans
  on it hardest: a My Domain hostname (`acme.my.salesforce.com`) hides the instance key
  that Trust indexes by, so that case reports `unknown` with a reason rather than guessing
  in either direction.
- **A declared absence must be `informational`.** An `unavailable` entry always reports
  `unknown`, and `unknown` outranks `ok` in the roll-up — so at any other severity, saying
  "this vendor publishes nothing" would pin the app's verdict at `unknown` permanently.
  Every declared absence in the pack carries `severity: "informational"` — verified by scan, not by tally.
- **Twenty-five apps needed the `context` posture**, the one a boolean would have lost:
  ActiveCampaign, Databricks, Discourse, Elastic, Freshdesk, Freshservice, Ghost, Grafana,
  Gravity Forms, Grist, Jenkins, Jira, Metabase, Odoo, Sentry, ServiceNow, Shopify, Snowflake,
  Strapi, Supabase, Upstash, WooCommerce, WordPress and Zendesk — plus Confluence, Jira's
  sibling — are each addressed by a per-tenant host, so the check needs the Connection to know *which* host to call and no credential to
  interpret the answer. Their dependency probes are deliberately unauthenticated, which makes
  a **401 a pass** — it proves the host resolves and the API is answering, and whether the
  credential is any good is the derived `auth:*` check's job. Conflating the two is how "the
  account was renamed" gets misreported as "your token expired".
- **The extra-host rule cost nothing.** Every check that widens egress
  (`status.*`, `api.status.salesforce.com`, `www.google.com`) is a `none` or `context`
  posture, so the spec's ban on pairing `network.allow` with `credential: "signed"` never
  bound. The signed checks — all of them quota probes — sit on the app's own API host.
## Reading a status feed

Some vendors publish Atom or RSS instead of, or alongside, a JSON status API. An app
**declares** the feed and the host fetches and parses it, handing the entries to the hook
as `input.feed`:

```ts
feed: { url: "https://status.mistral.ai/feed.rss", format: "rss" },
```

No app parses XML. The split is the point: reading Atom/RSS is generic and identical for
every publisher, while interpreting what an entry *means* is vendor-specific — so the
runtime does the first and the app does the second. The feed's host is added to that hook's
allowlist implicitly, so it never appears in `network.allow` or the app's egress list.

**A feed is a log of updates, not a statement of current state**, and conflating the two
produces confident nonsense. Mistral's feed is the worked example: 50 entries describe 26
incidents, because each update to an incident is its own entry — and the newest entry for a
*resolved* incident still carries the incident's original title, "Audio API Degraded". An
earlier version of the Mistral check judged by that newest title and reported Mistral
degraded for an incident that had already closed.

So the host supplies two projections, and which one a check reads is the whole ballgame:

1. **`latest`** — the newest entry per `<guid>` / Atom `<id>`, i.e. updates folded onto the
   incident they describe. This is almost always the right one.
2. **`entries`** — everything, newest first. Only for questions genuinely about the log.

Interpretation stays with the app. **Read the vendor's own status field, don't infer one:**
Mistral prefixes every update body with `Status: Resolved` / `Status: Investigating`, which
is machine-readable, and guessing from the title when a real field exists is inexcusable.
Where a vendor offers nothing like it, report `unknown` rather than inventing a state.

Three apps read feeds today, for different reasons:

- **mistral** — the feed is the *only* machine-readable surface, so it drives the `service`
  verdict. Affected components come from the `<li>` list in each update body.
- **zohomail** — same reason, one layer worse: `status.zoho.com` 301s to `us.zohostatus.com`,
  a Site24x7 StatusIQ page with no Statuspage-style JSON at all, and its single feed carries
  one item per component across every Zoho product. The check reads the `Zoho Mail` component
  specifically — the neighbouring `Zoho Mail-IMAP` / `-POP` / `-SMTP` entries are protocol
  front-ends, not the REST API, and rolling them up would report the app down for an IMAP
  incident that cannot affect it.
- **slack** — the JSON API already answers "what is broken now", so the feed answers what
  that API structurally cannot: what broke *recently and already resolved*, which is what
  you want when a run failed twenty minutes ago and works now. It is a separate
  `informational` check (`incidents`) that never touches the verdict.

Atom is preferred over RSS where a vendor serves both: Atom's `<updated>` says when an
entry last *changed*, where RSS's `<pubDate>` conflates that with first publication.

Note that every Statuspage vendor also serves `/history.atom` and `/history.rss`. None of
them use it here — their JSON API is strictly better for current state, and an incident
history check would double the request count for something `summary.json` largely covers.
Adding one is a two-line `feed:` declaration if a vendor ever drops its JSON API.

## Choosing a probe

The recurring trap is picking an endpoint that needs a scope the credential may not
have — it reports a perfectly good token as broken. Two cases in this pack:

- HubSpot's OAuth and private-app methods probed `/crm/v3/objects/contacts`, so a
  private app entitled to deals but not contacts failed its own health check. Now
  `/account-info/v3/details`, which needs no object scope.
- Shopify is probed with `/shop.json` rather than `/products.json` (which n8n uses and
  which 403s without `read_products`), and Stripe with `/v1/balance` rather than
  `/v1/charges`.

So, in order of preference: a dedicated ping endpoint; else a whoami that needs no
scope; else the cheapest read the narrowest usable credential can still perform.
