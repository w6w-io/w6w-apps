import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { paginationParams, profileIdParam, testmodeParam } from "../lib/params.ts";

/** `GET /v2/subscriptions` — every subscription across the account (or profile), not per-customer. */
interface Input {
  from?: string;
  limit?: number;
  profileId?: string;
  testmode?: boolean;
}

const subscriptionListAll: ActionDefinition<Input> = {
  key: "subscription-list-all",
  type: "search",
  resource: "subscription",
  title: "List All Subscriptions",
  description:
    "Retrieve a cursor-paginated list of subscriptions across the whole account (or profile).",
  params: [...paginationParams(), profileIdParam, testmodeParam],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Subscriptions" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      "/subscriptions",
      compact({
        from: input.from,
        limit: input.limit,
        profileId: input.profileId,
        testmode: input.testmode,
      }),
    );
    return {
      count: unwrapList(body, "subscriptions").length,
      items: unwrapList(body, "subscriptions"),
    };
  },
};

export default subscriptionListAll;
