import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, unset } from "../lib/client.ts";
import { taskOutput } from "../lib/params.ts";

interface Input {
  description: string;
  clientId?: string;
  projectId?: string;
  timeLog?: string;
}

/**
 * `POST /api/v1/tasks` — verified against `TaskRequest`, whose only required
 * field is `description`. `time_log` is documented only as `"Time logged for
 * the task"` with the shallow example `"2.5"` — Invoice Ninja's own UI encodes
 * this as a JSON array of `[start_ts, end_ts, description, billable]` tuples
 * rather than a bare duration, but the OpenAPI document itself does not state
 * that shape, so this field is passed through verbatim as documented rather
 * than a format this app cannot confirm.
 */
const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a billable task.",
  idempotent: false,
  params: [
    { key: "description", label: "Description", type: "text", required: true },
    { key: "clientId", label: "Client ID", type: "string" },
    { key: "projectId", label: "Project ID", type: "string", advanced: true },
    {
      key: "timeLog",
      label: "Time log",
      type: "string",
      advanced: true,
      hint: 'Invoice Ninja documents this only as "Time logged for the task" (example "2.5"); ' +
        "its own UI actually encodes a JSON array of time entries. Passed through verbatim — " +
        "leave unset unless you have confirmed the shape your instance expects.",
    },
  ],
  output: taskOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/tasks", {
      method: "POST",
      body: {
        description: input.description,
        client_id: unset(input.clientId),
        project_id: unset(input.projectId),
        time_log: unset(input.timeLog),
      },
    });
  },
};

export default taskCreate;
