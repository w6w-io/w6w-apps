import type { ActionDefinition } from "@w6w/types";
import {
  asJson,
  assertBatchSize,
  BaserowClient,
  flag,
  MAX_BATCH_SIZE,
  userFieldNamesFlag,
} from "../lib/client.ts";
import {
  sendWebhookEventsParam,
  tableIdParam,
  userFieldNamesParam,
  viewParam,
} from "../lib/params.ts";

/**
 * `PATCH /api/database/rows/table/{table_id}/batch/` — update up to 200 rows.
 *
 * **Every item must carry its own `id`.** This is the difference from the batch
 * *create* body, and the one thing that makes this call fail confusingly: an
 * item without an id is not "create this row", it is a validation error. The
 * check is done here so the message names the offending position.
 *
 * Idempotent: re-sending the same patch converges on the same rows.
 */
interface Input {
  tableId: number;
  items: unknown;
  userFieldNames?: boolean;
  view?: number;
  sendWebhookEvents?: boolean;
}

const rowsUpdateBatch: ActionDefinition<Input> = {
  key: "rows-update-batch",
  type: "perform",
  resource: "row",
  title: "Update Rows (Batch)",
  description:
    `Update up to ${MAX_BATCH_SIZE} rows in one request. Every row object must include its \`id\`.`,
  idempotent: true,
  params: [
    tableIdParam,
    {
      key: "items",
      label: "Rows",
      type: "json",
      required: true,
      hint: 'An array of row objects, each with its `id` — `[{"id": 1, "Name": "Ada"}]`. Baserow ' +
        `accepts at most ${MAX_BATCH_SIZE} per request.`,
    },
    userFieldNamesParam,
    viewParam,
    sendWebhookEventsParam,
  ],
  output: [{ key: "items", type: "array", label: "The updated rows" }],

  execute(input, ctx) {
    const items = asJson<Array<Record<string, unknown>>>(input.items, "Rows");
    if (!Array.isArray(items)) throw new Error("Rows must be an array of row objects");
    if (items.length === 0) throw new Error("Rows is empty");
    assertBatchSize(items.length, "Rows");

    const missing = items.findIndex((item) => !item || typeof item.id !== "number");
    if (missing !== -1) {
      throw new Error(
        `Rows: item at index ${missing} has no numeric \`id\`. Every row in a batch update must ` +
          "identify itself — there is no create-if-missing behaviour.",
      );
    }

    return new BaserowClient(ctx).request(`/api/database/rows/table/${input.tableId}/batch/`, {
      method: "PATCH",
      query: {
        user_field_names: userFieldNamesFlag(input.userFieldNames),
        view: input.view,
        send_webhook_events: flag(input.sendWebhookEvents),
      },
      body: { items },
    });
  },
};

export default rowsUpdateBatch;
