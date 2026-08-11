import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient, stripSecrets } from "../lib/client.ts";
import { appIdParam } from "../lib/params.ts";

/**
 * `GET /item/app/{app_id}/external_id/{external_id}` — "Retrieve an app item
 * with the given external_id."
 *
 * The upsert primitive. An `external_id` is a string this side owns: set it on
 * Create Item to record "this Podio item is that row in my system", then find
 * it again here without storing Podio's own numeric id.
 *
 * Podio's own warning, quoted because it is the whole risk of the pattern:
 * "It is the responsibility of the client to ensure that external ids are
 * unique within a given app. If this is not the case and there are more than
 * one items with the same external_id, this operation returns just one of
 * them." Podio does not enforce uniqueness and does not tell you when it is
 * violated — a duplicate silently returns an arbitrary one of the matches, so a
 * workflow that then updates it will update the wrong row half the time.
 *
 * A missing external id is a plain 404, which surfaces as an error rather than
 * an empty result. Branch on it with the workflow's own error handling; there
 * is no documented "find or nothing" form of this endpoint.
 *
 * The external id is path-escaped, so an id containing a slash or a question
 * mark cannot rewrite the request path.
 */
interface Input {
  appId: string;
  externalId: string;
}

const itemGetByExternalId: ActionDefinition<Input> = {
  key: "item-get-by-external-id",
  type: "read",
  resource: "item",
  title: "Get Item by External ID",
  description:
    "Find an item by the external id you set on it. Podio does not enforce uniqueness — if " +
    "two items share an external id it returns an arbitrary one. 404s when nothing matches.",
  params: [
    appIdParam,
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      required: true,
      hint: "The id from your own system that was stored on the item when it was created.",
    },
  ],
  output: [{ key: "item", type: "object", label: "Item" }],

  async execute(input, ctx) {
    const item = await new PodioClient(ctx).json<Record<string, unknown>>(
      `/item/app/${encodeSegment(input.appId)}/external_id/${encodeSegment(input.externalId)}`,
    );
    return { item: stripSecrets(item ?? {}) };
  },
};

export default itemGetByExternalId;
