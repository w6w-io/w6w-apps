import type { ActionDefinition } from "@w6w/types";
import { BETA, encodeId, MotionClient, requiredJson } from "../lib/client.ts";
import { customFieldTypeOptions } from "../lib/params.ts";

/**
 * `POST /beta/custom-field-values/project/{projectId}` — set a custom field
 * value on a project.
 *
 * The project twin of `custom-field-value-set-task`, with an identical body:
 * `{customFieldInstanceId, value: {type, value}}`. The field definition itself
 * is workspace-scoped and shared — the same `customFieldInstanceId` sets a value
 * on a task and on a project — so there is one definition surface and two value
 * surfaces.
 *
 * Idempotent: setting the same field to the same value twice leaves it at that
 * value.
 */
interface Input {
  projectId: string;
  customFieldInstanceId: string;
  type: string;
  value: unknown;
}

const customFieldValueSetProject: ActionDefinition<Input> = {
  key: "custom-field-value-set-project",
  type: "perform",
  resource: "custom-field-value",
  title: "Set Custom Field Value On Project",
  description: "Set the value of a custom field on a project.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Projects or Create Project result.",
    },
    {
      key: "customFieldInstanceId",
      label: "Custom field ID",
      type: "string",
      required: true,
      hint: "The `id` from List Custom Fields — the same workspace-scoped definition that a task " +
        "value uses.",
    },
    {
      key: "type",
      label: "Field type",
      type: "select",
      required: true,
      options: customFieldTypeOptions,
      hint: "Must match the field's own type; Motion sends it as a discriminator inside the " +
        "value object.",
    },
    {
      key: "value",
      label: "Value",
      type: "json",
      required: true,
      placeholder: '"Q3"',
      hint: "Shaped by the field type: a JSON string for text/url/date/email/phone/select and " +
        "for relatedTo, a number for number, true/false for checkbox, an array of strings for " +
        "multiSelect, a user id for person, an array of user ids for multiPerson.",
    },
  ],
  output: [
    { key: "type", type: "string", label: "Field type" },
    { key: "value", type: "string", label: "Value that was set" },
  ],

  execute(input, ctx) {
    ctx.log("info", "setting Motion custom field value on project", { projectId: input.projectId });
    return new MotionClient(ctx).json(
      `${BETA}/custom-field-values/project/${encodeId(input.projectId)}`,
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

export default customFieldValueSetProject;
