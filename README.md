# w6w-apps

Official **w6w app pack** — first-party integrations shipped as a registry Pack.

> **Status:** Development · **License:** MIT · **Spec:** `PackManifest v1`

## Contents

`w6w-pack.json` at the repo root lists every app bundled here. Register the
whole pack in one call:

```ts
import { createRegistry } from "@w6w/registry";
await registry.registerPack("github:w6w-io/w6w-apps@main");
// → { pack, results, registered, failed }
```

Or install a single app by pointing at its subdirectory
(`github:w6w-io/w6w-apps@main#apps/slack`, `file:./apps/slack`, …).

Each app dir is a standalone w6w App: `package.json` (manifest under the `w6w`
field), `index.ts` (default export of `AppDefinition`), `actions/`, `auth/`,
`assets/icon.{svg,png}`, and its own `deno.json` / `tsconfig.json` / `tests/`.

| App | Categories | Auth | Actions |
|-----|------------|------|--------:|
| activecampaign | marketing, crm | api-key | 13 |
| acuityscheduling | calendar | basic, oauth2 | 9 |
| airtable | spreadsheets, databases, productivity | personal-access-token, oauth2, api-key | 10 |
| anthropic | ai | api-key | 14 |
| apitemplateio | developer-tools | api-key | 5 |
| asana | productivity, project-management | access-token, oauth2 | 22 |
| attio | crm | api-key | 29 |
| bamboohr | hr | api-key | 18 |
| baserow | databases, spreadsheets, productivity | database-token | 12 |
| bitbucket | developer-tools | basic, access-token | 12 |
| bitly | marketing, analytics | access-token | 8 |
| box | storage | oauth2 | 10 |
| brevo | marketing, email | api-key | 15 |
| buffer | social-media, marketing | oauth2, api-key | 14 |
| cal | calendar | api-key | 8 |
| calendly | calendar, productivity | personal-access-token, oauth2 | 12 |
| chargebee | commerce, finance | api-key | 17 |
| circle | communication, social-media | api-token | 33 |
| circleci | devops, developer-tools | api-token | 8 |
| clearbit | marketing, crm | api-key | 9 |
| clickup | project-management, productivity | api-token, oauth2 | 12 |
| close | crm | api-key | 21 |
| clockify | productivity | api-key | 10 |
| cloudflare | devops | api-token | 8 |
| coda | productivity, documents | api-token | 11 |
| constantcontact | marketing, email | oauth2 | 22 |
| contentful | cms | access-token | 10 |
| copper | crm | api-key | 24 |
| customerio | marketing, email | basic | 7 |
| databricks | data-warehousing | bearer-token | 8 |
| deepl | ai | api-key | 8 |
| discord | communication | bot-token, oauth2 | 19 |
| discourse | communication, social-media | api-key | 26 |
| docusign | documents, legal, productivity | oauth2, oauth2-demo | 16 |
| dropbox | storage | access-token, oauth2 | 12 |
| elastic | search | api-key, basic | 9 |
| eventbrite | commerce, calendar | personal-token, oauth2 | 10 |
| excel | spreadsheets, productivity | oauth2 | 16 |
| facebook | social-media, marketing | oauth2, page-token | 14 |
| facebook-conversions | marketing, analytics, social-media | conversions-token, oauth2 | 5 |
| facebook-lead-ads | marketing, social-media | oauth2, page-token | 2 |
| fathom | ai, productivity, video | api-key | 11 |
| figma | productivity, developer-tools | personal-access-token, oauth2 | 10 |
| flodesk | marketing, email | api-key, oauth2 | 22 |
| followupboss | crm | api-key | 26 |
| freshdesk | support | api-key | 13 |
| freshservice | support, devops | api-key | 23 |
| getresponse | marketing, email | api-key | 14 |
| ghost | cms, productivity | admin-api-key | 11 |
| github | version-control, developer-tools | access-token, oauth2 | 24 |
| gitlab | developer-tools, version-control | access-token, oauth2 | 16 |
| gmail | communication, email | oauth2, service-account | 25 |
| google-ads | marketing, analytics | oauth2 | 14 |
| google-calendar | calendar, productivity | oauth2, service-account | 8 |
| google-slides | documents, productivity | oauth2, service-account | 17 |
| googlechat | communication | oauth2 | 18 |
| google-contacts | crm, productivity | oauth2 | 14 |
| google-docs | productivity, documents | oauth2, service-account | 20 |
| google-drive | storage, productivity | oauth2, service-account | 18 |
| google-forms | forms, productivity | oauth2, service-account | 12 |
| google-sheets | spreadsheets, productivity | oauth2, service-account | 12 |
| google-tasks | productivity, project-management | oauth2 | 13 |
| grafana | monitoring | service-account-token | 8 |
| gravityforms | forms, productivity | basic | 12 |
| grist | spreadsheets, databases, productivity | api-key, oauth2 | 15 |
| harvest | productivity | personal-access-token, oauth2 | 11 |
| helpscout | support | oauth2 | 13 |
| highlevel | crm, marketing | oauth2 | 18 |
| hubspot | crm, marketing | private-app-token, oauth2, api-key | 42 |
| intercom | support, communication, crm | access-token, oauth2 | 14 |
| jenkins | devops | basic | 6 |
| jira | project-management, developer-tools | api-token, oauth2 | 15 |
| jobber | calendar, crm, finance | oauth2 | 28 |
| jotform | forms, productivity | api-key | 14 |
| kajabi | commerce, crm, marketing | client-credentials | 49 |
| kit | marketing, email | api-key | 18 |
| klaviyo | marketing, email | api-key | 23 |
| lemlist | marketing, email | api-key | 18 |
| linear | project-management, developer-tools | api-key, oauth2 | 11 |
| linkedin | social-media, marketing | oauth2, oauth2-community-management | 6 |
| mailcheck | email, marketing | api-key | 4 |
| mailchimp | marketing, communication | api-key, oauth2 | 14 |
| mailerlite | marketing, email | api-key | 16 |
| mailgun | email, communication | api-key | 14 |
| mailjet | email, marketing | basic | 17 |
| mandrill | email, marketing | api-key | 17 |
| manychat | marketing, communication, social-media | api-token | 25 |
| mattermost | communication, productivity | access-token | 13 |
| metabase | analytics, databases | api-key | 17 |
| microsoft-todo | productivity, project-management | oauth2 | 19 |
| mistral | ai | api-key | 4 |
| monday | project-management, productivity | api-token, oauth2 | 14 |
| netlify | devops | personal-access-token | 10 |
| notion | productivity, documents | internal-secret, oauth2 | 17 |
| odoo | crm, commerce | api-key | 21 |
| okta | security | api-token | 11 |
| onesimpleapi | developer-tools | api-key | 7 |
| openai | ai, developer-tools | api-key | 13 |
| outlook | communication, email, calendar | oauth2 | 18 |
| paddle | commerce, finance | api-key | 21 |
| pagerduty | monitoring, devops | api-token, oauth2 | 14 |
| paypal | commerce, finance | client-credentials | 13 |
| pandadoc | documents, legal, productivity | api-key | 16 |
| pipedrive | crm | api-token, oauth2 | 14 |
| postbin | developer-tools | none | 5 |
| posthog | analytics | personal-api-key | 8 |
| postmark | email, communication | api-key | 13 |
| pushover | communication, monitoring | app-token | 4 |
| quickbase | databases, productivity, project-management | user-token | 20 |
| quickbooks | finance | oauth2 | 20 |
| reddit | social-media | oauth2 | 8 |
| s3 | storage | aws-iam | 9 |
| segment | analytics | write-key | 6 |
| salesforce | crm | access-token, oauth2 | 12 |
| sendgrid | email, communication | sendgrid-api | 10 |
| servicenow | support, devops | basic, oauth2 | 9 |
| shopify | commerce | access-token | 18 |
| slack | communication | access-token, oauth2 | 47 |
| smartsheet | spreadsheets, productivity | access-token | 16 |
| snowflake | data-warehousing | key-pair | 5 |
| splunk | monitoring, devops | token | 8 |
| spotify | productivity | oauth2 | 9 |
| strapi | cms | api-token | 6 |
| strava | productivity | oauth2 | 9 |
| square | commerce, finance | access-token | 17 |
| stripe | commerce, finance | api-key | 23 |
| supabase | databases | api-key | 7 |
| surveymonkey | forms, productivity | oauth2 | 12 |
| tally | forms, productivity | api-key | 38 |
| teams | communication | oauth2 | 16 |
| telegram | communication | bot-token | 21 |
| ticktick | productivity, project-management | oauth2 | 23 |
| todoist | productivity | api-token, oauth2 | 14 |
| toggl | productivity | api-token | 10 |
| trello | project-management, productivity | api-key | 27 |
| twilio | communication | api-key | 2 |
| twitter | social-media | oauth2 | 8 |
| typeform | forms, productivity | personal-access-token, oauth2 | 10 |
| upstash | databases | rest-token | 15 |
| uptimerobot | monitoring | api-key | 8 |
| webflow | cms | api-token, oauth2 | 14 |
| whatsapp | communication | access-token | 9 |
| wix | cms, crm, commerce | api-key | 24 |
| woocommerce | commerce | api-key | 13 |
| wordpress | cms | basic, oauth2 | 15 |
| wufoo | forms, productivity | api-key | 8 |
| xero | finance | oauth2 | 13 |
| youtube | video, social-media | api-key, oauth2 | 16 |
| zendesk | support, crm | api-token, oauth2 | 17 |
| zoho | crm | oauth2 | 21 |
| zoom | video, communication | server-to-server, oauth2 | 14 |

145 apps, 2144 actions.

`upstash` and `supabase` are **not** raw Redis/Postgres — this pack's Apps run in a
network-less sandbox that only reaches the network via `ctx.fetch` over HTTP(S) to a
static, publish-time hostname allowlist, so a wire-protocol database (TCP, not HTTP)
cannot be reached at all. Upstash (Redis over a REST API) and Supabase (Postgres via
PostgREST's REST API) are the closest real, fixed-domain products that actually work
under this architecture — see each app's README for the scoping rationale.

Icons are the vendors' own marks — copied verbatim from n8n's `nodes-base` for
the apps ported from it, and fetched from each vendor's brand page for the
apps built from scratch. See individual `assets/icon.*` for the exact source.

Five exceptions, stated rather than buried. In each case n8n has no node for the
product and the vendor publishes no obtainable mark, so there was nothing to copy
verbatim. Where a colour is quoted below it *is* vendor-sourced — taken from the
vendor's own stylesheet, theme config or web manifest — even though the artwork is not.

- **`google-forms`** — follows the sibling Google icons' silhouette in Forms' brand
  purple, with a checklist glyph.
- **`odoo`** — n8n's `nodes-base` Odoo icon is itself a simplification (a single
  filled ring), not the vendor's own artwork. Ours is two rings in Odoo's brand
  purples (`#714B67`, `#875A7B`).
- **`manychat`** — the vendor's assets sit behind Cloudflare (403) and the one
  fetchable logo is a wordmark, unusable as a square icon. Ours is a chat bubble in
  `#3A46BD`, the `brand_color` from ManyChat's own help-centre theme.
- **`ticktick`** — a rounded square and checkmark in `#4772FA`, the `themeColor`
  from TickTick's own `developer.ticktick.com/docs/config.js`.
- **`circle`** — n8n has a CircleCI node, a different product. Ours is a ring with
  three satellites, in colours sampled from circle.so's own stylesheet.

Each app's own README says so too. Replace any of them if an official mark is ever
sourced.

## Health checks

Every app **declares** its health checks per [`rfcs/healthcheck.md`][health-rfc], so a host
runs what the publisher says to run instead of guessing at a probe. Each declares a
`service` check (is the vendor up?) and a `quota` check (is there headroom?) — as a real
probe where the vendor supports one, and as an explicit `unavailable` where it does not,
because "nothing exists to check" is a more useful answer than a gap. Twenty-three apps addressed
by a per-tenant host (ActiveCampaign, Databricks, Discourse, Elastic, Freshdesk, Freshservice,
Ghost, Grafana, Gravity Forms, Grist, Jenkins, Jira, Metabase, Odoo, ServiceNow, Shopify,
Snowflake, Strapi, Supabase, Upstash, WooCommerce, WordPress, Zendesk) add a `dependency`
check for the tenant's own site. Credential checks come free: the runtime derives an
`auth:<method>` check from each Auth `test` hook.

Status hosts stay off every app's main egress allowlist — a `service` check widens egress
for its own worker only, which is safe precisely because such a check is never signed.

Per-app detail, including why each probe was chosen over the obvious alternatives, is in
`apps/<app>/README.md`, indexed in [HEALTHCHECKS.md](HEALTHCHECKS.md).

[health-rfc]: https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md

## Layout

```
w6w-apps/
├── w6w-pack.json           # top-level pack manifest — the registry entry point
├── apps/                   # every App lives here
│   └── <app>/              # one dir per App
│       ├── README.md       # usage + health check (status, probe, quota)
│       ├── package.json    # manifest (w6w field)
│       ├── deno.json
│       ├── tsconfig.json
│       ├── index.ts
│       ├── assets/icon.{svg,png}
│       ├── auth/*.ts
│       ├── actions/*.ts
│       ├── health/*.ts      # declared health checks (service, quota, dependency)
│       ├── lib/*.ts
│       └── tests/
└── _tools/                 # scaffolding + porting helpers (not shipped)
```

## Contributing

Each app has a `deno.json` with local tasks:

```sh
cd apps/<app>
deno task test
deno task check
deno task lint
```

Before opening a PR, run the pack-wide conformance auditor from the repo root.
It validates every app against `core`'s own `@w6w/validator`, rebuilds each
manifest the way the runtime's loader does, and source-scans for the sandbox
rules that are only visible in code — global `fetch`, `Deno.*`, credentials
handled outside an auth `sign` hook, and hosts called but absent from
`w6w.network.allow`:

```sh
deno run --no-check -A _tools/audit.ts          # every app
deno run --no-check -A _tools/audit.ts slack    # one app
deno run --no-check -A _tools/audit.ts --json   # machine-readable
```

It exits non-zero on any error. Warnings flag optional-but-recommended
metadata (`output`, `idempotent`, a unit test per action).

Ship changes through a PR against `w6w-io/w6w-apps` from a personal fork —
never push directly to `main` here.

## Spec

- Pack manifest shape: `PackManifest` in `@w6w/types` (see `w6w-io/w6w-core`).
- Pack install mechanics: `registerPack()` in `@w6w/registry` (see
  `w6w-io/w6w-registry`).
