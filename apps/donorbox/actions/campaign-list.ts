import type { ActionDefinition } from "@w6w/types";
import { DonorboxClient } from "../lib/client.ts";
import { compact, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  id?: number;
  name?: string;
  page?: number;
  per_page?: number;
  order?: string;
}

/**
 * `GET /api/v1/campaigns`.
 *
 * The "Campaign Filters" section of the README names its id filter
 * `campaign_id` in prose but its own worked example sends `id`:
 * `{GET} /api/v1/campaigns?id=XX`. Since a query parameter is wire format and
 * the example is what a reader would actually copy, this action sends `id` —
 * the discrepancy is not resolved further because the source repo carries no
 * OpenAPI/Postman spec to cross-check it against.
 */
const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description: "List campaigns on the connected Donorbox organization.",
  params: [
    {
      key: "id",
      label: "Campaign ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Narrow to one campaign by its Donorbox id.",
    },
    {
      key: "name",
      label: "Campaign name",
      type: "string",
      hint: "Filter by campaign name.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Campaigns" },
  ],

  async execute(input, ctx) {
    const data = await new DonorboxClient(ctx).list("/campaigns", {
      query: compact({ id: input.id, name: input.name, ...paginationQuery(input) }),
    });
    return { data };
  },
};

export default campaignList;
