import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, flag, PodioClient, stripSecrets } from "../lib/client.ts";
import { itemIdParam } from "../lib/params.ts";

/**
 * `GET /item/{item_id}` — "Returns the item with the specified id."
 *
 * ## `fields` comes back as Podio shapes it, and that is deliberate
 *
 * The response's `fields` is an **array of field descriptors** —
 * `{field_id, type, external_id, config, values}` — where `values` is a list of
 * `{sub_id: value}` objects whose keys depend on the field's type. It is not a
 * flat `{name: value}` map, and this action does not turn it into one.
 *
 * Flattening is what most Podio integrations do, and it is lossy in a way the
 * user never sees: a `date` field carries `start_date`, `start_time`,
 * `end_date` and `end_time`; `money` carries `value` and `currency`; `tel` and
 * `email` carry a `type`; `text` carries a `format`; `location` carries nine
 * sub_ids including latitude and longitude. Collapsing each field to one scalar
 * throws all of that away silently, and the workflow author only finds out when
 * the end date is missing downstream. Get App Fields documents the sub_ids per
 * type; the README states the cost of this choice explicitly.
 *
 * ## `mark_as_viewed` defaults to true, which is a side effect on a read
 *
 * Podio's documented default marks any new notifications on the item as viewed.
 * A polling workflow left on that default quietly clears a human's unread
 * badge. The parameter is surfaced here for that reason, and the hint says so.
 *
 * The `push` channel signature is stripped from the response — see
 * `lib/client.ts#REDACTED_FIELDS`.
 */
interface Input {
  itemId: string;
  markAsViewed?: boolean;
}

const itemGet: ActionDefinition<Input> = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get Item",
  description: "One item, with its field values in Podio's own array-of-fields shape (nothing is " +
    "flattened, so no sub-value is lost), plus its app, revisions and comments.",
  params: [
    itemIdParam,
    {
      key: "markAsViewed",
      label: "Mark notifications as viewed",
      type: "boolean",
      advanced: true,
      hint: "Podio defaults to TRUE — reading an item clears its unread notifications for " +
        "the connected identity. Set false for a polling workflow that should not touch " +
        "anyone's inbox.",
    },
  ],
  output: [{ key: "item", type: "object", label: "Item" }],

  async execute(input, ctx) {
    const item = await new PodioClient(ctx).json<Record<string, unknown>>(
      `/item/${encodeSegment(input.itemId)}`,
      { query: { mark_as_viewed: flag(input.markAsViewed) } },
    );
    return { item: stripSecrets(item ?? {}) };
  },
};

export default itemGet;
