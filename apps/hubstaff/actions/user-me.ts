import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";

/**
 * `GET /v2/users/me` — the member the credential acts as.
 *
 * Returns `{"user": {...User}}`: `id`, `name`, `first_name`, `last_name`,
 * `email`, `time_zone`, `ip_address`, `status`, `created_at`, `updated_at`.
 *
 * This is the identity behind an Organization access token: the token
 * "authenticates as that member, with exactly that member's current
 * organization role and access", and reassigning it in the Hubstaff app changes
 * this answer without changing the secret. Nothing in the response is
 * credential material — the schema has no token field — so the whole body is
 * returned. `email` and `trackable`-style membership facts live on
 * `member-list`; this is the profile.
 *
 * The `id` here is the `user_id` that `time-entry-create` and `user-get` take.
 */
const action: ActionDefinition = {
  key: "user-me",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Get the member the connected Organization access token acts as (GET /v2/users/me).",
  params: [],
  output: [{ key: "user", type: "object", label: "The acting member's profile" }],

  execute(_input, ctx) {
    return new HubstaffClient(ctx).request("/users/me");
  },
};

export default action;
