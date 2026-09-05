import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  search?: string;
}

/** `GET /admin/services` — the bookable services this company offers. */
const serviceGetMany: ActionDefinition<Input, unknown[]> = {
  key: "service-get-many",
  type: "read",
  resource: "service",
  title: "List Services",
  description: "List services (GET /admin/services).",
  params: [
    { key: "search", label: "Search", type: "string" },
  ],
  output: [{ key: "", type: "array", label: "Services" }],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    return client.request<unknown[]>("/admin/services", {
      query: { "filter[search]": input.search },
    });
  },
};

export default serviceGetMany;
