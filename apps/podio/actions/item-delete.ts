import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, flag, PodioClient } from "../lib/client.ts";
import { itemIdParam, writeSwitchParams } from "../lib/params.ts";

/**
 * `DELETE /item/{item_id}` — "Deletes an item and removes it from all views.
 * The item can no longer be retrieved."
 *
 * Permanent, in Podio's own words. There is no documented restore endpoint for
 * an item and no trash to fish it out of, so this is the one action in this app
 * that cannot be undone by another one.
 *
 * Marked idempotent because the end state converges: deleting a deleted item
 * answers 404, which the runtime can distinguish from the transient failure it
 * would be retrying. Retrying a delete cannot destroy anything the first call
 * did not already destroy.
 *
 * The endpoint returns no body, so this action reports the HTTP status rather
 * than inventing a result object.
 */
interface Input {
  itemId: string;
  hook?: boolean;
  silent?: boolean;
}

const itemDelete: ActionDefinition<Input> = {
  key: "item-delete",
  type: "perform",
  resource: "item",
  title: "Delete Item",
  description:
    "Permanently delete an item. Podio keeps no copy and publishes no restore endpoint — " +
    "the item cannot be retrieved afterwards.",
  idempotent: true,
  params: [itemIdParam, ...writeSwitchParams()],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    ctx.log("warn", "permanently deleting Podio item", { itemId: input.itemId });
    const status = await new PodioClient(ctx).status(
      `/item/${encodeSegment(input.itemId)}`,
      {
        method: "DELETE",
        query: { hook: flag(input.hook), silent: flag(input.silent) },
      },
    );
    return { status };
  },
};

export default itemDelete;
