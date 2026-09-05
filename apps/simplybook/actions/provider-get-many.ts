import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  search?: string;
  serviceId?: number;
}

/**
 * `GET /admin/providers` — the staff/units ("providers" in SimplyBook.me's
 * own vocabulary) who can be booked. `serviceId` narrows to only the
 * providers connected to that service.
 */
const providerGetMany: ActionDefinition<Input, unknown[]> = {
  key: "provider-get-many",
  type: "read",
  resource: "provider",
  title: "List Providers",
  description: "List providers/units (GET /admin/providers).",
  params: [
    { key: "search", label: "Search", type: "string" },
    {
      key: "serviceId",
      label: "Service ID",
      type: "number",
      hint: "Only return providers who can perform this service.",
    },
  ],
  output: [{ key: "", type: "array", label: "Providers" }],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    return client.request<unknown[]>("/admin/providers", {
      query: {
        "filter[search]": input.search,
        "filter[service_id]": input.serviceId,
      },
    });
  },
};

export default providerGetMany;
