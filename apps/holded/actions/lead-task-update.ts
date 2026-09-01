import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `PUT /leads/{leadId}/tasks` — rename an existing task. `taskId` is
 * required; "only the params included in the operation will update the
 * task".
 *
 * Unlike every other write in this app, Holded's own spec documents this
 * response as an empty object (`{"type": "object", "properties": {}}`, no
 * example) rather than the usual `{status, info, id}` envelope — carried
 * through here rather than assumed to match the others.
 */
interface Input {
  leadId: string;
  taskId: string;
  name?: string;
}

const leadTaskUpdate: ActionDefinition<Input> = {
  key: "lead-task-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead Task",
  description: "Rename an existing lead task.",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Leads result.",
    },
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "From the `taskId` of a task in the lead's `tasks` array.",
    },
    { key: "name", label: "Task name", type: "string" },
  ],
  output: [
    { key: "result", type: "object", label: "Response body (Holded documents no fields here)" },
  ],

  async execute(input, ctx) {
    const body = compact({ taskId: input.taskId, name: input.name });
    const result = await new HoldedClient(ctx).write(
      `/leads/${encodeId(input.leadId)}/tasks`,
      "PUT",
      body,
    );
    return { result };
  },
};

export default leadTaskUpdate;
