import type { ActionDefinition } from "@w6w/types";
import { OneSignalClient, resolveAppId } from "../lib/client.ts";
import { ALIAS_PARAMS, aliasPath } from "../lib/alias.ts";

interface Input {
  aliasLabel?: string;
  aliasId: string;
}

/**
 * `DELETE /apps/{app_id}/users/by/{alias_label}/{alias_id}` — permanently
 * removes a user and every associated property, subscription, and identity.
 * Verified against the OpenAPI document. Answers `202` with the deleted
 * user's `identity` in the body.
 */
const deleteUser: ActionDefinition<Input> = {
  key: "delete-user",
  type: "perform",
  resource: "user",
  title: "Delete User",
  description: "Permanently remove a user and all associated properties and subscriptions.",
  idempotent: true,
  params: ALIAS_PARAMS,
  output: [
    { key: "identity", type: "object", label: "Identity of the deleted user" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    return new OneSignalClient(ctx).json(
      `/apps/${encodeURIComponent(appId)}/users${aliasPath(input.aliasLabel, input.aliasId)}`,
      { method: "DELETE" },
    );
  },
};

export default deleteUser;
