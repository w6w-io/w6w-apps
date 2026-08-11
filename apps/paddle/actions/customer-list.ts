import type { ActionDefinition } from "@w6w/types";
import { PaddleClient, toList } from "../lib/client.ts";
import { entityStatusOptions, idsParam, orderByParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /customers` — list or find customers.
 *
 * Paddle offers two different ways to look a customer up by address and they
 * are not interchangeable: `email` matches **exactly** and takes up to 100
 * values, while `search` is a fuzzy match across `id`, `name` and `email`. The
 * vendor explicitly recommends `email` for precise matching, so both are
 * exposed and the hint says which to reach for.
 */
interface Input {
  ids?: string;
  email?: string;
  search?: string;
  status?: string[] | string;
  orderBy?: string;
  perPage?: number;
  after?: string;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "List customers, or find one by exact email address.",
  params: [
    idsParam,
    {
      key: "email",
      label: "Email",
      type: "string",
      hint:
        "Exact match — the reliable way to find one customer. Comma-separated for several (max " +
        "100).",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      validation: { maxLength: 100 },
      hint: "Fuzzy match across id, name and email. Use Email when you know the address.",
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: entityStatusOptions,
      hint: "Paddle returns only `active` customers when this is left empty.",
    },
    orderByParam("`id`"),
    ...paginationParams("Default 50, maximum 200."),
  ],
  output: [
    { key: "data", type: "array", label: "Customers" },
    { key: "meta", type: "object", label: "Request id and pagination cursor" },
  ],

  execute(input, ctx) {
    return new PaddleClient(ctx).envelope("/customers", {
      query: {
        id: toList(input.ids),
        email: toList(input.email),
        search: input.search,
        status: toList(input.status),
        order_by: input.orderBy,
        per_page: input.perPage,
        after: input.after,
      },
    });
  },
};

export default customerList;
