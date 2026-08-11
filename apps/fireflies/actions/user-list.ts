import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient, USER_FIELDS } from "../lib/client.ts";

interface Input {
  includeGroups?: boolean;
}

/** `users` takes no arguments — it returns everyone on the caller's team. */
function buildQuery(includeGroups: boolean): string {
  return `
    query Users {
      users {
        ${USER_FIELDS}
        ${
    includeGroups
      ? "user_groups { id name handle members { user_id first_name last_name email } }"
      : ""
  }
      }
    }
  `;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List every user on the team the API key belongs to.",
  params: [
    {
      key: "includeGroups",
      label: "Include user groups",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(buildQuery(input.includeGroups === true));
  },
};

export default userList;
