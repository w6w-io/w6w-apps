import type { ActionDefinition } from "@w6w/types";
import { CrunchbaseClient } from "../lib/client.ts";
import { buildSearchBody, SEARCH_BODY_PARAMS, SEARCH_OUTPUT } from "../lib/search.ts";

/**
 * `POST /data/searches/organizations` — verified against Crunchbase's OpenAPI
 * document (`OrganizationEntitySearch`, `allOf` [`EntitySearch`, a
 * `field_ids`/`query` override typed against `OrganizationFieldId` /
 * `OrganizationSearchPredicate`]). One of the three endpoints Crunchbase's
 * cheapest ("Basic") license tier includes (`docs/crunchbase-basic-using-api`),
 * so it works on every package.
 *
 * See `lib/search.ts` for why `query`/`order` are raw JSON rather than form
 * fields, and for the money-field `{value, currency}` gotcha.
 */
const action: ActionDefinition = {
  key: "search-organizations",
  type: "search",
  resource: "organizations",
  title: "Search Organizations",
  description: "Search Crunchbase organizations (companies, investors, schools).",
  params: SEARCH_BODY_PARAMS,
  output: SEARCH_OUTPUT,

  async execute(input, ctx) {
    const body = buildSearchBody(input as Record<string, unknown>);
    ctx.log("info", "Crunchbase organization search", {
      fieldCount: (body.field_ids as string[]).length,
    });
    return await new CrunchbaseClient(ctx).request(`/searches/organizations`, {
      method: "POST",
      body,
    });
  },
};

export default action;
