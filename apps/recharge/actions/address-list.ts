import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { paginationParams, timestampFilterParams, timestampFilterQuery } from "../lib/params.ts";

interface Input {
  customerId?: string;
  discountCode?: string;
  discountId?: string;
  ids?: string;
  isActive?: boolean;
  limit?: number;
  cursor?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
}

/**
 * `GET /addresses` — list addresses. Scope: `read_customers`.
 * Response envelope: `{"addresses": [...], "next_cursor", "previous_cursor"}`.
 */
const addressList: ActionDefinition<Input> = {
  key: "address-list",
  type: "read",
  resource: "address",
  title: "List Addresses",
  description: "Return addresses from the store, optionally filtered to one customer.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string" },
    { key: "discountCode", label: "Discount code", type: "string" },
    { key: "discountId", label: "Discount ID", type: "string" },
    { key: "ids", label: "IDs", type: "string", hint: "Comma-separated address ids." },
    { key: "isActive", label: "Active only", type: "boolean" },
    ...paginationParams(50),
    ...timestampFilterParams("Address"),
  ],
  output: [
    { key: "items", type: "array", label: "Addresses" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "previousCursor", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    const page = await client.list("/addresses", "addresses", {
      query: compact({
        customer_id: input.customerId,
        discount_code: input.discountCode,
        discount_id: input.discountId,
        ids: input.ids,
        is_active: input.isActive,
        limit: input.limit,
        cursor: input.cursor,
        ...timestampFilterQuery(input),
      }),
    });
    return { items: page.items, nextCursor: page.nextCursor, previousCursor: page.previousCursor };
  },
};

export default addressList;
