import type { ActionDefinition } from "@w6w/types";
import { BETA, encodeId, MotionClient, requiredJson } from "../lib/client.ts";
import { customFieldTypeOptions } from "../lib/params.ts";

/**
 * `POST /beta/custom-field-values/task/{taskId}` — set a custom field value on a
 * task.
 *
 * ## The value is a tagged pair, not a bare value
 *
 * The body is `{customFieldInstanceId, value: {type, value}}`, where the inner
 * `type` repeats the field's own type from the twelve-member vocabulary. Sending
 * a bare scalar will not do: the discriminator is part of the documented shape.
 * It is exposed as two fields — a `select` for the type and a free `json` for the
 * payload — and assembled here, so the discriminator cannot be mistyped and the
 * payload can still be a string, a number, a boolean, an object or an array as
 * the field type requires.
 *
 * ## `customFieldInstanceId` is the definition's id, not a name
 *
 * It comes from `custom-field-list` (or `custom-field-create`). Note the
 * asymmetry with reading: a task's `customFieldValues` is a record keyed by the
 * field's **name**, so the identifier you read a value under is never the
 * identifier you write it with.
 *
 * Idempotent: setting the same field to the same value twice leaves it at that
 * value. `POST` is the verb the vendor documents for what is a set, not an
 * append.
 */
interface Input {
  taskId: string;
  customFieldInstanceId: string;
  type: string;
  value: unknown;
}

const customFieldValueSetTask: ActionDefinition<Input> = {
  key: "custom-field-value-set-task",
  type: "perform",
  resource: "custom-field-value",
  title: "Set Custom Field Value On Task",
  description: "Set the value of a custom field on a task.",
  idempotent: true,
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Tasks or Create Task result.",
    },
    {
      key: "customFieldInstanceId",
      label: "Custom field ID",
      type: "string",
      required: true,
      hint: "The `id` from List Custom Fields — NOT the field name a task's customFieldValues is " +
        "keyed by.",
    },
    {
      key: "type",
      label: "Field type",
      type: "select",
      required: true,
      options: customFieldTypeOptions,
      hint: "Must match the field's own type. Motion sends it as a discriminator inside the " +
        "value object.",
    },
    {
      key: "value",
      label: "Value",
      type: "json",
      required: true,
      placeholder: '"in progress"',
      hint: "Shaped by the field type: a JSON string for text/url/date/email/phone/select and " +
        "for relatedTo (a task id), a number for number, true/false for checkbox, an array of " +
        "strings for multiSelect, a user id for person, an array of user ids for multiPerson.",
    },
  ],
  output: [
    { key: "type", type: "string", label: "Field type" },
    { key: "value", type: "string", label: "Value that was set" },
  ],

  execute(input, ctx) {
    ctx.log("info", "setting Motion custom field value on task", { taskId: input.taskId });
    return new MotionClient(ctx).json(
      `${BETA}/custom-field-values/task/${encodeId(input.taskId)}`,
      {
        method: "POST",
        body: {
          customFieldInstanceId: input.customFieldInstanceId,
          value: { type: input.type, value: requiredJson(input.value, "Value") },
        },
      },
    );
  },
};

export default customFieldValueSetTask;
