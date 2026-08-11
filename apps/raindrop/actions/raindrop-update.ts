import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient, toList } from "../lib/client.ts";
import {
  buildRaindropBody,
  type RaindropBodyInput,
  raindropBodyParams,
  raindropIdParam,
} from "../lib/params.ts";

/**
 * `PUT /rest/v1/raindrop/{id}` — update one bookmark.
 *
 * A partial update — omitted fields are left alone — which is what makes it
 * idempotent and safe for the runtime to retry.
 *
 * **`tags` on the single-raindrop endpoint replaces the list; on the batch
 * endpoint it appends.** The same field name means two different operations
 * depending on which path you send it to (see Update Raindrops). Sending
 * `["a"]` here leaves the bookmark with exactly one tag, whatever it had before.
 *
 * `pleaseParse` on an update re-parses the link's metadata in the background,
 * which will overwrite `cover`, `type` and description with whatever the page
 * says now — so combining it with a hand-written title in one call is a race
 * this app cannot resolve for you.
 *
 * Highlights are also written through this endpoint; they have their own three
 * actions (Add / Update / Remove Highlight) because the remove operation has a
 * genuinely surprising encoding.
 */
type Input = RaindropBodyInput & { raindropId: number };

const raindropUpdate: ActionDefinition<Input> = {
  key: "raindrop-update",
  type: "perform",
  resource: "raindrop",
  title: "Update Raindrop",
  description:
    "Change one bookmark's fields. Partial: omitted fields are untouched. Sending tags REPLACES " +
    "the bookmark's tags (the batch endpoint appends instead).",
  idempotent: true,
  params: [
    raindropIdParam,
    ...raindropBodyParams(false).map((p) =>
      p.key === "tags"
        ? {
          ...p,
          hint: "Comma-separated. This REPLACES the existing tags — it does not add to them.",
        }
        : p
    ),
  ],
  output: [{ key: "item", type: "object", label: "Updated raindrop" }],

  async execute(input, ctx) {
    const body = buildRaindropBody(input, toList(input.tags));

    return {
      item: await new RaindropClient(ctx).item(`/raindrop/${encodeId(input.raindropId)}`, {
        method: "PUT",
        body,
      }),
    };
  },
};

export default raindropUpdate;
