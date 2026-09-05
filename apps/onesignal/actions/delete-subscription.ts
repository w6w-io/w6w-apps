import type { ActionDefinition } from "@w6w/types";
import { OneSignalClient, resolveAppId } from "../lib/client.ts";

interface Input {
  subscriptionId: string;
}

/**
 * `DELETE /apps/{app_id}/subscriptions/{subscription_id}` — verified against
 * the OpenAPI document. Answers `202`; the underlying removal is async.
 */
const deleteSubscription: ActionDefinition<Input> = {
  key: "delete-subscription",
  type: "perform",
  resource: "subscription",
  title: "Delete Subscription",
  description: "Remove a Subscription from its user.",
  idempotent: true,
  params: [
    { key: "subscriptionId", label: "Subscription ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    const status = await new OneSignalClient(ctx).status(
      `/apps/${encodeURIComponent(appId)}/subscriptions/${
        encodeURIComponent(input.subscriptionId)
      }`,
      { method: "DELETE" },
    );
    return { deleted: status < 300 };
  },
};

export default deleteSubscription;
