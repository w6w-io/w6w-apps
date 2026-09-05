import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

/**
 * `GET /admin/locations` — provider locations (the "locations" custom
 * feature). Takes no filters per the OpenAPI document.
 */
const locationGetMany: ActionDefinition<Record<string, never>, unknown[]> = {
  key: "location-get-many",
  type: "read",
  resource: "location",
  title: "List Locations",
  description: "List provider locations (GET /admin/locations).",
  params: [],
  output: [{ key: "", type: "array", label: "Locations" }],

  execute(_input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    return client.request<unknown[]>("/admin/locations");
  },
};

export default locationGetMany;
