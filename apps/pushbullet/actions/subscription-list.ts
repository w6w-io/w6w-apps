import type { ActionDefinition } from "@w6w/types";
import { compact, PushbulletClient } from "../lib/client.ts";

/** `GET /v2/subscriptions` — see `device-list.ts` for why pagination params are offered here too. */
interface Input {
  modifiedAfter?: number;
  active?: boolean;
  cursor?: string;
  limit?: number;
}

interface SubscriptionListResponse {
  subscriptions?: unknown[];
  cursor?: string;
}

const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "read",
  resource: "subscription",
  title: "List Subscriptions",
  description:
    "List channel subscriptions belonging to the current user, most recently modified first.",
  params: [
    { key: "modifiedAfter", label: "Modified after", type: "number", advanced: true },
    { key: "active", label: "Active only", type: "boolean" },
    { key: "cursor", label: "Cursor", type: "string", advanced: true },
    { key: "limit", label: "Limit", type: "number", default: 50, validation: { min: 1, max: 500 } },
  ],
  output: [
    { key: "subscriptions", type: "array", label: "Subscriptions" },
    { key: "cursor", type: "string", label: "Cursor for the next page, if any" },
  ],

  async execute(input, ctx) {
    const body = await new PushbulletClient(ctx).json<SubscriptionListResponse>("/subscriptions", {
      query: compact({
        modified_after: input.modifiedAfter,
        active: input.active,
        cursor: input.cursor,
        limit: input.limit,
      }),
    });
    return { subscriptions: body.subscriptions ?? [], cursor: body.cursor };
  },
};

export default subscriptionList;
