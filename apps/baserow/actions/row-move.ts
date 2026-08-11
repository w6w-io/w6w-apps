import type { ActionDefinition } from "@w6w/types";
import { BaserowClient, flag, userFieldNamesFlag } from "../lib/client.ts";
import {
  sendWebhookEventsParam,
  tableIdParam,
  userFieldNamesParam,
  viewParam,
} from "../lib/params.ts";

/**
 * `PATCH /api/database/rows/table/{table_id}/{row_id}/move/` — reorder a row.
 *
 * Note the method: **PATCH**, not POST, despite reading like a command.
 *
 * `before_id` is the row to move this one in front of. **Omitting it moves the
 * row to the end of the table**, which is the vendor's documented behaviour and
 * not an error — worth stating, because "move" with no destination reads like a
 * missing argument.
 */
interface Input {
  tableId: number;
  rowId: number;
  beforeId?: number;
  userFieldNames?: boolean;
  view?: number;
  sendWebhookEvents?: boolean;
}

const rowMove: ActionDefinition<Input> = {
  key: "row-move",
  type: "perform",
  resource: "row",
  title: "Move Row",
  description: "Reposition a row before another one, or to the end of the table.",
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
      key: "beforeId",
      label: "Before row ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Move the row in front of this one. Leave empty to move it to the end of the table.",
    },
    userFieldNamesParam,
    viewParam,
    sendWebhookEventsParam,
  ],
  output: [{ key: "id", type: "number", label: "The moved row's id" }],

  execute(input, ctx) {
    return new BaserowClient(ctx).request(
      `/api/database/rows/table/${input.tableId}/${input.rowId}/move/`,
      {
        method: "PATCH",
        query: {
          before_id: input.beforeId,
          user_field_names: userFieldNamesFlag(input.userFieldNames),
          view: input.view,
          send_webhook_events: flag(input.sendWebhookEvents),
        },
      },
    );
  },
};

export default rowMove;
