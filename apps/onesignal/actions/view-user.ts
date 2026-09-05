import type { ActionDefinition } from "@w6w/types";
import { OneSignalClient, resolveAppId } from "../lib/client.ts";
import { ALIAS_PARAMS, aliasPath } from "../lib/alias.ts";

interface Input {
  aliasLabel?: string;
  aliasId: string;
}

/**
 * `GET /apps/{app_id}/users/by/{alias_label}/{alias_id}` — verified against
 * the OpenAPI document. Returns identity, properties, and every subscription.
 */
const viewUser: ActionDefinition<Input> = {
  key: "view-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve a user including aliases, properties, and subscriptions.",
  params: ALIAS_PARAMS,
  output: [
    { key: "identity", type: "object", label: "Identity" },
    { key: "properties", type: "object", label: "Properties" },
    { key: "subscriptions", type: "array", label: "Subscriptions" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    return new OneSignalClient(ctx).json(
      `/apps/${encodeURIComponent(appId)}/users${aliasPath(input.aliasLabel, input.aliasId)}`,
    );
  },
};

export default viewUser;
