import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { LIST_PARAMS, SEARCH_PARAM } from "../lib/params.ts";

/**
 * `GET /campaigns` — verified against Mautic's REST API docs
 * (`campaigns.html`, "List Campaigns"). `withContactCounts` is documented as
 * cached and left off by default since it is more expensive than a plain
 * list.
 */
const action: ActionDefinition = {
  key: "campaign-list",
  type: "read",
  resource: "campaign",
  title: "List campaigns",
  description: "List campaigns.",
  params: [
    SEARCH_PARAM,
    { key: "withContactCounts", label: "Include Contact Counts", type: "boolean", default: false },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 30);

    ctx.log("info", "listing Mautic campaigns", { returnAll });

    return await new MauticClient(ctx).requestAll(
      "/campaigns",
      "campaigns",
      {
        query: {
          search: (p.search as string) || undefined,
          withContactCounts: p.withContactCounts === true ? "true" : undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
