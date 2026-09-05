import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /ar/customers` — every accounts-receivable customer. */
interface Input {
  limit?: number;
  order?: "asc" | "desc";
  startAfter?: string;
  endBefore?: string;
}

interface CustomersResponse {
  customers?: unknown[];
  page?: { nextPage?: string; previousPage?: string };
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "List every accounts-receivable customer (invoice recipients this organization bills).",
  params: paginationParams(1000, "asc"),
  output: [
    { key: "items", type: "array", label: "Customers" },
    { key: "nextPage", type: "string", label: "Cursor for the next page" },
    { key: "previousPage", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const body = await new MercuryClient(ctx).json<CustomersResponse>("/ar/customers", {
      query: {
        limit: input.limit,
        order: input.order,
        start_after: input.startAfter,
        end_before: input.endBefore,
      },
    });
    return {
      items: body?.customers ?? [],
      nextPage: body?.page?.nextPage,
      previousPage: body?.page?.previousPage,
    };
  },
};

export default customerList;
