import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  assetId: string;
}

/**
 * `GET /v1/assets/{assetId}` — requires `asset:read`.
 */
const getAsset: ActionDefinition<Input> = {
  key: "get-asset",
  type: "read",
  resource: "asset",
  title: "Get Asset",
  description: "Get the metadata for an image or video asset in the user's Projects.",
  params: [
    { key: "assetId", label: "Asset ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Asset ID" },
    { key: "type", type: "string", label: "Type (image/video)" },
    { key: "name", type: "string", label: "Name" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "metadata", type: "object", label: "Type-specific metadata" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ asset: Record<string, unknown> }>(
      `/rest/v1/assets/${encodeURIComponent(input.assetId)}`,
    );
    return res.asset;
  },
};

export default getAsset;
