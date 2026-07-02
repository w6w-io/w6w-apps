import type { ActionDefinition } from "@w6w/types";
import { AirtableClient } from "../lib/client.ts";

interface Input {
  baseId: string;
  table: string;
  recordId: string;
  fields: Record<string, unknown>;
  typecast?: boolean;
  replace?: boolean;
}

/**
 * Update (patch) a single record. `replace: true` upgrades PATCH → PUT, which
 * clears any fields not included in the body (Airtable's "replace" semantics).
 */
const updateRecord: ActionDefinition<Input> = {
  key: "update-record",
  type: "perform",
  resource: "record",
  title: "Update Record",
  description: "Update a single record. Set `replace: true` to overwrite unspecified fields with null.",
  params: [
    { key: "baseId", label: "Base ID", type: "string", required: true, placeholder: "appXXXXXXXXXXXXXX" },
    { key: "table", label: "Table (name or ID)", type: "string", required: true },
    { key: "recordId", label: "Record ID", type: "string", required: true, placeholder: "recXXXXXXXXXXXXXX" },
    { key: "fields", label: "Fields", type: "json", required: true },
    { key: "typecast", label: "Typecast", type: "boolean", default: false },
    {
      key: "replace",
      label: "Replace (PUT)",
      type: "boolean",
      default: false,
      hint: "If true, fields not in the body are cleared. Uses HTTP PUT instead of PATCH.",
    },
  ],

  async execute(input, ctx) {
    const client = new AirtableClient(ctx);
    return client.request(`${input.baseId}/${encodeURI(input.table)}/${input.recordId}`, {
      method: input.replace ? "PUT" : "PATCH",
      body: {
        fields: input.fields,
        typecast: input.typecast ?? false,
      },
    });
  },
};

export default updateRecord;
