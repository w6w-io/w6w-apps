import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient, jsonObject } from "../lib/client.ts";
import { page, perPage, searchFilters } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
  search?: unknown;
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "read",
  resource: "invoice",
  title: "List Invoices",
  description: "List invoices.",
  params: [page, perPage, searchFilters],
  output: [{ key: "invoices", type: "array", label: "Invoices" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request("accounting", "/invoices/invoices", {
      query: { page: input.page ?? 1, per_page: input.perPage },
      search: jsonObject(input.search, "search"),
    });
  },
};

export default invoiceList;
