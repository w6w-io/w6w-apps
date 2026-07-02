import type { ActionDefinition } from "@w6w/types";
import { AirtableClient } from "../lib/client.ts";

interface TableSchema {
  id: string;
  name: string;
  primaryFieldId?: string;
  description?: string;
  fields?: Array<Record<string, unknown>>;
  views?: Array<Record<string, unknown>>;
}

interface Input {
  baseId: string;
  table: string;
}

/**
 * Get a single table's schema. There's no dedicated Airtable endpoint for it,
 * so we fetch the whole base schema and pick out the requested table. Matches
 * against both `id` and `name`.
 */
const getTable: ActionDefinition<Input, TableSchema> = {
  key: "get-table",
  type: "read",
  resource: "table",
  title: "Get Table",
  description: "Retrieve a single table's schema (fields + views).",
  params: [
    { key: "baseId", label: "Base ID", type: "string", required: true, placeholder: "appXXXXXXXXXXXXXX" },
    { key: "table", label: "Table (name or ID)", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new AirtableClient(ctx);
    const schema = await client.request<{ tables?: TableSchema[] }>(
      `meta/bases/${input.baseId}/tables`,
    );
    const tables = schema.tables ?? [];
    const found = tables.find((t) => t.id === input.table || t.name === input.table);
    if (!found) {
      throw new Error(`Airtable base ${input.baseId} has no table matching "${input.table}"`);
    }
    return found;
  },
};

export default getTable;
