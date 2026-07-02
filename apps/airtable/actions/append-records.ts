import type { ActionDefinition } from "@w6w/types";
import { AirtableClient } from "../lib/client.ts";

interface Input {
  baseId: string;
  table: string;
  records: Array<{ fields: Record<string, unknown> }>;
  typecast?: boolean;
}

/**
 * Batch-append up to 10 records in a single request. Airtable's `POST` on the
 * table endpoint accepts either a single `fields` object (see `create-record`)
 * or a `records` array of at most 10 items — this is the batch variant.
 */
const appendRecords: ActionDefinition<Input> = {
  key: "append-records",
  type: "perform",
  resource: "record",
  title: "Append Records (batch)",
  description: "Append up to 10 records in one request. For >10 records, call this action in a loop.",
  params: [
    { key: "baseId", label: "Base ID", type: "string", required: true, placeholder: "appXXXXXXXXXXXXXX" },
    { key: "table", label: "Table (name or ID)", type: "string", required: true },
    {
      key: "records",
      label: "Records",
      type: "json",
      required: true,
      hint: "Array of `{ fields: {...} }` objects. Max 10 per call.",
    },
    { key: "typecast", label: "Typecast", type: "boolean", default: false },
  ],

  async execute(input, ctx) {
    const client = new AirtableClient(ctx);
    return client.request(`${input.baseId}/${encodeURI(input.table)}`, {
      method: "POST",
      body: {
        records: input.records,
        typecast: input.typecast ?? false,
      },
    });
  },
};

export default appendRecords;
