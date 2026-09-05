import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";
import type { TicketTailorListPage } from "../lib/client.ts";

/** `GET /v1/discounts` — verified against `getDiscountList`, 2026-09-05. */
interface Input {
  code?: string;
  limit?: number;
}

const discountList: ActionDefinition<Input> = {
  key: "discount-list",
  type: "read",
  resource: "discount",
  title: "List Discounts",
  description: "List discount codes, paginated.",
  params: [
    { key: "code", label: "Discount code", type: "string" },
    { key: "limit", label: "Limit", type: "number" },
  ],
  output: [{ key: "data", type: "array", label: "Discounts" }],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<TicketTailorListPage<unknown>>("/discounts", {
      query: { code: input.code, limit: input.limit },
    });
  },
};

export default discountList;
