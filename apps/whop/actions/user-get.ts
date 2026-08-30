import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";

/**
 * `GET /users/{id}` — a user by `user_` tag, username, or `me`.
 *
 * ## `id: "me"` needs care
 *
 * Measured live 2026-08-29: `GET /users/me` answers `404
 * {"error":{"type":"not_found","message":"User not found"}}` for BOTH a
 * missing Authorization header and a syntactically valid but fake bearer
 * token — this endpoint cannot distinguish "no credential" from "bad
 * credential" the way `auth/api-key.ts`'s `/permissions` probe can, and "the
 * authenticated user" is a session/OAuth-token concept that an App API key
 * (which authenticates as the app, not a person) may not resolve at all. This
 * action still exposes `id: "me"` because it is a documented, real form — the
 * self-only fields (`email`, `staff`, `balance`, `earnings_usd`) it can
 * return are exactly why `auth/api-key.ts` probes `/permissions` instead.
 */
interface Input {
  id: string;
  accountId?: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve a user by ID, username, or the reserved id `me`.",
  params: [
    {
      key: "id",
      label: "User ID, username, or me",
      type: "string",
      required: true,
      placeholder: "me",
    },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      hint: "When set, returns this user's account-specific profile overrides for this account.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The user" }],

  execute(input, ctx) {
    return new WhopClient(ctx).get(`/users/${encodeURIComponent(input.id)}`, {
      account_id: input.accountId,
    });
  },
};

export default userGet;
