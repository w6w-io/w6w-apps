import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `POST /users/alias/new` — verified against the fetched spec. Attaches a new
 * alias (`alias_name` + `alias_label`) to an existing `external_id`. The spec
 * does not document what happens on a duplicate alias, so this is marked
 * non-idempotent rather than assuming a safe retry.
 */
const action: ActionDefinition = {
  key: "user-alias-new",
  type: "perform",
  resource: "user",
  title: "Create User Alias",
  description: "Attach a new alias to an existing external ID.",
  idempotent: false,
  params: [
    {
      key: "userAliases",
      label: "User Aliases",
      type: "json",
      required: true,
      hint: "Array of { external_id, alias_name, alias_label }.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as { userAliases: unknown };
    ctx.log("info", "creating Braze user alias(es)");
    return await new BrazeClient(ctx).post("/users/alias/new", { user_aliases: p.userAliases });
  },
};

export default action;
