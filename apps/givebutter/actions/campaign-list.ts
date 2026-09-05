import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient, type PageEnvelope } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  scope?: string;
  page?: number;
  per_page?: number;
}

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "read",
  resource: "campaign",
  title: "List Campaigns",
  description: "List all campaigns on the connected Givebutter account.",
  params: [
    {
      key: "scope",
      label: "Scope",
      type: "string",
      hint: "Givebutter documents this filter with no enum of accepted values — pass a value " +
        "only if the dashboard or support has told you one. Leave empty to list everything.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Campaigns" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).page("/campaigns", {
      query: { scope: input.scope, ...paginationQuery(input) },
    }) as PageEnvelope<unknown>;
  },
};

export default campaignList;
