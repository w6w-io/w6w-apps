import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  page?: number;
  onPage?: number;
  search?: string;
}

interface AdminListClientEntity {
  data: unknown[];
  metadata?: { items_count?: number; pages_count?: number; page?: number; on_page?: number };
}

/**
 * `GET /admin/clients` — genuinely paginated (`{data, metadata}`), unlike
 * `booking-get-many`, `service-get-many`, `provider-get-many` and
 * `location-get-many`, which all document the same "wrapped into paginated
 * result" prose but return a bare array. This is the one list action in the
 * app whose response actually carries `metadata.pages_count`.
 */
const clientGetMany: ActionDefinition<Input, AdminListClientEntity> = {
  key: "client-get-many",
  type: "read",
  resource: "client",
  title: "List Clients",
  description: "Search clients (GET /admin/clients).",
  params: [
    { key: "search", label: "Search", type: "string" },
    { key: "page", label: "Page", type: "number", advanced: true },
    { key: "onPage", label: "Items per page", type: "number", advanced: true },
  ],
  output: [
    { key: "data", type: "array", label: "Clients" },
    { key: "metadata.items_count", type: "number", label: "Total items" },
    { key: "metadata.pages_count", type: "number", label: "Total pages" },
  ],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    return client.request<AdminListClientEntity>("/admin/clients", {
      query: {
        page: input.page,
        on_page: input.onPage,
        "filter[search]": input.search,
      },
    });
  },
};

export default clientGetMany;
