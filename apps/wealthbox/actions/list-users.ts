import type { ActionDefinition } from "@w6w/types";
import { WealthboxClient } from "../lib/client.ts";

interface Input {
  status?: string;
}

/** `GET /v1/users` — list users on the current account. Defaults to active users only. */
const listUsers: ActionDefinition<Input> = {
  key: "list-users",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List users on the current Wealthbox account. Defaults to active users only.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active" },
        { value: "invited", label: "Invited" },
        { value: "inactive", label: "Inactive" },
        { value: "legacy", label: "Legacy" },
        { value: "all", label: "All" },
      ],
    },
  ],
  output: [{ key: "users", type: "array", label: "Users" }],

  execute(input, ctx) {
    return new WealthboxClient(ctx).request("/users", {
      query: { status: input.status },
    });
  },
};

export default listUsers;
