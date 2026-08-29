import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface Asset {
  uid: string;
  url: string;
  mime_type?: string | null;
  size?: number;
  created_at?: string;
}

interface Input {
  uid: string;
}

/** `GET /assets/{uid}`. */
const action: ActionDefinition<Input, Asset> = {
  key: "asset-get",
  type: "read",
  resource: "asset",
  title: "Get Asset",
  description: "Get an uploaded asset's CDN URL, mime type, and size.",
  params: [
    { key: "uid", label: "Asset UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "url", type: "string", label: "CDN URL" },
    { key: "mime_type", type: "string", label: "MIME type" },
    { key: "size", type: "number", label: "Size (bytes)" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<Asset>(`/assets/${encodeURIComponent(uid)}`);
  },
};

export default action;
