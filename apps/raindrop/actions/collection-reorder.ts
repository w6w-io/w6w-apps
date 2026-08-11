import type { ActionDefinition } from "@w6w/types";
import { RaindropClient } from "../lib/client.ts";

/**
 * `PUT /rest/v1/collections` — reorder every collection at once.
 *
 * Three sort orders and no others; the reference lists them exhaustively, and
 * they are not the same vocabulary as the raindrop `sort` parameter (there is no
 * `-created` here, and no `count` ascending).
 *
 * Idempotent: sorting an already-sorted account produces the same order.
 */
interface Input {
  sort: string;
}

const collectionReorder: ActionDefinition<Input> = {
  key: "collection-reorder",
  type: "perform",
  resource: "collection",
  title: "Reorder Collections",
  description: "Re-sort every collection in the account alphabetically or by bookmark count.",
  idempotent: true,
  params: [
    {
      key: "sort",
      label: "Order",
      type: "select",
      required: true,
      options: [
        { value: "title", label: "Title A→Z" },
        { value: "-title", label: "Title Z→A" },
        { value: "-count", label: "Most bookmarks first" },
      ],
      hint: "The only three values this endpoint accepts.",
    },
  ],
  output: [{ key: "result", type: "boolean", label: "Reordered" }],

  async execute(input, ctx) {
    const body = await new RaindropClient(ctx).ok("/collections", {
      method: "PUT",
      body: { sort: input.sort },
    });
    return { result: body.result !== false };
  },
};

export default collectionReorder;
