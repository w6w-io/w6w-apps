import type { ActionDefinition } from "@w6w/types";
import { asJson, LineClient } from "../lib/client.ts";
import {
  messagesParam,
  notificationDisabledParam,
  retryKeyHeader,
  retryKeyParam,
} from "../lib/params.ts";

interface Input {
  to: string;
  messages: unknown;
  notificationDisabled?: boolean;
  retryKey?: string;
}

/**
 * `POST /v2/bot/message/push` — send a message to one user, group or room chat at any time (not
 * only in reply to an event).
 *
 * ## Not idempotent by default — see `lib/params.ts`'s `retryKeyParam`
 *
 * LINE offers a real idempotency mechanism here (`X-Line-Retry-Key`, a caller-minted UUID), but it
 * has to be a UUID the caller generates and keeps stable across retries of one logical send — the
 * host's own `ctx.invocation.invocationId` is not UUID-shaped, so this app does not silently wire
 * it in and claim `idempotent: true`. Supply `retryKey` yourself for retry-safety; without it, a
 * retry sends the message again.
 */
const messagePush: ActionDefinition<Input> = {
  key: "message-push",
  type: "perform",
  resource: "message",
  title: "Push Message",
  description: "Send a message to a user, group chat or multi-person chat. Up to 5 messages.",
  idempotent: false,
  params: [
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      placeholder: "U4af4980629...",
      hint: "A `userId`, `groupId` or `roomId` from a webhook event's `source` object.",
    },
    messagesParam,
    notificationDisabledParam,
    retryKeyParam,
  ],
  output: [
    { key: "sentMessages", type: "array", label: "Sent messages ({ id, quoteToken? })" },
  ],

  execute(input, ctx) {
    const to = String(input.to ?? "").trim();
    if (!to) throw new Error("`to` is required");
    const messages = asJson<unknown[]>(input.messages, "messages");
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("`messages` must be a non-empty array of message objects");
    }
    ctx.log("info", "pushing a LINE message", { messageCount: messages.length });
    return new LineClient(ctx).json("/v2/bot/message/push", {
      method: "POST",
      headers: retryKeyHeader(input.retryKey),
      body: {
        to,
        messages,
        notificationDisabled: input.notificationDisabled === true ? true : undefined,
      },
    });
  },
};

export default messagePush;
