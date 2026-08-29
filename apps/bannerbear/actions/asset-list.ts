import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface Asset {
  uid: string;
  url: string;
  mime_type?: string | null;
  size?: number;
  created_at?: string;
}

interface Input {
  page?: number;
}

/** `GET /assets` — files this workspace has uploaded via `asset-upload`. */
const action: ActionDefinition<Input, Asset[]> = {
  key: "asset-list",
  type: "read",
  resource: "asset",
  title: "List Assets",
  description: "List uploaded assets in the workspace.",
  params: [pageParam],
  output: [{ key: "assets", type: "array", label: "Assets" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<Asset[]>("/assets", {
      query: { page: input.page },
    });
  },
};

export default action;
