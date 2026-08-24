import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

interface Input {
  assetId: string;
}

/** `GET /v3/assets/{asset_id}` — an asset's metadata and (when generable) its public URL. */
const assetGet: ActionDefinition<Input> = {
  key: "asset-get",
  type: "read",
  resource: "asset",
  title: "Get Asset",
  description: "Fetch an asset's metadata — owner, upload time, file type, and its public URL.",
  params: [{ key: "assetId", label: "Asset ID", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The asset" }],

  execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    return client.data(`/v3/assets/${encodeURIComponent(input.assetId)}`);
  },
};

export default assetGet;
