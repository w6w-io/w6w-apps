import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient, jsonObject } from "../lib/client.ts";
import { page, perPage, searchFilters } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
  search?: unknown;
}

const clientList: ActionDefinition<Input> = {
  key: "client-list",
  type: "read",
  resource: "client",
  title: "List Clients",
  description: "List clients (the people and organizations you send invoices to).",
  params: [page, perPage, searchFilters],
  output: [{ key: "clients", type: "array", label: "Clients" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request("accounting", "/users/clients", {
      query: { page: input.page ?? 1, per_page: input.perPage },
      search: jsonObject(input.search, "search"),
    });
  },
};

export default clientList;
