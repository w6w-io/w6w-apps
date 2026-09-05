import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  assetId: string;
  name?: string;
  tags?: string[];
}

/**
 * `PATCH /v1/assets/{assetId}` — requires `asset:write`. Rate limited to 30
 * requests/minute per user. Updating tags REPLACES the full tag list, it
 * doesn't merge.
 */
const updateAsset: ActionDefinition<Input> = {
  key: "update-asset",
  type: "perform",
  resource: "asset",
  title: "Update Asset",
  description: "Rename an asset or replace its tags. Leave a field empty to leave it unchanged.",
  // A PATCH that sets the same name/tags converges on the same state;
  // retrying is safe.
  idempotent: true,
  params: [
    { key: "assetId", label: "Asset ID", type: "string", required: true },
    {
      key: "name",
      label: "New name",
      type: "string",
      validation: { maxLength: 50 },
      hint: "Leave empty to leave the name unchanged.",
    },
    {
      key: "tags",
      label: "New tags",
      type: "json",
      hint: "Array of up to 50 strings. REPLACES all existing tags. Leave empty to leave " +
        "tags unchanged.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Asset ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ asset: Record<string, unknown> }>(
      `/rest/v1/assets/${encodeURIComponent(input.assetId)}`,
      { method: "PATCH", body: { name: input.name, tags: input.tags } },
    );
    return res.asset;
  },
};

export default updateAsset;
