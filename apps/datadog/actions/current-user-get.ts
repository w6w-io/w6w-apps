import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";

/**
 * `GET /api/v2/current_user` — who this connection's application key acts as.
 *
 * The only endpoint in this app's surface documented as needing **no
 * permission** beyond valid authentication: its `security` block offers no
 * `AuthZ` scope alternative, so any valid key pair reaches it. That is what
 * makes it the application-key half of the auth probe (`auth/api-key.ts`), and
 * it is useful in its own right — the response's `included` array carries the
 * organization and the user's roles *with their granted permissions*, which
 * answers "why did that other action 403?" in one call.
 *
 * It returns a profile, not credentials. Datadog's endpoints that return key
 * material — `GET /api/v2/current_user/application_keys`, `GET /api/v1/api_key`,
 * `GET /api/v1/application_key` — are deliberately not in this app at all, which
 * is the trap Mailjet's `/apikey` and Follow Up Boss's `/me` set for earlier
 * apps in this pack.
 *
 * Needs the application key: with only an API key this answers `403`.
 */
type Input = Record<string, never>;

const currentUserGet: ActionDefinition<Input> = {
  key: "current-user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Read the user this connection's application key acts as, with their organization, roles " +
    "and granted permissions.",
  params: [],
  output: [
    { key: "data", type: "object", label: "The authenticated user" },
    {
      key: "included",
      type: "array",
      label: "Organization, roles and the permissions they grant",
    },
  ],

  execute(_input, ctx) {
    return new DatadogClient(ctx).json("/api/v2/current_user");
  },
};

export default currentUserGet;
