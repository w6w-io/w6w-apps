import type { ActionDefinition } from "@w6w/types";
import { BETA, encodeId, MotionClient } from "../lib/client.ts";

/**
 * `DELETE /beta/custom-field-values/task/{taskId}/custom-fields/{valueId}` —
 * clear one custom field value from a task.
 *
 * ## `valueId` is a third identifier, and it is not the field's id
 *
 * The path parameter is documented as "The ID of the custom field value that
 * will be deleted" — the id of the *value*, not of the field definition that
 * `custom-field-value-set-task` writes with, and not the field *name* that a
 * task's `customFieldValues` record is keyed by. That is three identifiers for
 * one field across four endpoints, which is the single easiest thing to get
 * wrong in this part of the API. Motion's reference does not say which response
 * carries the value id, so this app passes through whatever the caller supplies
 * rather than guessing a derivation.
 *
 * This clears a value; `custom-field-delete` removes the field from the
 * workspace entirely.
 *
 * The reference documents no response body, so the status is what is returned.
 * Idempotent: after one call and after five the value is gone.
 */
interface Input {
  taskId: string;
  valueId: string;
}

const customFieldValueDeleteTask: ActionDefinition<Input> = {
  key: "custom-field-value-delete-task",
  type: "perform",
  resource: "custom-field-value",
  title: "Delete Custom Field Value From Task",
  description:
    "Clear one custom field value from a task. Removes the value only — Delete Custom Field " +
    "removes the definition from the whole workspace.",
  idempotent: true,
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Tasks result.",
    },
    {
      key: "valueId",
      label: "Custom field VALUE ID",
      type: "string",
      required: true,
      hint: "The id of the VALUE, which Motion documents as distinct from the custom field's own " +
        "id and from the field name a task's customFieldValues is keyed by.",
    },
  ],
  output: [
    { key: "valueId", type: "string", label: "Custom field value deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Motion custom field value from task", { taskId: input.taskId });
    const status = await new MotionClient(ctx).status(
      `${BETA}/custom-field-values/task/${encodeId(input.taskId)}/custom-fields/${
        encodeId(input.valueId)
      }`,
      { method: "DELETE" },
    );
    return { valueId: input.valueId, status };
  },
};

export default customFieldValueDeleteTask;
