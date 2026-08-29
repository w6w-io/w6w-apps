import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, toList } from "../lib/client.ts";

/**
 * `POST /api/v2/accounts/warmup-analytics` — per-day and aggregate warmup
 * send/receive/inbox/spam counts for up to 100 sending accounts. A `POST`
 * despite being a read, because the vendor accepts the email list as a body
 * array rather than a query parameter.
 */
interface Input {
  emails: string[] | string;
}

const accountWarmupAnalyticsGet: ActionDefinition<Input> = {
  key: "account-warmup-analytics-get",
  type: "read",
  resource: "account",
  title: "Get Warmup Analytics",
  description: "Get per-day and aggregate warmup send/receive/inbox/spam counts for sending " +
    "accounts.",
  params: [
    {
      key: "emails",
      label: "Emails",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "jondoe@example.com" },
      hint: "Up to 100 accounts already connected to this workspace.",
    },
  ],
  output: [
    { key: "email_date_data", type: "object", label: "Per-day figures by account" },
    { key: "aggregate_data", type: "object", label: "Aggregate figures by account" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json("/accounts/warmup-analytics", {
      method: "POST",
      body: { emails: toList(input.emails) },
    });
  },
};

export default accountWarmupAnalyticsGet;
