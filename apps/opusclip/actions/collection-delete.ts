import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/** `DELETE /api/collections/{collectionId}` — delete a collection. */
interface Input {
  collectionId: string;
}

const collectionDelete: ActionDefinition<Input> = {
  key: "collection-delete",
  type: "perform",
  resource: "collection",
  title: "Delete Collection",
  description: "Delete a collection. Does not delete the clips it contained.",
  idempotent: true,
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
  ],
  output: [{ key: "collectionId", type: "string", label: "Deleted collection ID" }],

  async execute(input, ctx) {
    const data = await new OpusClipClient(ctx).data<string>(
      `/api/collections/${encodeURIComponent(input.collectionId)}`,
      { method: "DELETE" },
    );
    return { collectionId: data };
  },
};

export default collectionDelete;
