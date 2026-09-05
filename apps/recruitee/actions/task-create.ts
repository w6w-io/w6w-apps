import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient, toNumberList } from "../lib/client.ts";

/**
 * `POST /c/{company_id}/tasks` — verified against the `Create task` resource.
 * `timezone` is documented as "required, if due date is present".
 */
interface Input {
  title: string;
  description?: string;
  candidateId?: number;
  dueDate?: string;
  timezone?: string;
  adminIds?: number[] | string;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task, optionally attached to a candidate and assigned to admins.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "candidateId", label: "Candidate ID", type: "number", validation: { integer: true } },
    { key: "dueDate", label: "Due date", type: "datetime" },
    {
      key: "timezone",
      label: "Due date timezone",
      type: "string",
      placeholder: "Europe/London",
      hint: "Required if a due date is set.",
    },
    {
      key: "adminIds",
      label: "Assign to admin IDs",
      type: "array",
      item: { type: "number" },
    },
  ],
  output: [
    { key: "task", type: "object", label: "The created task" },
    { key: "references", type: "array", label: "Related admins the response references" },
  ],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request("/tasks", {
      method: "POST",
      body: {
        task: {
          title: input.title,
          description: input.description,
          candidate_id: input.candidateId,
          due_date: input.dueDate,
          timezone: input.timezone,
          admin_ids: toNumberList(input.adminIds),
        },
      },
    });
  },
};

export default taskCreate;
