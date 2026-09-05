import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { includeParam, pageQuery, paginationParams } from "../lib/params.ts";

/** `GET /v1/customers` — filter parameters documented: `store_id`, `email`. */
interface Input {
  storeId?: string;
  email?: string;
  include?: string;
  pageNumber?: number;
  pageSize?: number;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "List customers, optionally filtered by store or email.",
  params: [
    { key: "storeId", label: "Store ID", type: "string", hint: "Filter to one store." },
    { key: "email", label: "Email", type: "string", hint: "Filter to an exact email address." },
    includeParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Customers" },
    { key: "meta", type: "object", label: "Pagination info" },
    { key: "links", type: "object", label: "first/last/next/prev page URLs" },
  ],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/customers", {
      query: {
        "filter[store_id]": input.storeId,
        "filter[email]": input.email,
        include: input.include,
        ...pageQuery(input),
      },
    });
  },
};

export default customerList;
