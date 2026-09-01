import type { ActionDefinition } from "@w6w/types";
import { BubbleClient, formatTypeName } from "../lib/client.ts";
import { TYPE_PARAM, UNIQUE_ID_PARAM } from "../lib/params.ts";

interface Input {
  type: string;
  uniqueId: string;
  confirm: boolean;
}

/**
 * `DELETE /obj/{type}/{UniqueID}` — verified against
 * `core-resources/api/the-bubble-api/the-data-api/data-api-requests`.
 *
 * Deletes one thing. There is no undo, and unlike a bad commit a local clone
 * does not bring it back — the same reasoning `gitea`'s `repo-delete`
 * documents — so this action is gated behind an explicit confirmation. The
 * Data Type's Privacy Rule must have `Delete via API` enabled.
 */
const action: ActionDefinition<Input, { ok: true }> = {
  key: "data-delete",
  type: "perform",
  resource: "data",
  title: "Delete Thing",
  description: "Permanently delete one record of a Data Type. There is no undo.",
  idempotent: true,
  params: [
    TYPE_PARAM,
    UNIQUE_ID_PARAM,
    {
      key: "confirm",
      label: "Confirm Delete",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be checked. This permanently deletes the record.",
    },
  ],

  async execute(input, ctx) {
    if (input.confirm !== true) {
      throw new Error("Delete Thing requires `confirm: true` — this permanently deletes data");
    }
    const type = formatTypeName(input.type);
    const client = new BubbleClient(ctx);
    ctx.log("warn", "deleting Bubble thing", { type, uniqueId: input.uniqueId });
    await client.request(`/obj/${type}/${encodeURIComponent(input.uniqueId)}`, {
      method: "DELETE",
    });
    return { ok: true };
  },
};

export default action;
