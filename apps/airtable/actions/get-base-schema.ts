import type { ActionDefinition } from "@w6w/types";
import { AirtableClient } from "../lib/client.ts";

interface Input {
  baseId: string;
  include?: string[];
}

/**
 * Get a base's table + field schema via `GET /meta/bases/{baseId}/tables`.
 * The optional `include` array lets callers request extra metadata like
 * `visibleFieldIds` from views.
 */
const getBaseSchema: ActionDefinition<Input> = {
  key: "get-base-schema",
  type: "read",
  resource: "base",
  title: "Get Base Schema",
  description: "Retrieve tables, fields and views for a base.",
  params: [
    { key: "baseId", label: "Base ID", type: "string", required: true, placeholder: "appXXXXXXXXXXXXXX" },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      hint: "Extra metadata to include, e.g. `visibleFieldIds`.",
    },
  ],

  async execute(input, ctx) {
    const client = new AirtableClient(ctx);
    return client.request(`meta/bases/${input.baseId}/tables`, {
      query: { include: input.include },
    });
  },
};

export default getBaseSchema;
