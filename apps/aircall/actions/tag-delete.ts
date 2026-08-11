import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { tagIdParam } from "../lib/params.ts";

interface Input {
  tagId: string;
}

/**
 * `DELETE /v1/tags/:id` — delete a call Tag. Answers **204**.
 *
 * This is not confined to the Tag row: "Tag will be removed from Calls." Every
 * Call carrying it loses it, and there is no undo — so a Search Calls filter
 * built on that Tag ID stops matching anything.
 */
const tagDelete: ActionDefinition<Input> = {
  key: "tag-delete",
  type: "perform",
  resource: "tag",
  title: "Delete Tag",
  description:
    "Delete a call Tag. It is also removed from every Call that carried it, and this cannot be " +
    "undone.",
  // Same end state on a replay; a second attempt 404s rather than destroying
  // anything further.
  idempotent: true,
  params: [tagIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status — 204 on success" }],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    ctx.log("warn", "deleting tag — it will be removed from every call carrying it", {
      tagId: input.tagId,
    });
    const status = await client.status(`/tags/${encodeId(input.tagId)}`, { method: "DELETE" });
    return { status };
  },
};

export default tagDelete;
