import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { customerIdParam, paginationParams, testmodeParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  from?: string;
  limit?: number;
  testmode?: boolean;
}

const mandateList: ActionDefinition<Input> = {
  key: "mandate-list",
  type: "search",
  resource: "mandate",
  title: "List Mandates",
  description: "Retrieve a cursor-paginated list of mandates for one customer.",
  params: [customerIdParam(), ...paginationParams(), testmodeParam],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Mandates" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      `/customers/${encodeURIComponent(input.customerId)}/mandates`,
      compact({ from: input.from, limit: input.limit, testmode: input.testmode }),
    );
    return { count: unwrapList(body, "mandates").length, items: unwrapList(body, "mandates") };
  },
};

export default mandateList;
