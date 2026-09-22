import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

/**
 * `GET /v2/users/{user_id}` — one member's profile.
 *
 * Returns `{"user": {...User}}`, the same schema `user-me` returns. This is the
 * endpoint that turns the bare `user_id` values carried by activities,
 * timesheets and members into a name and an email.
 *
 * A user id the organization cannot see answers `404`, not a permission error.
 */
interface Input {
  user_id: number;
}

const action: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Get one user by ID (GET /v2/users/{user_id}).",
  params: [userIdParam],
  output: [{ key: "user", type: "object", label: "User profile" }],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/users/${input.user_id}`);
  },
};

export default action;
