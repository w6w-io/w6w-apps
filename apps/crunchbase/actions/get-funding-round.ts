import type { ActionDefinition } from "@w6w/types";
import { CrunchbaseClient } from "../lib/client.ts";
import { entityParams, entityQuery } from "../lib/entity.ts";

/**
 * `GET /data/entities/funding_rounds/{entity_id}` — verified against
 * Crunchbase's OpenAPI document (`operationId: getFundingRound`, present
 * only in the Core/Advanced Financials package schema, not the Firmographics
 * one — funding data is a separately licensed tier from company profile
 * data).
 *
 * **Not included in the Basic license tier** (`docs/crunchbase-basic-using-api`).
 */
const action: ActionDefinition = {
  key: "get-funding-round",
  type: "read",
  resource: "funding-rounds",
  title: "Get Funding Round",
  description: "Look up one funding round by UUID or permalink.",
  params: entityParams(
    "33 fields available — e.g. announced_on, money_raised, investment_type, " +
      "funded_organization_identifier, investor_identifiers, lead_investor_identifiers, " +
      "pre_money_valuation, post_money_valuation.",
    "fields, investments, investors, lead_investors, organization, partners, press_references.",
  ),
  output: [
    { key: "properties", type: "object", label: "Funding round fields" },
    { key: "cards", type: "object", label: "Requested relationship cards" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const entityId = String(p.entityId ?? "").trim();
    if (!entityId) throw new Error("`entityId` is required");

    ctx.log("info", "Crunchbase funding round lookup", { entityId });

    return await new CrunchbaseClient(ctx).request(
      `/entities/funding_rounds/${encodeURIComponent(entityId)}`,
      { query: entityQuery(p) },
    );
  },
};

export default action;
