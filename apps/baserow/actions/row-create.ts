import type { ActionDefinition } from "@w6w/types";
import { asJson, BaserowClient, flag, userFieldNamesFlag } from "../lib/client.ts";
import {
  sendWebhookEventsParam,
  tableIdParam,
  userFieldNamesParam,
  viewParam,
} from "../lib/params.ts";

/**
 * `POST /api/database/rows/table/{table_id}/` — create one row.
 *
 * The body is the row itself: `{"Name": "Ada", "Age": 36}` with field names on,
 * or `{"field_4321": "Ada"}` with them off. It is a free-form `json` param
 * because the shape is the customer's own schema — List Fields is the action
 * that tells you what belongs in it.
 *
 * **Not idempotent.** Baserow has no idempotency key on this endpoint; running
 * it twice creates two rows. Use Batch Create Rows for a set, and dedupe
 * upstream if a retry is possible.
 */
interface Input {
  tableId: number;
  fields: unknown;
  userFieldNames?: boolean;
  before?: number;
  view?: number;
  sendWebhookEvents?: boolean;
}

const rowCreate: ActionDefinition<Input> = {
  key: "row-create",
  type: "perform",
  resource: "row",
  title: "Create Row",
  description: "Create a single row from an object of field values.",
  idempotent: false,
  params: [
    tableIdParam,
    {
      key: "fields",
      label: "Field values",
      type: "json",
      required: true,
      hint:
        'An object of field values — `{"Name": "Ada", "Age": 36}`. With Use field names off, key ' +
        'it by field id instead: `{"field_4321": "Ada"}`. List Fields shows what a table takes.',
    },
    userFieldNamesParam,
    {
      key: "before",
      label: "Before row ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Position the new row before this one. Appended at the end when omitted.",
    },
    viewParam,
    sendWebhookEventsParam,
  ],
  output: [{ key: "id", type: "number", label: "The created row's id" }],

  execute(input, ctx) {
    return new BaserowClient(ctx).request(`/api/database/rows/table/${input.tableId}/`, {
      method: "POST",
      query: {
        user_field_names: userFieldNamesFlag(input.userFieldNames),
        before: input.before,
        view: input.view,
        send_webhook_events: flag(input.sendWebhookEvents),
      },
      body: asJson<Record<string, unknown>>(input.fields, "Field values"),
    });
  },
};

export default rowCreate;
