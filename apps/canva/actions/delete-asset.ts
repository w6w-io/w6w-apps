import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  assetId: string;
}

/**
 * `DELETE /v1/assets/{assetId}` — requires `asset:write`.
 */
const deleteAsset: ActionDefinition<Input> = {
  key: "delete-asset",
  type: "perform",
  resource: "asset",
  title: "Delete Asset",
  description: "Delete an image or video asset.",
  // Deleting by ID converges on the same end state (the asset is gone) no
  // matter how many times it's called.
  idempotent: true,
  params: [
    { key: "assetId", label: "Asset ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "assetId", type: "string", label: "Asset ID" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    await client.request(`/rest/v1/assets/${encodeURIComponent(input.assetId)}`, {
      method: "DELETE",
    });
    return { deleted: true, assetId: input.assetId };
  },
};

export default deleteAsset;
