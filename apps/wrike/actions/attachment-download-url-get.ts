import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { attachmentIdParam } from "../lib/params.ts";

/**
 * `GET /attachments/{attachmentId}/url` — a fresh public download link for a
 * Wrike-hosted or external attachment.
 *
 * Per Wrike's own description: **the returned link is only valid for 24 hours
 * from when this call is made** — it is not the attachment's permanent
 * identity, and must be fetched again (not cached) each time a workflow
 * actually needs to download the file.
 */
interface Input {
  attachmentId: string;
}

const attachmentDownloadUrlGet: ActionDefinition<Input> = {
  key: "attachment-download-url-get",
  type: "read",
  resource: "attachment",
  title: "Get Attachment Download URL",
  description:
    "Get a public download link for an attachment. Valid for 24 hours from the time of this call.",
  params: [attachmentIdParam],
  output: [
    { key: "url", type: "string", label: "Download URL (24h)" },
    { key: "playlistUrl", type: "string", label: "Video playlist URL, if applicable" },
  ],

  execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    return new WrikeClient(ctx, host).one(
      `/attachments/${encodeURIComponent(input.attachmentId)}/url`,
    );
  },
};

export default attachmentDownloadUrlGet;
