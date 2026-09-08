import type { ActionDefinition } from "@w6w/types";
import { GlideClient } from "../lib/client.ts";
import { rowIdParam, tableIdParam } from "../lib/params.ts";

/** `GET /tables/{tableID}/rows/{rowID}` — read one row by id. */
interface Input {
  tableId: string;
  rowId: string;
}

type Output = Record<string, unknown>;

const rowGet: ActionDefinition<Input, Output> = {
  key: "row-get",
  type: "read",
  resource: "row",
  title: "Get Row by ID",
  description: "Read a single row's field values by id.",
  params: [tableIdParam, rowIdParam],
  // The row's shape is the customer's own table schema — there is no fixed field list this app
  // could honestly declare, same reasoning the pack applies to Baserow's row-get/Algolia's
  // object-get.

  execute(input, ctx) {
    return new GlideClient(ctx).data<Output>(
      `/tables/${encodeURIComponent(input.tableId)}/rows/${encodeURIComponent(input.rowId)}`,
    );
  },
};

export default rowGet;
