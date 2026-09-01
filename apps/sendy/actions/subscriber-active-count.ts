import type { ActionDefinition } from "@w6w/types";
import { ACTIVE_SUBSCRIBER_COUNT_PATH, sendyPost } from "../lib/client.ts";

interface Input {
  listId: string;
}

/**
 * `POST /api/subscribers/active-subscriber-count.php` — the active
 * subscriber count of a list. Success is a bare integer as plain text;
 * anything that doesn't parse as one is one of Sendy's documented errors
 * ("Invalid API key", "List does not exist", …).
 */
const subscriberActiveCount: ActionDefinition<Input> = {
  key: "subscriber-active-count",
  type: "read",
  resource: "subscriber",
  title: "Get Active Subscriber Count",
  description: "Total active subscriber count of a list.",
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      hint: "The encrypted list id, from View all lists.",
    },
  ],
  output: [{ key: "count", type: "number", label: "Active subscribers" }],

  async execute(input, ctx) {
    ctx.log("info", "reading active subscriber count", { list: input.listId });
    const text = await sendyPost(ctx, ACTIVE_SUBSCRIBER_COUNT_PATH, { list_id: input.listId });
    if (!/^\d+$/.test(text)) {
      throw new Error(`Sendy ${ACTIVE_SUBSCRIBER_COUNT_PATH} failed: ${text}`);
    }
    return { count: Number(text) };
  },
};

export default subscriberActiveCount;
