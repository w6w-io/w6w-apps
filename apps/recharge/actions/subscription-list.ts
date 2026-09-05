import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { paginationParams, timestampFilterParams, timestampFilterQuery } from "../lib/params.ts";

interface Input {
  customerId?: string;
  addressId?: string;
  addressIds?: string;
  externalVariantId?: string;
  ids?: string;
  status?: string;
  limit?: number;
  cursor?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
}

/**
 * `GET /subscriptions` — list subscriptions. Scope: `read_subscriptions`.
 * Response envelope: `{"subscriptions": [...], "next_cursor", "previous_cursor"}`.
 * `address_id` and `address_ids` are documented mutually exclusive.
 */
const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "read",
  resource: "subscription",
  title: "List Subscriptions",
  description: "Return a list of subscriptions in your Recharge store.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string" },
    {
      key: "addressId",
      label: "Address ID",
      type: "string",
      hint: "Not compatible with Address IDs.",
    },
    {
      key: "addressIds",
      label: "Address IDs",
      type: "string",
      hint: "Comma-separated. Not compatible with Address ID.",
    },
    { key: "externalVariantId", label: "External variant ID", type: "string" },
    { key: "ids", label: "IDs", type: "string", hint: "Comma-separated subscription ids." },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "cancelled", label: "Cancelled" },
        { value: "expired", label: "Expired" },
      ],
    },
    ...paginationParams(50),
    ...timestampFilterParams("Subscription"),
  ],
  output: [
    { key: "items", type: "array", label: "Subscriptions" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "previousCursor", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    const page = await client.list("/subscriptions", "subscriptions", {
      query: compact({
        customer_id: input.customerId,
        address_id: input.addressId,
        address_ids: input.addressIds,
        external_variant_id: input.externalVariantId,
        ids: input.ids,
        status: input.status,
        limit: input.limit,
        cursor: input.cursor,
        ...timestampFilterQuery(input),
      }),
    });
    return { items: page.items, nextCursor: page.nextCursor, previousCursor: page.previousCursor };
  },
};

export default subscriptionList;
