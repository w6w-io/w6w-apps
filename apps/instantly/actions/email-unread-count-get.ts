import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";

/** `GET /api/v2/emails/unread/count` — total unread emails across the Unibox. */
type Input = Record<string, never>;

const emailUnreadCountGet: ActionDefinition<Input> = {
  key: "email-unread-count-get",
  type: "read",
  resource: "email",
  title: "Count Unread Emails",
  description: "Get the total number of unread emails in the Unibox.",
  params: [],
  output: [
    { key: "count", type: "number", label: "Unread count" },
  ],

  execute(_input, ctx) {
    return new InstantlyClient(ctx).json("/emails/unread/count");
  },
};

export default emailUnreadCountGet;
