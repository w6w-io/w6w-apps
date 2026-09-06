import type { ActionDefinition } from "@w6w/types";
import { asJson, GlideClient } from "../lib/client.ts";
import { onSchemaErrorParam, tableIdParam } from "../lib/params.ts";

/**
 * `POST /tables/{tableID}/rows` — add one or more rows to an existing Big
 * Table.
 *
 * `rows` is either an inline array of row objects or a stash reference
 * (`{"$stashID": "..."}`) for datasets Glide's own guidance says are past "a
 * few hundred rows." Returned row ids are in the same order as the input.
 *
 * If a column is omitted from a row it is left empty; a column that doesn't
 * exist in the schema, or whose value doesn't match its type, is handled per
 * `onSchemaError` (Glide's default: abort the whole call).
 *
 * **Not idempotent.** There is no idempotency key on this endpoint — retrying
 * a call that actually succeeded adds the rows again.
 */
interface Input {
  tableId: string;
  rows: unknown;
  onSchemaError?: string;
}

interface Output {
  rowIDs: string[];
}

const rowsAdd: ActionDefinition<Input, Output> = {
  key: "rows-add",
  type: "perform",
  resource: "row",
  title: "Add Rows to Table",
  description: "Add one or more rows to an existing Big Table.",
  idempotent: false,
  params: [
    tableIdParam,
    {
      key: "rows",
      label: "Rows",
      type: "json",
      required: true,
      hint:
        'An array of row objects, `[{"fullName": "Alex Bard", "totalAmount": 34.5}, ...]`, or ' +
        'a stash reference (`{"$stashID": "20240215-job32"}`) for a large dataset.',
    },
    onSchemaErrorParam,
  ],
  output: [{ key: "rowIDs", type: "array", label: "IDs of the added rows, in input order" }],

  execute(input, ctx) {
    return new GlideClient(ctx).data<Output>(
      `/tables/${encodeURIComponent(input.tableId)}/rows`,
      {
        method: "POST",
        query: { onSchemaError: input.onSchemaError },
        body: asJson<unknown>(input.rows, "Rows"),
      },
    );
  },
};

export default rowsAdd;
