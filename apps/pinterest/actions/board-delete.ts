import type { ActionDefinition } from "@w6w/types";
import { PinterestClient } from "../lib/client.ts";
import { adAccountIdParam, boardIdParam } from "../lib/params.ts";

/**
 * `DELETE /v5/boards/{board_id}` — documented as `204` with no body on
 * success (also documents a `200` returning the deleted `Board`, but this app
 * treats the operation as fire-and-forget and reports only the outcome).
 *
 * Safe to retry: deleting an already-deleted board just answers `404` rather
 * than creating any new side effect, so a retry after a dropped connection
 * cannot duplicate anything.
 */
interface Input {
  boardId: string;
  adAccountId?: string;
}

const boardDelete: ActionDefinition<Input> = {
  key: "board-delete",
  type: "perform",
  resource: "board",
  title: "Delete Board",
  description: "Permanently delete a board and every Pin on it. Safe to retry.",
  idempotent: true,
  params: [boardIdParam, adAccountIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new PinterestClient(ctx).status(
      `/boards/${encodeURIComponent(input.boardId)}`,
      { method: "DELETE", query: { ad_account_id: input.adAccountId } },
    );
    return { deleted: status === 200 || status === 204, status };
  },
};

export default boardDelete;
