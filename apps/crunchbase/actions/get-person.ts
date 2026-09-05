import type { ActionDefinition } from "@w6w/types";
import { CrunchbaseClient } from "../lib/client.ts";
import { entityParams, entityQuery } from "../lib/entity.ts";

/**
 * `GET /data/entities/people/{entity_id}` — verified against Crunchbase's
 * OpenAPI document (`operationId: getPerson`).
 *
 * **Not included in the Basic license tier** — Basic reaches only
 * autocomplete plus organization search/lookup (`docs/crunchbase-basic-using-api`).
 */
const action: ActionDefinition = {
  key: "get-person",
  type: "read",
  resource: "people",
  title: "Get Person",
  description: "Look up one person by UUID or permalink.",
  params: entityParams(
    "52 fields available — e.g. name, first_name, last_name, primary_organization, " +
      "primary_job_title, linkedin, num_founded_organizations.",
    "degrees, event_appearances, fields, founded_organizations, jobs, " +
      "participated_funding_rounds, participated_funds, participated_investments, " +
      "partner_funding_rounds, partner_investments, press_references, primary_job, " +
      "primary_organization.",
  ),
  output: [
    { key: "properties", type: "object", label: "Person fields" },
    { key: "cards", type: "object", label: "Requested relationship cards" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const entityId = String(p.entityId ?? "").trim();
    if (!entityId) throw new Error("`entityId` is required");

    ctx.log("info", "Crunchbase person lookup", { entityId });

    return await new CrunchbaseClient(ctx).request(
      `/entities/people/${encodeURIComponent(entityId)}`,
      { query: entityQuery(p) },
    );
  },
};

export default action;
