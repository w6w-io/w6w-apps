import type { ActionDefinition } from "@w6w/types";
import { TapfiliateClient } from "../lib/client.ts";

/** `GET /affiliate-groups/` */
const affiliateGroupList: ActionDefinition<Record<string, never>> = {
  key: "affiliate-group-list",
  type: "read",
  resource: "affiliate-group",
  title: "List Affiliate Groups",
  description: "List all affiliate groups on the account.",
  params: [],
  output: [{ key: "items", type: "array", label: "Affiliate groups" }],

  async execute(_input, ctx) {
    const items = await new TapfiliateClient(ctx).json("/affiliate-groups/");
    return { items };
  },
};

export default affiliateGroupList;
