import type { ActionDefinition } from "@w6w/types";
import { AirtableClient } from "../lib/client.ts";

interface Input {
  baseId: string;
  table: string;
  records: Array<{ fields: Record<string, unknown>; id?: string }>;
  fieldsToMergeOn: string[];
  typecast?: boolean;
  replace?: boolean;
}

/**
 * Upsert (create-or-update) up to 10 records. Airtable expresses upsert as a
 * batch PATCH (or PUT for replace semantics) with a `performUpsert.fieldsToMergeOn`
 * key — it looks up existing records by matching those fields, updating on hit
 * and creating on miss.
 */
const upsertRecords: ActionDefinition<Input> = {
  key: "upsert-records",
  type: "perform",
  resource: "record",
  title: "Upsert Records",
  description:
    "Create-or-update up to 10 records, matched on the given `fieldsToMergeOn`.",
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
    {
      key: "fieldsToMergeOn",
      label: "Fields to merge on",
      type: "multiselect",
      required: true,
      hint: "Field names Airtable uses to match existing records.",
    },
    { key: "typecast", label: "Typecast", type: "boolean", default: false },
    {
      key: "replace",
      label: "Replace (PUT)",
      type: "boolean",
      default: false,
      hint: "If true, updates clear fields not in the body. Uses HTTP PUT.",
    },
  ],

  async execute(input, ctx) {
    const client = new AirtableClient(ctx);
    return client.request(`${input.baseId}/${encodeURI(input.table)}`, {
      method: input.replace ? "PUT" : "PATCH",
      body: {
        records: input.records,
        typecast: input.typecast ?? false,
        performUpsert: { fieldsToMergeOn: input.fieldsToMergeOn },
      },
    });
  },
};

export default upsertRecords;
