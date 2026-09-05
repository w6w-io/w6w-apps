import type { ActionDefinition } from "@w6w/types";
import { InstapaperClient, type InstapaperUser } from "../lib/client.ts";

/**
 * `POST /api/1/account/verify_credentials` — the currently authenticated
 * user. Exposed as its own Action (distinct from the Auth `test`/`afterConnect`
 * hooks that call the same endpoint internally) because it is a documented,
 * user-invokable method a workflow may want mid-run — e.g. to read the
 * canonical `username`, which the docs warn "may change".
 */
const accountVerifyCredentials: ActionDefinition<Record<string, never>> = {
  key: "account-verify-credentials",
  type: "read",
  resource: "account",
  title: "Get Current User",
  description: "Return the account this connection is authenticated as.",
  output: [
    { key: "user_id", type: "number", label: "User id" },
    { key: "username", type: "string", label: "Username" },
  ],

  async execute(_input, ctx) {
    const [user] = await new InstapaperClient(ctx).call<InstapaperUser>(
      "/api/1/account/verify_credentials",
    );
    if (!user) throw new Error("Instapaper returned no user");
    return user;
  },
};

export default accountVerifyCredentials;
