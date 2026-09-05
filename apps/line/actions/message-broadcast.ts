import type { ActionDefinition } from "@w6w/types";
import { asJson, LineClient } from "../lib/client.ts";
import {
  messagesParam,
  notificationDisabledParam,
  retryKeyHeader,
  retryKeyParam,
} from "../lib/params.ts";

interface Input {
  messages: unknown;
  notificationDisabled?: boolean;
  retryKey?: string;
}

/**
 * `POST /v2/bot/message/broadcast` — send a message to every friend of the Official Account.
 *
 * No `to` field — there is nobody to target, by design. Rate-limited to 60 requests/hour, the
 * tightest ceiling in this app's whole surface, which is the vendor's own guard against firing this
 * one repeatedly by mistake. See `message-push.ts` for why this is `idempotent: false` despite
 * LINE's `X-Line-Retry-Key` mechanism.
 */
const messageBroadcast: ActionDefinition<Input> = {
  key: "message-broadcast",
  type: "perform",
  resource: "message",
  title: "Broadcast Message",
  description: "Send a message to every friend of this LINE Official Account. Up to 5 messages.",
  idempotent: false,
  params: [
    messagesParam,
    notificationDisabledParam,
    retryKeyParam,
  ],
  output: [],

  execute(input, ctx) {
    const messages = asJson<unknown[]>(input.messages, "messages");
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("`messages` must be a non-empty array of message objects");
    }
    ctx.log("warn", "broadcasting a LINE message to every friend", {
      messageCount: messages.length,
    });
    return new LineClient(ctx).json("/v2/bot/message/broadcast", {
      method: "POST",
      headers: retryKeyHeader(input.retryKey),
      body: {
        messages,
        notificationDisabled: input.notificationDisabled === true ? true : undefined,
      },
    });
  },
};

export default messageBroadcast;
