import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { paginationParams, profileIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  from?: string;
  limit?: number;
  profileId?: string;
  testmode?: boolean;
}

const paymentList: ActionDefinition<Input> = {
  key: "payment-list",
  type: "search",
  resource: "payment",
  title: "List Payments",
  description: "Retrieve a cursor-paginated list of payments. Maximum 250 per page.",
  params: [...paginationParams(), profileIdParam, testmodeParam],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Payments" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      "/payments",
      compact({
        from: input.from,
        limit: input.limit,
        profileId: input.profileId,
        testmode: input.testmode,
      }),
    );
    return { count: unwrapList(body, "payments").length, items: unwrapList(body, "payments") };
  },
};

export default paymentList;
