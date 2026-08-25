import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  before?: string;
  after?: string;
  limit?: number;
}

/** GET /webhooks — cursor-paginated, sorted by creation date. */
const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List webhook subscriptions (GET /webhooks).",
  output: [
    { key: "object", type: "string", label: "Object type (list)" },
    { key: "data", type: "array", label: "Webhooks" },
    { key: "has_more", type: "boolean", label: "More results available" },
  ],
  params: [
    { key: "before", label: "Before cursor", type: "string", advanced: true },
    { key: "after", label: "After cursor", type: "string", advanced: true },
    { key: "limit", label: "Limit", type: "number", default: 10, advanced: true, hint: "1-100." },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request("/webhooks", {
      query: { before: input.before, after: input.after, limit: input.limit },
    });
  },
};

export default webhookList;
