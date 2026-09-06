# folk

Groups (contact lists), People and Companies, plus account/network metadata, on **folk**
(folk.app) — a CRM built around Groups — over the **folk External API**.

- **Categories** — crm
- **Auth methods** — api-key
- **Actions** — 12
- **Health checks** — 1 (`service`) + the derived `auth:api-key`
- **Egress allowlist** — `api.folk.app`
- **Website** — https://folk.app/
- **API docs** — https://folk-external-api.readme.io/reference/getuser
- **Status page** — https://folk.instatus.com

> **Everything below was verified against folk's own OpenAPI 3.0.3 document on 2026-09-06.**
> `folk-external-api.readme.io` (ReadMe) embeds the full spec (`oasDefinition`) directly in every
> reference page's server-rendered payload — this app was built by reading that JSON document, not
> by transcribing the rendered HTML or inferring endpoints from a marketing page. All 12 operations
> across the document's 4 tags (Network, Group Person, Group Company, User) are covered — nothing
> was trimmed for scope, unlike most apps in this pack, because the vendor's own public surface is
> exactly this size. Plus a live probe of `folk.instatus.com`.

## The three things most likely to cost someone a day

### 1. Auth is `X-Api-Key`, not `Authorization: Bearer`

folk's marketing copy loosely calls this a "bearer" key in places, which would suggest
`Authorization: Bearer <key>`. The OAS document says otherwise:
`securitySchemes.ApiKeyAuth: {"type":"apiKey","in":"header","name":"X-Api-Key"}`, applied globally
to every operation — independently confirmed by the reference page's own auth widget, whose input
field DOM id is literally `APIAuth-X-Api-Key`. [`auth/api-key.ts`](auth/api-key.ts) sends a plain
`X-Api-Key: <key>` header.

### 2. Nearly everything needs a `networkId`, and nothing documents where to find one

11 of the 12 operations (everything except `GET /user`) are scoped under
`/network/{networkId}/...`. "Network" is folk's own name for what its UI elsewhere calls a
workspace. This ReadMe project has exactly 12 reference pages and no guide/getting-started pages —
there is nowhere in the public docs that says where a network's id comes from. This app asks for it
as a second required Auth field alongside the API key
([`auth/api-key.ts`](auth/api-key.ts)), and [`check-network-access`](actions/check-network-access.ts)
(`GET /network/{networkId}/check-access`) doubles as the connect-time `test` probe specifically
because it is the one endpoint built to validate both halves of the credential together — a key
that is valid for a *different* network still fails at connect time instead of failing on the
first real call.

### 3. `listUsers` ("List Members") returns folk's own teammates, not CRM contacts

`GET /network/{networkId}/users` answers `ExternalUser[]` — `id`, `fullName`, `email` — the humans
logged into this folk network. It is easy to reach for this expecting a network's contacts; those
are an entirely different, much richer shape (`ExternalGroupPerson`: emails/phones/urls/addresses/
customFields) scoped to a *group* (a contact list), not the network as a whole, and returned only
by the `person-*` actions. This app names the action
[`list-network-members`](actions/list-network-members.ts), not `list-users`, specifically to keep
the two from being confused at the point someone is picking an action.

## Two smaller vendor quirks, documented at the call site

- **`GET /user`'s documented success status is `201`, not `200`.** Almost certainly a copy-paste
  artifact in folk's own OAS (every other GET in the document uses `200`), but worth knowing before
  someone "fixes" a supposed bug in this app that isn't one. [`lib/client.ts`](lib/client.ts)'s
  `FolkClient` only ever checks `res.ok`, so no special-casing was needed —
  [`get-user.ts`](actions/get-user.ts) notes it in a comment for the next person who reads the OAS
  and is confused by the same thing.
- **`AddPersonDto`/`AddCompanyDto` declare no required fields at all — not even a name.** Creating a
  person or company with an empty body is technically valid per the schema. `person-create` and
  `company-create` leave every field optional to match, rather than inventing a requirement folk
  itself doesn't enforce; see each field's hint text.

## Auth

An **API Key** (`Settings` in your folk account — the reference doesn't say exactly where) plus the
**Network ID** the key should act on. `sign` ([`auth/api-key.ts`](auth/api-key.ts)) sets
`X-Api-Key` on every request and fills in a `__network_id__` placeholder that every scoped action's
path carries (see `NETWORK_PLACEHOLDER` in [`lib/client.ts`](lib/client.ts) for why a plain token is
used instead of the OAS's own `{networkId}` curly-brace syntax). `test` calls
`GET /network/{networkId}/check-access`, which validates both fields together and never echoes the
key back. `afterConnect` records the connected user's name/email from `GET /user` — also never the
key.

## Actions

| Action | Operation | Notes |
|---|---|---|
| [`get-user`](actions/get-user.ts) | `GET /user` | The only operation not scoped to a network. |
| [`list-groups`](actions/list-groups.ts) | `GET /network/{id}/groups` | Not paginated. First call for a `groupId`. |
| [`list-network-members`](actions/list-network-members.ts) | `GET /network/{id}/users` | folk teammates, not CRM contacts — see above. |
| [`check-network-access`](actions/check-network-access.ts) | `GET /network/{id}/check-access` | Also the auth `test` probe. |
| [`person-create`](actions/person-create.ts) | `POST .../group/{id}/person` | No idempotency key documented. |
| [`person-update`](actions/person-update.ts) | `PUT .../person/{id}` | Partial update — only set fields are sent. |
| [`person-find`](actions/person-find.ts) | `GET .../person/find/{query}` | `query` is a PATH segment, URL-encoded here. Match fields undocumented. |
| [`person-custom-fields-list`](actions/person-custom-fields-list.ts) | `GET .../person/custom-fields` | Field names/ids and option labels for `customFields`. |
| [`company-create`](actions/company-create.ts) | `POST .../group/{id}/company` | No idempotency key documented. |
| [`company-update`](actions/company-update.ts) | `PUT .../company/{id}` | Partial update — only set fields are sent. |
| [`company-find`](actions/company-find.ts) | `GET .../company/find/{query}` | Same path-segment search as `person-find`. |
| [`company-custom-fields-list`](actions/company-custom-fields-list.ts) | `GET .../company/custom-fields` | See `person-custom-fields-list`. |

None of the list endpoints (`list-groups`, `list-network-members`, the two `*-custom-fields-list`
actions) declare a page/cursor/limit parameter anywhere in the OAS — each returns its entire result
in one response.

## Health

- **`service`** — Instatus at `folk.instatus.com`. Two candidate status hosts exist for "folk":
  `status.folk.app` (folk's own domain, CNAMEd to UptimeRobot's public-status-page product, but with
  no fetchable JSON summary/component endpoint found) and `folk.instatus.com`. This app uses the
  latter because it is independently verifiable as genuinely folk's:
  `GET https://folk.instatus.com/components.json` answers real, specifically-named components —
  `"CRM"` ("Manage people, companies, deals, groups and views", folk's own product description) and
  `"folk rest API"` (an exact match for the surface this app calls), alongside `"folk website"`,
  `"Account synchronization"`, `"Messaging"` and `"Data import"`. That is the genuinely-claimed-page
  pattern this pack looks for, not the unclaimed-Statuspage-decoy pattern (a bare redirect to the
  provider's marketing page) found on some other vendors. [`health/service.ts`](health/service.ts)
  reads the `"folk rest API"` component specifically. `degraded` severity (this kind's default): a
  folk incident never hard-fails a target on its own.
- **`auth:api-key`** (derived) — `GET /network/{networkId}/check-access`. Never echoes the key back.

No `quota` check: nothing in the OAS or any reference page documents rate-limit headers, a 429
response, or any quota concept at all.

## Out of scope

The OAS document's 12 operations are covered in full — there is no larger public surface being
trimmed down. Two things are left unmodelled because the vendor's own schema leaves them
underspecified rather than because this app chose to skip them:

- **`person-find`/`company-find`'s match semantics.** The OAS documents no description of what
  `query` matches against (name vs. email vs. both, exact vs. fuzzy) — this app passes it through
  URL-encoded and does not attempt to guess or normalise it.
- **Whether `person-update`/`company-update` truly PATCH or REPLACE.** Both are documented as `PUT`
  against a schema with no required fields; this app builds the request body from only the fields a
  caller sets (see `buildPersonBody`/`buildCompanyBody` in [`lib/person.ts`](lib/person.ts) /
  [`lib/company.ts`](lib/company.ts)), on the assumption that is the safer reading, but this was not
  verified against a live credential.
