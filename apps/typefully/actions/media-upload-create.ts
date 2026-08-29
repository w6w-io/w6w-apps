import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  fileName: string;
}

/**
 * `POST /v2/social-sets/{social_set_id}/media/upload` — reserve a media slot
 * and get a presigned upload URL.
 *
 * ## This action does not upload the file
 *
 * Getting bytes onto Typefully's storage is documented as two calls: this one
 * returns `{media_id, upload_url}`, and the caller then sends a plain `PUT` of
 * the raw file bytes to `upload_url` directly — **no extra headers**
 * (`Content-Type`, `Authorization`, etc.); the presigned signature was computed
 * without them, and adding any causes `403 SignatureDoesNotMatch`. The URL
 * expires in **1 hour**; an unreceived file transitions the media to `failed`.
 *
 * That second call is not an Action in this app: `upload_url`'s host is
 * generated per-call (the vendor's own example is `s3.amazonaws.com`, but the
 * bucket/region is not documented as fixed), and this app's sandbox egress
 * allowlist (`network.allow`) is declared statically in the manifest and
 * cannot name a host that only exists at call time. Hand the returned URL to
 * an HTTP step (e.g. `@w6w/http`) or an external tool to perform the `PUT`,
 * then poll `media-status-get` with the returned `media_id` until it reads
 * `ready`, and pass that id as a post's `media_ids` entry.
 */
const mediaUploadCreate: ActionDefinition<Input> = {
  key: "media-upload-create",
  type: "perform",
  resource: "media",
  title: "Create Media Upload",
  description: "Reserve a media slot for an image, video, GIF, or PDF and get an upload URL. " +
    "Does not upload the file itself — see the action's own notes.",
  idempotent: false,
  params: [
    socialSetIdParam,
    {
      key: "fileName",
      label: "File Name",
      type: "string",
      required: true,
      hint: "Original filename with extension — used for MIME-type detection and display. " +
        "Allowed: letters, numbers, hyphens, underscores, periods, parentheses; extensions " +
        ".jpg .jpeg .png .webp .gif .mp4 .mov .pdf.",
      validation: {
        pattern:
          "^[a-zA-Z0-9_.()\\-]+\\.([jJ][pP][gG]|[jJ][pP][eE][gG]|[pP][nN][gG]|[wW][eE][bB][pP]|" +
          "[gG][iI][fF]|[mM][pP]4|[mM][oO][vV]|[pP][dD][fF])$",
      },
    },
  ],
  output: [
    { key: "media_id", type: "string", label: "Media ID — use in a post's media_ids" },
    {
      key: "upload_url",
      type: "string",
      label: "Presigned S3 URL — PUT raw bytes here, no headers",
    },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(`/social-sets/${input.socialSetId}/media/upload`, {
      method: "POST",
      body: { file_name: input.fileName },
    });
  },
};

export default mediaUploadCreate;
