import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { pagination, statusFilter } from "../lib/params.ts";

interface Input {
  clientId?: string;
  status?: string[];
  page?: number;
  perPage?: number;
}

/** `GET /api/v1/quotes` — verified against `getQuotes`. */
const quoteGetMany: ActionDefinition<Input> = {
  key: "quote-get-many",
  type: "search",
  resource: "quote",
  title: "List Quotes",
  description: "List quotes, optionally scoped to one client.",
  params: [
    { key: "clientId", label: "Client ID", type: "string" },
    statusFilter,
    ...pagination,
  ],
  output: [{ key: "data", type: "array", label: "Quotes" }],

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/quotes", {
      query: {
        client_id: input.clientId,
        status: input.status?.length ? input.status.join(",") : undefined,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default quoteGetMany;
