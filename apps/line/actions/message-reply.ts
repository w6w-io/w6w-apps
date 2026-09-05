import type { ActionDefinition } from "@w6w/types";
import { asJson, LineClient } from "../lib/client.ts";
import { messagesParam, notificationDisabledParam } from "../lib/params.ts";

interface Input {
  replyToken: string;
  messages: unknown;
  notificationDisabled?: boolean;
}

/**
 * `POST /v2/bot/message/reply` — answer an inbound webhook event with its reply token.
 *
 * ## The reply token is single-use and short-lived
 *
 * Reply tokens come from a webhook event and can be used exactly once, within about a minute of
 * the event (LINE's own wording: "don't rely on the time limit for implementation... use reply
 * tokens as soon as possible"). A second call with the same token fails with
 * `400 {"message":"Invalid reply token"}`, so this action is declared **not idempotent** — retrying
 * it after a timeout is not safe, because the token may already have been consumed by the first
 * (successful) attempt. There is also no `X-Line-Retry-Key` for this endpoint, unlike push,
 * multicast and broadcast — LINE gives reply no separate idempotency mechanism at all.
 */
const messageReply: ActionDefinition<Input> = {
  key: "message-reply",
  type: "perform",
  resource: "message",
  title: "Reply Message",
  description: "Reply to a webhook event using its one-time reply token. Up to 5 messages.",
  idempotent: false,
  params: [
    {
      key: "replyToken",
      label: "Reply token",
      type: "string",
      required: true,
      hint: "From the `replyToken` field of the webhook event you're responding to. Single-use, " +
        "valid for about a minute.",
    },
    messagesParam,
    notificationDisabledParam,
  ],
  output: [
    { key: "sentMessages", type: "array", label: "Sent messages ({ id, quoteToken? })" },
  ],

  execute(input, ctx) {
    const replyToken = String(input.replyToken ?? "").trim();
    if (!replyToken) throw new Error("`replyToken` is required");
    const messages = asJson<unknown[]>(input.messages, "messages");
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("`messages` must be a non-empty array of message objects");
    }
    ctx.log("info", "replying to a LINE event", { messageCount: messages.length });
    return new LineClient(ctx).json("/v2/bot/message/reply", {
      method: "POST",
      body: {
        replyToken,
        messages,
        notificationDisabled: input.notificationDisabled === true ? true : undefined,
      },
    });
  },
};

export default messageReply;
