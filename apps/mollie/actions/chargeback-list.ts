import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { paginationParams, profileIdParam, sortParam, testmodeParam } from "../lib/params.ts";

interface Input {
  from?: string;
  limit?: number;
  sort?: "asc" | "desc";
  profileId?: string;
  testmode?: boolean;
}

const chargebackList: ActionDefinition<Input> = {
  key: "chargeback-list",
  type: "search",
  resource: "chargeback",
  title: "List All Chargebacks",
  description:
    "Retrieve a cursor-paginated list of chargebacks across the whole account (or profile).",
  params: [...paginationParams(), sortParam, profileIdParam, testmodeParam],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Chargebacks" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      "/chargebacks",
      compact({
        from: input.from,
        limit: input.limit,
        sort: input.sort,
        profileId: input.profileId,
        testmode: input.testmode,
      }),
    );
    return {
      count: unwrapList(body, "chargebacks").length,
      items: unwrapList(body, "chargebacks"),
    };
  },
};

export default chargebackList;
