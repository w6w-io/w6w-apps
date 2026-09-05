import type { ActionDefinition } from "@w6w/types";
import { ErpNextClient } from "../lib/client.ts";

/**
 * `GET /api/method/frappe.auth.get_logged_user` — the account this
 * Connection's credential belongs to.
 *
 * This is the exact call the docs use as their worked example for every auth
 * mode, and it is also what `auth/api-key.ts#test` and `health/instance.ts`
 * each build on — this action exposes the same call to a workflow, for e.g.
 * stamping a record with who a bot integration is running as.
 */
const getLoggedUser: ActionDefinition = {
  key: "get-logged-user",
  type: "read",
  title: "Get Logged-In User",
  description: "Return the User this connection's API Key belongs to.",
  output: [{ key: "user", type: "string", label: "User id (usually an email address)" }],

  async execute(_input, ctx) {
    const user = await new ErpNextClient(ctx).method<string>("frappe.auth.get_logged_user");
    return { user };
  },
};

export default getLoggedUser;
