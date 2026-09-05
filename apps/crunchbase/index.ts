/**
 * Crunchbase — look up companies, people and funding rounds from Crunchbase's
 * licensed private-market dataset.
 *
 * Every path, parameter and required field was taken from Crunchbase's own
 * OpenAPI document, fetched 2026-09-05 from the `document.api.schema` field
 * embedded in https://data.crunchbase.com/reference's server-rendered page
 * (the "Advanced Financials Package" schema, v1.1.0, a ReadMe-hosted
 * reference whose live pages embed the actual versioned OAS files Crunchbase
 * uploads — not a static/stale mirror), cross-checked against the prose
 * guides under https://data.crunchbase.com/docs.
 *
 * Four things about this API shape this app:
 *
 *   - **It is entirely read-only.** There is no write endpoint anywhere in
 *     the document, so every action here is `read`, `search` or autocomplete
 *     (itself a `read`) — nothing needs `idempotent`.
 *   - **Auth is one header, not a query param** — `X-cb-user-key`, the only
 *     scheme the OpenAPI document declares (`ApiKeyAuthHeader`), even though
 *     Crunchbase's prose docs also describe a `user_key` query-string form.
 *     See `auth/api-key.ts`.
 *   - **License tier gates endpoints, not just fields.** The cheapest
 *     ("Basic") tier reaches exactly three endpoints — autocomplete,
 *     organization search, organization lookup — and 403s on everything
 *     else, even with a perfectly valid key
 *     (`docs/crunchbase-basic-using-api`). A workflow author on a Basic key
 *     will see `search-people`, `search-funding-rounds`, `get-person` and
 *     `get-funding-round` fail with a 403, not a 401.
 *   - **Search bodies are Crunchbase's own predicate DSL, not a flattened
 *     form.** `field_ids`/`query`/`order` are raw JSON because the field and
 *     operator vocabulary is too large to model as fixed controls (93
 *     organization fields, 20 operators) — see `lib/search.ts`, including the
 *     `{value, currency}` shape money-typed predicate values actually need.
 *
 * Deliberately out of scope:
 *   - **Every other collection the API documents** (events, event
 *     appearances, IPOs, ownerships, categories, category groups, locations,
 *     jobs, addresses, degrees, diversity spotlights, principals,
 *     acquisitions, investments, press references, funds, deleted entities).
 *     Companies, people and funding rounds are the core of what a workflow
 *     enriching a lead or researching a deal needs; the rest is real and
 *     documented but adds two dozen more near-identical search/lookup pairs
 *     without adding a new capability.
 *   - **Per-card pagination** (`/entities/{collection}/{entity_id}/cards/{card_id}`)
 *     — a card already returns up to 100 items inline via `card_ids` on the
 *     three lookup actions; paginating deeper into one relationship is a
 *     narrower need than the base lookup.
 *   - **The Metadata endpoints** (`/md/applications/crunchbase/openapi.{yaml,json}`,
 *     `/md/applications/crunchbase/fields`) — schema introspection for a
 *     client author, not data a workflow acts on.
 *   - **Deleted Entities** (`/data/deleted_entities`) — a sync/dedup concern
 *     for a data pipeline, not a workflow action.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import autocomplete from "./actions/autocomplete.ts";
import searchOrganizations from "./actions/search-organizations.ts";
import searchPeople from "./actions/search-people.ts";
import searchFundingRounds from "./actions/search-funding-rounds.ts";
import getOrganization from "./actions/get-organization.ts";
import getPerson from "./actions/get-person.ts";
import getFundingRound from "./actions/get-funding-round.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    autocomplete,
    searchOrganizations,
    searchPeople,
    searchFundingRounds,
    getOrganization,
    getPerson,
    getFundingRound,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
