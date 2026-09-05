import type { ActionDefinition } from "@w6w/types";
import { CrunchbaseClient } from "../lib/client.ts";
import { buildSearchBody, SEARCH_BODY_PARAMS, SEARCH_OUTPUT } from "../lib/search.ts";

/**
 * `POST /data/searches/people` — verified against Crunchbase's OpenAPI
 * document (`PersonEntitySearch`, `allOf` [`EntitySearch`, a `field_ids`
 * override typed against `PersonFieldId`, 52 fields — founders, investors,
 * job titles, education).
 *
 * **Not included in the Basic license tier** — Basic only reaches autocomplete
 * plus organization search/lookup (`docs/crunchbase-basic-using-api`), so a
 * Basic-tier key gets a 403 here even though the key itself is valid.
 */
const action: ActionDefinition = {
  key: "search-people",
  type: "search",
  resource: "people",
  title: "Search People",
  description: "Search Crunchbase people (founders, investors, executives).",
  params: SEARCH_BODY_PARAMS,
  output: SEARCH_OUTPUT,

  async execute(input, ctx) {
    const body = buildSearchBody(input as Record<string, unknown>);
    ctx.log("info", "Crunchbase person search", {
      fieldCount: (body.field_ids as string[]).length,
    });
    return await new CrunchbaseClient(ctx).request(`/searches/people`, {
      method: "POST",
      body,
    });
  },
};

export default action;
