import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

/**
 * `GET /v3/users/me` — profile, billing block and remaining balance/credits.
 *
 * `UserInfoResponse` carries no credential material (verified against the schema — see
 * `auth/api-key.ts`), so nothing here needs stripping before it reaches a workflow.
 */
const userGet: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Return the authenticated account's profile and billing details (wallet balance, " +
    "subscription credits, or usage-based spend, depending on the account's billing type).",
  params: [],
  output: [{ key: "data", type: "object", label: "The user" }],

  execute(_input, ctx) {
    const client = new HeyGenClient(ctx);
    return client.data("/v3/users/me");
  },
};

export default userGet;
