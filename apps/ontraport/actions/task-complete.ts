import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, OntraportClient } from "../lib/client.ts";

/**
 * `POST /1/task/complete` — mark one or more tasks complete.
 *
 * `objectTypeId` here names the type of object the tasks are attached to
 * (0 = Contact, the vendor's default), NOT the Task object type itself —
 * unlike `task-cancel`'s `objectID`, which addresses the tasks directly. Two
 * different "object type" parameters, two different meanings, on two
 * sibling endpoints; both are transcribed exactly as documented.
 */
interface Input {
  objectTypeId?: number;
  taskIds: string;
  data?: unknown;
}

const taskComplete: ActionDefinition<Input> = {
  key: "task-complete",
  type: "perform",
  resource: "task",
  title: "Complete Task",
  description: "Mark one or more tasks as completed, optionally recording an outcome and " +
    "updating related object fields.",
  idempotent: true,
  params: [
    {
      key: "objectTypeId",
      label: "Related object type ID",
      type: "number",
      default: 0,
      advanced: true,
      hint: "The type of object these tasks are attached to. 0 = Contact (the default).",
    },
    { key: "taskIds", label: "Task IDs", type: "string", required: true, hint: "Comma-separated." },
    {
      key: "data",
      label: "Completion data",
      type: "json",
      advanced: true,
      hint: 'Optional object, e.g. {"outcome": ":=success", "task_form_lastname": "Green"} — ' +
        "an outcome value and/or fields on the related object to update.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Completed" }],

  async execute(input, ctx) {
    const data = asOptionalJson<Record<string, unknown>>(input.data, "Completion data");
    await new OntraportClient(ctx).envelope("/task/complete", {
      body: compact({
        object_type_id: input.objectTypeId ?? 0,
        ids: input.taskIds.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)),
        data,
      }),
    });
    return { ok: true };
  },
};

export default taskComplete;
