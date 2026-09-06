import type { ActionDefinition } from "@w6w/types";
import { asJson, asOptionalJson, assertIfMatch, GlideClient } from "../lib/client.ts";
import { asyncParam, ifMatchParam, onSchemaErrorParam, tableIdParam } from "../lib/params.ts";

/**
 * `PUT /tables/{tableID}` — overwrite a Big Table: clear every row, then
 * (optionally) add new data and/or update the schema.
 *
 * Send `rows: []` to clear a table with no replacement. Row IDs for any added
 * rows come back in the same order as the input, same as Create Table.
 *
 * Glide's own warning, verbatim: **"There is currently no way to supply values
 * for user-specific columns in the API. Those columns will be cleared when
 * using this endpoint."**
 *
 * Use `ifMatch` (the ETag / Get Rows Version value) to refuse the overwrite if
 * the table changed since you last read it — Glide's own data-versioning guide
 * calls this out as the way to avoid clobbering a concurrent edit during a
 * read-modify-write cycle.
 */
interface Input {
  tableId: string;
  schema?: unknown;
  rows: unknown;
  onSchemaError?: string;
  asynchronous?: boolean;
  ifMatch?: string;
}

interface Output {
  jobID: string;
}

const tableOverwrite: ActionDefinition<Input, Output> = {
  key: "table-overwrite",
  type: "perform",
  resource: "table",
  title: "Overwrite Table",
  description: "Clear every row in a Big Table and optionally replace them, and/or its schema.",
  idempotent: false,
  params: [
    tableIdParam,
    {
      key: "schema",
      label: "Column schema",
      type: "json",
      hint: "Replace the table's schema. Omit to keep the existing schema.",
    },
    {
      key: "rows",
      label: "Rows",
      type: "json",
      required: true,
      hint: "An array of row objects, `[]` to clear the table with nothing added, or a stash " +
        'reference (`{"$stashID": "20240215-job32"}`).',
    },
    onSchemaErrorParam,
    asyncParam,
    ifMatchParam,
  ],
  output: [{ key: "jobID", type: "string", label: "Async job id — check with Get Job Status" }],

  execute(input, ctx) {
    const headers: Record<string, string> = {};
    if (input.asynchronous !== undefined) {
      headers["x-glide-asynchronous"] = input.asynchronous ? "true" : "false";
    }
    if (input.ifMatch) headers["if-match"] = assertIfMatch(input.ifMatch);

    return new GlideClient(ctx).data<Output>(`/tables/${encodeURIComponent(input.tableId)}`, {
      method: "PUT",
      query: { onSchemaError: input.onSchemaError },
      headers,
      body: {
        schema: asOptionalJson<Record<string, unknown>>(input.schema, "Column schema"),
        rows: asJson<unknown>(input.rows, "Rows"),
      },
    });
  },
};

export default tableOverwrite;
