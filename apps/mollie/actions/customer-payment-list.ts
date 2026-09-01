import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import {
  customerIdParam,
  paginationParams,
  profileIdParam,
  sortParam,
  testmodeParam,
} from "../lib/params.ts";

interface Input {
  customerId: string;
  from?: string;
  limit?: number;
  sort?: "asc" | "desc";
  profileId?: string;
  testmode?: boolean;
}

const customerPaymentList: ActionDefinition<Input> = {
  key: "customer-payment-list",
  type: "search",
  resource: "customer",
  title: "List Customer Payments",
  description: "Retrieve a cursor-paginated list of payments made by one customer.",
  params: [customerIdParam(), ...paginationParams(), sortParam, profileIdParam, testmodeParam],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Payments" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      `/customers/${encodeURIComponent(input.customerId)}/payments`,
      compact({
        from: input.from,
        limit: input.limit,
        sort: input.sort,
        profileId: input.profileId,
        testmode: input.testmode,
      }),
    );
    return { count: unwrapList(body, "payments").length, items: unwrapList(body, "payments") };
  },
};

export default customerPaymentList;
