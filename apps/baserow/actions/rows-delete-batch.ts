import type { ActionDefinition } from "@w6w/types";
import { BaserowClient, flag, MAX_BATCH_SIZE, parseRowIds } from "../lib/client.ts";
import { sendWebhookEventsParam, tableIdParam, viewParam } from "../lib/params.ts";

/**
 * `POST /api/database/rows/table/{table_id}/batch-delete/` — delete up to 200
 * rows.
 *
 * Note the method: **POST**, not DELETE. The ids go in a body (`{items: [1, 2,
 * 3]}`) because a delete with a body is not portable, so Baserow uses POST on a
 * dedicated path.
 *
 * The ids are typed as integers in the spec, so a comma-separated string param —
 * which is what an upstream step actually produces — is parsed and validated
 * here. A non-numeric entry is named rather than sent.
 */
interface Input {
  tableId: number;
  rowIds: string;
  view?: number;
  sendWebhookEvents?: boolean;
}

const rowsDeleteBatch: ActionDefinition<Input> = {
  key: "rows-delete-batch",
  type: "perform",
  resource: "row",
  title: "Delete Rows (Batch)",
  description: `Delete up to ${MAX_BATCH_SIZE} rows in one request. Returns no body.`,
  idempotent: true,
  params: [
    tableIdParam,
    {
      key: "rowIds",
      label: "Row IDs",
      type: "string",
      required: true,
      placeholder: "12,13,14",
      hint: `Comma-separated row ids. At most ${MAX_BATCH_SIZE} per request.`,
    },
    viewParam,
    sendWebhookEventsParam,
  ],
  output: [],

  execute(input, ctx) {
    const items = parseRowIds(input.rowIds);
    return new BaserowClient(ctx).request(
      `/api/database/rows/table/${input.tableId}/batch-delete/`,
      {
        method: "POST",
        query: { view: input.view, send_webhook_events: flag(input.sendWebhookEvents) },
        body: { items },
      },
    );
  },
};

export default rowsDeleteBatch;
