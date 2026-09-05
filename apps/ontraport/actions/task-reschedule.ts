import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";

/** `POST /1/task/reschedule` — move a single task to a new date and time. */
interface Input {
  id: string;
  newTime: number;
}

const taskReschedule: ActionDefinition<Input> = {
  key: "task-reschedule",
  type: "perform",
  resource: "task",
  title: "Reschedule Task",
  description: "Reschedule a single task for a different date and time.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    {
      key: "newTime",
      label: "New due date/time",
      type: "number",
      required: true,
      hint: "Unix timestamp (seconds).",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Rescheduled" }],

  async execute(input, ctx) {
    await new OntraportClient(ctx).envelope("/task/reschedule", {
      body: { id: Number(input.id), newtime: input.newTime },
    });
    return { ok: true };
  },
};

export default taskReschedule;
