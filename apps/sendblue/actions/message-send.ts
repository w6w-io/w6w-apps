import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";
import { asOptionalJson } from "../lib/params.ts";

interface Input {
  fromNumber: string;
  number: string;
  content?: string;
  mediaUrl?: string;
  sendStyle?: string;
  seatId?: string;
  statusCallback?: string;
  replyTo?: unknown;
  appCard?: unknown;
}

/**
 * `POST /api/send-message` — the flagship endpoint, and deliberately a bare,
 * unversioned path with no `/v2` form (verified against
 * `api/resources/messages/methods/send`, 2026-08-25). Routes to iMessage, SMS,
 * MMS, or a Sendblue App Card depending on which fields are set; RCS delivery
 * is chosen automatically by the vendor based on the recipient's device, not
 * by any parameter here (see the RCS Messaging guide).
 *
 * `app_card` is accepted as raw JSON rather than modelled field-by-field: it
 * mirrors Apple's `MSMessageTemplateLayout` and has 10+ nested fields
 * (`appName`, `extensionBundleId`, `layout.{caption,imageUrl,...}`, `teamId`,
 * `url`, `appStoreId`, ...) that only a caller building an actual iMessage
 * extension integration will ever populate.
 */
const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send an iMessage, SMS, MMS, or Sendblue App Card to a single recipient.",
  idempotent: false,
  params: [
    {
      key: "fromNumber",
      label: "From (Sendblue number)",
      type: "string",
      required: true,
      hint: "One of your registered Sendblue phone numbers, in E.164 format.",
    },
    { key: "number", label: "To", type: "string", required: true, hint: "E.164 format." },
    { key: "content", label: "Message text", type: "text" },
    {
      key: "mediaUrl",
      label: "Media URL",
      type: "string",
      hint: "HTTPS URL of an image/video/etc. to attach.",
    },
    {
      key: "sendStyle",
      label: "Expressive send style",
      type: "select",
      options: [
        "celebration",
        "shooting_star",
        "fireworks",
        "lasers",
        "love",
        "confetti",
        "balloons",
        "spotlight",
        "echo",
        "invisible",
        "gentle",
        "loud",
        "slam",
      ].map((v) => ({ value: v, label: v })),
      advanced: true,
    },
    {
      key: "seatId",
      label: "Seat ID",
      type: "string",
      advanced: true,
      hint: "Attribute this send to a specific rep (seat UUID or Firebase Auth subject).",
    },
    {
      key: "statusCallback",
      label: "Status callback URL",
      type: "string",
      advanced: true,
      hint: "Webhook URL for this message's status updates.",
    },
    {
      key: "replyTo",
      label: "Reply to (JSON)",
      type: "json",
      advanced: true,
      hint: '{ "message_handle": "...", "part_index": 0 } — inline-reply to a prior message.',
    },
    {
      key: "appCard",
      label: "App Card (JSON)",
      type: "json",
      advanced: true,
      hint: "Full Sendblue App Card object. Requires a V2 (Mac Mini) line.",
    },
  ],
  output: [
    { key: "message_handle", type: "string", label: "Message handle" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post(
      "/api/send-message",
      compact({
        from_number: input.fromNumber,
        number: input.number,
        content: input.content,
        media_url: input.mediaUrl,
        send_style: input.sendStyle,
        seat_id: input.seatId,
        status_callback: input.statusCallback,
        reply_to: asOptionalJson(input.replyTo, "replyTo"),
        app_card: asOptionalJson(input.appCard, "appCard"),
      }),
    );
  },
};

export default messageSend;
