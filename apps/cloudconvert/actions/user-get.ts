import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";

/**
 * `GET /v2/users/me` — show the current account and its remaining conversion credits.
 *
 * Needs the `user.read` scope — a key created only for running conversions
 * (`task.read`/`task.write`) will not have it and this action will fail with a 403; see
 * `auth/api-token.ts` for why no single CloudConvert scope covers every action in this
 * app. Unlike some other apps in this pack (Apify's `/v2/users/me`, for example), this
 * response carries no live credential material — `id`, `username`, `email`, `credits`
 * and `created_at` are all it returns.
 */
const userGet: ActionDefinition<Record<string, never>> = {
  key: "user-get",
  type: "read",
  resource: "account",
  title: "Get Current User",
  description: "Show the current account and its remaining conversion credits.",
  requiresAuth: true,
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "email", type: "string", label: "Email" },
    { key: "credits", type: "number", label: "Remaining conversion credits" },
    { key: "created_at", type: "string", label: "Account created at" },
  ],

  execute(_input, ctx) {
    return new CloudConvertClient(ctx).data(`/users/me`);
  },
};

export default userGet;
