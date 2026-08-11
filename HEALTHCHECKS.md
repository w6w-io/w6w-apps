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
methods. Twenty-three apps add a fourth question — **is this tenant's own host reachable?** —
as a `kind: "dependency"` check, because "the site is gone" and "the token expired" are
different problems with different fixes.

Across the pack that comes to **518 checks**: 196 live probes, 122 declared absences, and 200
`auth:*` checks derived for free from existing `test` hooks.

Per-app detail, including why each probe was chosen over the obvious alternatives and how
each check is annotated, is in `apps/<app>/README.md`. This table is the index.

| App | Vendor status | Machine-readable? | Credential probe | Quota headroom | Declared checks |
|---|---|:-:|---|:-:|---|
| [activecampaign](apps/activecampaign/README.md) | [Statuspage](https://status.activecampaign.com/api/v2/summary.json) | yes | `GET /contacts?limit=1` | yes | `service` · `quota` · `site` · 1 derived |
| [acuityscheduling](apps/acuityscheduling/README.md) | [Statuspage](https://status.acuityscheduling.com/api/v2/summary.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 2 derived |
| [airtable](apps/airtable/README.md) | [Statuspage](https://status.airtable.com/api/v2/status.json) | yes | `GET /v0/meta/whoami` | no | `service` · ~~quota~~ · 3 derived |
| [anthropic](apps/anthropic/README.md) | [Statuspage](https://status.anthropic.com/api/v2/status.json) | yes | `GET /v1/models` | yes | `service` · `quota` · 1 derived |
| [apitemplateio](apps/apitemplateio/README.md) | none published | no | `GET /v2/list-templates?limit=1` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [asana](apps/asana/README.md) | [Statuspage](https://status.asana.com/api/v2/status.json) | yes | `GET /api/1.0/users/me` | no | `service` · ~~quota~~ · 2 derived |
| [attio](apps/attio/README.md) | [Statuspage](https://status.attio.com/api/v2/summary.json) | yes | `GET /v2/self` | no | `service` · ~~quota~~ · 1 derived |
| [bamboohr](apps/bamboohr/README.md) | [RSS](https://status.bamboohr.com/pages/54f0de009d6f51e7140002b7/rss) | yes | `GET /api/v1/employees/0` | no | `service` · ~~quota~~ · 1 derived |
| [baserow](apps/baserow/README.md) | [Better Stack](https://status.baserow.org/index.json) | yes | `GET /api/database/tables/all-tables/` | no | `service` · ~~quota~~ · 1 derived |
| [bitbucket](apps/bitbucket/README.md) | [Statuspage](https://bitbucket.status.atlassian.com/api/v2/status.json) | yes | `GET /2.0/user` | yes | `service` · `quota` · 2 derived |
| [bitly](apps/bitly/README.md) | [Atom](https://status.bitly.com/history.atom) | yes | `GET /user` | no | `service` · ~~quota~~ · 1 derived |
| [box](apps/box/README.md) | [Statuspage](https://status.box.com/api/v2/summary.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 1 derived |
| [brevo](apps/brevo/README.md) | [Statuspage](https://status.brevo.com/api/v2/status.json) | yes | `GET /v3/account` | yes | `service` · `quota` · 1 derived |
| [buffer](apps/buffer/README.md) | [Statuspage](https://status.buffer.com/api/v2/summary.json) | yes | `{ account { id } }` (GraphQL) | yes | `service` · `quota` · 2 derived |
| [cal](apps/cal/README.md) | [JSON](https://status.cal.com/api/status/summary.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 1 derived |
| [calendly](apps/calendly/README.md) | [Statuspage](https://www.calendlystatus.com/api/v2/status.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 2 derived |
| [chargebee](apps/chargebee/README.md) | [Statuspage](https://status.chargebee.com/api/v2/summary.json) | yes | `GET /customers?limit=1` | no | `service` · ~~quota~~ · 1 derived |
| [circle](apps/circle/README.md) | [Statuspage](https://status.circle.so/api/v2/summary.json) | yes | `GET /community` | no | `service` · ~~quota~~ · 1 derived |
| [circleci](apps/circleci/README.md) | [Statuspage](https://status.circleci.com/api/v2/summary.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 1 derived |
| [clearbit](apps/clearbit/README.md) | [Statuspage](https://status.clearbit.com/api/v2/summary.json) | yes | `GET /v1/domains/find?name=Clearbit` | yes | `service` · `quota` · 1 derived |
| [clickup](apps/clickup/README.md) | [status.io](https://api.status.io/1.0/status/5b6e0963c662144d00913a09) | yes | `GET /user` | yes | `service` · `quota` · 2 derived |
| [clockify](apps/clockify/README.md) | none machine-readable | no | `GET /workspaces` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [close](apps/close/README.md) | [Statuspage](https://status.close.com/api/v2/summary.json) | yes | `GET /me/` | yes | `service` · `quota` · 1 derived |
| [cloudflare](apps/cloudflare/README.md) | [Statuspage](https://www.cloudflarestatus.com/api/v2/summary.json) | yes | `GET /user/tokens/verify` | yes | `service` · `quota` · 1 derived |
| [coda](apps/coda/README.md) | [Atom](https://status.coda.io/history.atom) | yes | `GET /whoami` | no | `service` · ~~quota~~ · 1 derived |
| [constantcontact](apps/constantcontact/README.md) | [Statuspage](https://status.constantcontact.com/api/v2/summary.json) | yes | `GET /contacts?limit=1` | no | `service` · ~~quota~~ · 1 derived |
| [contentful](apps/contentful/README.md) | [Statuspage](https://www.contentfulstatus.com/api/v2/status.json) | yes | `GET /spaces/{spaceId}` | yes | `service` · `quota` · 1 derived |
| [copper](apps/copper/README.md) | [Statuspage](https://status.copper.com/api/v2/summary.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 1 derived |
| [customerio](apps/customerio/README.md) | [Statuspage](https://status.customerio.com/api/v2/summary.json) | yes | `PUT /customers/:id` | no | `service` · ~~quota~~ · 1 derived |
| [databricks](apps/databricks/README.md) | none published | no | _varies by method_ | no | ~~service~~ · `workspace` · 1 derived |
| [deepl](apps/deepl/README.md) | [JSON](https://api-status.deepl.com/api/status) | yes | `GET /v2/usage` | yes | `service` · `quota` · 1 derived |
| [discord](apps/discord/README.md) | [Statuspage](https://discordstatus.com/api/v2/status.json) | yes | `GET /users/@me` | yes | `service` · `quota` · 2 derived |
| [discourse](apps/discourse/README.md) | [status.io](https://api.status.io/1.0/status/5e2141ce30dc5c04b3ac32fc) | yes | `GET /u/{username}.json` | no | `service` · ~~quota~~ · `site` · 1 derived |
| [docusign](apps/docusign/README.md) | [Statuspage](https://status.docusign.com/api/v2/summary.json) | yes | `GET /accounts/{accountId}` | yes | `service` · `quota` · 2 derived |
| [dropbox](apps/dropbox/README.md) | [Statuspage](https://status.dropbox.com/api/v2/status.json) | yes | `POST /2/users/get_current_account` | no | `service` · ~~quota~~ · 2 derived |
| [elastic](apps/elastic/README.md) | none published | no | `GET /_security/_authenticate` | no | ~~service~~ · ~~quota~~ · `site` · 2 derived |
| [eventbrite](apps/eventbrite/README.md) | [page](https://status.eventbrite.com) | no | `GET /v3/users/me/` | yes | ~~service~~ · `quota` · 2 derived |
| [excel](apps/excel/README.md) | none machine-readable | no | `GET /me/drive` | yes | ~~service~~ · `quota` · 1 derived |
| [facebook](apps/facebook/README.md) | none published | no | _varies by method_ | yes | ~~service~~ · `quota` · 2 derived |
| [facebook-conversions](apps/facebook-conversions/README.md) | none published | no | `GET /me` | yes | ~~service~~ · `quota` · 2 derived |
| [facebook-lead-ads](apps/facebook-lead-ads/README.md) | [page](https://metastatus.com) | no | _varies by method_ | yes | ~~service~~ · `quota` · 2 derived |
| [fathom](apps/fathom/README.md) | [Statuspage](https://status.fathom.video/api/v2/summary.json) | yes | `GET /meetings` | yes | `service` · `quota` · 1 derived |
| [figma](apps/figma/README.md) | [Statuspage](https://status.figma.com/api/v2/summary.json) | yes | `GET /v1/me` | no | `service` · ~~quota~~ · 2 derived |
| [flodesk](apps/flodesk/README.md) | none machine-readable | no | `GET /segments/colors` | yes | ~~service~~ · `quota` · 2 derived |
| [followupboss](apps/followupboss/README.md) | [Statuspage](https://followupboss.statuspage.io/api/v2/summary.json) | yes | `GET /identity` | yes | `service` · `quota` · 1 derived |
| [freshdesk](apps/freshdesk/README.md) | none published | no | `GET /agents/me` | yes | ~~service~~ · `quota` · `domain` · 1 derived |
| [freshservice](apps/freshservice/README.md) | [Freshstatus](https://public-api.freshstatus.io/v1/public-components/?account_id=3616) | yes | `GET /api/v2/tickets` | yes | `service` · `quota` · `domain` · 1 derived |
| [getresponse](apps/getresponse/README.md) | [Statuspage](https://status.getresponse.com/api/v2/summary.json) | yes | `GET /accounts` | no | `service` · ~~quota~~ · 1 derived |
| [ghost](apps/ghost/README.md) | [RSS](https://ghoststatus.org/history.rss) | yes | `GET /users/?limit=1` | no | `service` · ~~quota~~ · `site` · 1 derived |
| [github](apps/github/README.md) | [Statuspage](https://www.githubstatus.com/api/v2/status.json) | yes | `GET /user` | yes | `service` · `quota` · 2 derived |
| [gitlab](apps/gitlab/README.md) | [status.io](https://api.status.io/1.0/status/5b36dc6502d06804c08349f7) | yes | `GET /user` | yes | `service` · `quota` · 2 derived |
| [gmail](apps/gmail/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `GET /gmail/v1/users/me/profile` | no | `service` · ~~quota~~ · 2 derived |
| [google-ads](apps/google-ads/README.md) | [JSON](https://ads.google.com/status/publisher/incidents.json) | yes | `GET /v25/customers:listAccessibleCustomers` | no | `service` · ~~quota~~ · 1 derived |
| [google-calendar](apps/google-calendar/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `GET /users/me/calendarList?maxResults=1` | no | `service` · ~~quota~~ · 2 derived |
| [google-slides](apps/google-slides/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `POST /tokeninfo` | no | `service` · ~~quota~~ · 2 derived |
| [googlechat](apps/googlechat/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `GET /spaces` | no | `service` · ~~quota~~ · 1 derived |
| [google-contacts](apps/google-contacts/README.md) | none published | no | `GET /people/me?personFields=names` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [google-docs](apps/google-docs/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | _varies by method_ | no | `service` · ~~quota~~ · 2 derived |
| [google-drive](apps/google-drive/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | _varies by method_ | no | `service` · ~~quota~~ · 2 derived |
| [google-forms](apps/google-forms/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | _varies by method_ | no | `service` · ~~quota~~ · 2 derived |
| [google-sheets](apps/google-sheets/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | _varies by method_ | no | `service` · ~~quota~~ · 2 derived |
| [google-tasks](apps/google-tasks/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `GET /users/@me/lists?maxResults=1` | no | `service` · ~~quota~~ · 1 derived |
| [grafana](apps/grafana/README.md) | none published | no | `GET /api/org` | no | ~~service~~ · ~~quota~~ · `site` · 1 derived |
| [gravityforms](apps/gravityforms/README.md) | none published | no | `GET /gf/v2/forms` | no | ~~service~~ · ~~quota~~ · `site` · 1 derived |
| [grist](apps/grist/README.md) | none machine-readable | no | `GET /api/profile/user` | no | ~~service~~ · ~~quota~~ · `site` · 2 derived |
| [harvest](apps/harvest/README.md) | [Statuspage](https://www.harveststatus.com/api/v2/summary.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 2 derived |
| [helpscout](apps/helpscout/README.md) | [Statuspage](https://status.helpscout.com/api/v2/summary.json) | yes | `GET /users/me` | yes | `service` · `quota` · 1 derived |
| [highlevel](apps/highlevel/README.md) | [Atom](https://status.gohighlevel.com/feed.atom) | yes | `GET /locations/{locationId}` | yes | `service` · `quota` · 1 derived |
| [hubspot](apps/hubspot/README.md) | [Statuspage](https://status.hubspot.com/api/v2/status.json) | yes | `GET /account-info/v3/details` | yes | `service` · `quota` · 3 derived |
| [intercom](apps/intercom/README.md) | [Statuspage](https://www.finstatus.com/api/v2/status.json) | yes | `GET /me` | yes | `service` · `quota` · 2 derived |
| [jenkins](apps/jenkins/README.md) | none published | no | `GET /api/json` | no | ~~service~~ · `site` · 1 derived |
| [jira](apps/jira/README.md) | [Statuspage](https://jira-software.status.atlassian.com/api/v2/status.json) | yes | _varies by method_ | no | `service` · ~~quota~~ · `site` · 2 derived |
| [jobber](apps/jobber/README.md) | [Statuspage](https://www.jobberstatus.net/api/v2/summary.json) | yes | `query { account }` (GraphQL) | yes | `service` · `quota` · 1 derived |
| [jotform](apps/jotform/README.md) | [Statuspage](https://status.jotform.com/api/v2/summary.json) | yes | `GET /user` | yes | `service` · `quota` · 1 derived |
| [kajabi](apps/kajabi/README.md) | [Statuspage](https://status.kajabi.com/api/v2/summary.json) | yes | `GET /v1/me` | no | `service` · ~~quota~~ · 1 derived |
| [kit](apps/kit/README.md) | [Statuspage](https://status.kit.com/api/v2/summary.json) | yes | `GET /v4/account` | no | `service` · ~~quota~~ · 1 derived |
| [klaviyo](apps/klaviyo/README.md) | [Statuspage](https://status.klaviyo.com/api/v2/status.json) | yes | `GET /api/accounts/` | yes | `service` · `quota` · 1 derived |
| [lemlist](apps/lemlist/README.md) | [Hyperping](https://status.lempire.com/status.json) | yes | `GET /team` | yes | `service` · `quota` · 1 derived |
| [linear](apps/linear/README.md) | [page](https://status.linear.app) | no | `POST /graphql  ·  { viewer { id } }` | yes | ~~service~~ · `quota` · 2 derived |
| [linkedin](apps/linkedin/README.md) | [Statuspage](https://www.linkedin-apistatus.com/api/v2/summary.json) | yes | `GET /v2/userinfo` | no | `service` · ~~quota~~ · 2 derived |
| [mailcheck](apps/mailcheck/README.md) | none published | no | `GET /v1/emails/operations?page_size=1` | no | ~~service~~ · 1 derived |
| [mailchimp](apps/mailchimp/README.md) | [page](https://status.mailchimp.com) | no | `GET /3.0/ping` | no | ~~service~~ · ~~quota~~ · 2 derived |
| [mailerlite](apps/mailerlite/README.md) | [Statuspage](https://status.mailerlite.com/api/v2/summary.json) | yes | `GET /api/subscribers?limit=0` | yes | `service` · `quota` · 1 derived |
| [mailgun](apps/mailgun/README.md) | [Statuspage](https://status.mailgun.com/api/v2/summary.json) | yes | `GET /v4/domains?limit=1` | yes | `service` · `quota` · 1 derived |
| [mailjet](apps/mailjet/README.md) | [Statuspage](https://status.mailjet.com/api/v2/summary.json) | yes | `GET /v3/REST/contactslist?Limit=1` | no | `service` · ~~quota~~ · 1 derived |
| [mandrill](apps/mandrill/README.md) | none published | no | `POST /users/ping.json` | yes | ~~service~~ · `quota` · 1 derived |
| [manychat](apps/manychat/README.md) | [Instatus](https://status.manychat.com/v2/components.json) | yes | `GET /fb/page/getInfo` | no | `service` · ~~quota~~ · 1 derived |
| [mattermost](apps/mattermost/README.md) | [Statuspage](https://status.mattermost.com/api/v2/summary.json) | yes | `GET /api/v4/users/me` | yes | `service` · `quota` · `instance` · 1 derived |
| [metabase](apps/metabase/README.md) | [Statuspage](https://status.metabase.com/api/v2/summary.json) | yes | `GET /api/user/current` | no | `service` · ~~quota~~ · `instance` · 1 derived |
| [microsoft-todo](apps/microsoft-todo/README.md) | none published | no | `GET /me/todo/lists` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [mistral](apps/mistral/README.md) | [RSS](https://status.mistral.ai/feed.rss) | yes | `GET /v1/models` | yes | `service` · `quota` · 1 derived |
| [monday](apps/monday/README.md) | [Statuspage](https://status.monday.com/api/v2/status.json) | yes | `POST /v2 · { me { id } }` | yes | `service` · `quota` · 2 derived |
| [netlify](apps/netlify/README.md) | [Statuspage](https://www.netlifystatus.com/api/v2/summary.json) | yes | `GET /user` | yes | `service` · `quota` · 1 derived |
| [notion](apps/notion/README.md) | [page](https://status.notion.so) | no | `GET /v1/users/me` | no | ~~service~~ · ~~quota~~ · 2 derived |
| [odoo](apps/odoo/README.md) | none machine-readable | no | `common.authenticate` (JSON-RPC) | no | ~~service~~ · ~~quota~~ · `instance` · 1 derived |
| [okta](apps/okta/README.md) | [page](https://status.okta.com) | no | `GET /api/v1/users?limit=1` | yes | ~~service~~ · `quota` · 1 derived |
| [onesimpleapi](apps/onesimpleapi/README.md) | none published | no | `GET /exchange_rate?to_currency=USD` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [openai](apps/openai/README.md) | [Statuspage](https://status.openai.com/api/v2/status.json) | yes | `GET /v1/models` | yes | `service` · `quota` · 1 derived |
| [outlook](apps/outlook/README.md) | none machine-readable | no | `GET /me` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [paddle](apps/paddle/README.md) | [incident.io](https://paddlestatus.com/api/v2/summary.json) | yes | `GET /event-types` | no | `service` · ~~quota~~ · 1 derived |
| [pagerduty](apps/pagerduty/README.md) | [page](https://status.pagerduty.com) | no | `GET /abilities` | yes | ~~service~~ · `quota` · 2 derived |
| [paypal](apps/paypal/README.md) | [Atom](https://www.paypal-status.com/feed/atom) | yes | `POST /v1/oauth2/token` | no | `service` · ~~quota~~ · 1 derived |
| [pandadoc](apps/pandadoc/README.md) | [Statuspage](https://status.pandadoc.com/api/v2/summary.json) | yes | `GET /members/current` | no | `service` · ~~quota~~ · 1 derived |
| [pipedrive](apps/pipedrive/README.md) | [page](https://status.pipedrive.com) | no | `GET /users/me` | yes | ~~service~~ · `quota` · 2 derived |
| [postbin](apps/postbin/README.md) | [page](https://www.postb.in) | no | _no credential_ | no | `service` · ~~quota~~ · 0 derived |
| [posthog](apps/posthog/README.md) | none published | no | `GET /api/users/@me/` | no | ~~service~~ · 1 derived |
| [postmark](apps/postmark/README.md) | [JSON](https://status.postmarkapp.com/api/v1/status) | yes | `GET /server` | no | `service` · ~~quota~~ · 1 derived |
| [pushover](apps/pushover/README.md) | [page](https://status.pushover.net) | no | `POST /1/users/validate.json` | yes | ~~service~~ · `quota` · 1 derived |
| [quickbase](apps/quickbase/README.md) | [status.page](https://quickbasestatus.status.page/status.json) | yes | `GET /v1/apps/{appId}` | yes | `service` · `quota` · 1 derived |
| [quickbooks](apps/quickbooks/README.md) | [Statuspage](https://status.developer.intuit.com/api/v2/summary.json) | yes | `GET /v3/company/{realmId}/companyinfo/{realmId}` | no | `service` · ~~quota~~ · 1 derived |
| [reddit](apps/reddit/README.md) | [Statuspage](https://www.redditstatus.com/api/v2/summary.json) | yes | `GET /api/v1/me` | yes | `service` · `quota` · 1 derived |
| [s3](apps/s3/README.md) | [JSON](https://health.aws.amazon.com/public/currentevents) | yes | `GET /` (ListBuckets) | no | `service` · 1 derived |
| [segment](apps/segment/README.md) | [Statuspage](https://status.segment.com/api/v2/summary.json) | yes | `POST /v1/identify` | no | `service` · ~~quota~~ · 1 derived |
| [salesforce](apps/salesforce/README.md) | [JSON](https://api.status.salesforce.com/v1/instances) | yes | _varies by method_ | yes | `service` · `quota` · 2 derived |
| [sendgrid](apps/sendgrid/README.md) | [Statuspage](https://status.sendgrid.com/api/v2/status.json) | yes | `GET /v3/scopes` | yes | `service` · `quota` · 1 derived |
| [servicenow](apps/servicenow/README.md) | none published | no | `GET /api/now/table/sys_user_role?sysparm_limit=1` | no | ~~service~~ · ~~quota~~ · `instance` · 2 derived |
| [shopify](apps/shopify/README.md) | [Statuspage](https://www.shopifystatus.com/api/v2/status.json) | yes | `GET /shop.json` | yes | `service` · `quota` · `store` · 1 derived |
| [slack](apps/slack/README.md) | [JSON](https://status.slack.com/api/v2.0.0/current) · [Atom/RSS](https://slack-status.com/feed/atom) | yes | `POST /api/auth.test` | no | `service` · `incidents` · ~~quota~~ · 2 derived |
| [smartsheet](apps/smartsheet/README.md) | [Statuspage](https://status.smartsheet.com/api/v2/summary.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 1 derived |
| [snowflake](apps/snowflake/README.md) | [Atom](https://status.snowflake.com/history.atom) | yes | `POST /api/v2/statements` | no | `service` · `account` · 1 derived |
| [splunk](apps/splunk/README.md) | [Statuspage](https://status.splunkcloud.com/api/v2/summary.json) | yes | `GET /services/authentication/current-context` | no | `service` · 1 derived |
| [spotify](apps/spotify/README.md) | [Statuspage](https://spotify.statuspage.io/api/v2/summary.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 1 derived |
| [strapi](apps/strapi/README.md) | none published | no | `GET /api/upload/files/page` | no | ~~service~~ · ~~quota~~ · `site` · 1 derived |
| [strava](apps/strava/README.md) | [Statuspage](https://status.strava.com/api/v2/summary.json) | yes | `GET /athlete` | yes | `service` · `quota` · 1 derived |
| [square](apps/square/README.md) | [Statuspage](https://issquareup.com/api/v2/status.json) | yes | `GET /v2/merchants/me` | no | `service` · ~~quota~~ · 1 derived |
| [stripe](apps/stripe/README.md) | [JSON](https://status.stripe.com/current) | yes | `GET /v1/balance` | no | `service` · ~~quota~~ · 1 derived |
| [supabase](apps/supabase/README.md) | [Atom](https://status.supabase.com/history.atom) | yes | `GET /rest/v1/` | no | `service` · `reachable` · 1 derived |
| [surveymonkey](apps/surveymonkey/README.md) | [Statuspage](https://status.surveymonkey.com/api/v2/summary.json) | yes | `GET /users/me` | yes | `service` · `quota` · 1 derived |
| [tally](apps/tally/README.md) | [Better Stack](https://status.tally.so/index.json) | yes | `GET /users/me` | no | `service` · ~~quota~~ · 1 derived |
| [teams](apps/teams/README.md) | none machine-readable | no | `GET /me` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [telegram](apps/telegram/README.md) | none published | no | `GET /bot{token}/getMe` | no | ~~service~~ · ~~quota~~ · 1 derived |
| [ticktick](apps/ticktick/README.md) | none published | no | `GET /open/v1/project` | no | `service` · ~~quota~~ · 1 derived |
| [todoist](apps/todoist/README.md) | [Instatus](https://status.todoist.net/summary.json) | yes | `GET /projects` | no | `service` · ~~quota~~ · 2 derived |
| [toggl](apps/toggl/README.md) | [Statuspage](https://status.toggl.com/api/v2/summary.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 1 derived |
| [trello](apps/trello/README.md) | [Statuspage](https://trello.status.atlassian.com/api/v2/status.json) | yes | `GET /1/members/me` | no | `service` · ~~quota~~ · 1 derived |
| [twilio](apps/twilio/README.md) | [Statuspage](https://status.twilio.com/api/v2/status.json) | yes | `GET /2010-04-01/Accounts/{accountSid}.json` | no | `service` · ~~quota~~ · 1 derived |
| [twitter](apps/twitter/README.md) | [page](https://developer.x.com/status) | no | `GET /2/users/me` | yes | ~~service~~ · `quota` · 1 derived |
| [typeform](apps/typeform/README.md) | [Statuspage](https://status.typeform.com/api/v2/status.json) | yes | `GET /me` | no | `service` · ~~quota~~ · 2 derived |
| [upstash](apps/upstash/README.md) | [Statuspage](https://status.upstash.com/api/v2/summary.json) | yes | `GET /ping` | no | `service` · `host` · 1 derived |
| [uptimerobot](apps/uptimerobot/README.md) | none published | no | `POST /getAccountDetails` | yes | ~~service~~ · `quota` · 1 derived |
| [webflow](apps/webflow/README.md) | [Statuspage](https://status.webflow.com/api/v2/status.json) | yes | `GET /v2/sites` | yes | `service` · `quota` · 2 derived |
| [whatsapp](apps/whatsapp/README.md) | [RSS](https://metastatus.com/outage-events-feed-whatsapp-business-api.rss) | yes | `GET /{phone-number-id}?fields=verified_name` | no | `service` · ~~quota~~ · 1 derived |
| [wix](apps/wix/README.md) | [Statuspage](https://status.wix.com/api/v2/status.json) | yes | `GET /contacts/v4/contacts` | no | `service` · ~~quota~~ · 1 derived |
| [woocommerce](apps/woocommerce/README.md) | none published | no | `GET /wp-json/wc/v3/system_status` | no | ~~service~~ · ~~quota~~ · `site` · 1 derived |
| [wordpress](apps/wordpress/README.md) | none published | no | `GET /wp-json/wp/v2/users/me` | no | ~~service~~ · ~~quota~~ · `site` · 2 derived |
| [wufoo](apps/wufoo/README.md) | [Statuspage](https://status.wufoo.com/api/v2/summary.json) | yes | `GET /forms.json` | no | `service` · ~~quota~~ · 1 derived |
| [xero](apps/xero/README.md) | [Statuspage](https://status.xero.com/api/v2/summary.json) | yes | `GET /connections` | yes | `service` · `quota` · 1 derived |
| [youtube](apps/youtube/README.md) | not on the Workspace dashboard | no | _varies by method_ | no | ~~service~~ · ~~quota~~ · 2 derived |
| [zendesk](apps/zendesk/README.md) | [page](https://status.zendesk.com) | no | `GET /api/v2/users/me.json` | yes | ~~service~~ · `quota` · `account` · 2 derived |
| [zoho](apps/zoho/README.md) | [RSS](https://us.zohostatus.com/rss) | yes | `GET /crm/v6/org` | yes | `service` · `quota` · 1 derived |
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
  All 117 absences carry `severity: "informational"`.
- **Twenty-three apps needed the `context` posture**, the one a boolean would have lost:
  ActiveCampaign, Databricks, Discourse, Elastic, Freshdesk, Freshservice, Ghost, Grafana,
  Gravity Forms, Grist, Jenkins, Jira, Metabase, Odoo, ServiceNow, Shopify, Snowflake, Strapi,
  Supabase, Upstash, WooCommerce, WordPress and Zendesk are each addressed by a per-tenant
  host, so the check needs the Connection to know *which* host to call and no credential to
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

Two apps read feeds today, for opposite reasons:

- **mistral** — the feed is the *only* machine-readable surface, so it drives the `service`
  verdict. Affected components come from the `<li>` list in each update body.
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
