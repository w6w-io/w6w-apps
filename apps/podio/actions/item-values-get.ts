import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient } from "../lib/client.ts";
import { itemIdParam } from "../lib/params.ts";

/**
 * `GET /item/{item_id}/value` — "Returns all the values for an item".
 *
 * The narrow read: a bare array of `{field_id, type, label, values}` and
 * nothing else. Get Item returns the same field data wrapped in the item
 * envelope — app, revisions, up to eight revision records, comments,
 * participants, ratings — so this is the call for a workflow that only wants
 * the data, on an item with a long comment history.
 *
 * Reachable under App Authentication, which the `/v2` variant of this endpoint
 * (`/item/{item_id}/value/v2`) is not; that is why this app uses the v1 form.
 * The two differ in how they render values, and only this one is documented as
 * available to an app token.
 *
 * Values keep Podio's sub_id structure; see Get Item for why nothing is
 * flattened.
 */
interface Input {
  itemId: string;
}

const itemValuesGet: ActionDefinition<Input> = {
  key: "item-values-get",
  type: "read",
  resource: "item",
  title: "Get Item Values",
  description:
    "Just the field values of one item, without the item envelope, revisions or comments. " +
    "Cheaper than Get Item when only the data matters.",
  params: [itemIdParam],
  output: [{ key: "values", type: "array", label: "Field values" }],

  async execute(input, ctx) {
    const values = await new PodioClient(ctx).json<unknown[]>(
      `/item/${encodeSegment(input.itemId)}/value`,
    );
    return { values: values ?? [] };
  },
};

export default itemValuesGet;
