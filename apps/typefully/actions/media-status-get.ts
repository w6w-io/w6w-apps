import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  mediaId: string;
}

/**
 * `GET /v2/social-sets/{social_set_id}/media/{media_id}` — poll processing
 * status after a `media-upload-create` + out-of-band `PUT`. `status` is
 * `processing`, `ready` (usable in a post's `media_ids`), or `failed`
 * (`error_reason` set — including "no file received before the presigned URL
 * expired", which is a 1-hour window).
 */
const mediaStatusGet: ActionDefinition<Input> = {
  key: "media-status-get",
  type: "read",
  resource: "media",
  title: "Get Media Status",
  description: "Check whether an uploaded media file has finished processing.",
  params: [
    socialSetIdParam,
    { key: "mediaId", label: "Media ID", type: "string", required: true },
  ],
  output: [
    { key: "media_id", type: "string", label: "Media ID" },
    { key: "file_name", type: "string", label: "Original filename" },
    { key: "mime", type: "string", label: "MIME type, or null" },
    { key: "status", type: "string", label: "processing | ready | failed" },
    { key: "error_reason", type: "string", label: "Set when status is failed" },
    { key: "media_urls", type: "object", label: "Size-keyed URLs once ready" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/media/${input.mediaId}`,
    );
  },
};

export default mediaStatusGet;
