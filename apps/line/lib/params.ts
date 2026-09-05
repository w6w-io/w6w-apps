import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the message-sending actions (reply, push, multicast, broadcast).
 *
 * LINE's message body accepts a JSON array of up to 5 "message objects" — text, image, video,
 * audio, location, sticker, imagemap, template or flex, each with its own field set (see
 * https://developers.line.biz/en/reference/messaging-api/#message-objects). Re-deriving each shape
 * as a separate typed param would multiply this app's surface without adding anything the vendor's
 * own object model doesn't already say, so it is accepted as free-form JSON here, the same choice
 * Apify's `actorInputParam` makes for a vendor-defined payload this app does not own the schema of.
 */
export const messagesParam: Param = {
  key: "messages",
  label: "Messages",
  type: "json",
  required: true,
  hint: "Array of up to 5 message objects (type: text, image, video, audio, location, sticker, " +
    "imagemap, template, or flex). See " +
    "https://developers.line.biz/en/reference/messaging-api/#message-objects",
};

export const notificationDisabledParam: Param = {
  key: "notificationDisabled",
  label: "Disable push notification",
  type: "boolean",
  default: false,
  hint: "When on, the recipient's device does not chime/vibrate for this message (they still " +
    "receive it, unless they've disabled notifications themselves).",
};

/**
 * LINE's own idempotency key — a caller-minted UUID (`X-Line-Retry-Key`), not something LINE
 * issues. See `README.md` § "No auto-generated retry key" for why this app leaves it as an opt-in
 * pass-through rather than deriving one from `ctx.invocation.invocationId` (which is not
 * UUID-shaped) and marking the action idempotent.
 */
export const retryKeyParam: Param = {
  key: "retryKey",
  label: "Retry key",
  type: "string",
  advanced: true,
  hint: "A UUID you generate and keep stable across retries of the same logical send (e.g. " +
    "`crypto.randomUUID()`, minted once and stored). LINE deduplicates requests carrying the same " +
    "key for a short window and returns the original result instead of sending twice. Leave empty " +
    "to send unconditionally on every call.",
};

export function retryKeyHeader(retryKey: unknown): Record<string, string> | undefined {
  const key = String(retryKey ?? "").trim();
  return key ? { "X-Line-Retry-Key": key } : undefined;
}

export const userIdParam: Param = {
  key: "userId",
  label: "User ID",
  type: "string",
  required: true,
  placeholder: "U4af4980629...",
  hint: "A `userId` from a webhook event's `source` object. Never a LINE ID a person looks up in " +
    "the LINE app itself.",
};

export const richMenuIdParam: Param = {
  key: "richMenuId",
  label: "Rich menu ID",
  type: "string",
  required: true,
  hint: "From `rich-menu-create`'s output, or `rich-menu-list`.",
};
