import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  email?: string;
  name?: string;
  externalId?: string;
  orderBy?: string;
  cursor?: string;
  limit?: number;
}

/**
 * `GET /customers` — verified against developers.gorgias.com/reference/list-customers.
 */
const customerGetMany: ActionDefinition<Input> = {
  key: "customer-get-many",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "List customers, alphabetical by name unless sorted otherwise.",
  params: [
    { key: "email", label: "Email", type: "string", row: "filter" },
    { key: "name", label: "Name", type: "string", row: "filter" },
    { key: "externalId", label: "External ID", type: "string", advanced: true },
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      default: "created_datetime:desc",
      options: [
        { value: "created_datetime:asc", label: "Created (oldest first)" },
        { value: "created_datetime:desc", label: "Created (newest first)" },
        { value: "updated_datetime:asc", label: "Updated (oldest first)" },
        { value: "updated_datetime:desc", label: "Updated (newest first)" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "data", type: "array", label: "Customers" }],

  execute(input, ctx) {
    return new GorgiasClient(ctx).request("/customers", {
      query: {
        email: unset(input.email),
        name: unset(input.name),
        external_id: unset(input.externalId),
        order_by: unset(input.orderBy),
        cursor: unset(input.cursor),
        limit: input.limit,
      },
    });
  },
};

export default customerGetMany;
