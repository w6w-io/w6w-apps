import type { ActionDefinition } from "@w6w/types";
import { asJson, LineClient, toStringList } from "../lib/client.ts";
import {
  messagesParam,
  notificationDisabledParam,
  retryKeyHeader,
  retryKeyParam,
} from "../lib/params.ts";

interface Input {
  to: string[] | string;
  messages: unknown;
  notificationDisabled?: boolean;
  retryKey?: string;
}

/**
 * `POST /v2/bot/message/multicast` — the same message to up to 500 user IDs in one call.
 *
 * Group and room chats cannot be targeted (`to` must be `userId`s only) — for a single recipient
 * LINE's own guidance is to use Push Message instead, since multicast is optimised for the
 * many-recipients case. See `message-push.ts` for why this is `idempotent: false` despite LINE's
 * `X-Line-Retry-Key` mechanism.
 */
const messageMulticast: ActionDefinition<Input> = {
  key: "message-multicast",
  type: "perform",
  resource: "message",
  title: "Multicast Message",
  description: "Send the same message to up to 500 user IDs. Cannot target group or room chats.",
  idempotent: false,
  params: [
    {
      key: "to",
      label: "To (user IDs)",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "U4af4980629..." },
      hint: "Up to 500 `userId` values from webhook events' `source` objects. Never a LINE ID " +
        "looked up in the app.",
    },
    messagesParam,
    notificationDisabledParam,
    retryKeyParam,
  ],
  output: [],

  execute(input, ctx) {
    const to = toStringList(input.to);
    if (!to || to.length === 0) throw new Error("`to` must be a non-empty list of user IDs");
    if (to.length > 500) throw new Error("`to` accepts at most 500 user IDs");
    const messages = asJson<unknown[]>(input.messages, "messages");
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("`messages` must be a non-empty array of message objects");
    }
    ctx.log("info", "multicasting a LINE message", { recipients: to.length });
    return new LineClient(ctx).json("/v2/bot/message/multicast", {
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

export default messageMulticast;
