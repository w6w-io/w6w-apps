import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { pagingParams } from "../lib/params.ts";

interface Input {
  sort?: "asc" | "desc";
  fromindex?: number;
  range?: number;
}

interface Output {
  lists: Array<Record<string, unknown>>;
}

/**
 * `GET /getmailinglists` — verified against
 * `https://www.zoho.com/campaigns/help/developers/get-mailing-lists.html`.
 * The payload is inlined at the top level under `list_of_details`, not
 * wrapped in a uniform resource key (see `lib/client.ts`'s module doc).
 */
const listList: ActionDefinition<Input, Output> = {
  key: "list-list",
  type: "read",
  resource: "list",
  title: "List Mailing Lists",
  description: "List every mailing list in this Zoho Campaigns account.",
  params: pagingParams,
  output: [{ key: "lists", type: "array", label: "Mailing lists" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<
      { list_of_details?: Array<Record<string, unknown>> }
    >("getmailinglists", {
      query: { sort: input.sort, fromindex: input.fromindex, range: input.range },
    });
    return { lists: body.list_of_details ?? [] };
  },
};

export default listList;
