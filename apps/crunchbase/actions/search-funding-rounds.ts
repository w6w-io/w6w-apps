import type { ActionDefinition } from "@w6w/types";
import { CrunchbaseClient } from "../lib/client.ts";
import { buildSearchBody, SEARCH_BODY_PARAMS, SEARCH_OUTPUT } from "../lib/search.ts";

/**
 * `POST /data/searches/funding_rounds` — verified against Crunchbase's
 * OpenAPI document (`FundingRoundEntitySearch`, `allOf` [`EntitySearch`, a
 * `field_ids` override typed against `FundingRoundFieldId`: `announced_on`,
 * `money_raised`, `investment_type`, `investor_identifiers`,
 * `lead_investor_identifiers`, `pre_money_valuation`, `post_money_valuation`,
 * …).
 *
 * **Not included in the Basic license tier** (`docs/crunchbase-basic-using-api`
 * lists only three Basic endpoints and this is not one of them) — a Basic key
 * 403s here even though it works for organization search.
 *
 * There is no country/region field on funding rounds directly; Crunchbase's
 * own FAQ (`docs/api-faqs`) answers "how do I find funds/rounds in a country"
 * by querying `funded_organization_location` on this same endpoint rather
 * than a `/searches/funds` location filter, since funds don't carry one.
 */
const action: ActionDefinition = {
  key: "search-funding-rounds",
  type: "search",
  resource: "funding-rounds",
  title: "Search Funding Rounds",
  description: "Search Crunchbase funding rounds.",
  params: SEARCH_BODY_PARAMS,
  output: SEARCH_OUTPUT,

  async execute(input, ctx) {
    const body = buildSearchBody(input as Record<string, unknown>);
    ctx.log("info", "Crunchbase funding round search", {
      fieldCount: (body.field_ids as string[]).length,
    });
    return await new CrunchbaseClient(ctx).request(`/searches/funding_rounds`, {
      method: "POST",
      body,
    });
  },
};

export default action;
