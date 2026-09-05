import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";

/**
 * `GET /v1/users/me` — the currently authenticated user.
 *
 * The same endpoint the vendor's own docs use as the "authenticated request
 * example" and this app's auth probe (`auth/api-key.ts`). Kept as a standalone
 * action too, since a workflow may legitimately want the account name/email
 * (e.g. to stamp an audit log) without that being the health check's job.
 */
type Input = Record<string, never>;

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Retrieve the account that owns the connected API key.",
  params: [],
  output: [{ key: "data", type: "object", label: "The User object" }],

  execute(_input, ctx) {
    return new LemonSqueezyClient(ctx).request("/users/me");
  },
};

export default userGet;
