import type { ActionDefinition } from "@w6w/types";
import { BaserowClient, flag } from "../lib/client.ts";
import { sendWebhookEventsParam, tableIdParam, viewParam } from "../lib/params.ts";

/**
 * `DELETE /api/database/rows/table/{table_id}/{row_id}/` — delete one row.
 *
 * Answers `204` with no body, which the client resolves to `undefined`.
 *
 * Idempotent in the sense the runtime cares about — a retry of the same delete
 * cannot delete a second row — though the second attempt reports
 * `ERROR_ROW_DOES_NOT_EXIST` rather than succeeding silently.
 */
interface Input {
  tableId: number;
  rowId: number;
  view?: number;
  sendWebhookEvents?: boolean;
}

const rowDelete: ActionDefinition<Input> = {
  key: "row-delete",
  type: "perform",
  resource: "row",
  title: "Delete Row",
  description: "Delete a single row. Returns no body.",
  idempotent: true,
  params: [
    tableIdParam,
    {
      key: "rowId",
      label: "Row ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    viewParam,
    sendWebhookEventsParam,
  ],
  output: [],

  execute(input, ctx) {
    return new BaserowClient(ctx).request(
      `/api/database/rows/table/${input.tableId}/${input.rowId}/`,
      {
        method: "DELETE",
        query: { view: input.view, send_webhook_events: flag(input.sendWebhookEvents) },
      },
    );
  },
};

export default rowDelete;
