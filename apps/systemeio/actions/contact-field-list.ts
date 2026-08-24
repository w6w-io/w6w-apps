import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

/** `GET /api/contact_fields` — no query parameters at all, per the OpenAPI document. */
const contactFieldList: ActionDefinition<Record<string, never>> = {
  key: "contact-field-list",
  type: "read",
  resource: "contact-field",
  title: "List Contact Fields",
  description: "Retrieve the collection of custom ContactField definitions.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Contact fields" },
    { key: "hasMore", type: "boolean", label: "Whether another page is available" },
  ],

  async execute(_input, ctx) {
    return await new SystemeClient(ctx).get("/api/contact_fields");
  },
};

export default contactFieldList;
