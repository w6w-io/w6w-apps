import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/**
 * `POST /api/collection-contents` — add a clip to a collection.
 *
 * Declared idempotent: the relation being created is a (collectionId,
 * contentId) membership, so adding the same clip to the same collection twice
 * leaves the collection in the same state either way. This is a design
 * judgment, not a vendor-documented guarantee — the OpenAPI document does not
 * state what happens on a duplicate add.
 */
interface Input {
  collectionId: string;
  contentId: string;
}

const collectionContentAdd: ActionDefinition<Input> = {
  key: "collection-content-add",
  type: "perform",
  resource: "collection-content",
  title: "Add Clip to Collection",
  description: "Add a clip to a collection.",
  idempotent: true,
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    {
      key: "contentId",
      label: "Clip ID",
      type: "string",
      required: true,
      hint: "Composite id, {projectId}.{curationId} — e.g. P0000000demo.CUexample2.",
    },
  ],
  output: [
    { key: "collectionId", type: "string", label: "Collection ID" },
    { key: "contentId", type: "string", label: "Clip ID" },
  ],

  async execute(input, ctx) {
    return await new OpusClipClient(ctx).data("/api/collection-contents", {
      method: "POST",
      body: { collectionId: input.collectionId, contentId: input.contentId },
    });
  },
};

export default collectionContentAdd;
