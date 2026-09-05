import type { ActionDefinition } from "@w6w/types";
import { CrunchbaseClient } from "../lib/client.ts";
import { entityParams, entityQuery } from "../lib/entity.ts";

/**
 * `GET /data/entities/organizations/{entity_id}` — verified against
 * Crunchbase's OpenAPI document (`operationId: getOrganization`). One of the
 * three endpoints Crunchbase's Basic license tier includes
 * (`docs/crunchbase-basic-using-api`).
 *
 * `card_ids` here is the Firmographics/Core-Financials union observed across
 * the reference pages fetched 2026-09-05: `child_organizations`,
 * `child_ownerships`, `event_appearances`, `fields`, `founders`,
 * `headquarters_address`, `investors`, `ipos`, `jobs`, `parent_organization`,
 * `parent_ownership` — left as free text rather than a fixed `select` since
 * which cards a given key can actually resolve depends on its package.
 */
const action: ActionDefinition = {
  key: "get-organization",
  type: "read",
  resource: "organizations",
  title: "Get Organization",
  description: "Look up one organization by UUID or permalink.",
  params: entityParams(
    "93 fields available — see the Organization schema, e.g. name, short_description, " +
      "website, founded_on, funding_total, funding_stage, num_funding_rounds, categories.",
    "child_organizations, child_ownerships, event_appearances, fields, founders, " +
      "headquarters_address, investors, ipos, jobs, parent_organization, parent_ownership.",
  ),
  output: [
    { key: "properties", type: "object", label: "Organization fields" },
    { key: "cards", type: "object", label: "Requested relationship cards" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const entityId = String(p.entityId ?? "").trim();
    if (!entityId) throw new Error("`entityId` is required");

    ctx.log("info", "Crunchbase organization lookup", { entityId });

    return await new CrunchbaseClient(ctx).request(
      `/entities/organizations/${encodeURIComponent(entityId)}`,
      { query: entityQuery(p) },
    );
  },
};

export default action;
