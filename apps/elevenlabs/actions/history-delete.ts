import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient, encodeId } from "../lib/client.ts";
import { historyItemIdParam } from "../lib/params.ts";

/**
 * `DELETE /v1/history/{history_item_id}` — remove one generation from history.
 *
 * The usual reason to call it from a workflow is retention: a generation's text
 * is stored alongside its audio, so a pipeline that synthesises anything
 * sensitive deletes the history item once the audio has been delivered.
 *
 * Deleting the history item does **not** refund the characters it was billed at
 * — the plan-headroom check reads the account's usage counter, not the history.
 *
 * Marked idempotent: deleting an already-deleted item changes nothing, so a
 * retry after a dropped connection is safe.
 */
interface Input {
  historyItemId: string;
}

const historyDelete: ActionDefinition<Input> = {
  key: "history-delete",
  type: "perform",
  resource: "history",
  title: "Delete History Item",
  description: "Delete one past generation, removing its stored text and audio.",
  idempotent: true,
  params: [historyItemIdParam],
  output: [{ key: "status", type: "string", label: "`ok` when the item was deleted" }],

  execute(input, ctx) {
    return new ElevenLabsClient(ctx).json(`/v1/history/${encodeId(input.historyItemId)}`, {
      method: "DELETE",
    });
  },
};

export default historyDelete;
