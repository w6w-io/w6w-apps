import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/**
 * `POST /api/collections/{collectionId}/export` — download links for every
 * clip in a collection.
 *
 * A `read`, despite the HTTP verb: the request body is documented as empty
 * (`EmptyDto`) and the call has no side effect on the collection — it hands
 * back export URLs, which is exactly what a `read` action is for.
 */
interface Input {
  collectionId: string;
}

const collectionExport: ActionDefinition<Input> = {
  key: "collection-export",
  type: "read",
  resource: "collection",
  title: "Export Collection",
  description: "Get an HD download link for every clip in a collection.",
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
  ],
  output: [{ key: "contentList", type: "array", label: "Clip ID + export URL pairs" }],

  async execute(input, ctx) {
    return await new OpusClipClient(ctx).data(
      `/api/collections/${encodeURIComponent(input.collectionId)}/export`,
      { method: "POST", body: {} },
    );
  },
};

export default collectionExport;
