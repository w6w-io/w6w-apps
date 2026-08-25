import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  email?: string;
  before?: string;
  after?: string;
  limit?: number;
}

/** GET /users — cursor-paginated. */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List all users in the account (GET /users).",
  output: [
    { key: "object", type: "string", label: "Object type (list)" },
    { key: "data", type: "array", label: "Users" },
    { key: "has_more", type: "boolean", label: "More results available" },
  ],
  params: [
    { key: "email", label: "Email", type: "string" },
    { key: "before", label: "Before cursor", type: "string", advanced: true },
    { key: "after", label: "After cursor", type: "string", advanced: true },
    { key: "limit", label: "Limit", type: "number", default: 10, advanced: true, hint: "1-100." },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request("/users", {
      query: { email: input.email, before: input.before, after: input.after, limit: input.limit },
    });
  },
};

export default userList;
