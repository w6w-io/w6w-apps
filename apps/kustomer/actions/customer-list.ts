import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/params.ts";

interface Input {
  page?: number;
  pageSize?: number;
  sort?: string;
}

/** `GET /v1/customers` — verified against the Core Resources OAS. */
const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "read",
  resource: "customer",
  title: "List Customers",
  description: "Page through customer records.",
  params: [
    ...pagination,
    {
      key: "sort",
      label: "Sort",
      type: "string",
      advanced: true,
      hint: "A field name, e.g. `updatedAt`. Prefix with `-` for descending.",
    },
  ],
  output: listOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).json("/customers", {
      query: { page: input.page, pageSize: input.pageSize, sort: input.sort },
    });
  },
};

export default customerList;
