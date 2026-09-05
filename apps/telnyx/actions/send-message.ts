import type { ActionDefinition } from "@w6w/types";
import { TelnyxClient } from "../lib/client.ts";

interface Input {
  from?: string;
  messagingProfileId?: string;
  to: string;
  text?: string;
  mediaUrls?: string[];
  subject?: string;
  type?: "SMS" | "MMS";
  webhookUrl?: string;
  webhookFailoverUrl?: string;
  sendAt?: string;
  autoDetect?: boolean;
  encoding?: "auto" | "gsm7" | "ucs2";
}

/**
 * Send an SMS or MMS via Telnyx's `Messages` resource (`POST /messages`,
 * `CreateMessageRequest` in the OpenAPI document).
 *
 * **Sender.** Telnyx requires exactly one of `from` (a number, short code or
 * approved alphanumeric sender ID you own) or `messagingProfileId` (send via
 * a Messaging Profile's number pool / alphanumeric sender configuration) —
 * `execute` enforces the either/or up front so a bare `to`-only request fails
 * with a clear message instead of Telnyx's own 400.
 *
 * **MMS is a media attachment, not a separate endpoint.** Supplying
 * `mediaUrls` (URLs Telnyx fetches itself; total under 1 MB) is what makes a
 * send an MMS. `type` only needs to be set to override Telnyx's own
 * inference.
 *
 * **The response is not a delivery receipt.** `POST /messages` answers `200`
 * (not `201`) with the message queued — each entry in the response's `to`
 * array carries its own delivery `status` (`queued`, `sending`, `sent`, …),
 * never `delivered` yet. Use `get-message` or `webhookUrl` for the outcome.
 */
const sendMessage: ActionDefinition<Input> = {
  key: "send-message",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send an SMS or MMS message via Telnyx.",
  idempotent: false,
  params: [
    {
      key: "sender",
      label: "Sender",
      type: "section",
      section: "group",
      layout: "row",
      children: [
        {
          key: "from",
          label: "From",
          type: "string",
          hint:
            "Number, short code, or approved alphanumeric sender ID you own, in E.164 format. " +
            "Leave empty when sending via a Messaging Profile.",
        },
        {
          key: "messagingProfileId",
          label: "Messaging Profile ID",
          type: "string",
          hint:
            "Send from a Messaging Profile's number pool or alphanumeric sender configuration " +
            "instead of one address.",
        },
      ],
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Recipient phone number in E.164 format, or short code.",
    },
    {
      key: "text",
      label: "Message text",
      type: "text",
      hint: "Required for SMS. Optional for an MMS carrying only media.",
    },
    {
      key: "options",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      subtitle: "Media, type, scheduling, webhooks",
      collapsed: true,
      children: [
        {
          key: "mediaUrls",
          label: "Media URLs",
          type: "array",
          item: { type: "string", placeholder: "https://example.com/image.jpg" },
          hint: "Publicly reachable URLs Telnyx will fetch and attach. Supplying any turns this " +
            "into an MMS. Total media size must be under 1 MB.",
        },
        { key: "subject", label: "Subject", type: "string", hint: "MMS subject line." },
        {
          key: "type",
          label: "Type",
          type: "select",
          options: [
            { label: "SMS", value: "SMS" },
            { label: "MMS", value: "MMS" },
          ],
          hint: "Usually inferred from whether media is attached — set to override that.",
        },
        {
          key: "webhookUrl",
          label: "Webhook URL",
          type: "string",
          hint: "Overrides the Messaging Profile's webhook URL for this message's delivery events.",
        },
        { key: "webhookFailoverUrl", label: "Webhook failover URL", type: "string" },
        {
          key: "sendAt",
          label: "Send at",
          type: "datetime",
          hint: "Schedule delivery for a future time, accurate to the minute.",
        },
        {
          key: "autoDetect",
          label: "Auto-detect long messages",
          type: "boolean",
          default: false,
          hint:
            "Automatically detect if the message is unusually long and exceeds a recommended limit of message parts.",
        },
        {
          key: "encoding",
          label: "Encoding",
          type: "select",
          options: [
            { label: "Auto (smart encoding)", value: "auto" },
            { label: "Force GSM-7", value: "gsm7" },
            { label: "Force UCS-2", value: "ucs2" },
          ],
          default: "auto",
        },
      ],
    },
  ],
  output: [{ key: "data", type: "object", label: "The queued message" }],

  execute(input, ctx) {
    const hasFrom = !!input.from?.trim();
    const hasProfile = !!input.messagingProfileId?.trim();
    if (!hasFrom && !hasProfile) {
      throw new Error(
        "A sender is required: set `from` (a number, short code, or alphanumeric sender ID you " +
          "own) or `messagingProfileId` (a Messaging Profile).",
      );
    }
    const media = (input.mediaUrls ?? []).map((u) => String(u).trim()).filter(Boolean);

    return new TelnyxClient(ctx).data("/messages", {
      method: "POST",
      body: {
        from: hasFrom ? input.from!.trim() : undefined,
        messaging_profile_id: hasProfile ? input.messagingProfileId!.trim() : undefined,
        to: input.to,
        text: input.text,
        media_urls: media.length ? media : undefined,
        subject: input.subject,
        type: input.type,
        webhook_url: input.webhookUrl,
        webhook_failover_url: input.webhookFailoverUrl,
        send_at: input.sendAt ? new Date(input.sendAt).toISOString() : undefined,
        auto_detect: input.autoDetect,
        encoding: input.encoding,
      },
    });
  },
};

export default sendMessage;
