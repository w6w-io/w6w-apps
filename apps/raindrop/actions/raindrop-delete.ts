import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";
import { raindropIdParam } from "../lib/params.ts";

/**
 * `DELETE /rest/v1/raindrop/{id}` — remove one bookmark.
 *
 * **The same call means two different things depending on where the bookmark
 * already is.** The reference: "When you remove raindrop it will be moved to
 * user `Trash` collection. But if you try to remove raindrop from `Trash`, it
 * will be removed permanently."
 *
 * So deleting a bookmark is recoverable exactly once, and a workflow that
 * retries a delete against something already in Trash destroys it. Nothing in
 * the request or the response distinguishes the two outcomes, and this app
 * cannot tell them apart without reading the bookmark first — which would be a
 * race, not a guarantee. The description says so plainly instead.
 *
 * Still marked idempotent: both calls converge on "this bookmark is gone", and
 * the second one is what the caller asked for either way. The nuance is *how*
 * gone.
 */
interface Input {
  raindropId: number;
}

const raindropDelete: ActionDefinition<Input> = {
  key: "raindrop-delete",
  type: "perform",
  resource: "raindrop",
  title: "Delete Raindrop",
  description: "Move one bookmark to Trash. If it is ALREADY in Trash, the same call destroys it " +
    "permanently.",
  idempotent: true,
  params: [raindropIdParam],
  output: [{ key: "result", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    const body = await new RaindropClient(ctx).ok(`/raindrop/${encodeId(input.raindropId)}`, {
      method: "DELETE",
    });
    return { result: body.result !== false };
  },
};

export default raindropDelete;
