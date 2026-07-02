import type { ActionDefinition } from "@w6w/types";
import { ContentfulClient, resolveScope } from "../lib/client.ts";

interface Input {
  assetId: string;
  spaceId?: string;
  environmentId?: string;
  source?: "delivery" | "preview";
}

const getAsset: ActionDefinition<Input> = {
  key: "get-asset",
  type: "read",
  resource: "asset",
  title: "Get Asset",
  description: "Retrieve a single asset by ID.",
  params: [
    { key: "assetId", label: "Asset ID", type: "string", required: true },
    { key: "spaceId", label: "Space ID", type: "string" },
    { key: "environmentId", label: "Environment ID", type: "string" },
    {
      key: "source",
      label: "Source",
      type: "select",
      default: "delivery",
      options: [
        { value: "delivery", label: "Delivery API (published)" },
        { value: "preview", label: "Preview API (drafts)" },
      ],
    },
  ],

  async execute(input, ctx) {
    const { spaceId, environmentId } = resolveScope(input, ctx);
    const client = new ContentfulClient(ctx);
    return client.request(
      `/spaces/${spaceId}/environments/${environmentId}/assets/${input.assetId}`,
      { base: input.source === "preview" ? "preview" : "delivery" },
    );
  },
};

export default getAsset;
