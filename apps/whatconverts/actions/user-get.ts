import type { ActionDefinition } from "@w6w/types";
import { WhatConvertsClient } from "../lib/client.ts";
import { USER_OUTPUT_FIELDS } from "../lib/user-fields.ts";

interface Input {
  userId: number;
}

/**
 * `GET /users/{user_id}` — details for a single user. Requires a Master Account (agency)
 * Key. Verified against `whatconverts.com/api/users/` on 2026-08-29.
 */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Get details for a single user. Requires a Master Account (agency) Key.",
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
  ],
  output: USER_OUTPUT_FIELDS,

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get(`/users/${input.userId}`);
  },
};

export default userGet;
