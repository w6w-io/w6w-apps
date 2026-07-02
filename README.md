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

| App | Auth | Actions |
|-----|------|--------:|
| airtable | personal-access-token, oauth2, api-key (deprecated) | 10 |
| anthropic | api-key | 14 |
| asana | access-token, oauth2 | 22 |
| bitbucket | basic, access-token | 12 |
| brevo | api-key | 15 |
| contentful | access-token | 10 |
| discord | bot-token, oauth2 | 19 |
| dropbox | access-token, oauth2 | 12 |
| eventbrite | personal-token, oauth2 | 10 |
| facebook-lead-ads | oauth2 | 2 |
| gmail | oauth2, service-account | 25 |
| google-calendar | oauth2, service-account | 8 |
| google-docs | oauth2, service-account | 20 |
| google-drive | oauth2, service-account | 18 |
| google-sheets | oauth2, service-account | 12 |
| hubspot | private-app-token, oauth2, api-key | 42 |
| klaviyo | api-key | 23 |
| mailchimp | api-key, oauth2 | 14 |
| mistral | api-key | 4 |
| notion | internal-secret, oauth2 | 17 |
| openai | api-key | 13 |
| sendgrid | api-key | 10 |
| slack | access-token, oauth2 | 47 |
| twilio | basic | 2 |
| wordpress | basic, oauth2 | 15 |

Icons are the vendors' own marks — copied verbatim from n8n's `nodes-base` for
the apps ported from it, and fetched from each vendor's brand page for the
apps built from scratch. See individual `assets/icon.*` for the exact source.

## Layout

```
w6w-apps/
├── w6w-pack.json           # top-level pack manifest — the registry entry point
├── apps/                   # every App lives here
│   └── <app>/              # one dir per App
│       ├── package.json    # manifest (w6w field)
│       ├── deno.json
│       ├── tsconfig.json
│       ├── index.ts
│       ├── assets/icon.{svg,png}
│       ├── auth/*.ts
│       ├── actions/*.ts
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
```

Ship changes through a PR against `w6w-io/w6w-apps` from a personal fork —
never push directly to `main` here.

## Spec

- Pack manifest shape: `PackManifest` in `@w6w/types` (see `w6w-io/w6w-core`).
- Pack install mechanics: `registerPack()` in `@w6w/registry` (see
  `w6w-io/w6w-registry`).
