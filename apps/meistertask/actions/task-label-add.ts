import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `POST /tasks/:task_id/task_labels` — attach an existing label to a task. */
interface Input {
  taskId: number;
  labelId: number;
}

const taskLabelAdd: ActionDefinition<Input> = {
  key: "task-label-add",
  type: "perform",
  resource: "task-label",
  title: "Add Label to Task",
  description: "Attach an existing label to a task. The label must already exist in the " +
    "task's project — see label-create.",
  // Not verified idempotent by the vendor's docs (no documented dedupe on
  // repeat attachment), so the honest declaration is false.
  idempotent: false,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
    { key: "labelId", label: "Label ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Task-label ID (needed to remove it)" },
    { key: "label_id", type: "number", label: "Label ID" },
    { key: "task_id", type: "number", label: "Task ID" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/tasks/${input.taskId}/task_labels`, {
      method: "POST",
      body: { label_id: input.labelId },
    });
  },
};

export default taskLabelAdd;
