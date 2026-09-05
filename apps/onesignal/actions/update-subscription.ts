import type { ActionDefinition } from "@w6w/types";
import { compact, OneSignalClient, resolveAppId } from "../lib/client.ts";

interface Input {
  subscriptionId: string;
  token?: string;
  enabled?: boolean;
  notificationTypes?: number;
}

/**
 * `PATCH /apps/{app_id}/subscriptions/{subscription_id}` — verified against
 * the OpenAPI document. `notification_types` is OneSignal's opt-in/out
 * tri-state: `1` subscribed, `-2` unsubscribed, `0` (or others) various
 * platform-specific unsubscribe reasons — this app exposes it as a raw
 * number rather than guessing at every platform's meaning.
 */
const updateSubscription: ActionDefinition<Input> = {
  key: "update-subscription",
  type: "perform",
  resource: "subscription",
  title: "Update Subscription",
  description: "Update a Subscription's token, enabled state, or opt-in status.",
  idempotent: false,
  params: [
    { key: "subscriptionId", label: "Subscription ID", type: "string", required: true },
    { key: "token", label: "Token", type: "string", default: "" },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      hint: "Leave unset to not change.",
    },
    {
      key: "notificationTypes",
      label: "Notification Types",
      type: "number",
      default: "",
      hint: "1 = subscribed, -2 = unsubscribed. See OneSignal's Subscriptions guide for the " +
        "full per-platform table.",
      advanced: true,
    },
  ],
  output: [],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    const body = {
      subscription: compact({
        token: input.token,
        enabled: input.enabled,
        notification_types: input.notificationTypes,
      }),
    };
    return new OneSignalClient(ctx).json(
      `/apps/${encodeURIComponent(appId)}/subscriptions/${
        encodeURIComponent(input.subscriptionId)
      }`,
      { method: "PATCH", body },
    );
  },
};

export default updateSubscription;
