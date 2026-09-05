import type { ActionDefinition } from "@w6w/types";
import { API_DATA_HOST, LineClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/** Refuse rather than silently truncate — a partial image/video/audio file is not usable data. */
const MAX_BYTES = 20_000_000;

/**
 * `GET /v2/bot/message/{messageId}/content` on `api-data.line.me` — the image, video, audio or
 * file a user sent, addressed by the message ID from its webhook event.
 *
 * ## `api-data.line.me`, not `api.line.me`
 *
 * The vendor's own "Common specifications" section calls this out first: content retrieval is one
 * of the five endpoints that live on the separate `api-data.line.me` host. This action is the
 * reason that host is in `w6w.network.allow` at all.
 *
 * ## Only for content LINE still hosts
 *
 * Only reachable when the webhook event's `contentProvider.type` was `"line"` (as opposed to
 * `"external"`, which already carries its own `originalContentUrl`). Content is auto-deleted after
 * an undocumented retention window; a message the user unsent answers `410 Gone`. There is no API
 * for retrieving the *text* of a text message — that only ever arrives via the webhook itself.
 *
 * ## The response is binary, and this app returns it base64-encoded with a size ceiling
 *
 * Base64-encoding is the only way to carry arbitrary bytes through an Action's JSON-shaped output.
 * `MAX_BYTES` refuses anything over 20 MB rather than truncating it — a truncated image or audio
 * file is corrupt, not merely smaller, so there is nothing useful a partial download could return.
 */
const contentGet: ActionDefinition<Input> = {
  key: "content-get",
  type: "read",
  resource: "content",
  title: "Get Content",
  description:
    "Download media (image, video, audio or file) a user sent, base64-encoded. Only works while " +
    "LINE still hosts it, and only for content whose webhook event reported `contentProvider.type` " +
    'as "line".',
  params: [
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      required: true,
      hint: "From the `message.id` field of the webhook event the media arrived in.",
    },
  ],
  output: [
    { key: "contentType", type: "string", label: "MIME type LINE served it under" },
    { key: "base64", type: "string", label: "Base64-encoded bytes" },
    { key: "bytes", type: "number", label: "Size before encoding" },
  ],

  async execute(input, ctx) {
    const messageId = String(input.messageId ?? "").trim();
    if (!messageId) throw new Error("`messageId` is required");

    const result = await new LineClient(ctx, API_DATA_HOST).binaryGet(
      `/v2/bot/message/${encodeURIComponent(messageId)}/content`,
    );
    if (result.bytes > MAX_BYTES) {
      throw new Error(
        `the content is ${result.bytes} bytes, over the ${MAX_BYTES} ceiling this action applies`,
      );
    }
    ctx.log("info", "downloaded LINE message content", {
      messageId,
      contentType: result.contentType,
      bytes: result.bytes,
    });
    return { contentType: result.contentType, base64: result.base64, bytes: result.bytes };
  },
};

export default contentGet;
