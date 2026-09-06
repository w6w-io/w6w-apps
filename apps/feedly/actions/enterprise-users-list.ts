import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `GET /v3/enterprise/users` — list the enterprise account's users and their
 * activity metrics.
 *
 * Verified against the "List Enterprise Users" reference page (fetched
 * 2026-09-06): `servers: ["https://api.feedly.com/v3"]`, path
 * `/enterprise/users`, with a full `User` component schema (email, role,
 * login/activity counters). The vendor's own `?format=csv` export option is
 * not exposed here — this action always requests JSON, so a workflow gets a
 * structured array rather than a string it would have to re-parse.
 *
 * Documented as requiring the caller to be a team admin (403 "Insufficient
 * permissions" otherwise), which is why the credential probe in
 * `auth/bearer-token.ts` deliberately does NOT use this endpoint.
 */

const enterpriseUsersList: ActionDefinition<Record<string, never>> = {
  key: "enterprise-users-list",
  type: "read",
  resource: "users",
  title: "List Enterprise Users",
  description:
    "List every user in the enterprise account with their role and activity metrics. Requires " +
    "the connected token to belong to a team admin.",
  params: [],
  output: [{ key: "users", type: "array", label: "Users" }],

  async execute(_input, ctx) {
    const users = await new FeedlyClient(ctx).json<unknown[]>("/v3/enterprise/users");
    return { users: users ?? [] };
  },
};

export default enterpriseUsersList;
