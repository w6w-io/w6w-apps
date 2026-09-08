import type { ActionDefinition } from "@w6w/types";
import { asJson, assertIfMatch, GlideClient } from "../lib/client.ts";
import { ifMatchParam, onSchemaErrorParam, rowIdParam, tableIdParam } from "../lib/params.ts";

/**
 * `PATCH /tables/{tableID}/rows/{rowID}` — update an existing row.
 *
 * The body is passed through verbatim, not compacted: an explicit `null` is
 * how a Glide field is cleared, and a column left out of the body is simply
 * not touched. Dropping `null`s here would make clearing a field impossible.
 *
 * Use `ifMatch` (from a prior ETag / Get Rows Version read) to reject the
 * update if the row changed since — Glide's data-versioning guide's own
 * concurrency guard, answering `412 Precondition Failed` when it doesn't
 * match. It only guards the row being updated; another row changing in the
 * same window does not trip it.
 */
interface Input {
  tableId: string;
  rowId: string;
  fields: unknown;
  onSchemaError?: string;
  ifMatch?: string;
}

const rowUpdate: ActionDefinition<Input, Record<string, never>> = {
  key: "row-update",
  type: "perform",
  resource: "row",
  title: "Update Row",
  description: "Update field values on an existing row. Fields left out are not changed.",
  idempotent: true,
  params: [
    tableIdParam,
    rowIdParam,
    {
      key: "fields",
      label: "Field values",
      type: "json",
      required: true,
      hint: 'An object of the columns to change, e.g. `{"totalAmount": 40, "notes": null}`. ' +
        "`null` clears a field; an omitted key leaves it unchanged.",
    },
    onSchemaErrorParam,
    ifMatchParam,
  ],
  output: [],

  execute(input, ctx) {
    const headers: Record<string, string> = {};
    if (input.ifMatch) headers["if-match"] = assertIfMatch(input.ifMatch);

    return new GlideClient(ctx).data<Record<string, never>>(
      `/tables/${encodeURIComponent(input.tableId)}/rows/${encodeURIComponent(input.rowId)}`,
      {
        method: "PATCH",
        query: { onSchemaError: input.onSchemaError },
        headers,
        body: asJson<Record<string, unknown>>(input.fields, "Field values"),
      },
    );
  },
};

export default rowUpdate;
