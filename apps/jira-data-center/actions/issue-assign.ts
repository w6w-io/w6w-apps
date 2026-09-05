import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient } from "../lib/client.ts";
import { issueKey } from "../lib/params.ts";

interface Input {
  issueKey: string;
  username?: string;
}

const issueAssign: ActionDefinition<Input> = {
  key: "issue-assign",
  type: "perform",
  resource: "issue",
  title: "Assign Issue",
  description: "Assign an issue to a user, or leave the username empty to unassign it.",
  idempotent: true,
  params: [
    issueKey,
    {
      key: "username",
      label: "Assignee username",
      type: "string",
      hint: "The account's login username, from `user-search`. Leave empty to unassign.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new JiraDcClient(ctx).request(`/issue/${encodeURIComponent(input.issueKey)}/assignee`, {
      method: "PUT",
      // Explicit null is how Jira unassigns; omitting the key would be a no-op.
      body: { name: input.username || null },
    });
  },
};

export default issueAssign;
