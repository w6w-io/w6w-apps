import type { ActionDefinition } from "@w6w/types";
import { AirtableClient } from "../lib/client.ts";

interface Input {
  baseId: string;
  table: string;
  fields: Record<string, unknown>;
  typecast?: boolean;
}

/**
 * Create a single record in `{baseId}/{table}`.
 *
 * n8n v2 supports auto-mapped input and multi-record batch inserts, but a w6w
 * action is one-item-in / one-item-out — the workflow engine handles fan-out.
 * So this is the single-record shape; callers who need bulk should iterate.
 * `typecast: true` asks Airtable to coerce string values for linked-record and
 * select fields.
 */
const createRecord: ActionDefinition<Input> = {
  key: "create-record",
  type: "perform",
  resource: "record",
  title: "Create Record",
  description: "Create a single record in an Airtable table.",
  params: [
    { key: "baseId", label: "Base ID", type: "string", required: true, placeholder: "appXXXXXXXXXXXXXX" },
    { key: "table", label: "Table (name or ID)", type: "string", required: true },
    { key: "fields", label: "Fields", type: "json", required: true, hint: "Object keyed by field name or ID." },
    {
      key: "typecast",
      label: "Typecast",
      type: "boolean",
      default: false,
      hint: "Ask Airtable to coerce string values for linked-record & select options.",
    },
  ],

  async execute(input, ctx) {
    const client = new AirtableClient(ctx);
    return client.request(`${input.baseId}/${encodeURI(input.table)}`, {
      method: "POST",
      body: {
        fields: input.fields,
        typecast: input.typecast ?? false,
      },
    });
  },
};

export default createRecord;
