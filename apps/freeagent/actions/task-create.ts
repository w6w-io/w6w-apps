import type { ActionDefinition } from "@w6w/types";
import { compact, FreeAgentClient, ref } from "../lib/client.ts";

interface Input {
  projectId: string;
  name: string;
  isBillable?: boolean;
  billingRate?: string;
  billingPeriod?: "hour" | "day";
}

/**
 * Unlike every other "create under a parent" endpoint in this API (invoices
 * under a contact, timeslips under a project, expenses under a user — all of
 * which take the parent reference as a BODY field), FreeAgent's own docs
 * define task creation as `POST /v2/tasks?project=:project` — the project is
 * a QUERY PARAM, not part of the `task` payload
 * (confirmed at dev.freeagent.com/docs/tasks). Sending it in the body instead
 * (the pattern every other create action in this app follows) creates a
 * project-less task rather than failing loudly, so it is easy to miss.
 */
const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task under a project.",
  // FreeAgent mints a new task id per call and offers no request key, so a
  // retry creates a duplicate task.
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "isBillable", label: "Billable", type: "boolean" },
    { key: "billingRate", label: "Billing rate", type: "string" },
    {
      key: "billingPeriod",
      label: "Billing period",
      type: "select",
      options: [
        { value: "hour", label: "Per hour" },
        { value: "day", label: "Per day" },
      ],
    },
  ],
  output: [{ key: "task", type: "object", label: "Task" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/tasks", {
      method: "POST",
      query: { project: ref("projects", input.projectId) },
      body: {
        task: compact({
          name: input.name,
          is_billable: input.isBillable,
          billing_rate: input.billingRate,
          billing_period: input.billingPeriod,
        }),
      },
    });
  },
};

export default taskCreate;
