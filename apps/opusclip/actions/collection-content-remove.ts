import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/**
 * `POST /api/collection-contents/delete-collection-contents` — remove a clip
 * from a collection.
 *
 * `q` is a required body field, but `findByCollectionIdAndContentId` is
 * documented as its only legal value, so it is hard-coded.
 */
interface Input {
  collectionId: string;
  contentId: string;
}

const collectionContentRemove: ActionDefinition<Input> = {
  key: "collection-content-remove",
  type: "perform",
  resource: "collection-content",
  title: "Remove Clip from Collection",
  description: "Remove a clip from a collection.",
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
  output: [{ key: "status", type: "string", label: "Execution status" }],

  async execute(input, ctx) {
    const status = await new OpusClipClient(ctx).data<string>(
      "/api/collection-contents/delete-collection-contents",
      {
        method: "POST",
        body: {
          q: "findByCollectionIdAndContentId",
          collectionId: input.collectionId,
          contentId: input.contentId,
        },
      },
    );
    return { status };
  },
};

export default collectionContentRemove;
