import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient } from "../lib/client.ts";

interface Input {
  view?: "all" | "staff" | "active_staff" | "advisors" | "active_advisors";
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List users on the FreeAgent account.",
  params: [
    {
      key: "view",
      label: "View",
      type: "select",
      advanced: true,
      options: [
        { value: "all", label: "All (default)" },
        { value: "staff", label: "Staff" },
        { value: "active_staff", label: "Active staff" },
        { value: "advisors", label: "Advisors (accountants)" },
        { value: "active_advisors", label: "Active advisors" },
      ],
    },
  ],
  output: [{ key: "users", type: "array", label: "Users" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/users", { query: { view: input.view } });
  },
};

export default userList;
