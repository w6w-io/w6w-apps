import type { ActionDefinition } from "@w6w/types";
import { DialpadClient } from "../lib/client.ts";
import { groupTypeOptions, toStringArray } from "../lib/params.ts";

/**
 * `POST /api/v2/sms` — send an SMS (or MMS, with media) to phone numbers or to
 * a Dialpad channel, on behalf of a user.
 *
 * **There is no SMS list/history endpoint in this API.** The `sms` tag
 * declares exactly one operation, `sms.send` — confirmed against the full
 * OpenAPI document, which has no `GET` under `/api/v2/sms` or anywhere else
 * that returns individual sent/received messages. What the API *does* expose
 * for messaging beyond sending are two adjacent, different features this app
 * covers separately: **bulk SMS** (`message/bulk`, a CSV-driven batch send)
 * and **scheduled SMS** (`message/schedule`, a message queued for later) —
 * neither is "list the SMS I've sent", and both are out of scope here (see the
 * README's "Deliberately not covered" section).
 *
 * Provide either `toNumbers` or `channelHashtag` as the recipient, and either
 * `text` or `media` as the content. No idempotency key is documented, so
 * calling this twice sends two messages.
 */
interface Input {
  toNumbers?: string;
  channelHashtag?: string;
  text?: string;
  media?: string;
  fromNumber?: string;
  userId?: string;
  senderGroupId?: string;
  senderGroupType?: string;
  inferCountryCode?: boolean;
}

const smsSend: ActionDefinition<Input> = {
  key: "sms-send",
  type: "perform",
  resource: "sms",
  title: "Send SMS",
  description:
    "Send an SMS (or MMS, with a media attachment) to up to 10 phone numbers or to a Dialpad " +
    "channel, on behalf of a user or a group.",
  idempotent: false,
  params: [
    {
      key: "toNumbers",
      label: "To numbers",
      type: "string",
      hint: "Comma-separated, up to 10 E164-formatted numbers. Provide this or Channel hashtag.",
    },
    {
      key: "channelHashtag",
      label: "Channel hashtag",
      type: "string",
      hint: "The hashtag of the channel that should receive the SMS. Provide this or To numbers.",
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      hint: "Provide this or Media.",
    },
    {
      key: "media",
      label: "Media (base64)",
      type: "string",
      hint: "Base64-encoded attachment, sent as MMS. Max 500 KiB raw file size.",
    },
    {
      key: "fromNumber",
      label: "From number",
      type: "string",
      hint: "Sender's E164 number. Must be assigned to a user or group. Overrides User ID and " +
        "Sender group ID when set.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      hint: "The user who should be the sender.",
    },
    {
      key: "senderGroupId",
      label: "Sender group ID",
      type: "string",
      hint: "An office, department or call center id to send on behalf of.",
    },
    {
      key: "senderGroupType",
      label: "Sender group type",
      type: "select",
      options: groupTypeOptions,
      hint: "Required whenever Sender group ID is set.",
    },
    {
      key: "inferCountryCode",
      label: "Infer country code",
      type: "boolean",
      hint: "Assume To numbers are in the sending user's country, relaxing the E164 requirement.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "SMS ID" },
    { key: "message_status", type: "string", label: "pending, success, or failed" },
    { key: "to_numbers", type: "array", label: "Recipients" },
  ],

  execute(input, ctx) {
    if (!input.toNumbers && !input.channelHashtag) {
      throw new Error("provide either To numbers or Channel hashtag");
    }
    if (!input.text && !input.media) {
      throw new Error("provide either Text or Media");
    }
    ctx.log("info", "sending SMS", {
      to: input.toNumbers ? toStringArray(input.toNumbers)?.length : undefined,
      channel: input.channelHashtag,
    });
    return new DialpadClient(ctx).json("/sms", {
      method: "POST",
      body: {
        to_numbers: toStringArray(input.toNumbers),
        channel_hashtag: input.channelHashtag,
        text: input.text,
        media: input.media,
        from_number: input.fromNumber,
        user_id: input.userId ? Number(input.userId) : undefined,
        sender_group_id: input.senderGroupId ? Number(input.senderGroupId) : undefined,
        sender_group_type: input.senderGroupType,
        infer_country_code: input.inferCountryCode,
      },
    });
  },
};

export default smsSend;
