import type { ActionDefinition } from "@w6w/types";
import { PatreonClient } from "../lib/client.ts";

interface Input {
  /** CSV: client, campaign. */
  include?: string;
  /** CSV: last_attempted_at, num_consecutive_times_failed, paused, secret, triggers, uri. */
  webhookFields?: string;
}

const listWebhooks: ActionDefinition<Input> = {
  key: "list-webhooks",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the webhooks created by THIS API client on the current user's campaign " +
    "(GET /webhooks). Requires the `w:campaigns.webhook` scope. Only webhooks created " +
    "by the calling client are visible.",
  params: [
    {
      key: "include",
      label: "Include related resources",
      type: "string",
      hint: "CSV: client, campaign",
    },
    { key: "webhookFields", label: "Webhook fields", type: "string", hint: "CSV" },
  ],
  output: [{ key: "data", type: "array", label: "Webhooks" }],

  execute(input, ctx) {
    return new PatreonClient(ctx).request("/webhooks", {
      query: {
        include: input.include,
        "fields[webhook]": input.webhookFields,
      },
    });
  },
};

export default listWebhooks;
