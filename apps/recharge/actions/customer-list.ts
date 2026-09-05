import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { paginationParams, timestampFilterParams, timestampFilterQuery } from "../lib/params.ts";

interface Input {
  email?: string;
  hash?: string;
  externalCustomerId?: string;
  ids?: string;
  limit?: number;
  cursor?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
}

/**
 * `GET /customers` — list customers. Scope: `read_customers`.
 *
 * Response envelope is `{"customers": [...], "next_cursor", "previous_cursor"}`.
 * Cursor pagination is the only form this app uses — Recharge's own
 * page-number pagination is documented `*Deprecated` on this endpoint (still
 * capped at page 100 when used at all), and 2021-11 dropped the total-count
 * field a UI would need to build page numbers anyway.
 */
const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "read",
  resource: "customer",
  title: "List Customers",
  description: "Return a list of customers in your Recharge store.",
  params: [
    { key: "email", label: "Email", type: "string", hint: "Exact match on the customer's email." },
    { key: "hash", label: "Recharge customer hash", type: "string" },
    { key: "externalCustomerId", label: "External customer ID", type: "string" },
    {
      key: "ids",
      label: "IDs",
      type: "string",
      hint: "Comma-separated Recharge customer ids.",
    },
    ...paginationParams(50),
    ...timestampFilterParams("Customer"),
  ],
  output: [
    { key: "items", type: "array", label: "Customers" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "previousCursor", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    const page = await client.list("/customers", "customers", {
      query: compact({
        email: input.email,
        hash: input.hash,
        external_customer_id: input.externalCustomerId,
        ids: input.ids,
        limit: input.limit,
        cursor: input.cursor,
        ...timestampFilterQuery(input),
      }),
    });
    return { items: page.items, nextCursor: page.nextCursor, previousCursor: page.previousCursor };
  },
};

export default customerList;
