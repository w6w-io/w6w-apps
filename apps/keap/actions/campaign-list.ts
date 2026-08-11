import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/campaigns` — List Campaigns.
 *
 * The name filter is a **contains** match, not equality, despite using the `==`
 * operator: "The search will look for the text anywhere in the campaign name."
 *
 * `order_by`'s field names are the odd ones out across this whole API — they
 * are lowercase and unseparated (`publisheddate`, `completedContactCount`,
 * `activeContacts`, `datecreated`, `lastupdated`), where every other resource
 * uses snake_case. `create_time` is not among them.
 *
 * Note this returns campaign *headers* only. The sequences a campaign contains
 * come from `GET /rest/v2/campaigns/{campaign_id}/sequences`, which is what
 * Add Contacts to Sequence needs a `sequence_id` from.
 */
interface Input {
  name?: string;
  orderBy?: string;
  pageSize?: number;
  pageToken?: string;
}

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  title: "List Campaigns",
  resource: "campaign",
  description: "List marketing campaigns, with their active and completed contact counts.",
  params: [
    {
      key: "name",
      label: "Name contains",
      type: "string",
      hint: "Matches anywhere in the campaign name, not just the start.",
    },
    orderByParam(
      "One of `name`, `publisheddate`, `id`, `completedContactCount`, `activeContacts`, " +
        "`datecreated`, `lastupdated`, plus `asc` or `desc`. These spellings are Keap's own and " +
        "differ from every other resource.",
    ),
    ...pageParams(),
  ],
  output: [
    { key: "campaigns", type: "array", label: "Campaigns" },
    { key: "count", type: "number", label: "Campaigns returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([eq("name", input.name)]);
    const client = new KeapClient(ctx);
    const body = await client.json<{ campaigns?: unknown[]; next_page_token?: string }>(
      `${V2}/campaigns`,
      {
        query: {
          filter,
          order_by: input.orderBy,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );
    const campaigns = body?.campaigns ?? [];
    return { campaigns, count: campaigns.length, nextPageToken: nextPageToken(body) };
  },
};

export default campaignList;
