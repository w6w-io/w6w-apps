import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient, stripSecrets } from "../lib/client.ts";

/**
 * `GET /task/{task_id}` — one task in full.
 *
 * Carries what List Tasks omits at its default detail level: `description`,
 * `files`, `labels`, `reminder`, and the whole completion audit trail
 * (`completed_on` / `completed_by` / `completed_via`, and the deletion triple
 * alongside it).
 *
 * `ref` is the interesting field for a workflow — `{type, id, title, link,
 * data}` — because that is how a task points back at the item it was raised
 * against.
 *
 * The `push` channel signature is stripped; see `lib/client.ts#REDACTED_FIELDS`.
 */
interface Input {
  taskId: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description:
    "One task in full: description, responsible, due date, labels, files, its reference to " +
    "an item, and the completion audit trail.",
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "Numeric task_id.",
    },
  ],
  output: [{ key: "task", type: "object", label: "Task" }],

  async execute(input, ctx) {
    const task = await new PodioClient(ctx).json<Record<string, unknown>>(
      `/task/${encodeSegment(input.taskId)}`,
    );
    return { task: stripSecrets(task ?? {}) };
  },
};

export default taskGet;
