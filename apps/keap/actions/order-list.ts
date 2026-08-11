import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/orders` — List orders.
 *
 * The date clauses here are `created_since_time` / `created_until_time` and
 * `modified_since_time` / `modified_until_time` — a fourth spelling of the same
 * idea, after contacts' `start_update_time`, tasks' `since_time` and emails'
 * `start_created_time`. There is no shared convention on this API; each
 * resource's own list is what to read.
 *
 * `paid` is one of the very few boolean clauses in the filter grammar.
 */
interface Input {
  contactId?: string;
  productId?: string;
  paid?: string;
  createdSinceTime?: string;
  createdUntilTime?: string;
  modifiedSinceTime?: string;
  filter?: string;
  orderBy?: string;
  pageSize?: number;
  pageToken?: string;
}

const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "search",
  title: "List Orders",
  resource: "order",
  description: "Search orders by contact, product, paid state or created/modified window.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string" },
    { key: "productId", label: "Product ID", type: "string" },
    {
      key: "paid",
      label: "Paid",
      type: "select",
      options: [
        { value: "true", label: "Paid only" },
        { value: "false", label: "Unpaid only" },
      ],
      hint: "Leave empty for both.",
    },
    { key: "createdSinceTime", label: "Created since", type: "datetime" },
    { key: "createdUntilTime", label: "Created until", type: "datetime" },
    { key: "modifiedSinceTime", label: "Modified since", type: "datetime", advanced: true },
    filterParam,
    orderByParam("One of `id`, `order_time`, `modification_time`, plus `asc` or `desc`."),
    ...pageParams(),
  ],
  output: [
    { key: "orders", type: "array", label: "Orders" },
    { key: "count", type: "number", label: "Orders returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([
      eq("contact_id", input.contactId),
      eq("product_id", input.productId),
      eq("paid", input.paid),
      eq("created_since_time", input.createdSinceTime),
      eq("created_until_time", input.createdUntilTime),
      eq("modified_since_time", input.modifiedSinceTime),
      input.filter,
    ]);
    const client = new KeapClient(ctx);
    const body = await client.json<{ orders?: unknown[]; next_page_token?: string }>(
      `${V2}/orders`,
      {
        query: {
          filter,
          order_by: input.orderBy,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );
    const orders = body?.orders ?? [];
    return { orders, count: orders.length, nextPageToken: nextPageToken(body) };
  },
};

export default orderList;
