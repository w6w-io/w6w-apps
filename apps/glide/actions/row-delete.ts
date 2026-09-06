import type { ActionDefinition } from "@w6w/types";
import { GlideClient } from "../lib/client.ts";
import { rowIdParam, tableIdParam } from "../lib/params.ts";

/**
 * `DELETE /tables/{tableID}/rows/{rowID}` — delete a row.
 *
 * Glide's own description: "No error is returned if the row does not exist" —
 * so this is safe to retry, and marked idempotent accordingly.
 */
interface Input {
  tableId: string;
  rowId: string;
}

const rowDelete: ActionDefinition<Input, Record<string, never>> = {
  key: "row-delete",
  type: "perform",
  resource: "row",
  title: "Delete Row",
  description: "Delete a row. Not an error if it no longer exists.",
  idempotent: true,
  params: [tableIdParam, rowIdParam],
  output: [],

  execute(input, ctx) {
    return new GlideClient(ctx).data<Record<string, never>>(
      `/tables/${encodeURIComponent(input.tableId)}/rows/${encodeURIComponent(input.rowId)}`,
      { method: "DELETE" },
    );
  },
};

export default rowDelete;
