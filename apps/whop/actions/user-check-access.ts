import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";

/**
 * `GET /users/{id}/access/{resource_id}` — does this user have access to an
 * account, product, or experience the caller can reach? The common
 * content-gating check: "has this buyer paid for this product."
 */
interface Input {
  userId: string;
  resourceId: string;
}

const userCheckAccess: ActionDefinition<Input> = {
  key: "user-check-access",
  type: "read",
  resource: "user",
  title: "Check User Access",
  description: "Check whether a user has access to an account, product, or experience.",
  params: [
    {
      key: "userId",
      label: "User ID or username",
      type: "string",
      required: true,
      placeholder: "user_xxxxxxxxxxxxxx",
    },
    {
      key: "resourceId",
      label: "Resource ID",
      type: "string",
      required: true,
      placeholder: "prod_xxxxxxxxxxxxxx",
      hint: "An account (biz_), product (prod_), or experience (exp_) ID.",
    },
  ],
  output: [
    { key: "has_access", type: "boolean", label: "Whether the user has access" },
    { key: "access_level", type: "string", label: "no_access, admin, or customer" },
  ],

  execute(input, ctx) {
    return new WhopClient(ctx).get(
      `/users/${encodeURIComponent(input.userId)}/access/${encodeURIComponent(input.resourceId)}`,
    );
  },
};

export default userCheckAccess;
