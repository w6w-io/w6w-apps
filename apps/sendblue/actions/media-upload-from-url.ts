import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  mediaUrl: string;
}

/**
 * `POST /api/upload-media-object` — downloads a URL and re-hosts it on
 * Sendblue's CDN, "useful for ensuring media persists and is accessible by
 * iMessage" per the vendor's own docs.
 *
 * `POST /api/upload-file` (direct multipart binary upload) is deliberately
 * NOT implemented: it takes a raw file body under a `file` form field rather
 * than a JSON/param-shaped request, which does not fit this app's params
 * model — a caller with a URL for the source media (the common case for a
 * workflow) should use this action instead. See the app README.
 */
const mediaUploadFromUrl: ActionDefinition<Input> = {
  key: "media-upload-from-url",
  type: "perform",
  resource: "media",
  title: "Upload Media (from URL)",
  description: "Download media from a URL and re-host it on Sendblue's CDN.",
  idempotent: false,
  params: [
    { key: "mediaUrl", label: "Source media URL", type: "string", required: true },
  ],
  output: [
    { key: "mediaObjectId", type: "string", label: "Media object ID" },
    { key: "media_url", type: "string", label: "Re-hosted media URL" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post("/api/upload-media-object", { media_url: input.mediaUrl });
  },
};

export default mediaUploadFromUrl;
