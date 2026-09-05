import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, unset } from "../lib/client.ts";
import { pagination, statusFilter } from "../lib/params.ts";

interface Input {
  name?: string;
  status?: string[];
  page?: number;
  perPage?: number;
}

/** `GET /api/v1/clients` — verified against `getClients` in the OpenAPI document. */
const clientGetMany: ActionDefinition<Input> = {
  key: "client-get-many",
  type: "search",
  resource: "client",
  title: "List Clients",
  description: "List clients, optionally filtered by name.",
  params: [
    { key: "name", label: "Name", type: "string" },
    statusFilter,
    ...pagination,
  ],
  output: [{ key: "data", type: "array", label: "Clients" }],

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/clients", {
      query: {
        name: unset(input.name),
        status: input.status?.length ? input.status.join(",") : undefined,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default clientGetMany;
