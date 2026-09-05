import type { ActionDefinition } from "@w6w/types";
import { compact, OBJECT_TYPE, OntraportClient } from "../lib/client.ts";
import { bulkActionParams, type CollectionInput, collectionQuery } from "../lib/params.ts";

/**
 * `POST /1/task/cancel` — cancel one or more tasks.
 *
 * Uses `objectID` (not `object_type_id` — see `task-assign.ts`'s note on the
 * inconsistency) for the task's own object type, which is always the Task
 * type (1) itself here, not the type of object the task is attached to.
 */
interface Input extends CollectionInput {
  ids?: string;
}

const taskCancel: ActionDefinition<Input> = {
  key: "task-cancel",
  type: "perform",
  resource: "task",
  title: "Cancel Task",
  description: "Cancel one or more tasks by ID, or by Group ID / Condition for a bulk cancel.",
  idempotent: true,
  params: [
    {
      key: "ids",
      label: "Task IDs",
      type: "string",
      hint: "Comma-separated. 0 selects every task.",
    },
    ...bulkActionParams,
  ],
  output: [{ key: "ok", type: "boolean", label: "Cancelled" }],

  async execute(input, ctx) {
    await new OntraportClient(ctx).envelope("/task/cancel", {
      body: compact({ objectID: OBJECT_TYPE.TASK, ...collectionQuery(input) }),
    });
    return { ok: true };
  },
};

export default taskCancel;
