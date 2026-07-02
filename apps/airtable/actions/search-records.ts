import type { ActionDefinition } from "@w6w/types";
import { AirtableClient, type AirtableListEnvelope } from "../lib/client.ts";

interface SortRule {
  field: string;
  direction?: "asc" | "desc";
}

interface Input {
  baseId: string;
  table: string;
  filterByFormula?: string;
  fields?: string[];
  view?: string;
  sort?: SortRule[];
  maxRecords?: number;
  pageSize?: number;
  offset?: string;
}

/**
 * List/search records with Airtable's `list records` endpoint. Returns one
 * page — pass back `offset` to walk the cursor. `pageSize` maxes at 100.
 */
const searchRecords: ActionDefinition<Input, AirtableListEnvelope> = {
  key: "search-records",
  type: "search",
  resource: "record",
  title: "Search Records",
  description:
    "List or filter records. Returns one page with an `offset` cursor for the next page.",
  params: [
    { key: "baseId", label: "Base ID", type: "string", required: true, placeholder: "appXXXXXXXXXXXXXX" },
    { key: "table", label: "Table (name or ID)", type: "string", required: true },
    {
      key: "filterByFormula",
      label: "Filter by formula",
      type: "string",
      placeholder: "NOT({Name} = 'Admin')",
      hint: "Airtable formula. If empty, all records are returned.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "multiselect",
      hint: "Field names to include in the output. Empty = all fields.",
    },
    { key: "view", label: "View (name or ID)", type: "string" },
    {
      key: "sort",
      label: "Sort",
      type: "json",
      hint: "Array of { field, direction: 'asc' | 'desc' }.",
    },
    {
      key: "maxRecords",
      label: "Max records (total across pages)",
      type: "number",
      hint: "Absolute cap on records returned across all pages.",
    },
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "offset", label: "Offset cursor", type: "string" },
  ],
  output: [
    { key: "records", type: "array", label: "Records" },
    { key: "offset", type: "string", label: "Next page cursor" },
  ],

  async execute(input, ctx) {
    const client = new AirtableClient(ctx);
    return client.request<AirtableListEnvelope>(`${input.baseId}/${encodeURI(input.table)}`, {
      query: {
        filterByFormula: input.filterByFormula,
        fields: input.fields,
        view: input.view,
        // Airtable requires sort as sort[0][field]=…&sort[0][direction]=… — see below.
        ...flattenSort(input.sort),
        maxRecords: input.maxRecords,
        pageSize: input.pageSize ?? 100,
        offset: input.offset,
      },
    });
  },
};

/**
 * Airtable expects `sort` as bracketed array-of-object params:
 *   sort[0][field]=Name & sort[0][direction]=asc
 * We flatten a `SortRule[]` into that shape so the URL builder emits them as-is.
 */
function flattenSort(sort: SortRule[] | undefined): Record<string, string | undefined> {
  if (!sort || sort.length === 0) return {};
  const flat: Record<string, string | undefined> = {};
  for (let i = 0; i < sort.length; i++) {
    flat[`sort[${i}][field]`] = sort[i].field;
    flat[`sort[${i}][direction]`] = sort[i].direction ?? "asc";
  }
  return flat;
}

export default searchRecords;
