import type { ActionDefinition } from "@w6w/types";
import { sendyPost, SUBSCRIPTION_STATUS_PATH } from "../lib/client.ts";

interface Input {
  email: string;
  listId: string;
}

/** The exact, documented success literals for this endpoint. */
const STATUSES = [
  "Subscribed",
  "Unsubscribed",
  "Unconfirmed",
  "Bounced",
  "Soft bounced",
  "Complained",
] as const;

/**
 * `POST /api/subscribers/subscription-status.php` — the current status of a
 * subscriber in a list.
 */
const subscriberStatus: ActionDefinition<Input> = {
  key: "subscriber-status",
  type: "read",
  resource: "subscriber",
  title: "Get Subscription Status",
  description: "Current status of a subscriber in a list (subscribed, unsubscribed, bounced, …).",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      hint: "The encrypted list id this email belongs to, from View all lists.",
    },
  ],
  output: [{ key: "status", type: "string", label: "Status" }],

  async execute(input, ctx) {
    ctx.log("info", "reading subscription status", { list: input.listId });
    const text = await sendyPost(ctx, SUBSCRIPTION_STATUS_PATH, {
      email: input.email,
      list_id: input.listId,
    });
    if (!(STATUSES as readonly string[]).includes(text)) {
      throw new Error(`Sendy ${SUBSCRIPTION_STATUS_PATH} failed: ${text}`);
    }
    return { status: text };
  },
};

export default subscriberStatus;
