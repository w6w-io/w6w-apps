import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, HeyGenClient } from "../lib/client.ts";

interface Input {
  file: string;
  fileName?: string;
  fileMimeType?: string;
}

/**
 * `POST /v3/assets` — `multipart/form-data`, max 32 MB (per HeyGen's Usage Limits doc; larger
 * files need the direct-to-S3 flow at `POST /v3/assets/direct-uploads`, not exposed here). The
 * returned `asset_id` is what `video-create`'s `audioAssetId`, `video-translation-create`'s
 * `videoAssetId`/`audioAssetId`, and other actions accept as an upload reference.
 */
const assetUpload: ActionDefinition<Input> = {
  key: "asset-upload",
  type: "perform",
  resource: "asset",
  title: "Upload Asset",
  description:
    "Upload a file (image, video, audio, or PDF; max 32 MB) and return an asset_id usable in " +
    "other actions.",
  idempotent: false,
  params: [
    {
      key: "file",
      label: "File (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded file contents (a data: URL prefix is stripped automatically).",
    },
    { key: "fileName", label: "File name", type: "string", default: "upload.bin" },
    {
      key: "fileMimeType",
      label: "File MIME type",
      type: "string",
      default: "application/octet-stream",
    },
  ],
  output: [
    { key: "asset_id", type: "string", label: "Asset ID" },
    { key: "url", type: "string", label: "Public URL" },
    { key: "mime_type", type: "string", label: "Detected MIME type" },
    { key: "size_bytes", type: "number", label: "File size (bytes)" },
  ],

  execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    const form = new FormData();
    form.append(
      "file",
      new Blob([base64ToBytes(input.file)], {
        type: input.fileMimeType ?? "application/octet-stream",
      }),
      input.fileName ?? "upload.bin",
    );
    return client.data("/v3/assets", { method: "POST", form });
  },
};

export default assetUpload;
