import type { ActionDefinition } from "@w6w/types";
import { asJson, BaserowClient, flag, userFieldNamesFlag } from "../lib/client.ts";
import {
  sendWebhookEventsParam,
  tableIdParam,
  userFieldNamesParam,
  viewParam,
} from "../lib/params.ts";

/**
 * `PATCH /api/database/rows/table/{table_id}/{row_id}/` — update one row.
 *
 * A `PATCH` applies exactly the fields present in the body, so only send the
 * ones being changed; an omitted field keeps its value. To *clear* a field, send
 * it explicitly as `null` — which is why the body is passed through verbatim
 * rather than run through `compact`, whose whole job is dropping nulls.
 *
 * Idempotent: re-sending the same patch converges on the same row.
 */
interface Input {
  tableId: number;
  rowId: number;
  fields: unknown;
  userFieldNames?: boolean;
  view?: number;
  sendWebhookEvents?: boolean;
}

const rowUpdate: ActionDefinition<Input> = {
  key: "row-update",
  type: "perform",
  resource: "row",
  title: "Update Row",
  description: "Update a row's fields. Omitted fields keep their value; send `null` to clear one.",
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
    {
      key: "fields",
      label: "Field values",
      type: "json",
      required: true,
      hint:
        'Only the fields to change — `{"Age": 37}`. An omitted field is left alone; an explicit ' +
        "`null` clears it.",
    },
    userFieldNamesParam,
    viewParam,
    sendWebhookEventsParam,
  ],
  output: [{ key: "id", type: "number", label: "The updated row's id" }],

  execute(input, ctx) {
    return new BaserowClient(ctx).request(
      `/api/database/rows/table/${input.tableId}/${input.rowId}/`,
      {
        method: "PATCH",
        query: {
          user_field_names: userFieldNamesFlag(input.userFieldNames),
          view: input.view,
          send_webhook_events: flag(input.sendWebhookEvents),
        },
        // Passed through verbatim, NOT compacted: an explicit null is how a
        // field is cleared, and dropping it would make that impossible.
        body: asJson<Record<string, unknown>>(input.fields, "Field values"),
      },
    );
  },
};

export default rowUpdate;
