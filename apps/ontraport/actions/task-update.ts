import type { ActionDefinition } from "@w6w/types";
import { compact, OntraportClient } from "../lib/client.ts";

/**
 * `PUT /1/Tasks` — reassign a task, change its due date, or its status.
 *
 * There is no `task-create` or `task-delete` action in this app: Ontraport's
 * own "Accessible Objects" permission table grants Task (object type 1) only
 * GET and PUT — no POST, no DELETE — and no such endpoint exists anywhere in
 * the reference doc either (the Tasks section jumps straight from "Retrieve"
 * to "Update", "Assign", "Cancel", "Complete", "Reschedule"). Tasks are
 * created only as a side effect of `task-assign` or of an Ontraport
 * automation, and are removed only via `task-cancel`.
 */
interface Input {
  id: string;
  owner?: string;
  dateDue?: number;
  status?: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Reassign a task, change its due date, or change its status.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    { key: "owner", label: "Assignee user ID", type: "string" },
    {
      key: "dateDue",
      label: "Due date",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "0", label: "Pending" },
        { value: "1", label: "Complete" },
        { value: "2", label: "Cancelled" },
      ],
      hint: "Prefer Complete Task / Cancel Task for those transitions — they exist as their own " +
        "endpoints and can also record a task outcome.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated fields" }],

  execute(input, ctx) {
    return new OntraportClient(ctx).data("/Tasks", {
      method: "PUT",
      form: compact({
        id: input.id,
        owner: input.owner,
        date_due: input.dateDue,
        status: input.status,
      }),
    });
  },
};

export default taskUpdate;
