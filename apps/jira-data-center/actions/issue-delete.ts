import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient } from "../lib/client.ts";
import { issueKey } from "../lib/params.ts";

interface Input {
  issueKey: string;
  deleteSubtasks?: boolean;
}

const issueDelete: ActionDefinition<Input> = {
  key: "issue-delete",
  type: "perform",
  resource: "issue",
  title: "Delete Issue",
  description: "Permanently delete an issue.",
  // A retry after a dropped response finds nothing left to delete and 404s —
  // safe to retry, not "already applied".
  idempotent: true,
  params: [
    issueKey,
    {
      key: "deleteSubtasks",
      label: "Delete sub-tasks",
      type: "boolean",
      default: false,
      hint: "If false and the issue has sub-tasks, Jira rejects the delete.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new JiraDcClient(ctx).request(`/issue/${encodeURIComponent(input.issueKey)}`, {
      method: "DELETE",
      query: { deleteSubtasks: input.deleteSubtasks ?? false },
    });
  },
};

export default issueDelete;
