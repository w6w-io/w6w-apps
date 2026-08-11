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
 * `POST /api/database/rows/table/{table_id}/batch/` — create up to 200 rows in
 * one request.
 *
 * Baserow's spec types the body as `{items: [...]}` with `minItems: 1` and
 * **`maxItems: 200`**. The ceiling is checked here rather than left to fail as a
 * 400, because the failure would arrive after a workflow had already built a
 * 5,000-row payload.
 *
 * Not idempotent: there is no idempotency key, so a retry creates a second copy
 * of every row.
 */
interface Input {
  tableId: number;
  items: unknown;
  userFieldNames?: boolean;
  before?: number;
  view?: number;
  sendWebhookEvents?: boolean;
}

const rowsCreateBatch: ActionDefinition<Input> = {
  key: "rows-create-batch",
  type: "perform",
  resource: "row",
  title: "Create Rows (Batch)",
  description: `Create up to ${MAX_BATCH_SIZE} rows in one request.`,
  idempotent: false,
  params: [
    tableIdParam,
    {
      key: "items",
      label: "Rows",
      type: "json",
      required: true,
      hint:
        'An array of row objects — `[{"Name": "Ada"}, {"Name": "Grace"}]`. Baserow accepts at ' +
        `most ${MAX_BATCH_SIZE} per request.`,
    },
    userFieldNamesParam,
    {
      key: "before",
      label: "Before row ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Position the new rows before this one. Appended at the end when omitted.",
    },
    viewParam,
    sendWebhookEventsParam,
  ],
  output: [{ key: "items", type: "array", label: "The created rows" }],

  execute(input, ctx) {
    const items = asJson<unknown[]>(input.items, "Rows");
    if (!Array.isArray(items)) throw new Error("Rows must be an array of row objects");
    if (items.length === 0) throw new Error("Rows is empty");
    assertBatchSize(items.length, "Rows");

    return new BaserowClient(ctx).request(`/api/database/rows/table/${input.tableId}/batch/`, {
      method: "POST",
      query: {
        user_field_names: userFieldNamesFlag(input.userFieldNames),
        before: input.before,
        view: input.view,
        send_webhook_events: flag(input.sendWebhookEvents),
      },
      body: { items },
    });
  },
};

export default rowsCreateBatch;
